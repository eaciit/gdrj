package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
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
	shs       = toolkit.M{}
	pcs       = toolkit.M{}
	ccs       = toolkit.M{}
	ledgers   = toolkit.M{}
	prods     = toolkit.M{}
	custs     = toolkit.M{}
	vdistskus = toolkit.M{}
	mapskuids = toolkit.M{}
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

	// mapskuid := new(gdrj.MappingInventory)
	// cmskuid := getCursor(mapskuid)
	// defer cmskuid.Close()
	var e error
	// for e = cmskuid.Fetch(mapskuid, 1, false); e == nil; {
	// 	mapskuids.Set(mapskuid.SKUID_VDIST, mapskuid.ID)
	// 	mapskuid = new(gdrj.MappingInventory)
	// 	e = cmskuid.Fetch(mapskuid, 1, false)
	// }

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

	sku := new(gdrj.MappingInventory)
	cskus := getCursor(sku)
	defer cskus.Close()
	for e = cskus.Fetch(sku, 1, false); e == nil; {
		vdistskus.Set(sku.SKUID_VDIST, sku.ID)
		sku = new(gdrj.MappingInventory)
		e = cskus.Fetch(sku, 1, false)
	}

	sh := new(gdrj.SalesHeader)
	cshs := getCursor(sh)
	defer cshs.Close()
	for e = cshs.Fetch(sh, 1, false); e == nil; {
		shs.Set(sh.ID, sh)
		sh = new(gdrj.SalesHeader)
		e = cshs.Fetch(sh, 1, false)
	}
}

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Reading Master")
	prepMaster()

	toolkit.Println("START...")

	//for i, src := range arrstring {
	//dbf := dbox.Contains("src", src)
	crx, err := gdrj.Find(new(gdrj.SalesDetail),
		//dbox.Eq("salesheaderid","FK/NAS/14002178"),
		nil,
		toolkit.M{}.Set("take", 10000))

	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	lastSalesLine := toolkit.M{}
	count = crx.Count()
	step := count / 100
	i := 0
	t0 := time.Now()
	for {
		i++
		sd := new(gdrj.SalesDetail)
		e := crx.Fetch(sd, 1, false)
		if e != nil {
			break
		}

		st := new(gdrj.SalesTrx)
		st.SalesHeaderID = sd.SalesHeaderID
		if lastSalesLine.Has(sd.SalesHeaderID) {
			lastLineNo := lastSalesLine.GetInt(sd.SalesHeaderID) + 1
			st.LineNo = lastLineNo
			lastSalesLine.Set(sd.SalesHeaderID, lastLineNo)
		} else {
			st.LineNo = 1
			lastSalesLine.Set(sd.SalesHeaderID, 1)
		}

		if shs.Has(sd.SalesHeaderID) {
			sho := shs.Get(sd.SalesHeaderID).(*gdrj.SalesHeader)
			sho.OutletID = strings.ToUpper(sho.OutletID)

			if sho.SalesDiscountAmount != 0 && sho.SalesGrossAmount != 0 {
				st.DiscountAmount = sd.SalesGrossAmount * sho.SalesDiscountAmount / sho.SalesGrossAmount
			}

			if sho.SalesTaxAmount != 0 && sho.SalesGrossAmount != 0 {
				st.TaxAmount = sd.SalesGrossAmount * sho.SalesTaxAmount / sho.SalesGrossAmount
			}

			st.OutletID = sho.BranchID + sho.OutletID
			st.Date = sho.Date
			st.HeaderValid = true

		} else {
			st.HeaderValid = false
		}

		st.SKUID_VDIST = sd.SKUID_VDIST
		if vdistskus.Has(sd.SKUID_VDIST) {
			st.SKUID = toolkit.ToString(vdistskus[sd.SKUID_VDIST])
		} else {
			st.SKUID = "not found"
		}

		st.SalesQty = float64(sd.SalesQty)
		st.GrossAmount = sd.SalesGrossAmount
		st.NetAmount = sd.SalesNetAmount

		if prods.Has(st.SKUID) {
			st.ProductValid = true
			st.Product = prods.Get(st.SKUID).(*gdrj.Product)
		} else {
			st.ProductValid = false
		}

		if custs.Has(st.OutletID) {
			st.CustomerValid = true
			st.Customer = custs.Get(st.OutletID).(*gdrj.Customer)
			if st.Customer.ChannelID == "I1" {
				st.CustomerValid = false
			}
		} else {
			st.CustomerValid = false
		}

		if st.ProductValid && st.CustomerValid {
			pcid := st.Customer.BranchID + st.Product.BrandCategoryID
			if pcs.Has(pcid) {
				st.PCValid = true
				st.PC = pcs.Get(pcid).(*gdrj.ProfitCenter)
			} else {
				st.PCValid = false
			}
		} else {
			st.PCValid = false
		}

		st.Src = "VDIST"

		gdrj.Save(st)
		if i > step {
			toolkit.Printfn("Processing %d of %d %s in %s",
				i, count, sd.SalesHeaderID,
				time.Since(t0).String())
			step += count / 100
		}
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}
