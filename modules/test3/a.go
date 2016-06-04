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
    pcs = toolkit.M{}
    ccs = toolkit.M{}
    ledgers = toolkit.M{}
    prods = toolkit.M{}
    custs = toolkit.M{}
    vdistskus = toolkit.M{}
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
        prods.Set(ledger.ID,prod)
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
    
    sku:=new(gdrj.MappingInventory)
    cskus:=getCursor(sku)
    defer cskus.Close()
    for e=cskus.Fetch(sku,1,false);e==nil;{
        vdistskus.Set(sku.SKUID_VDIST,sku.ID)
        e=cskus.Fetch(sku,1,false)
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
	crx, err := gdrj.Find(new(gdrj.SalesHeader), nil, nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
    defer crx.Close()
    
    count := crx.Count()
    var e error
    //sd := new(gdrj.SalesDetail)
    i:=0
    
    t0 := time.Now()
    isneof:=true
    for isneof{
        var shs []gdrj.SalesHeader
        e=crx.Fetch(&shs,1000,false);
        if e!=nil{
            isneof=false
            break
        }
        if len(shs)<1000{
            isneof=false
        }
        for _, sh := range shs{
            i++
            processHeader(&sh)
        }
        toolkit.Printfn("Processing %d of %d in %s", i, count, time.Since(t0).String())
    }
	toolkit.Println("END...")
}

func processHeader(sh *gdrj.SalesHeader){
    var sds []gdrj.SalesDetail
    var sdsi []toolkit.M
    
    filter := dbox.Eq("salesheaderid",sh.ID)
    
    func(){
        crs, ecrs :=gdrj.Find(new(gdrj.SalesDetail), filter, nil)
        if ecrs!=nil{
            return
        }
        defer crs.Close()
        crs.Fetch(&sds,0,false)
    }()
    
    func(){
        filter = dbox.Eq("SalesheaderID",sh.ID)
        crs, ecrs :=conn.NewQuery().From("rawsalesdetail_import").Where(filter).Cursor(nil)
        if ecrs!=nil{
            return
        }
        defer crs.Close()
        crs.Fetch(&sdsi,0,false)
        
        for _, si := range sdsi{
            sd := gdrj.SalesDetail{}
            skuid := si.GetString("SKUID_VDIST")
            if !vdistskus.Has(skuid){
                continue
            }
            sd.SKUID_SAPBI = vdistskus.GetString(skuid)
            sd.BranchID = si.GetString("BranchID")
            sd.SalesQty = si.GetInt("SalesQty")
            sd.Price = si.GetFloat64("Price")
            sd.SalesGrossAmount = si.GetFloat64("SalesGrossAmount")
            sd.SalesNetAmount = si.GetFloat64("SalesNetAmount")
            sds = append(sds,sd)
        }
    }()
    
    totalAmount := float64(0)
    for _, sd := range sds{
        totalAmount += sd.SalesNetAmount
    }
    
    //-- alloc disc
    for _, sd := range sds{
        if sh.SalesDiscountAmount != 0 {
            sd.AllocDiscAmount = sd.SalesNetAmount * sh.SalesDiscountAmount / totalAmount
        }
        if sh.SalesTaxAmount != 0 {
            sd.AllocTaxAmount = sd.SalesNetAmount * sh.SalesTaxAmount / totalAmount
        }
    }   
}