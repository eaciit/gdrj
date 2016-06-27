package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"sync"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0         time.Time
	fiscalyear int
	data       map[string]float64
	mutex      = &sync.Mutex{}
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

func main() {
	t0 = time.Now()
	data = make(map[string]float64)
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.Parse()

	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Start data query...")

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	// speriode := eperiode.AddDate(-1, 0, 0)

	// filter := dbox.And(dbox.Gte("date.date", speriode), dbox.Lt("date.date", eperiode))
	// csr, _ := conn.NewQuery().Select("date.fiscal", "pldatas").From("salespls-1").Where(filter).Cursor(nil)
	// defer csr.Close()

	result := make(chan int, 12)
	for i := 1; i <= 12; i++ {
		tstart := eperiode.AddDate(0, -i, 0)
		tend := tstart.AddDate(0, 1, 0)
		toolkit.Sprintf("From : %v, To : %v", tstart, tend)

		filter := dbox.And(dbox.Gte("date.date", tstart), dbox.Lt("date.date", tend))
		go workerproc(i, filter, result)
	}

	for i := 1; i <= 12; i++ {
		a := <-result
		toolkit.Sprintf("Worker-%d Done in %s", a, time.Since(t0).String())
	}

	for k, v := range data {
		toolkit.Printfn("%s,%v", k, v)
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func workerproc(wi int, filter *dbox.Filter, result chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	csr, _ := workerconn.NewQuery().Select("date.fiscal", "pldatas").From("salespls-1").Where(filter).Cursor(nil)
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

		fiscal := spl.Date.Fiscal
		for k, v := range spl.PLDatas {
			key := toolkit.Sprintf("%s_%s", fiscal, k)
			mutex.Lock()
			data[key] += v.Amount
			mutex.Unlock()
		}

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
