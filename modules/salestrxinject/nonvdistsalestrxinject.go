package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "strings"
	"time"
)

var conn dbox.IConnection
var count int

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

var (
	shs     = toolkit.M{}
	pcs     = toolkit.M{}
	ccs     = toolkit.M{}
	ledgers = toolkit.M{}
	prods   = toolkit.M{}
	custs   = toolkit.M{}
)

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}

func prepMaster() {
	pc := new(gdrj.ProfitCenter)
	cc := new(gdrj.CostCenter)
	prod := new(gdrj.Product)
	ledger := new(gdrj.LedgerMaster)

	var e error
	cpc := getCursor(pc)
	defer cpc.Close()
	for e = cpc.Fetch(pc, 1, false); e == nil; {
		pcs.Set(pc.ID, pc)
		pc = new(gdrj.ProfitCenter)
		e = cpc.Fetch(pc, 1, false)
	}

	ccc := getCursor(cc)
	defer ccc.Close()
	for e = ccc.Fetch(cc, 1, false); e == nil; {
		ccs.Set(cc.ID, cc)
		cc = new(gdrj.CostCenter)
		e = ccc.Fetch(cc, 1, false)
	}

	cprod := getCursor(prod)
	defer cprod.Close()
	for e = cprod.Fetch(prod, 1, false); e == nil; {
		prods.Set(prod.ID, prod)
		prod = new(gdrj.Product)
		e = cprod.Fetch(prod, 1, false)
	}

	cledger := getCursor(ledger)
	defer cledger.Close()
	for e = cledger.Fetch(ledger, 1, false); e == nil; {
		ledgers.Set(ledger.ID, ledger)
		ledger = new(gdrj.LedgerMaster)
		e = cledger.Fetch(ledger, 1, false)
	}

	cust := new(gdrj.Customer)
	ccust := getCursor(cust)
	defer ccust.Close()
	for e = ccust.Fetch(cust, 1, false); e == nil; {
		custs.Set(cust.ID, cust)
		cust = new(gdrj.Customer)
		e = ccust.Fetch(cust, 1, false)
	}

}

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Reading Master")
	prepMaster()

	toolkit.Println("START...")

	crx, err := gdrj.Find(new(gdrj.RawSalesExpVdist),
		nil,
		toolkit.M{})

	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count = crx.Count()
	step := count / 100
	i := 0
	t0 := time.Now()
	for {
		i++
		sev := new(gdrj.RawSalesExpVdist)
		e := crx.Fetch(sev, 1, false)
		if e != nil {
			break
		}

		st := new(gdrj.SalesTrx)
		st.SalesHeaderID = toolkit.Sprintf("%v%v", sev.ID, toolkit.RandomString(32))
		st.OutletID = sev.OutletID
		st.SKUID = sev.SKUID
		st.Fiscal = toolkit.Sprintf("%v%v", sev.Period, sev.Year)
		st.Date = time.Date(sev.Year, time.Month(sev.Period), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		st.Year = st.Date.Year()
		st.Month = int(st.Date.Month())
		st.GrossAmount = sev.Amount
		st.Src = sev.Src

		st.HeaderValid = true
		st.ProductValid = true
		st.CustomerValid = true
		st.PCValid = true

		if prods.Has(st.SKUID) {
			st.ProductValid = true
			st.Product = prods.Get(st.SKUID).(*gdrj.Product)
		} else {
			st.Product = &gdrj.Product{
				ID:              st.SKUID,
				Name:            sev.SKU_DESC,
				Brand:           "VIRTUAL",
				BrandCategoryID: "VIRTUAL",
			}
		}

		if custs.Has(st.OutletID) {
			st.CustomerValid = true
			st.Customer = custs.Get(st.OutletID).(*gdrj.Customer)
		} else if sev.Src == "RD" || sev.Src == "RD-DISC" {
			st.Customer = &gdrj.Customer{
				ID:          sev.OutletID,
				Name:        sev.OutletName,
				BranchID:    sev.BusA,
				ChannelID:   "I1",
				ChannelName: "Regional Distributor",
				CustType:    "RD",
			}
		} else if sev.Src == "EXPORT" {
			st.Customer = &gdrj.Customer{
				ID:          sev.OutletID,
				Name:        sev.OutletName,
				BranchID:    sev.BusA,
				ChannelID:   "EXP",
				ChannelName: "Export",
				CustType:    "EXP",
			}
		} else if sev.Src == "DISCOUNT" {
			st.Customer = &gdrj.Customer{
				ID:          sev.OutletID,
				Name:        sev.OutletName,
				BranchID:    sev.BusA,
				ChannelID:   "DISCOUNT",
				ChannelName: "DISCOUNT",
				CustType:    "DISCOUNT",
			}
		}

		if len(sev.PCID) > 4 {
			st.Product.BrandCategoryID = sev.PCID[4:len(sev.PCID)]
		}

		if pcs.Has(sev.PCID) {
			st.PC = pcs.Get(sev.PCID).(*gdrj.ProfitCenter)
			st.Product.Brand = st.PC.BrandID
			st.Product.BrandCategoryID = st.PC.BrandCategoryID
		} else {
			st.PC = &gdrj.ProfitCenter{
				ID: sev.PCID,
			}
		}

		gdrj.Save(st)
		if i > step {
			toolkit.Printfn("Processing %d of %d in %s",
				i, count,
				time.Since(t0).String())
			step += count / 100
		}
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}
