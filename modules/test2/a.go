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
	plmodels = toolkit.M{}
	brands = toolkit.M{}
	ratios = map[string][]gdrj.SalesRatio{}
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

	plmodel := new(gdrj.PLModel)
	cplmodel := getCursor(plmodel)
	defer cplmodel.Close()
	for e=cplmodel.Fetch(plmodel,1,false);e==nil;{
		plmodels.Set(plmodel.ID,plmodel)
		plmodel=new(gdrj.PLModel)
		e=cplmodel.Fetch(plmodel,1,false)
	}

	toolkit.Println("--> Brand")
	brand := new(gdrj.HBrandCategory)
	cbrand := getCursor(plmodel)
	defer cbrand.Close()
	for e=cbrand.Fetch(brand,1,false);e==nil;{
		brands.Set(brand.ID,brand)
		brand=new(gdrj.HBrandCategory)
		e=cbrand.Fetch(brand,1,false)
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
		a=append(a, *ratio)
		ratio = new(gdrj.SalesRatio)
		ratios[ratioid] = a
	}
}

func main() {
	//runtime.GOMAXPROCS(runtime.NumCPU())
	setinitialconnection()
	defer gdrj.CloseDb()
    
    toolkit.Println("Reading Master")
    prepMaster()

	pldm := new(gdrj.PLDataModel)
	toolkit.Println("Delete existing")
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","30052016SAP_EXPORT")).Delete().Exec(nil)
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","31052016SAP_FREIGHT")).Delete().Exec(nil)
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","31052016SAP_SUSEMI")).Delete().Exec(nil)
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","31052016SAP_APINTRA")).Delete().Exec(nil)
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","30052016SAP_SGAPL")).Delete().Exec(nil)
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","31052016SAP_MEGASARI")).Delete().Exec(nil)
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","31052016SAP_SALESRD")).Delete().Exec(nil)
    conn.NewQuery().From(pldm.TableName()).Where(dbox.Eq("source","31052016SAP_DISC-RDJKT")).Delete().Exec(nil)
    
    toolkit.Println("START...")

	//for i, src := range arrstring {
	//dbf := dbox.Contains("src", src)
	crx, err := gdrj.Find(new(gdrj.RawDataPL), nil, toolkit.M{})
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}

    count := crx.Count()

	jobs := make(chan *gdrj.RawDataPL, count)
	result := make(chan string, count)

	for wi:=1;wi<10;wi++{
		go worker(wi, jobs, result)
	}

	t0 := time.Now()
	ci := 0
	iseof := false
	for !iseof {
		arrpl := []*gdrj.RawDataPL{}
		e := crx.Fetch(&arrpl, 1000, false)
		if e!=nil{
			iseof=true
			break
		}
		
		for _, v := range arrpl {
			jobs <- v
			ci++
		}

		toolkit.Printfn("Processing %d of %d in %s", ci, count, time.Since(t0).String())
	
		if len(arrpl) < 1000 {
			iseof = true
		}
	}

	toolkit.Println("Saving")
	step := count / 100
	limit := step
	for ri := 0; ri < count; ri++ {
		<-result
		if ri >= limit {
			toolkit.Printfn("Saving %d of %d (%dpct) in %s", ri, count, ri*100/count,
				time.Since(t0).String())
			limit += step
		}
	}
	toolkit.Printfn("Done %s", time.Since(t0).String())
}

var pldatas = map[string]*gdrj.PLDataModel{}

func worker(wi int, jobs <-chan *gdrj.RawDataPL, result chan<- string){
	workerconn, err := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

		for v:= range jobs{
			if v.Src=="31052016SAP_SALESRD" || v.Src=="31052016SAP_DISC-RDJKT" || v.Src=="" || v.AmountinIDR==0 {
				result <- "NOK"
				continue
			}
				
			tdate := time.Date(v.Year, time.Month(v.Period), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)

			ls := new(gdrj.PLDataModel)
			ls.CompanyCode = v.EntityID
			//ls.LedgerAccount = v.Account

			ls.Year = tdate.Year()
			ls.Month = int(tdate.Month())
			ls.Date = gdrj.NewDate(ls.Year, ls.Month, 1)

			ls.PCID = v.PCID
			if v.PCID != "" && pcs.Has(v.PCID) {
				ls.PC = pcs.Get(v.PCID).(*gdrj.ProfitCenter)
			}

			ls.CCID = v.CCID
			if v.CCID != "" && ccs.Has(v.CCID) {
				ls.CC = ccs.Get(v.CCID).(*gdrj.CostCenter)
			}

			ls.OutletID = v.OutletID
			if v.OutletID != "" && custs.Has(v.OutletID) {
				ls.Customer = custs.Get(v.OutletID).(*gdrj.Customer)
				//ls.Customer = gdrj.CustomerGetByID(v.OutletID)
			} else {
				c := new(gdrj.Customer)
				c.Name = v.OutletName
				c.BranchID = v.BusA
				c.ChannelID = "I3"
				c.ChannelName = "MT"
				c.CustType = "EXP"
				c.CustomerGroup = "EXP"
				c.Zone = "EXP"
				c.Region = "EXP"
				c.National = "EXP"
				c.AreaName = "EXP"
				c.CustomerGroupName = "Export"
				ls.Customer = c
			}

			ls.SKUID = v.SKUID
			if v.SKUID != "" && prods.Has(v.SKUID) {
				ls.Product = prods.Get(v.SKUID).(*gdrj.Product)
			} else if v.SKUID!="" {
				ls.Product = new(gdrj.Product)
				ls.Product.Name = v.ProductName
				ls.Product.BrandCategoryID = v.PCID[4:]
				if brands.Has(ls.Product.BrandCategoryID){
					ls.Product.Brand = brands.Get(ls.Product.BrandCategoryID).(*gdrj.HBrandCategory).BrandID
				} else {
					ls.Product.BrandCategoryID = "Common"
					ls.Product.Brand = "-"
				}
			}

			ls.Value1 = v.AmountinIDR
			//ls.Value2 = v.AmountinUSD

			tLedgerAccount := new(gdrj.LedgerMaster)
			if ledgers.Has(v.Account){
				tLedgerAccount = ledgers.Get(v.Account).(*gdrj.LedgerMaster)
			}
			if tLedgerAccount.PLCode==""{
				plm := plmodels.Get("PL34").(*gdrj.PLModel)
				ls.PLCode = plm.ID
				ls.PLOrder = plm.OrderIndex
				ls.PLGroup1 = plm.PLHeader1
				ls.PLGroup2 = plm.PLHeader2
				ls.PLGroup3 = plm.PLHeader3
			} else if v.Src=="30052016SAP_EXPORT"{
				plm := plmodels.Get("PL6").(*gdrj.PLModel)
				ls.PLCode = plm.ID
				ls.PLOrder = plm.OrderIndex
				ls.PLGroup1 = plm.PLHeader1
				ls.PLGroup2 = plm.PLHeader2
				ls.PLGroup3 = plm.PLHeader3
			} else  {
				ls.PLCode = tLedgerAccount.PLCode
				ls.PLOrder = tLedgerAccount.OrderIndex
				ls.PLGroup1 = tLedgerAccount.H1
				ls.PLGroup2 = tLedgerAccount.H2
				ls.PLGroup3 = tLedgerAccount.H3
			}
			
			ls.Date = gdrj.NewDate(ls.Year, int(ls.Month), 1)
			
			sources := strings.Split(v.Src,"_")
			if len(sources)==1{
				ls.Source = sources[1]
			} else if len(sources)>1{
				ls.Source = sources[1]
			} else {
				ls.Source="OTHER"
			}

			rs := []gdrj.SalesRatio{}
			if v.Src!="30052016SAP_EXPORT"{
				srid := toolkit.Sprintf("%d_%d_%s", ls.Year, ls.Month, ls.Customer.BranchID)
				a, exists := ratios[srid]
				if exists{
					rs=a
				}
			}

			if len(rs)==0{
				r := new(gdrj.SalesRatio)
				r.Year = ls.Year
				r.Month = ls.Month
				r.Ratio = 1
				rs = append(rs, *r)
			}

			total := float64(0)
			for _, r := range rs{
				total += r.Ratio
			}

			for _, r := range rs{
				lsexist := false
				rls := new(gdrj.PLDataModel)
				*rls = *ls
				rls.OutletID = r.OutletID
				rls.SKUID = r.SKUID 
				rls.ID = rls.PrepareID().(string)
				rls, lsexist = pldatas[rls.ID]
				multiplier:=float64(1)
				if v.Src!="30052016SAP_EXPORT"{
					multiplier=-1
				}
				
				if !lsexist{
					//-- need to grand rls again
					rls = new(gdrj.PLDataModel)
					*rls = *ls
					rls.OutletID = r.OutletID
					rls.SKUID = r.SKUID 
					rls.ID = rls.PrepareID().(string)
					//-- end

					//-- get existing values
					els := new(gdrj.PLDataModel)
					cls,_ := workerconn.NewQuery().From(ls.TableName()).
						Where(dbox.Eq("_id",rls.ID)).Cursor(nil)
					ecls:=cls.Fetch(els,1,false)
					if ecls==nil{
						rls.Value1=els.Value1
					}
					cls.Close()
				} 
				
				rls.Value1 += ls.Value1 * r.Ratio/total * multiplier
				err = workerconn.NewQuery().From(ls.TableName()).Save().Exec(toolkit.M{}.Set("data",rls))
				if err != nil {
					toolkit.Println("Error Found : ", err.Error())
					os.Exit(1)
				}
				pldatas[rls.ID]=rls
			}
			result <- "OK"
		}
}
