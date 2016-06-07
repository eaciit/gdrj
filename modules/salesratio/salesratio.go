package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	//"strings"
)

var conn dbox.IConnection
var count int

var (
	shs       = toolkit.M{}
	pcs       = toolkit.M{}
	ccs       = toolkit.M{}
	ledgers   = toolkit.M{}
	prods     = toolkit.M{}
	custs     = toolkit.M{}
	vdistskus = toolkit.M{}
)

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

	cpc := getCursor(pc)
	defer cpc.Close()
	var e error
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
		//sh.SalesGrossAmount=0
		//sh.SalesNetAmount=0
		//sh.SalesLine=0
		shs.Set(sh.ID, sh)
		sh = new(gdrj.SalesHeader)
		e = cshs.Fetch(sh, 1, false)
	}

}

var (
	monthly map[string]float64
	ratios  map[string]*gdrj.SalesRatio
)

func main() {
	//runtime.GOMAXPROCS(runtime.NumCPU())
	toolkit.Println("Load Master ...")
	setinitialconnection()
	defer gdrj.CloseDb()
	
	
	prepMaster()
	toolkit.Println("START...")
	crx, err := conn.NewQuery().From(new(gdrj.SalesTrx).TableName()).
		Select("outletid", "skuid", "date", "netamount").
		Where(dbox.Eq("pcvalid",true)).
		Cursor(nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count = crx.Count()
	i := 0
	t0 := time.Now()

	monthly = map[string]float64{}
	ratios = map[string]*gdrj.SalesRatio{}

	for {
		st := new(gdrj.SalesTrx)
		e := crx.Fetch(st, 1, false)
		if e != nil {
			break
		}

		ratioid := toolkit.Sprintf("%d_%d_%s_%s", st.Date.Year(), st.Date.Month(), st.OutletID, st.SKUID)
		monthid := toolkit.Sprintf("%d_%d", st.Date.Year(), st.Date.Month())

		sm, bsm := monthly[monthid]
		if !bsm {
			sm = 0
		}
		sm += st.NetAmount
		monthly[monthid] = sm

		sr, bsr := ratios[ratioid]
		if !bsr {
			sr = new(gdrj.SalesRatio)
			sr.Year = st.Date.Year()
			sr.Month = st.Date.Month()
			sr.OutletID = st.OutletID
			sr.SKUID = st.SKUID
			sr.BranchID = custs.Get(sr.OutletID).(*gdrj.Customer).BranchID
			sr.BrandCategoryID = prods.Get(sr.SKUID).(*gdrj.Product).BrandCategoryID
			sr.PCID = sr.BranchID + sr.BrandCategoryID
		}
		sr.Amount += st.NetAmount
		ratios[ratioid] = sr

		i++
		toolkit.Printfn("Processing %d of %d in %s",
			i, count,
			time.Since(t0).String())
	}
	
	srcount := len(ratios)
	i = 0
	for _, sr := range ratios{
		monthid := toolkit.Sprintf("%d_%d", sr.Year, sr.Month)
		total := monthly[monthid]
		sr.Ratio = sr.Amount / total
		gdrj.Save(sr)
		i++
		toolkit.Printfn("%d of %d Save %s", i, srcount, sr.ID)
	}
}
