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
	t0                                         time.Time
	fiscalyear, gscount, iscount, scount, step int
	data                                       map[string]float64
	mwg                                        sync.WaitGroup
	mutex                                      = &sync.Mutex{}
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

	filter := dbox.Eq("date.fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	c, _ := gdrj.Find(new(gdrj.SalesPL), filter, nil)
	defer c.Close()

	scount = c.Count()
	step = scount / 100

	jobs := make(chan map[string]*gdrj.PLData, count)
	toolkit.Println("Prepare Worker")
	for wi := 0; wi < 30; wi++ {
		mwg.Add(1)
		go worker(wi, jobs)
	}

	for {
		iscount++
		spl := new(gdrj.SalesPL)
		e := c.Fetch(spl, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		// for k, v := range spl.PLDatas {
		// 	data[k] += v.Amount
		// }

		jobs <- spl.PLDatas

		if iscount%step == 0 {
			toolkit.Printfn("Sending %d of %d in %s", iscount, scount,
				time.Since(t0).String())
		}

	}

	close(jobs)
	mwg.Wait()

	for k, v := range data {
		toolkit.Printfn("%s,%v", k, v)
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func worker(wi int, jobs <-chan map[string]*gdrj.PLData) {
	defer mwg.Done()
	var j map[string]*gdrj.PLData
	for j = range jobs {
		gscount++
		for k, v := range j {
			mutex.Lock()
			data[k] += v.Amount
			mutex.Unlock()
		}

		if gscount%step == 0 {
			toolkit.Printfn("Processing %d of %d in %s", gscount, scount,
				time.Since(t0).String())
		}
	}
}
