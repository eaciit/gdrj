package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
    "time"
	// "strings"
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
    pcs = toolkit.M{}
    ccs = toolkit.M{}
    ledgers = toolkit.M{}
    prods = toolkit.M{}
    custs = toolkit.M{}
)

func getCursor(obj orm.IModel)dbox.ICursor{
    c, e := gdrj.Find(obj,nil,nil)
    if e!=nil{
        return nil
    }
    return c
}

func prepMaster(){
    pc:=new(gdrj.ProfitCenter)
    cc:=new(gdrj.CostCenter)
    prod:=new(gdrj.Product)
    ledger:=new(gdrj.LedgerMaster)
    
    cpc := getCursor(pc)
    defer cpc.Close()
    var e error
    for e=cpc.Fetch(pc,1,false);e==nil;{
        pcs.Set(pc.ID,pc)
        pc =new(gdrj.ProfitCenter)
        e=cpc.Fetch(pc,1,false)
    }
    
    ccc:=getCursor(cc)
    defer ccc.Close()
    for e=ccc.Fetch(cc,1,false);e==nil;{
        ccs.Set(cc.ID,cc)
        cc = new(gdrj.CostCenter)
        e=ccc.Fetch(cc,1,false)
    }
    
    cprod:=getCursor(prod)
    defer cprod.Close()
    for e=cprod.Fetch(prod,1,false);e==nil;{
        prods.Set(prod.ID,prod)
        prod=new(gdrj.Product)
        e=cprod.Fetch(prod,1,false)
    }
    
    cledger:=getCursor(ledger)
    defer cledger.Close()
    for e=cledger.Fetch(ledger,1,false);e==nil;{
        ledgers.Set(ledger.ID,ledger)
        ledger=new(gdrj.LedgerMaster)
        e=cledger.Fetch(ledger,1,false)
    }
    
    cust := new(gdrj.Customer)
    ccust:=getCursor(cust)
    defer ccust.Close()
    for e=ccust.Fetch(cust,1,false);e==nil;{
        custs.Set(cust.ID,cust)
        cust=new(gdrj.Customer)
        e=ccust.Fetch(cust,1,false)
    }
}

func main() {
	//runtime.GOMAXPROCS(runtime.NumCPU())
	setinitialconnection()
	defer gdrj.CloseDb()
    
    toolkit.Println("Reading Master")
    prepMaster()
    
    toolkit.Println("START...")

	//for i, src := range arrstring {
	//dbf := dbox.Contains("src", src)
	crx, err := gdrj.Find(new(gdrj.RawDataPL), nil, toolkit.M{})
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}

    arrcount := []int{0}
	i := 0
	arrcount[i] = crx.Count()
	func(xi int, xcrx dbox.ICursor) {
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
				if v.PCID != "" && pcs.Has(v.PCID) {
					ls.PC = pcs.Get(v.PCID).(*gdrj.ProfitCenter)
				}

				ls.CCID = v.CCID
				if v.CCID != "" && ccs.Has(v.CCID) {
					ls.CC = ccs.Get(v.CCID).(*gdrj.CostCenter)
				}

				ls.OutletID = v.OutletID
				if v.OutletID != "" && custs.Has(v.OutletID) {
					ls.Customer = custs.Get(v.OutletID).(*gdrj.Customer)
                    //ls.Customer = gdrj.CustomerGetByID(v.OutletID)
				}

				ls.SKUID = v.SKUID
				if v.SKUID != "" && prods.Has(v.SKUID) {
                    ls.Product = prods.Get(v.SKUID).(*gdrj.Product)
				}

				ls.Value1 = v.AmountinIDR
				ls.Value2 = v.AmountinUSD

                tLedgerAccount := new(gdrj.LedgerMaster)
                if ledgers.Has(ls.LedgerAccount){
				    tLedgerAccount = ledgers.Get(ls.LedgerAccount).(*gdrj.LedgerMaster)
                }
				ls.PLCode = tLedgerAccount.PLCode
				ls.PLOrder = tLedgerAccount.OrderIndex
				ls.PLGroup1 = tLedgerAccount.H1
				ls.PLGroup2 = tLedgerAccount.H2
				ls.PLGroup3 = tLedgerAccount.H3
				
				ls.Date = gdrj.NewDate(ls.Year, int(ls.Month), 1)
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
	toolkit.Println("END...")
}
