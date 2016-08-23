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
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
	masters                     = toolkit.M{}
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

func prepmastercalc() {
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
	toolkit.Println("--> End PL MODEL")
}

func getstep(count int) int {
	v := count / 100
	if v == 0 {
		return 1
	}
	return v
}

func main() {
	t0 = time.Now()
	data = make(map[string]float64)
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.Parse()

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	setinitialconnection()
	defer gdrj.CloseDb()

	prepmastercalc()

	toolkit.Println("Start data query...")
	csr, _ := workerconn.NewQuery().Select().From("salespls-summary-4pva-out").Cursor(nil)
	defer csr.Close()

	scount = csr.Count()

	jobs := make(chan toolkit.M, scount)
	result := make(chan int, scount)
	for wi := 0; wi < 10; wi++ {
		go workersave(wi, jobs, result)
	}

	iscount = 0
	step := getstep(scount) * 10

	for {
		iscount++
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		jobs <- tkm

		if iscount%step == 0 {
			toolkit.Printfn("Sending %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
				time.Since(t0).String())
		}

	}

	close(jobs)

	for ri := 0; ri < scount; ri++ {
		<-result

		if ri%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				ri, scount, ri*100/scount, time.Since(t0).String())
		}
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func CalcSum(tkm toolkit.M) {
	gdrj.CalcSum(tkm, masters)
}

func CalcSalesVDist20142015(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("trxsrc") != "VDIST" || dtkm.GetString("date_fiscal") != "2014-2015" {
		return
	}

	netsales := tkm.GetFloat64("PL8A") - tkm.GetFloat64("PL7") - tkm.GetFloat64("PL8")

	if dtkm.GetString("customer_channelid") == "I1" {
		v := tkm.GetFloat64("discountamount")
		tkm.Set("PL8", -v)
	} else {
		v := tkm.GetFloat64("discountamount")
		tkm.Set("PL7", -v)
	}

	netsales = netsales + tkm.GetFloat64("PL7") + tkm.GetFloat64("PL8")
	tkm.Set("PL8A", netsales)

}

func workersave(wi int, jobs <-chan toolkit.M, result chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary-4pva-out-1.0").
		SetConfig("multiexec", true).
		Save()

	trx := toolkit.M{}
	for trx = range jobs {

		key := trx.Get("_id", toolkit.M{}).(toolkit.M)
		trx.Set("key", key)

		id := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
			key.GetString("date_fiscal"), key.GetInt("date_month"), key.GetInt("date_year"),
			key.GetString("customer_customerid"), key.GetString("customer_branchid"), key.GetString("customer_branchname"),
			key.GetString("customer_channelid"), key.GetString("customer_custtype"), key.GetString("customer_reportsubchannel"),
			key.GetString("customer_channelname"), key.GetString("customer_reportchannel"), key.GetString("customer_keyaccount"),
			key.GetString("customer_customergroupname"), key.GetString("customer_customergroup"), key.GetString("customer_areaname"),
			key.GetString("customer_region"), key.GetString("customer_zone"),
			key.GetString("product_brand"), key.GetString("product_skuid"), key.GetString("product_name"),
			key.GetString("trxsrc"), key.GetString("source"), key.GetString("ref")) //customer_customerid

		trx.Set("_id", id)

		CalcSalesVDist20142015(trx)
		CalcSum(trx)

		dkey := trx.Get("key", toolkit.M{}).(toolkit.M)
		if dkey.GetString("customer_channelid") != "I1" && dkey.GetString("customer_channelid") != "EXP" {
			err := qSave.Exec(toolkit.M{}.Set("data", trx))
			if err != nil {
				toolkit.Println(err)
			}
		}

		result <- 1
	}
}
