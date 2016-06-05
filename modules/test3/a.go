package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
    "time"
	"strings"
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
	crx, err := gdrj.Find(new(gdrj.SalesHeader), dbox.Ne("outletid",""), 
        toolkit.M{})
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
    sds:=[]*gdrj.SalesDetail{}
    var sdsi []toolkit.M
    
    filter := dbox.Eq("salesheaderid",sh.ID)
    sh.OutletID = sh.BranchID + sh.OutletID
    crs, ecrs :=gdrj.Find(new(gdrj.SalesDetail), filter, nil)
    if ecrs!=nil{
        return
    }
    defer crs.Close()
    ecrs = crs.Fetch(&sds,0,false)
    
    toolkit.Printf("Processing %s", sh.ID)
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
            skuid := toolkit.ToString(si.GetInt("SKUID_VDIST"))
            if !vdistskus.Has(skuid){
                continue
            }
            sd.SKUID_SAPBI = vdistskus.GetString(skuid)
            sd.BranchID = si.GetString("BranchID")
            sd.SalesQty = si.GetInt("SalesQty")
            sd.Price = si.GetFloat64("Price")
            sd.SalesGrossAmount = si.GetFloat64("SalesGrossAmount")
            sd.SalesNetAmount = si.GetFloat64("SalesNetAmount")
            sds = append(sds,&sd)
        }
    }()
    
    totalAmount := float64(0)
    for _, sd := range sds{
        totalAmount += sd.SalesNetAmount
    }
    
    //-- alloc disc
    lss := map[string]*gdrj.LedgerSummary{}
    
    for _, sd := range sds{
        if sh.SalesDiscountAmount != 0 {
            sd.AllocDiscAmount = sd.SalesNetAmount * sh.SalesDiscountAmount / totalAmount
        }
        if sh.SalesTaxAmount != 0 {
            sd.AllocTaxAmount = sd.SalesNetAmount * sh.SalesTaxAmount / totalAmount
        }
        
        gdate := gdrj.NewDate(sh.Date.Year(), int(sh.Date.Month()), sh.Date.Day())
        updatels := new(gdrj.LedgerSummary)
        updatels.CompanyCode = "ID11"
        updatels.Date = gdate
        updatels.Year = gdate.Year
        updatels.Month = gdate.Month
        updatels.SKUID = sd.SKUID_SAPBI
        updatels.OutletID = sh.OutletID
        //updatels.Value1 = sd.SalesGrossAmount   
        //updatels.Value2 = float64(sd.SalesQty)
        
        lss_id_gross := toolkit.Sprintf("%d_%d_%s_%s_gross",  updatels.Year, updatels.Month, updatels.OutletID, updatels.SKUID)
        lss_id_return := toolkit.Sprintf("%d_%d_%s_%s_return",  updatels.Year, updatels.Month, updatels.OutletID, updatels.SKUID)
        lss_id_discount := toolkit.Sprintf("%d_%d_%s_%s_discount",  updatels.Year, updatels.Month, updatels.OutletID, updatels.SKUID)
        //lss_id_tax := toolkit.Sprintf("%d_%d_%s_%s_tax",  updatels.Year, updatels.Month, updatels.OutletID, updatels.SKUID)
        
        if sd.SalesGrossAmount<0{
            ls := findSales(&lss, lss_id_return, updatels)
            if ls==nil {
                continue
            }
            ls.Value1 += sd.SalesGrossAmount
            ls.Value3 += float64(sd.SalesQty)
        } else if sd.SalesGrossAmount>0 {
            ls := findSales(&lss, lss_id_gross, updatels)
            if ls==nil {
                continue
            }
            ls.Value1 += sd.SalesGrossAmount
            ls.Value3 += float64(sd.SalesQty)
        }
        
        if sd.AllocDiscAmount != 0{
            ls := findSales(&lss, lss_id_discount, updatels)
            if ls==nil {
                continue
            }
            ls.Value1 += sd.AllocDiscAmount
            ls.Value3 += float64(sd.SalesQty)
        }
        
       /* 
       if sd.AllocTaxAmount != 0{
            ls := findSales(&lss, lss_id_tax)
            ls.Value1 += sd.AllocTaxAmount
            ls.Value3 += float64(sd.SalesQty)
        }
        */
    }   
    
    for _, ls := range lss{
        toolkit.Printfn("Saving %s %s %s", ls.LedgerAccount, ls.SKUID, ls.OutletID)
        gdrj.Save(ls)
    }
    //toolkit.Printfn("%s Length: %d 5s",sh.ID,len(sds),toolkit.JsonString(lss))    
}

func findSales(lss *map[string]*gdrj.LedgerSummary, id string, defls *gdrj.LedgerSummary)*gdrj.LedgerSummary{
    var (
        ls *gdrj.LedgerSummary
        b bool
    )
    lssv := *lss
    if ls, b = lssv[id]; !b{
        var (
            prod *gdrj.Product
            cust *gdrj.Customer
            pcid string
        )
        
        if !prods.Has(defls.SKUID){
            toolkit.Printfn("Product %s is not exist", defls.SKUID)
            return nil
        }
        
        if !custs.Has(defls.OutletID){
            toolkit.Printfn("Outlet %s is not exist", defls.OutletID)
            return nil
        }
        
        prod = prods[defls.SKUID].(*gdrj.Product)
        cust = custs[defls.OutletID].(*gdrj.Customer)
        pcid = cust.BranchID + prod.BrandCategoryID
        
        lsnew := gdrj.GetLedgerSummaryByDetail(defls.LedgerAccount,pcid,"",defls.OutletID,defls.SKUID,
            defls.Year,defls.Month)
        if lsnew.ID=="" {
            ls = defls
        } else {
            ls = lsnew
        }
        
        ls.PCID = pcid
        ls.PC = pcs[ls.PCID].(*gdrj.ProfitCenter) 
        ls.Product = prod 
        ls.Customer = cust
        if strings.HasSuffix(id, "gross"){
            ls.LedgerAccount = "70000000"
        }  else if strings.HasSuffix(id, "return"){
            ls.LedgerAccount = "70000302"
        }  else if strings.HasSuffix(id, "tax"){
        } else if strings.HasSuffix(id, "discount"){
            ls.LedgerAccount = "75053730"
        }
        /*
        if !ledgers.Has(defls.LedgerAccount){
            toolkit.Printfn("Ledger %s id %s is not exist", defls.LedgerAccount, id)
            return nil
        }
        */
        ledg := ledgers.Get(ls.LedgerAccount).(*gdrj.LedgerMaster)
        ls.PLCode = ledg.PLCode
        ls.PLOrder = ledg.OrderIndex
        ls.PLGroup1 = ledg.H1
        ls.PLGroup2 = ledg.H2
        ls.PLGroup3 = ledg.H3
        lssv[id]=ls
    }
    //toolkit.Printfn("Findls: %s",toolkit.JsonString(ls))
    *lss = lssv
    return ls
}