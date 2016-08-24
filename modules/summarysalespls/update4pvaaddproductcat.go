package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	// "github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "strings"
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

func prepmasterproduct() {
	toolkit.Println("--> Product")
	csr, _ := conn.NewQuery().From("product").Cursor(nil)
	products := toolkit.M{}
	defer csr.Close()
	for {
		m := toolkit.M{}
		e := csr.Fetch(&m, 1, false)
		if e != nil {
			break
		}
		products.Set(m.GetString("_id"), m.GetString("brandcategoryid"))
	}
	masters.Set("products", products)
	toolkit.Println("End PL MODEL <--")
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

	prepmasterproduct()

	toolkit.Println("Start data query...")
	csr, _ := workerconn.NewQuery().Select().From("salespls-summary-4pva").Cursor(nil)
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

func workersave(wi int, jobs <-chan toolkit.M, result chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary-4pva-1.1").
		SetConfig("multiexec", true).
		Save()

	products := masters.Get("products", toolkit.M{}).(toolkit.M)

	trx := toolkit.M{}
	for trx = range jobs {

		key := trx.Get("key", toolkit.M{}).(toolkit.M)
		skuid := key.GetString("product_skuid")

		key.Set("product_brandcategoryid", products.GetString(skuid))
		trx.Set("key", key)

		err := qSave.Exec(toolkit.M{}.Set("data", trx))
		if err != nil {
			toolkit.Println(err)
		}

		result <- 1
	}
}
