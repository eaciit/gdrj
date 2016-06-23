package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"sync"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"

	"flag"
	"strings"
)

var mutex = new(sync.Mutex)
var conn dbox.IConnection
var (
	compute              string
	periodFrom, periodTo int
	dateFrom, dateTo     time.Time
	fiscalyear           int
)
var masters = toolkit.M{}

func setinitialconnection() {
	var err error
	conn, err = modules.GetDboxIConnection("db_godrej")

	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}

	err = gdrj.SetDb(conn)
	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}
}

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj,
		nil, nil)
	if e != nil {
		return nil
	}
	return c
}

var subchannels = toolkit.M{}

func buildmap(holder interface{},
	fnModel func() orm.IModel,
	filter *dbox.Filter,
	fnIter func(holder interface{}, obj interface{})) interface{} {
	crx, _ := gdrj.Find(fnModel(), filter, nil)
	defer crx.Close()
	for {
		s := fnModel()
		e := crx.Fetch(s, 1, false)
		if e != nil {
			break
		}
		fnIter(holder, s)
	}
	return holder
}

func prepmaster() {
	// toolkit.Println("--> SUBCHANNEL")
	// c, _ := conn.NewQuery().From("subchannels").Cursor(nil)
	// defer c.Close()

	// for {
	// 	m := toolkit.M{}
	// 	e := c.Fetch(&m, 1, false)
	// 	if e != nil {
	// 		break
	// 	}
	// 	subchannels.Set(m.GetString("_id"), m.GetString("title"))
	// }

	masters = toolkit.M{}
	toolkit.Println("--> PL MODEL")
	masters.Set("plmodel", buildmap(map[string]*gdrj.PLModel{},
		func() orm.IModel {
			return new(gdrj.PLModel)
		},
		nil,
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.PLModel)
			o := obj.(*gdrj.PLModel)
			h[o.ID] = o
		}).(map[string]*gdrj.PLModel))
	//HBrandCategory
	toolkit.Println("--> BRAND Category")
	tkmbrandcategory := toolkit.M{}
	chbc := getCursor(new(gdrj.HBrandCategory))
	defer chbc.Close()
	for {
		hbc := new(gdrj.HBrandCategory)
		err := chbc.Fetch(hbc, 1, false)
		if err != nil {
			break
		}

		if len(hbc.BrandID) < 3 {
			continue
		}

		tkmbrandcategory.Set(hbc.ID, hbc.BrandID)
	}

	toolkit.Println("--> COGS")
	masters.Set("cogs", buildmap(map[string]*gdrj.COGSConsolidate{},
		func() orm.IModel {
			return new(gdrj.COGSConsolidate)
		},
		nil,
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.COGSConsolidate)
			o := obj.(*gdrj.COGSConsolidate)
			cogsid := toolkit.Sprintf("%d_%d_%s", o.Year, int(o.Month), o.SAPCode)
			h[cogsid] = o
		}).(map[string]*gdrj.COGSConsolidate))

	toolkit.Println("--> RAW DATA PL")
	promos, freight, depreciation := map[string]*gdrj.RawDataPL{}, map[string]*gdrj.RawDataPL{}, map[string]*gdrj.RawDataPL{}
	royalties, damages := map[string]*gdrj.RawDataPL{}, map[string]*gdrj.RawDataPL{}
	f := dbox.Eq("year", fiscalyear-1)
	csrpromo, _ := gdrj.Find(new(gdrj.RawDataPL), f, nil)
	defer csrpromo.Close()
	vPromo, vAdv := float64(0), float64(0)

	for {
		o := new(gdrj.RawDataPL)
		e := csrpromo.Fetch(o, 1, false)
		if e != nil {
			break
		}

		Date := time.Date(o.Year, time.Month(o.Period), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		key := toolkit.Sprintf("%d_%d", Date.Year(), Date.Month())

		switch o.Src {
		case "APROMO":
			agroup := "promo"
			if strings.Contains(o.Grouping, "Advertising") {
				agroup = "adv"
			} else if strings.Contains(o.Grouping, "SPG") {
				agroup = "spg"
			}

			key = toolkit.Sprintf("%s_%s", key, agroup)
			prm, exist := promos[key]
			if !exist {
				prm = new(gdrj.RawDataPL)
			}

			prm.AmountinIDR += o.AmountinIDR
			promos[key] = prm
		case "FREIGHT":
			frg, exist := freight[key]
			if !exist {
				frg = new(gdrj.RawDataPL)
			}
			frg.AmountinIDR += o.AmountinIDR
			freight[key] = frg
		case "ROYALTY":
			key = toolkit.Sprintf("%d", Date.Year())
			roy, exist := royalties[key]
			if !exist {
				roy = new(gdrj.RawDataPL)
			}
			roy.AmountinIDR += o.AmountinIDR
			royalties[key] = roy
		case "DEPRECIATION":
			dpr, exist := depreciation[key]
			if !exist {
				dpr = new(gdrj.RawDataPL)
			}
			dpr.AmountinIDR += o.AmountinIDR
			depreciation[key] = dpr
		case "DAMAGEGOODS":
			dmg, exist := damages[key]
			if !exist {
				dmg = new(gdrj.RawDataPL)
			}
			dmg.AmountinIDR += o.AmountinIDR
			damages[key] = dmg
		}
	}

	toolkit.Printfn("PROMO : %v, ADV : %v", vPromo, vAdv)
	masters.Set("promos", promos).Set("freight", freight).Set("depreciation", depreciation).
		Set("royalties", royalties).Set("damages", damages)

	toolkit.Println("--> DISCOUNT ACTIVITY")
	//discounts_all discounts
	//can be by brach,brand,channelid,month
	cda, _ := conn.NewQuery().From("rawdatadiscountactivity_rev").Cursor(nil)
	defer cda.Close()

	tkmdiscount := toolkit.M{}
	for {
		m := toolkit.M{}
		e := cda.Fetch(&m, 1, false)
		if e != nil {
			break
		}
		date := time.Date(m.GetInt("year"), time.Month(m.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		key := toolkit.Sprintf("%d_%d_%s", date.Year(), date.Month(), strings.ToUpper(m.GetString("channel")))
		ln := len(m.GetString("pcid"))
		brand := ""
		if ln >= 7 {
			brand = strings.ToUpper(tkmbrandcategory.GetString(m.GetString("pcid")[(ln - 3):ln]))
		}

		if len(brand) > 2 {
			key = toolkit.Sprintf("%s_%s", key, brand)
		}

		tamount := tkmdiscount.GetFloat64(key) + m.GetFloat64("amountinidr")
		tkmdiscount.Set(key, tamount)
	}
	masters.Set("discounts", tkmdiscount)
}

func prepmastergrossproc() {

	globalgross, globalgrossvdist := float64(0), float64(0)
	grossbybranch, grossbybrand, grossbysku, grossbychannel := toolkit.M{}, toolkit.M{}, toolkit.M{}, toolkit.M{}
	grossbymonthvdist, grossbymonth, grossbymonthsku := toolkit.M{}, toolkit.M{}, toolkit.M{}
	grossbymonthchannel, grossbymonthbrandchannel := toolkit.M{}, toolkit.M{}

	toolkit.Println("--> Trx Gross Proc")
	csr01, _ := conn.NewQuery().From("salestrxs-grossproc").Cursor(nil)
	defer csr01.Close()
	for {
		m := toolkit.M{}
		e := csr01.Fetch(&m, 1, false)
		if e != nil {
			break
		}

		if strings.ToUpper(m.GetString("src")) == "DISCOUNT" {
			continue
		}

		agross := m.GetFloat64("gross")
		globalgross += agross
		if strings.ToUpper(m.GetString("src")) == "VDIST" {
			globalgrossvdist += agross
		}

		key := toolkit.Sprintf("%s", m.GetString("brand"))
		tempval := grossbybrand.GetFloat64(key) + agross
		grossbybrand.Set(key, tempval)

		key = toolkit.Sprintf("%s", m.GetString("branchid"))
		tempval = grossbybranch.GetFloat64(key) + agross
		grossbybranch.Set(key, tempval)

		key = toolkit.Sprintf("%s", m.GetString("skuid"))
		tempval = grossbysku.GetFloat64(key) + agross
		grossbysku.Set(key, tempval)

		key = toolkit.Sprintf("%s", m.GetString("channelcheck"))
		tempval = grossbychannel.GetFloat64(key) + agross
		grossbychannel.Set(key, tempval)

		key = toolkit.Sprintf("%d_%d", m.GetInt("year"), m.GetInt("month"))
		tempval = grossbymonth.GetFloat64(key) + agross
		grossbymonth.Set(key, tempval)

		if strings.ToUpper(m.GetString("src")) == "VDIST" {
			key = toolkit.Sprintf("%d_%d", m.GetInt("year"), m.GetInt("month"))
			tempval = grossbymonthvdist.GetFloat64(key) + agross
			grossbymonthvdist.Set(key, tempval)
		}

		key = toolkit.Sprintf("%d_%d_%s", m.GetInt("year"), m.GetInt("month"), m.GetString("skuid"))
		tempval = grossbymonthsku.GetFloat64(key) + agross
		grossbymonthsku.Set(key, tempval)

		key = toolkit.Sprintf("%d_%d_%s", m.GetInt("year"), m.GetInt("month"), m.GetString("channelcheck"))
		tempval = grossbymonthchannel.GetFloat64(key) + agross
		grossbymonthchannel.Set(key, tempval)

		key = toolkit.Sprintf("%d_%d_%s_%s", m.GetInt("year"), m.GetInt("month"), m.GetString("brand"), m.GetString("channelcheck"))
		tempval = grossbymonthbrandchannel.GetFloat64(key) + agross
		grossbymonthbrandchannel.Set(key, tempval)

	}

	masters.Set("globalgross", globalgross).Set("globalgrossvdist", globalgrossvdist)
	// tkm
	masters.Set("grossbybranch", grossbybranch).Set("grossbybrand", grossbybrand).Set("grossbysku", grossbysku).Set("grossbychannel", grossbychannel)
	masters.Set("grossbymonth", grossbymonth).Set("grossbymonthvdist", grossbymonthvdist).Set("grossbymonthsku", grossbymonthsku).
		Set("grossbymonthchannel", grossbymonthchannel).Set("grossbymonthbrandchannel", grossbymonthbrandchannel)
}

var pldatas = map[string]*gdrj.PLDataModel{}
var t0 time.Time

func main() {

	t0 = time.Now()
	flag.IntVar(&fiscalyear, "year", 2015, "fiscal year to process. default is 2015")
	flag.Parse()

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)

	setinitialconnection()
	defer gdrj.CloseDb()

	var f *dbox.Filter
	f = dbox.And(dbox.Gte("date.date", speriode), dbox.Lt("date.date", eperiode))
	// f = dbox.Or(dbox.Eq("_id", "RD_2015_10_20010074_639316"), dbox.Eq("_id", "CN/GBS/15000021_1"))

	toolkit.Println("Reading Master")
	prepmaster()
	// prepmastergrossproc()

	c, _ := gdrj.Find(new(gdrj.SalesPL), f, nil)
	defer c.Close()

	count := c.Count()
	jobs := make(chan *gdrj.SalesPL, count)
	result := make(chan string, count)
	for wi := 0; wi < 10; wi++ {
		go workerproc(wi, jobs, result)
	}

	toolkit.Printfn("START ... %d records", count)
	step := count / 100
	if step == 0 {
		step = 1
	}

	i := 0
	for {
		stx := new(gdrj.SalesPL)
		e := c.Fetch(stx, 1, false)
		if e != nil {
			break
		}

		if i == 1000 {
			//break
		}

		i++
		jobs <- stx
		if i%step == 0 {
			toolkit.Printfn("Sending %d of %d (%d pct) in %s",
				i, count, i/step, time.Since(t0).String())
		}
	}
	close(jobs)

	for ri := 0; ri < i; ri++ {
		<-result

		if ri%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				ri, count, ri/step, time.Since(t0).String())
		}
	}
}

func workerproc(wi int, jobs <-chan *gdrj.SalesPL, result chan<- string) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	var spl *gdrj.SalesPL
	for spl = range jobs {

		// spl.CleanAndClasify(masters)

		// === For ratio update and calc
		// spl.RatioCalc(masters)

		//calculate process
		spl.CalcCOGSRev(masters)
		spl.CalcFreight(masters)
		spl.CalcDepre(masters)
		spl.CalcDamage(masters)
		spl.CalcDepre(masters)
		spl.CalcRoyalties(masters)
		spl.CalcDiscountActivity(masters)
		spl.CalcPromo(masters)
		spl.CalcSum(masters)

		tablename := toolkit.Sprintf("%v", spl.TableName())
		workerconn.NewQuery().From(tablename).
			Save().Exec(toolkit.M{}.Set("data", spl))

		result <- spl.ID
	}
}
