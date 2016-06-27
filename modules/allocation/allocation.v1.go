package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
	"sync"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0                                time.Time
	custgroup, prodgroup, plcode, ref string
	value, fiscalyear                 int
	globalval                         float64
	mapkeysvalue                      map[string]float64
	masters                           toolkit.M
	mutex                             = &sync.Mutex{}
)

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
	masters = toolkit.M{}
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
}

func prepmasterclean() {

	toolkit.Println("--> Sub Channel")
	csr, _ := conn.NewQuery().From("subchannels").Cursor(nil)
	subchannels := toolkit.M{}
	defer csr.Close()
	for {
		m := toolkit.M{}
		e := csr.Fetch(&m, 1, false)
		if e != nil {
			break
		}
		subchannels.Set(m.GetString("_id"), m.GetString("title"))
	}
	masters.Set("subchannels", subchannels)

	customers := toolkit.M{}
	toolkit.Println("--> Customer")
	ccb := getCursor(new(gdrj.Customer))
	defer ccb.Close()
	for {
		cust := new(gdrj.Customer)
		e := ccb.Fetch(cust, 1, false)
		if e != nil {
			break
		}

		customers.Set(cust.ID, cust)
	}
	masters.Set("customers", customers)

	branchs := toolkit.M{}
	cmb := getCursor(new(gdrj.MasterBranch))
	defer cmb.Close()
	for {
		stx := toolkit.M{}
		e := cmb.Fetch(&stx, 1, false)
		if e != nil {
			break
		}

		branchs.Set(stx.Get("_id", "").(string), stx)
	}
	masters.Set("branchs", branchs)

	rdlocations := toolkit.M{}
	crdloc, _ := conn.NewQuery().From("outletgeo").Cursor(nil)
	defer crdloc.Close()
	for {
		stx := toolkit.M{}
		e := crdloc.Fetch(&stx, 1, false)
		if e != nil {
			break
		}

		rdlocations.Set(stx.GetString("_id"), stx)
	}
	masters.Set("rdlocations", rdlocations)
}

func main() {
	t0 = time.Now()
	mapkeysvalue = make(map[string]float64)

	flag.IntVar(&value, "value", 0, "representation of value need to be allocation. Default is 0")
	//branch,channel,group
	flag.StringVar(&custgroup, "custgroup", "global", "group of customer. Default is global")
	//brand,group,skuid
	flag.StringVar(&prodgroup, "prodgroup", "global", "group of product. Default is global")
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.StringVar(&plcode, "plcode", "", "PL Code to take the value. Default is blank")
	flag.StringVar(&ref, "ref", "", "Reference from document or other. Default is blank")
	flag.Parse()

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)

	if plcode == "" || value == 0 {
		toolkit.Println("PLCode and Value are mandatory to fill")
		os.Exit(1)
	}

	setinitialconnection()
	defer gdrj.CloseDb()
	defer conn.Close()

	toolkit.Println("Get Data Master...")
	prepmaster()
	prepmasterclean()

	toolkit.Println("Start Data Process...")
	result := make(chan int, 12)
	for i := 1; i <= 12; i++ {
		tstart := eperiode.AddDate(0, -i, 0)
		tend := tstart.AddDate(0, 1, 0)
		toolkit.Printfn("From : %v, To : %v", tstart, tend)

		filter := dbox.And(dbox.Gte("date.date", tstart), dbox.Lt("date.date", tend))
		go workerproc(i, filter, result)
	}

	for i := 1; i <= 12; i++ {
		a := <-result
		toolkit.Printfn("Worker-%d Done Get Data in %s", a, time.Since(t0).String())
	}

	toolkit.Printfn("Preparing the data")
	mcount := len(mapkeysvalue)
	step := mcount / 100
	if step == 0 {
		step = 1
	}

	i := 0
	for k, v := range mapkeysvalue {
		i++

		akey := strings.Split(k, "_")
		tcustomer := new(gdrj.Customer)
		tproduct := new(gdrj.Product)

		if len(akey) > 2 && akey[2] != "" {
			switch custgroup {
			case "branch":
				tcustomer.BranchID = akey[2]
			case "channel":
				skey := strings.Split(akey[2], "|")
				tcustomer.BranchID = skey[0]
				if len(skey) > 1 {
					tcustomer.ChannelID = skey[1]
				}
			case "group":
				skey := strings.Split(akey[2], "|")
				tcustomer.BranchID = skey[0]
				if len(skey) > 1 {
					tcustomer.CustomerGroup = skey[1]
				}
			}
		}

		if len(akey) > 3 && akey[3] != "" {
			switch prodgroup {
			case "brand":
				tproduct.Brand = akey[3]
			case "group":
				skey := strings.Split(akey[3], "|")
				tproduct.Brand = skey[0]
				if len(skey) > 1 {
					tproduct.BrandCategoryID = skey[1]
				}
			case "skuid":
				skey := strings.Split(akey[3], "|")
				tproduct.Brand = skey[0]
				if len(skey) > 1 {
					tproduct.BrandCategoryID = skey[1]
				}
				if len(skey) > 2 {
					tproduct.ID = skey[2]
				}
			}
		}

		spl := new(gdrj.SalesPL)
		spl.Date = gdrj.SetDate(time.Date(toolkit.ToInt(akey[1], toolkit.RoundingAuto),
			time.Month(toolkit.ToInt(akey[0], toolkit.RoundingAuto)),
			1, 0, 0, 0, 0, time.UTC))
		spl.Customer = tcustomer
		spl.Product = tproduct
		spl.Source = "ADJUST"
		spl.Ref = ref

		spl.PC = new(gdrj.ProfitCenter)
		spl.CC = new(gdrj.CostCenter)

		amount := toolkit.ToFloat64(value, 6, toolkit.RoundingAuto) * (v / globalval)
		plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)

		spl.ID = toolkit.Sprintf("%v_%v_%v_%v", "ALLOCATION-SCRIPT", spl.Date.Fiscal, akey[0], akey[1])

		spl.CleanAndClasify(masters)
		spl.AddData(plcode, amount, plmodels)
		spl.CalcSum(masters)

		// gdrj.Save(spl)
		conn.NewQuery().From("salespls-1").
			Save().Exec(toolkit.M{}.Set("data", spl))

		if i%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d) in %s", i, mcount, i/step,
				time.Since(t0).String())
		}
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func workerproc(wi int, filter *dbox.Filter, result chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	csr, _ := workerconn.NewQuery().Select("date.month", "date.year", "customer", "product", "grossamount").
		From("salespls-1").
		Where(filter).
		Cursor(nil)

	defer csr.Close()

	scount := csr.Count()
	iscount := 0
	step := scount / 100

	if step == 0 {
		step = 1
	}

	for {
		iscount++
		spl := new(gdrj.SalesPL)
		e := csr.Fetch(spl, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		key := toolkit.Sprintf("%d_%d", spl.Date.Month, spl.Date.Year)
		k := ""

		if spl.Customer != nil {
			switch custgroup {
			case "branch":
				key = toolkit.Sprintf("%v_%v", key, spl.Customer.BranchID)
			case "channel":
				k = toolkit.Sprintf("%v|%v", spl.Customer.BranchID, spl.Customer.ChannelID)
				key = toolkit.Sprintf("%v_%v", key, k)
			case "group":
				k = toolkit.Sprintf("%v|%v", spl.Customer.BranchID, spl.Customer.CustomerGroup)
				key = toolkit.Sprintf("%v_%v", key, k)
			default:
				key = toolkit.Sprintf("%v_", key)
			}
		}

		if prodgroup == "skuid" && (spl.Product.ID == "" || len(spl.Product.ID) < 3) {
			continue
		}

		if spl.Product != nil {
			switch prodgroup {
			case "brand":
				key = toolkit.Sprintf("%v_%v", key, spl.Product.Brand)
			case "group":
				k = toolkit.Sprintf("%v|%v", spl.Product.Brand, spl.Product.BrandCategoryID)
				key = toolkit.Sprintf("%v_%v", key, k)
			case "skuid":
				k = toolkit.Sprintf("%v|%v|%v", spl.Product.Brand, spl.Product.BrandCategoryID, spl.Product.ID)
				key = toolkit.Sprintf("%v_%v", key, k)
			default:
				key = toolkit.Sprintf("%v_", key)
			}
		}

		mutex.Lock()
		mapkeysvalue[key] += spl.GrossAmount
		globalval += spl.GrossAmount
		mutex.Unlock()

		if iscount%step == 0 {
			toolkit.Printfn("Go %d. Processing %d of %d (%d) in %s", wi, iscount, scount, iscount/step,
				time.Since(t0).String())
		}

		if iscount == 20 {
			break
		}

	}

	result <- wi
}

// -value=-73075766282 -custgroup="channel" -prodgroup="skuid" -year=2016 -plcode="PL9" -ref="COGSMATERIALADJUST"
// -value=-66909788405 -custgroup="channel" -prodgroup="skuid" -year=2015 -plcode="PL9" -ref="COGSMATERIALADJUST"
//(66,900,693,607)(66,909,788,405)
