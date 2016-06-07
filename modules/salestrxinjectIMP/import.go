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
	prods     = toolkit.M{}
	custs     = toolkit.M{}
	vdistskus = toolkit.M{}
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
	prod := new(gdrj.Product)

	cpc := getCursor(pc)
	defer cpc.Close()
	var e error
	for e = cpc.Fetch(pc, 1, false); e == nil; {
		pcs.Set(pc.ID, pc)
		pc = new(gdrj.ProfitCenter)
		e = cpc.Fetch(pc, 1, false)
	}

	cprod := getCursor(prod)
	defer cprod.Close()
	for e = cprod.Fetch(prod, 1, false); e == nil; {
		prods.Set(prod.ID, prod)
		prod = new(gdrj.Product)
		e = cprod.Fetch(prod, 1, false)
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
		//sh.SalesGrossAmount=0
		//sh.SalesNetAmount=0
		//sh.SalesLine=0
		shs.Set(sh.ID, sh)
		sh = new(gdrj.SalesHeader)
		e = cshs.Fetch(sh, 1, false)
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
	crx, err := conn.NewQuery().From("rawsalesdetail_import").Cursor(nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	lastSalesLine := toolkit.M{}
	count = crx.Count()
	i := 0
	t0 := time.Now()
	for {
		i++
		detail := toolkit.M{}
		e := crx.Fetch(&detail, 1, false)
		if e != nil {
			break
		}

		st := new(gdrj.SalesTrx)
		st.SalesHeaderID = detail.GetString("SalesheaderID")
		if lastSalesLine.Has(detail.GetString("SalesheaderID")) {
			lastLineNo := lastSalesLine.GetInt(detail.GetString("SalesheaderID")) + 1
			st.LineNo = lastLineNo
			lastSalesLine.Set(detail.GetString("SalesheaderID"), lastLineNo)
		} else {
			st.LineNo = 1
			lastSalesLine.Set(detail.GetString("SalesheaderID"), 1)
		}
		if shs.Has(detail.GetString("SalesheaderID")) {
			sho := shs.Get(detail.GetString("SalesheaderID")).(*gdrj.SalesHeader)
			sho.OutletID = strings.ToUpper(sho.OutletID)
			if sho.SalesDiscountAmount != 0 && sho.SalesGrossAmount != 0 {
				st.DiscountAmount = detail.GetFloat64("SalesGrossAmount") * sho.SalesDiscountAmount / sho.SalesGrossAmount
			}
			if sho.SalesTaxAmount != 0 && sho.SalesGrossAmount != 0 {
				st.TaxAmount = detail.GetFloat64("SalesGrossAmount") * sho.SalesTaxAmount / sho.SalesGrossAmount
			}
			st.OutletID = sho.BranchID + sho.OutletID
			st.Date = sho.Date
			st.HeaderValid = true
		} else {
			st.HeaderValid = false
		}
		skuid := toolkit.ToString(detail.GetInt("SKUID_VDIST"))
		if !vdistskus.Has(skuid) {
			st.SKUID = ""
		} else {
			st.SKUID = vdistskus.GetString(skuid)
		}
		st.SKUID_VDIST = skuid
		st.SalesQty = detail.GetFloat64("SalesQty")
		st.GrossAmount = detail.GetFloat64("SalesGrossAmount")
		st.NetAmount = detail.GetFloat64("SalesNetAmount")

		if prods.Has(st.SKUID) {
			st.ProductValid = true
			st.Product = prods.Get(st.SKUID).(*gdrj.Product)
		} else {
			st.ProductValid = false
		}

		if custs.Has(st.OutletID) {
			st.CustomerValid = true
			st.Customer = custs.Get(st.OutletID).(*gdrj.Customer)
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

		gdrj.Save(st)
		toolkit.Printfn("Processing %d of %d %s in %s",
			i, count, detail.GetString("SalesheaderID"),
			time.Since(t0).String())
	}
}
