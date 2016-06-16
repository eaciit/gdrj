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
	toolkit.Println("Total Data : ", count)
	step := count / 100
	i := 0
	t0 := time.Now()
	for {
		i++
		// sev := new(gdrj.RawSalesExpVdist)
		sev := toolkit.M{}
		e := crx.Fetch(&sev, 1, false)
		if e != nil {
			toolkit.Println("Error Found : ", e.Error())
			break
		}

		st := new(gdrj.SalesTrx)
		st.SalesHeaderID = toolkit.RandomString(32)
		st.OutletID = toolkit.ToString(sev.Get("outletid", ""))
		st.SKUID = toolkit.ToString(sev.Get("skuid", ""))
		st.Fiscal = toolkit.Sprintf("%v%v", sev.Get("period", 0), sev.Get("year", 0))
		tyear := toolkit.ToInt(sev.Get("year", 0), toolkit.RoundingAuto)
		tperiod := time.Month(toolkit.ToInt(sev.Get("period", 0), toolkit.RoundingAuto))
		st.Date = time.Date(tyear, tperiod, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		st.Year = st.Date.Year()
		st.Month = int(st.Date.Month())
		st.GrossAmount = toolkit.ToFloat64(sev.Get("amount", 0), 6, toolkit.RoundingAuto)
		st.Src = toolkit.ToString(sev.Get("src", ""))

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
				Name:            toolkit.ToString(sev.Get("sku_desc", "")),
				Brand:           "VIRTUAL",
				BrandCategoryID: "VIRTUAL",
			}
		}

		if custs.Has(st.OutletID) {
			st.CustomerValid = true
			st.Customer = custs.Get(st.OutletID).(*gdrj.Customer)
		} else if st.Src == "RD" || st.Src == "RD-DISC" {
			st.Customer = &gdrj.Customer{
				ID:          st.OutletID,
				Name:        toolkit.ToString(sev.Get("outletname", "")),
				BranchID:    toolkit.ToString(sev.Get("busa", "")),
				ChannelID:   "I1",
				ChannelName: "Regional Distributor",
				CustType:    "RD",
			}
		} else if st.Src == "EXPORT" {
			st.Customer = &gdrj.Customer{
				ID:          st.OutletID,
				Name:        toolkit.ToString(sev.Get("outletname", "")),
				BranchID:    toolkit.ToString(sev.Get("busa", "")),
				ChannelID:   "EXP",
				ChannelName: "Export",
				CustType:    "EXP",
			}
		} else if st.Src == "DISCOUNT" {
			st.Customer = &gdrj.Customer{
				ID:          st.OutletID,
				Name:        toolkit.ToString(sev.Get("outletname", "")),
				BranchID:    toolkit.ToString(sev.Get("busa", "")),
				ChannelID:   "DISCOUNT",
				ChannelName: "DISCOUNT",
				CustType:    "DISCOUNT",
			}
		}

		tpcid := toolkit.ToString(sev.Get("pcid", ""))
		if len(tpcid) > 4 {
			st.Product.BrandCategoryID = tpcid[4:len(tpcid)]
		}

		if pcs.Has(tpcid) {
			st.PC = pcs.Get(tpcid).(*gdrj.ProfitCenter)
			st.Product.Brand = st.PC.BrandID
			st.Product.BrandCategoryID = st.PC.BrandCategoryID
		} else {
			st.PC = &gdrj.ProfitCenter{
				ID: tpcid,
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
