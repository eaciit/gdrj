package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
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
	iscount = 0
	step := scount / 100

	for {
		iscount++
		spl := new(gdrj.SalesPL)
		e := c.Fetch(spl, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		for k, v := range spl.PLDatas {
			data[k] += v.Amount
		}

		if iscount > step {
			step += scount / 100
			toolkit.Printfn("Processing %d of %d in %s", iscount, scount,
				time.Since(t0).String())
		}

	}

	for k, v := range data {
		toolkit.Printfn("%s,%v", k, v)
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}
