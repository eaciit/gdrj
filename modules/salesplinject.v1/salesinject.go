package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"strings"
	"sync"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"

	"flag"
)

var mutex = new(sync.Mutex)
var conn dbox.IConnection

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

var (
	masters                                                 = toolkit.M{}
	t0                                                      time.Time
	fiscalyear                                              int
	subchannels                                             = toolkit.M{}
	customers                                               = toolkit.M{}
	branchs                                                 = toolkit.M{}
	globalgross, globalgrossvdist                           = float64(0), float64(0)
	grossbybranch, grossbybrand, grossbysku, grossbychannel = toolkit.M{}, toolkit.M{}, toolkit.M{}, toolkit.M{}
	grossbymonthvdist, grossbymonth, grossbymonthsku        = toolkit.M{}, toolkit.M{}, toolkit.M{}
	grossbymonthchannel, grossbymonthbrandchannel           = toolkit.M{}, toolkit.M{}
)

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

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj,
		nil, nil)
	//toolkit.M{}.Set("take", 10))
	if e != nil {
		return nil
	}
	return c
}

func prepmaster() {
	toolkit.Println("--> PL Model")
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

	toolkit.Println("--> Sub Channel")
	csr, _ := conn.NewQuery().From("subchannels").Cursor(nil)
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

	toolkit.Println("--> Trx Gross Proc")
	csr01, _ := conn.NewQuery().From("salestrxs-grossproc").Cursor(nil)
	defer csr01.Close()
	for {
		m := toolkit.M{}
		e := csr01.Fetch(&m, 1, false)
		if e != nil {
			break
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

func main() {

	t0 = time.Now()
	flag.IntVar(&fiscalyear, "year", 2015, "fiscal year to process. default is 2015")
	flag.Parse()

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)

	setinitialconnection()
	defer gdrj.CloseDb()

	var f *dbox.Filter
	f = dbox.And(dbox.Gte("date", speriode), dbox.Lt("date", eperiode))
	// f = dbox.Or(dbox.Eq("_id", "RD_2014_4_40007354_24260"),dbox.Eq("_id", "EXPORT_2014_4_40007767_13"),dbox.Eq("_id", "VDIST/2015-2014/FK/IPR/14003129_CD04_2"))

	toolkit.Printfn("Prepare : %v", t0)
	prepmaster()

	toolkit.Printfn("Run : %v", t0)

	c, _ := gdrj.Find(new(gdrj.SalesTrx), f, nil)
	defer c.Close()

	count := c.Count()
	jobs := make(chan *gdrj.SalesTrx, count)
	result := make(chan string, count)
	for wi := 0; wi < 10; wi++ {
		go workerproc(wi, jobs, result)
	}

	step := count / 100
	if step == 0 {
		step = 10
	}

	i := 0
	toolkit.Printfn("START ... %d records ", count)
	for {
		stx := new(gdrj.SalesTrx)
		e := c.Fetch(stx, 1, false)
		if e != nil {
			break
		}

		i++
		jobs <- stx
		if i%step == 0 {
			toolkit.Printfn("Sending %d of %d (%d) in %s",
				i, count, i/step,
				time.Since(t0).String())
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

func workerproc(wi int, jobs <-chan *gdrj.SalesTrx, result chan<- string) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	trx := new(gdrj.SalesTrx)
	for trx = range jobs {
		pl := new(gdrj.SalesPL)

		pl.ID = trx.ID
		pl.SKUID = trx.SKUID
		pl.SKUID_VDIST = trx.SKUID_VDIST
		pl.OutletID = trx.OutletID

		pl.Date = gdrj.SetDate(trx.Date)

		pl.SalesQty = trx.SalesQty
		pl.GrossAmount = trx.GrossAmount
		pl.DiscountAmount = trx.DiscountAmount
		pl.TaxAmount = trx.TaxAmount

		pl.Customer = trx.Customer
		pl.Product = trx.Product

		pl.CleanAndClasify(masters)
		// pl.RatioCalc(masters)
		RatioCalc(pl)

		pl.CalcSales(masters)
		pl.CalcSum(masters)

		tablename := toolkit.Sprintf("%v-1", pl.TableName())
		workerconn.NewQuery().From(tablename).
			Save().Exec(toolkit.M{}.Set("data", pl))

		result <- pl.ID
	}
}

func RatioCalc(pl *SalesPL) {

	pl.RatioToGlobalSales = pl.GrossAmount / masters.GetFloat64("globalgross")
	pl.RatioToGlobalSalesVdist = pl.GrossAmount / masters.GetFloat64("globalgrossvdist")
	pl.RatioToBranchSales = pl.GrossAmount / masters.GetFloat64(pl.Customer.BranchID)

	tmp := toolkit.M{}
	if pl.Product.Brand != "" && pl.Product.Brand != "Other" && masters.Has("grossbybrand") {
		tmp = masters["grossbybrand"].(toolkit.M)
		pl.RatioToBrandSales = pl.GrossAmount / tmp.GetFloat64(pl.Product.Brand)
	}

	if pl.SKUID != "" && masters.Has("grossbysku") {
		tmp = masters["grossbysku"].(toolkit.M)
		pl.RatioToSKUSales = pl.GrossAmount / tmp.GetFloat64(pl.SKUID)
	}

	if masters.Has("grossbychannel") {
		gbychannel := masters["grossbychannel"].(toolkit.M)
		pl.RatioToChannelSales = pl.GrossAmount / gbychannel.GetFloat64(pl.Customer.ChannelID)
	}

	if masters.Has("grossbymonth") {
		gdt := masters["grossbymonth"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
		pl.RatioToMonthSales = pl.GrossAmount / gdt.GetFloat64(key)
	}

	if masters.Has("grossbymonthvdist") {
		gdt := masters["grossbymonthvdist"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
		pl.RatioToMonthSalesVdist = pl.GrossAmount / gdt.GetFloat64(key)
	}

	if masters.Has("grossbymonthsku") {
		gdt := masters["grossbymonthsku"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, pl.SKUID)
		pl.RatioToMonthSKUSales = pl.GrossAmount / gdt.GetFloat64(key)
	}

	if masters.Has("grossbymonthchannel") {
		gdt := masters["grossbymonthchannel"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, pl.Customer.ChannelID)
		pl.RatioToMonthChannelSales = pl.GrossAmount / gdt.GetFloat64(key)
	}

	if masters.Has("grossbymonthbrandchannel") {
		gdt := masters["grossbymonthbrandchannel"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d_%s_%s", pl.Date.Year, pl.Date.Month, pl.Product.Brand, pl.Customer.ChannelID)
		pl.RatioToMonthChannelBrandSales = pl.GrossAmount / gdt.GetFloat64(key)
	}

	return
}
