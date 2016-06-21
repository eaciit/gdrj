package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
	"sync"
	"time"
)

var conn dbox.IConnection
var count, step, fiscalyear int
var vdistdetail string
var vdistheader string
var mutex *sync.Mutex
var eperiode, speriode time.Time
var ggrossamount, cggrossamount float64

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
	shs           = toolkit.M{}
	shs11         = toolkit.M{}
	sgrossamount  = toolkit.M{}
	pcs           = toolkit.M{}
	ccs           = toolkit.M{}
	ledgers       = toolkit.M{}
	prods         = toolkit.M{}
	custs         = toolkit.M{}
	vdistskus     = toolkit.M{}
	mapskuids     = toolkit.M{}
	lastSalesLine = toolkit.M{}
)

var mwg sync.WaitGroup

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

	sku := new(gdrj.MappingInventory)
	cskus := getCursor(sku)
	defer cskus.Close()
	for e = cskus.Fetch(sku, 1, false); e == nil; {
		vdistskus.Set(sku.SKUID_VDIST, sku.ID)
		sku = new(gdrj.MappingInventory)
		e = cskus.Fetch(sku, 1, false)
	}

	// sh := new(gdrj.SalesHeader)
	// filter := dbox.And(dbox.Gte("date", speriode), dbox.Lt("date", eperiode))
	// filter = nil

	// cshs, _ := gdrj.Find(sh,
	// 	filter,
	// 	toolkit.M{})
	// defer cshs.Close()
	// for e = cshs.Fetch(sh, 1, false); e == nil; {
	// 	shs.Set(sh.ID, sh)
	// 	sh = new(gdrj.SalesHeader)
	// 	e = cshs.Fetch(sh, 1, false)
	// }

	conn, _ := modules.GetDboxIConnection("db_godrej")
	// crsh, _ := conn.NewQuery().Select().From("rawsalesheader-1415").Cursor(nil)
	// crsh11, _ := conn.NewQuery().Select().From("rawsalesheader-cd11").Cursor(nil)
	cgross, _ := conn.NewQuery().Select().From("rawsalesdetail1415-grosstot").Cursor(nil)
	// defer crsh.Close()
	// defer crsh11.Close()
	defer cgross.Close()
	defer conn.Close()

	// for {
	// 	tkmcrsh := new(toolkit.M)
	// 	e := crsh.Fetch(tkmcrsh, 1, false)
	// 	if e != nil {
	// 		break
	// 	}

	// 	ivid := toolkit.Sprintf("%s_%s", tkmcrsh.Get("iv_no", ""), tkmcrsh.Get("branchid", ""))
	// 	if ivid != "" {
	// 		shs.Set(ivid, tkmcrsh)
	// 	}
	// }

	// for {
	// 	tkmcrsh := new(toolkit.M)
	// 	e := crsh11.Fetch(tkmcrsh, 1, false)
	// 	if e != nil {
	// 		break
	// 	}

	// 	ivid := toolkit.Sprintf("%s_%s", tkmcrsh.Get("_id", ""), tkmcrsh.Get("branchid", ""))
	// 	if ivid != "" {
	// 		shs11.Set(ivid, tkmcrsh)
	// 	}
	// }

	for {
		// _id,
		tkmcrsh := new(toolkit.M)
		e := cgross.Fetch(tkmcrsh, 1, false)
		if e != nil {
			break
		}

		ivid := toolkit.Sprintf("%s_%s", tkmcrsh.Get("_id", ""), tkmcrsh.Get("branchid", ""))
		if ivid != "" {
			sgrossamount.Set(ivid, toolkit.ToFloat64(tkmcrsh.Get("salesgrossamount", 0), 6, toolkit.RoundingAuto))
		}
	}
}

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()
	mutex = &sync.Mutex{}

	flag.StringVar(&vdistdetail, "vdistdetail", "rawsalesdetail1415_rev", "vdistdetail representation of collection vdist detail that want to be processed. Default is blank")
	flag.IntVar(&fiscalyear, "year", 2015, "fiscal year to process. Default is 2015")
	flag.Parse()

	// if vdistdetail == "" {
	// 	toolkit.Println("VDist detail collection need to be fill,")
	// 	os.Exit(1)
	// }

	eperiode = time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode = eperiode.AddDate(-1, 0, 0)

	toolkit.Println("Reading Master")
	prepMaster()

	toolkit.Println("START...")

	conn, _ := modules.GetDboxIConnection("db_godrej")
	// filter := dbox.Eq("iv_no", "FK/IGA/14001247")
	crx, _ := conn.NewQuery().Select().From(vdistdetail).Cursor(nil)
	defer crx.Close()
	defer conn.Close()

	lastSalesLine = toolkit.M{}
	count = crx.Count()
	step = count / 100
	i := 0

	jobs := make(chan *gdrj.SalesTrx, count)
	result := make(chan string, count)
	for wi := 0; wi < 10; wi++ {
		mwg.Add(1)
		go workerProc(wi, jobs, result)
	}

	t0 := time.Now()
	for {
		i++
		tkmsd := new(toolkit.M)
		e := crx.Fetch(&tkmsd, 1, false)
		if e != nil {
			break
		}

		gdrjdate := new(gdrj.Date)
		st := new(gdrj.SalesTrx)

		st.SalesHeaderID = toolkit.Sprintf("%s_%s", tkmsd.Get("iv_no", ""), tkmsd.Get("brsap", ""))

		if st.SalesHeaderID == "" {
			st.SalesHeaderID = "OTHER/03/2016_CD00"
		}

		if lastSalesLine.Has(st.SalesHeaderID) {
			lastLineNo := lastSalesLine.GetInt(st.SalesHeaderID) + 1
			st.LineNo = lastLineNo
			lastSalesLine.Set(st.SalesHeaderID, lastLineNo)
		} else {
			st.LineNo = 1
			lastSalesLine.Set(st.SalesHeaderID, 1)
		}

		dgrossamount := toolkit.ToFloat64(tkmsd.Get("gross", 0), 6, toolkit.RoundingAuto)
		ggrossamount += dgrossamount

		asgrossamount := toolkit.ToFloat64(sgrossamount.Get(st.SalesHeaderID, ""), 6, toolkit.RoundingAuto)

		st.HeaderValid = true
		st.OutletID = toolkit.Sprintf("%s%s", tkmsd.Get("brsap", ""), strings.ToUpper(tkmsd.Get("outletid", "").(string)))

		ddisc := toolkit.ToFloat64(tkmsd.Get("disc", 0), 6, toolkit.RoundingAuto)
		if ddisc != 0 && asgrossamount != 0 {
			st.DiscountAmount = dgrossamount * ddisc / asgrossamount
		}

		dvppn := toolkit.ToFloat64(tkmsd.Get("ivppn", 0), 6, toolkit.RoundingAuto)
		if dvppn != 0 && asgrossamount != 0 {
			st.TaxAmount = dgrossamount * dvppn / asgrossamount
		}

		yr := toolkit.ToInt(tkmsd.Get("year", ""), toolkit.RoundingAuto)
		month := toolkit.ToInt(tkmsd.Get("month", ""), toolkit.RoundingAuto)
		day := toolkit.ToInt(tkmsd.Get("day", ""), toolkit.RoundingAuto)
		st.Date = time.Date(yr, time.Month(month), day, 0, 0, 0, 0, time.UTC)

		// if shs.Has(st.SalesHeaderID) {
		// 	sho := shs.Get(st.SalesHeaderID).(*toolkit.M)
		// 	st.OutletID = strings.ToUpper(toolkit.ToString(sho.Get("outletid", "")))

		// 	ddisc := toolkit.ToFloat64(sho.Get("disc", 0), 6, toolkit.RoundingAuto)
		// 	if ddisc != 0 && asgrossamount != 0 {
		// 		st.DiscountAmount = dgrossamount * ddisc / asgrossamount
		// 	}

		// 	dvppn := toolkit.ToFloat64(sho.Get("ivppn", 0), 6, toolkit.RoundingAuto)
		// 	if dvppn != 0 && asgrossamount != 0 {
		// 		st.TaxAmount = dgrossamount * dvppn / asgrossamount
		// 	}

		// 	st.OutletID = toolkit.ToString(sho.Get("branchid", "")) + st.OutletID
		// 	yr := toolkit.ToInt(sho.Get("year", ""), toolkit.RoundingAuto)
		// 	month := toolkit.ToInt(sho.Get("month", ""), toolkit.RoundingAuto)
		// 	st.Date = time.Date(yr, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		// }

		if st.Date.IsZero() {
			st.Date = time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
		}

		gdrjdate = gdrj.SetDate(st.Date)
		st.Year = gdrjdate.Year
		st.Month = int(gdrjdate.Month)
		st.Fiscal = gdrjdate.Fiscal

		//brsap,iv_no,dtsales,inv_no,qty,price,gross,net
		st.SKUID_VDIST = toolkit.ToString(tkmsd.Get("inv_no", ""))
		if vdistskus.Has(st.SKUID_VDIST) {
			st.SKUID = toolkit.ToString(vdistskus[st.SKUID_VDIST])
		} else {
			st.SKUID = "not found"
		}

		st.SalesQty = toolkit.ToFloat64(tkmsd.Get("qty", 0), 6, toolkit.RoundingAuto)
		st.GrossAmount = dgrossamount
		st.NetAmount = toolkit.ToFloat64(tkmsd.Get("net", 0), 6, toolkit.RoundingAuto)

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

		if st.CustomerValid && st.HeaderValid {
			cggrossamount += st.GrossAmount
		}

		st.Src = "VDIST"
		st.ID = toolkit.Sprintf("VDIST/2015-2014/%v_%d", st.SalesHeaderID, st.LineNo)

		//////////////////////////////////////////////

		jobs <- st
		// gdrj.Save(st)
		if step == 0 {
			step = 100
		}

		if i%step == 0 {
			toolkit.Printfn("Processing %d of %d (%d) in %s",
				i, count, i/step,
				time.Since(t0).String())
		}
	}

	close(jobs)

	for ri := 0; ri < i; ri++ {
		ri++
		<-result
		if step == 0 {
			step = 100
		}

		if ri%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				ri, count, ri/step, time.Since(t0).String())
		}
	}

	mwg.Wait()

	toolkit.Printfn("Processing done in %s with gross %v and correct %v",
		time.Since(t0).String(), ggrossamount, cggrossamount)
}

func workerProc(wi int, jobs <-chan *gdrj.SalesTrx, result chan<- string) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()
	defer mwg.Done()

	st := new(gdrj.SalesTrx)
	for st = range jobs {

		tablename := toolkit.Sprintf("%v-1", st.TableName())

		workerconn.NewQuery().From(tablename).
			Save().Exec(toolkit.M{}.Set("data", st))

		result <- st.ID
	}

}
