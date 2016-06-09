package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"strings"
	"sync"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

var mutex = new(sync.Mutex)
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

var masters = toolkit.M{}

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

	plmodel := new(gdrj.PLModel)
	cplmodel := getCursor(plmodel)
	defer cplmodel.Close()
	for e = cplmodel.Fetch(plmodel, 1, false); e == nil; {
		plmodels.Set(plmodel.ID, plmodel)
		plmodel = new(gdrj.PLModel)
		e = cplmodel.Fetch(plmodel, 1, false)
	}

	toolkit.Println("--> Brand")
	brand := new(gdrj.HBrandCategory)
	cbrand := getCursor(plmodel)
	defer cbrand.Close()
	for e = cbrand.Fetch(brand, 1, false); e == nil; {
		brands.Set(brand.ID, brand)
		brand = new(gdrj.HBrandCategory)
		e = cbrand.Fetch(brand, 1, false)
	}

	toolkit.Println("--> Sales Ratio")
	ratio := new(gdrj.SalesRatio)
	cratios := getCursor(ratio)
	defer cratios.Close()
	for {
		efetch := cratios.Fetch(ratio, 1, false)
		if efetch != nil {
			break
		}
		ratioid := toolkit.Sprintf("%d_%d_%s", ratio.Year, ratio.Month, ratio.BranchID)
		a, exist := ratios[ratioid]
		if !exist {
			a = []gdrj.SalesRatio{}
		}
		a = append(a, *ratio)
		ratio = new(gdrj.SalesRatio)
		ratios[ratioid] = a
	}
}

var pldatas = map[string]*gdrj.PLDataModel{}

func main() {
	//runtime.GOMAXPROCS(runtime.NumCPU())
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Reading Master")
	prepMaster()

	pldm := new(gdrj.PLDataModel)
	toolkit.Println("Delete existing")
	/*
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "30052016SAP_EXPORT")).Delete().Exec(nil)
	conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "31052016SAP_FREIGHT")).Delete().Exec(nil)
	conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "31052016SAP_SUSEMI")).Delete().Exec(nil)
	conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "31052016SAP_APINTRA")).Delete().Exec(nil)
	conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "30052016SAP_SGAPL")).Delete().Exec(nil)
	conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "31052016SAP_MEGASARI")).Delete().Exec(nil)
	conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "31052016SAP_SALESRD")).Delete().Exec(nil)
	conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source", "31052016SAP_DISC-RDJKT")).Delete().Exec(nil)
    */

	toolkit.Println("START...")
	crx, err := conn.NewQuery().From(pldm.TableName()).
        Group("year","period","account","busa").
        Cursor(nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
    defer crx.Close()

    count:=crx.Count()
    for i:=0
}