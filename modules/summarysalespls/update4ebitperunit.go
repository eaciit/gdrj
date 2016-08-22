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

	alloc = map[string]float64{
		"I1": 0.17,
		"I3": 0.51,
		"I2": 0.32,
	}
)

type sgaalloc struct {
	ChannelID                                    string
	TotalNow, TotalExpect, RatioNow, RatioExpect float64
	TotalSales                                   float64
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

func prepdatacogsfinal() {
	toolkit.Println("--> Prepare data to from salespls-summary-4cogpersku")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().From("salespls-summary-4cogpersku").Where(filter).Cursor(nil)
	defer csr.Close()

	cogsfinal := toolkit.M{}

	scount := csr.Count()
	iscount := 0
	step := getstep(scount) * 20
	t1 := time.Now()

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		cogsfinal.Set(tkm.GetString("_id"), tkm)

		iscount++
		if iscount%step == 0 {
			toolkit.Printfn("Reading %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
				time.Since(t1).String())
		}
	}

	masters.Set("cogsfinal", cogsfinal)
}

func prepdatasgafinal() {
	toolkit.Println("--> Prepare data to from salespls-summary-4cogssgafinal2")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().From("salespls-summary-4cogssgafinal2").Where(filter).Cursor(nil)
	defer csr.Close()

	sgafinal := toolkit.M{}

	scount := csr.Count()
	iscount := 0
	step := getstep(scount) * 20
	t1 := time.Now()

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		sgafinal.Set(tkm.GetString("_id"), tkm)

		iscount++
		if iscount%step == 0 {
			toolkit.Printfn("Reading %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
				time.Since(t1).String())
		}
	}

	masters.Set("sgafinal", sgafinal)
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
	prepdatacogsfinal()
	prepdatasgafinal()

	toolkit.Println("Start data query...")
	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := workerconn.NewQuery().Select().Where(filter).From("salespls-summary-4cogssga").Cursor(nil)
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

func RemapCogs(tkm toolkit.M) {

	arrpl := []string{"PL9", "PL10", "PL11", "PL12", "PL13", "PL14", "PL14A", "PL15", "PL16",
		"PL17", "PL18", "PL19", "PL20", "PL21", "PL74", "PL74A", "PL74B"}

	inlist := func(str string) bool {
		for _, v := range arrpl {
			if v == str {
				return true
			}
		}
		return false
	}

	for k, _ := range tkm {
		if inlist(k) {
			tkm.Unset(k)
		}
	}

	id := tkm.GetString("_id")
	listcogs := masters.Get("cogsfinal", toolkit.M{}).(toolkit.M)
	tkmcogs := listcogs.Get(id, toolkit.M{}).(toolkit.M)

	for k, v := range tkmcogs {
		if inlist(k) {
			tkm.Set(k, v)
		}
	}

	return
}

func RemapSga(tkm toolkit.M) {

	arrpl := []string{"PL33", "PL34", "PL35", "PL94", "PL94A"}

	inlist := func(str string) bool {
		arrstr := strings.Split(str, "_")
		for _, v := range arrpl {
			if v == arrstr[0] {
				return true
			}
		}
		return false
	}

	for k, _ := range tkm {
		if inlist(k) {
			tkm.Unset(k)
		}
	}

	id := tkm.GetString("_id")
	listsga := masters.Get("sgafinal", toolkit.M{}).(toolkit.M)
	tkmsga := listsga.Get(id, toolkit.M{}).(toolkit.M)

	for k, v := range tkmsga {
		if inlist(k) {
			tkm.Set(k, v)
		}
	}

	return
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
		From("salespls-summary-4cogssga-ebit-1.0").
		SetConfig("multiexec", true).
		Save()

	trx := toolkit.M{}
	for trx = range jobs {
		RemapCogs(trx)
		RemapSga(trx)
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
