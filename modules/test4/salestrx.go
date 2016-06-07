package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"os"
	"runtime"
	"sync"
	"time"
)

var conn dbox.IConnection

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
	pcs       = toolkit.M{}
	ccs       = toolkit.M{}
	prods     = toolkit.M{}
	custs     = toolkit.M{}
	vdistskus = toolkit.M{}
	details   = toolkit.M{}
	detailImp = toolkit.M{}
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
		e = cskus.Fetch(sku, 1, false)
	}

	detail := new(gdrj.SalesDetail)
	cdetail := getCursor(detail)
	defer cdetail.Close()
	for e = cdetail.Fetch(detail, 1, false); e == nil; {
		details.Set(detail.SalesHeaderID, detail)
		detail = new(gdrj.SalesDetail)
		e = cdetail.Fetch(detail, 1, false)
	}

	detaili := toolkit.M{}
	cdetailImp, _ := conn.NewQuery().From("rawsalesdetail_import").Cursor(nil)
	defer cdetailImp.Close()
	for e = cdetailImp.Fetch(&detaili, 1, false); e == nil; {
		detailImp.Set(detaili.GetString("SalesheaderID"), detaili)
		detaili = toolkit.M{}
		e = cdetailImp.Fetch(&detaili, 1, false)
	}

}

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Reading Master")
	prepMaster()

	toolkit.Println("START...")

	crx, err := gdrj.Find(new(gdrj.SalesHeader), dbox.Ne("outletid", ""),
		toolkit.M{})
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count := crx.Count()
	var e error
	i := 0

	t0 := time.Now()
	isneof := true
	runtime.GOMAXPROCS(runtime.NumCPU())
	var mwg sync.WaitGroup

	for isneof {
		var shs []*gdrj.SalesHeader
		e = crx.Fetch(&shs, 1000, false)
		if e != nil {
			isneof = false
			break
		}
		if len(shs) < 1000 {
			isneof = false
		}
		for _, sh := range shs {
			mwg.Add(1)
			go func(shh *gdrj.SalesHeader) {
				defer mwg.Done()
				i++
				processHeader(shh)
			}(sh)
			mwg.Wait()
		}
		toolkit.Printfn("Processing %d of %d in %s", i, count, time.Since(t0).String())
	}
	toolkit.Println("END...")
}

func processHeader(sh *gdrj.SalesHeader) {
	sds := []*gdrj.SalesDetail{}
	var sdsi []toolkit.M

	for key := range details {
		if key == sh.ID {
			sds = append(sds, details[sh.ID].(*gdrj.SalesDetail))
		}
	}
	sh.OutletID = sh.BranchID + sh.OutletID

	toolkit.Printf("Processing %s", sh.ID)
	func() {

		for key := range detailImp {
			if key == sh.ID {
				dataM, _ := toolkit.ToM(detailImp[sh.ID])
				sdsi = append(sdsi, dataM)
			}
		}

		for _, si := range sdsi {
			sd := gdrj.SalesDetail{}
			skuid := toolkit.ToString(si.GetInt("SKUID_VDIST"))
			if !vdistskus.Has(skuid) {
				sd.SKUID_SAPBI = ""
			} else {
				sd.SKUID_SAPBI = vdistskus.GetString(skuid)
			}
			sd.BranchID = si.GetString("BranchID")
			sd.SalesQty = si.GetInt("SalesQty")
			sd.Price = si.GetFloat64("Price")
			sd.SalesGrossAmount = si.GetFloat64("SalesGrossAmount")
			sd.SalesNetAmount = si.GetFloat64("SalesNetAmount")
			sds = append(sds, &sd)
		}
	}()

	totalAmount := float64(0)
	for _, sd := range sds {
		totalAmount += sd.SalesNetAmount
	}

	//-- alloc disc
	lineno := map[string]int{}

	for _, sd := range sds {
		if sh.SalesDiscountAmount != 0 {
			sd.AllocDiscAmount = sd.SalesNetAmount * sh.SalesDiscountAmount / totalAmount
		}
		if sh.SalesTaxAmount != 0 {
			sd.AllocTaxAmount = sd.SalesNetAmount * sh.SalesTaxAmount / totalAmount
		}

		salestrx := new(gdrj.SalesTrx)
		lineno[sd.SalesHeaderID] += 1

		salestrx.SalesHeaderID = sd.SalesHeaderID
		salestrx.LineNo = lineno[sd.SalesHeaderID]
		salestrx.SKUID = sd.SKUID_SAPBI
		salestrx.SKUID_VDIST = sd.SKUID_VDIST
		salestrx.OutletID = sh.OutletID
		salestrx.Date = sh.Date
		salestrx.SalesQty = toolkit.ToFloat64(sd.SalesQty, 6, toolkit.RoundingAuto)
		salestrx.GrossAmount = sd.SalesGrossAmount
		salestrx.DiscountAmount = sh.SalesDiscountAmount
		salestrx.TaxAmount = sh.SalesTaxAmount
		salestrx.NetAmount = sd.SalesNetAmount
		checkValid(salestrx)

		toolkit.Printfn("Saving %s %s %s", salestrx.SalesHeaderID, salestrx.SKUID_VDIST, salestrx.OutletID)
		gdrj.Save(salestrx)

	}
}

func checkValid(strx *gdrj.SalesTrx) {
	var (
		prod *gdrj.Product
		cust *gdrj.Customer
		pcid string
	)

	if !prods.Has(strx.SKUID) {
		strx.ProductValid = false
	} else {
		strx.ProductValid = true
		prod = prods[strx.SKUID].(*gdrj.Product)
		strx.Product = prod
	}

	if !custs.Has(strx.OutletID) {
		strx.CustomerValid = false
	} else {
		strx.CustomerValid = true
		cust = custs[strx.OutletID].(*gdrj.Customer)
		strx.Customer = cust
	}

	if strx.ProductValid && strx.CustomerValid {
		pcid = cust.BranchID + prod.BrandCategoryID
		if !pcs.Has(pcid) {
			strx.PCValid = false
		} else {
			strx.PCValid = true
			strx.PC = pcs[pcid].(*gdrj.ProfitCenter)
		}
	} else {
		strx.PCValid = false
	}
}
