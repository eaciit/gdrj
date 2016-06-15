package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"os"
	"runtime"
	"sync"
	"time"
)

var (
	countsales, icount, vskip int       = 0, 0, 0
	startdate                 time.Time = time.Date(2014, 4, 1, 0, 0, 0, 0, time.UTC)
	enddate                   time.Time = startdate.AddDate(1, 0, 0)
	sheaders                  toolkit.M
)

func setinitialconnection() {
	conn, err := modules.GetDboxIConnection("db_godrej")

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
	runtime.GOMAXPROCS(runtime.NumCPU())
	var mwg sync.WaitGroup
	setinitialconnection()
	defer gdrj.CloseDb()

	dconn, err := modules.GetDboxIConnection("db_godrej")

	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}

	toolkit.Println("START...")

	crx, err := gdrj.Find(new(gdrj.SalesHeader), dbox.Eq("salesgrossamount", 0), nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}

	countsales = crx.Count()

	icount = 0
	iseof := false
	for !iseof && countsales > 0 {
		// vskip += 1000

		arrsh := []*gdrj.SalesHeader{}
		err = crx.Fetch(&arrsh, 1000, false)
		if err != nil {
			toolkit.Println("Error Found : ", err.Error())
			os.Exit(1)
		}

		if len(arrsh) < 1000 {
			iseof = false
		}

		// mwg.Add(1)
		func(garrsh []*gdrj.SalesHeader) {
			// defer mwg.Done()

			for ix, gv := range garrsh {
				icount += 1

				toolkit.Printfn("%d of %d data header processing", icount, countsales)

				dbfdetail := dbox.Eq("salesheaderid", gv.ID)
				dc, err := dconn.NewQuery().Select().
					From("rawsalesdetail").
					Where(dbfdetail).
					Cursor(nil)

				if err != nil {
					toolkit.Println("Error Found : ", err.Error())
					os.Exit(1)
				}

				arrsalesdetail := []*gdrj.SalesDetail{}
				err = dc.Fetch(&arrsalesdetail, 0, true)
				if err != nil {
					toolkit.Println("Error Found : ", err.Error())
					os.Exit(1)
				}

				var salesgrossamount float64
				var salesnetamount float64
				for _, gxv := range arrsalesdetail {
					salesgrossamount += gxv.SalesGrossAmount
					salesnetamount += gxv.SalesNetAmount
				}

				gv.SalesGrossAmount = salesgrossamount
				gv.SalesNetAmount = salesnetamount

				mwg.Add(1)
				func(ggv *gdrj.SalesHeader) {
					_ = gdrj.Save(ggv)
					mwg.Done()
				}(gv)

			}
		}(arrsh)
	}

	mwg.Wait()
	crx.Close()
	toolkit.Println("END...")
}
