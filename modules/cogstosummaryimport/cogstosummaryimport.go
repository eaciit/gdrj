package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/toolkit"
	"os"
	"runtime"
	"strings"
	"time"
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

var (
	starttime      time.Time = time.Now()
	acount, icount int       = 0, 0
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	setinitialconnection()

	toolkit.Println("START...")

	crx, err := gdrj.Find(new(gdrj.COGSConsolidate), nil, nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}

	acount = crx.Count()
	icount = 0

	iseof := false
	for !iseof {
		arrcogs := []*gdrj.COGSConsolidate{}
		_ = crx.Fetch(&arrcogs, 10000, false)

		if len(arrcogs) < 10000 {
			iseof = true
		}

		for _, v := range arrcogs {
			tdate := time.Date(v.Year, time.Month(v.Month), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)

			ls := new(gdrj.LedgerSummary)
			ls.CompanyCode = "ID11"

			ls.Year = tdate.Year()
			ls.Month = tdate.Month()
			ls.Date = &gdrj.Date{
				Month: tdate.Month(),
				Year:  tdate.Year()}

			ls.SKUID = toolkit.ToString(v.SAPCode)
			if ls.SKUID != "" {
				ls.Product = gdrj.ProductGetBySKUID(ls.SKUID)
			}

			if ls.Product.PCID != "" {
				ls.PC = gdrj.ProfitCenterGetByID(ls.Product.PCID)
			}

			ls.Value1 = toolkit.ToFloat64(strings.Replace(v.COGS_Amount, ",", "", -1), 6, toolkit.RoundingAuto)

			tLedgerAccount := gdrj.LedgerMasterGetByID("75000055")
			ls.LedgerAccount = "75000055"
			ls.PLCode = tLedgerAccount.PLCode
			ls.PLOrder = tLedgerAccount.OrderIndex

			err = gdrj.Save(ls)
			if err != nil {
				toolkit.Println("Error Found : ", err.Error())
				os.Exit(1)
			}

			icount++
		}

		toolkit.Printfn("%d of %d data cogs processing in %.2f Minutes", icount, acount, time.Since(starttime).Minutes())
	}

	crx.Close()
	toolkit.Println("END...")
}
