package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"os"
	"runtime"
	"sync"
)

var (
	countsales, icount int = 0, 0
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

	toolkit.Println("START...")

	crx, err := gdrj.Find(new(gdrj.SalesHeader), nil, nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}

	countsales = crx.Count()
	icount = 0

	iseof := false
	for !iseof {
		arrsh := []*gdrj.SalesHeader{}
		err = crx.Fetch(&arrsh, 10000, false)
		if err != nil {
			toolkit.Println("Error Found : ", err.Error())
			os.Exit(1)
		}

		if len(arrsh) < 10000 {
			iseof = false
		}

		mwg.Add(1)
		go func(garrsh []*gdrj.SalesHeader) {
			defer mwg.Done()

			for _, gv := range garrsh {
				icount += 1

				toolkit.Printfn("%d of %d data header processing", icount, countsales)

				dbfdetail := dbox.Eq("salesheaderid", gv.ID)
				gcr, err := gdrj.Find(new(gdrj.SalesDetail), dbfdetail, nil)
				if err != nil {
					toolkit.Println("Error Found : ", err.Error())
					os.Exit(1)
				}

				arrsalesdetail := []*gdrj.SalesDetail{}
				err = gcr.Fetch(&arrsalesdetail, 0, false)
				if err != nil {
					toolkit.Println("Error Found : ", err.Error())
					os.Exit(1)
				}

				var salesgrossamount float64
				for _, gxv := range arrsalesdetail {
					salesgrossamount += gxv.SalesGrossAmount
				}

				for _, gxv := range arrsalesdetail {
					xsales := new(gdrj.Sales)

					xsales.ID = toolkit.RandomString(32)
					xsales.INVID = gv.ID
					xsales.Date = gv.Date
					xsales.OutletID = gv.OutletID

					xsales.SKUID = gxv.SKUID_SAPBI
					xsales.SalesQty = gxv.SalesQty
					xsales.SalesGrossAmount = gxv.SalesGrossAmount

					xsales.SalesTaxAmount = gv.SalesTaxAmount * (gxv.SalesGrossAmount / salesgrossamount)
					xsales.SalesDiscountAmount = gv.SalesDiscountAmount * (gxv.SalesGrossAmount / salesgrossamount)

					err = gdrj.Save(xsales)
					if err != nil {
						toolkit.Println("Error Found : ", err.Error())
						os.Exit(1)
					}
				}
			}
		}(arrsh)
	}

	crx.Close()

	mwg.Wait()
	toolkit.Println("END...")
}
