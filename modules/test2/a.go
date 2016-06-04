package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	"runtime"

	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	// "strings"
	"sync"
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
	// arrstring = []string{"SAP_SGAPL", "SAP_APINTRA", "SAP_MEGASARI", "SAP_SUSEMI", "SAP_DISC-RDJKT", "SAP_FREIGHT", "SAP_SALESRD"}
	arrstring = []string{"SAP_APINTRA", "SAP_MEGASARI", "SAP_SUSEMI", "SAP_DISC-RDJKT", "SAP_FREIGHT", "SAP_SALESRD"}
	arrcount  = []int{0, 0, 0, 0, 0, 0, 0, 0}
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	var mwg sync.WaitGroup
	setinitialconnection()
	// defer gdrj.CloseDb()
	// tkmmap := toolkit.M{}

	toolkit.Println("START...")

	//for i, src := range arrstring {
	//dbf := dbox.Contains("src", src)
	crx, err := gdrj.Find(new(gdrj.RawDataPL), nil, nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}

	i := 0
	arrcount[i] = crx.Count()
	mwg.Add(1)
	func(xi int, xcrx dbox.ICursor) {
		defer mwg.Done()
		ci := 0
		iseof := false
		for !iseof {
			arrpl := []*gdrj.RawDataPL{}
			_ = xcrx.Fetch(&arrpl, 1000, false)

			if len(arrpl) < 1000 {
				iseof = true
			}

			for _, v := range arrpl {
				tdate := time.Date(v.Year, time.Month(v.Period), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)

				ls := new(gdrj.LedgerSummary)
				ls.CompanyCode = v.EntityID
				ls.LedgerAccount = v.Account

				ls.Year = tdate.Year()
				ls.Month = tdate.Month()
				ls.Date = &gdrj.Date{
					Month: tdate.Month(),
					Year:  tdate.Year()}

				ls.PCID = v.PCID
				if v.PCID != "" {
					ls.PC = gdrj.ProfitCenterGetByID(v.PCID)
				}

				ls.CCID = v.CCID
				if v.CCID != "" {
					ls.CC = gdrj.CostCenterGetByID(v.CCID)
				}

				ls.OutletID = v.OutletID
				if v.OutletID != "" {
					ls.Customer = gdrj.CustomerGetByID(v.OutletID)
				}

				ls.SKUID = v.SKUID
				if v.SKUID != "" {
					ls.Product = gdrj.ProductGetBySKUID(v.SKUID)
				}

				ls.Value1 = v.AmountinIDR
				ls.Value2 = v.AmountinUSD

				tLedgerAccount := gdrj.LedgerMasterGetByID(ls.LedgerAccount)

				ls.PLCode = tLedgerAccount.PLCode
				ls.PLOrder = tLedgerAccount.OrderIndex

				ls.ID = ls.PrepareID().(string)
				err = gdrj.Save(ls)
				if err != nil {
					toolkit.Println("Error Found : ", err.Error())
					os.Exit(1)
				}

				ci++
			}

			toolkit.Printfn("%d of %d Processed", ci, arrcount[xi])
		}

	}(i, crx)

	mwg.Wait()
	toolkit.Println("END...")
}
