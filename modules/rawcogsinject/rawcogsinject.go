package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"sync"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

var conn dbox.IConnection
var count int
var wg *sync.WaitGroup
var mtx *sync.Mutex

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
	//ledgers = toolkit.M{}
	plmodels = toolkit.M{}
	//shs = toolkit.M{}
	pcs = toolkit.M{}
	ccs = toolkit.M{}
	prods = toolkit.M{}
	custs = toolkit.M{}
	ratios = map[string]*gdrj.SalesRatio{}
	//vdistskus = toolkit.M{}
)

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}

func prepMaster() {
	var e error
	   pc:=new(gdrj.ProfitCenter)
	   cc:=new(gdrj.CostCenter)
	   prod:=new(gdrj.Product)

	   cpc := getCursor(pc)
	   defer cpc.Close()
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

	   cust := new(gdrj.Customer)
	   ccust:=getCursor(cust)
	   defer ccust.Close()
	   for e=ccust.Fetch(cust,1,false);e==nil;{
	       custs.Set(cust.ID,cust)
	       cust=new(gdrj.Customer)
	       e=ccust.Fetch(cust,1,false)
	   }

	   /*
	   sku:=new(gdrj.MappingInventory)
	   cskus:=getCursor(sku)
	   defer cskus.Close()
	   for e=cskus.Fetch(sku,1,false);e==nil;{
	       vdistskus.Set(sku.SKUID_VDIST,sku.ID)
	       sku=new(gdrj.MappingInventory)
	       e=cskus.Fetch(sku,1,false)
	   }

	   sh := new(gdrj.SalesHeader)
	   cshs:=getCursor(sh)
	   defer cshs.Close()
	   for e=cshs.Fetch(sh,1,false);e==nil;{
	       //sh.SalesGrossAmount=0
	       //sh.SalesNetAmount=0
	       //sh.SalesLine=0
	       shs.Set(sh.ID,sh)
	       sh = new(gdrj.SalesHeader)
	       e=cshs.Fetch(sh,1,false)
	   }
	   
	ledger := new(gdrj.LedgerMaster)
	cledger := getCursor(ledger)
	defer cledger.Close()
	for e = cledger.Fetch(ledger, 1, false); e == nil; {
		ledgers.Set(ledger.ID, ledger)
		ledger = new(gdrj.LedgerMaster)
		e = cledger.Fetch(ledger, 1, false)
	}
	*/

	plmodel := new(gdrj.PLModel)
	cplmodel := getCursor(plmodel)
	defer cplmodel.Close()
	bmodels := []gdrj.PLModel{}
	cplmodel.Fetch(&bmodels,0,false)
	for _, plm := range bmodels{
		plmodels.Set(plm.ID, plm)
	}

	ratio := new(gdrj.SalesRatio)
	cratios := getCursor(ratio)
	defer cratios.Close()
	for{
		efetch := cratios.Fetch(ratio,1,false)
		if efetch!=nil{
			break
		}
		ratios[ratio.ID]=ratio
		ratio = new(gdrj.SalesRatio)
	}
}

type cogs struct{
	Year, Month int
	SKUID string
	COGS, RM, Labour, Energy, OtherCost, FixedCost, Depreciation float64 
}

func (cogs *cogs) ID() string{
	return toolkit.Sprintf("%d_%d_%s",
		cogs.Year, cogs.Month,
		cogs.SKUID)
}

//var cogss = map[string]*cogs{}
func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Reading Master")
	prepMaster()

	toolkit.Printfn("Delete existing")
	conn.NewQuery().From(new(gdrj.PLDataModel).TableName()).Where(dbox.Eq("source", "COGS")).Delete().Exec(nil)

	toolkit.Println("START...")
	crx, err := conn.NewQuery().From("cogs_import").
		Take(100000).
		Cursor(nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count := crx.Count()
	jobs := make(chan cogs, count)
	result := make(chan string, count)

	i := 0
	step := count / 100
	limit := step
	t0 := time.Now()
	for {
		//st := new(gdrj.SalesTrx)
		acogs := []cogs{}
		err = crx.Fetch(&acogs, 1000, false)
		if err != nil {
			toolkit.Printfn("Exit loop: %s", err.Error())
			break
		}

		if len(acogs) > 0 {
			for _, cogs := range acogs{
				i++
				jobs <- cogs
			}
		}

		if i >= limit{
			toolkit.Printfn("Calc %d of %d (%dpct) in %s", i, count, i*100/count,
				time.Since(t0).String())
			limit +=step
		}

		if len(acogs)<1000{
			break
		}
	}
	close(jobs)

	limit = step
	for ri := 0; ri < count; ri++ {
		<-result
		if ri >= limit{
			toolkit.Printfn("Saving %d of %d (%dpct) in %s", ri, count, ri*100/count,
				time.Since(t0).String())
			limit +=step
		}
	}
	toolkit.Printfn("Done %s", time.Since(t0).String())
}

func worker(wi int, jobs <-chan *cogs, r chan<- string) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

	for m := range jobs {
		id := m.ID()
		for _, alloc := range ratios{
			if m.Year==alloc.Year && 
				m.Month==int(alloc.Month) && 
				m.SKUID==alloc.SKUID{
					m.CreatePLModel(alloc.OutletID, alloc.Ratio, workerConn)
				}
		}
		r <- id
	}
}

func (c *cogs) CreatePLModel(outletid string, ratio float64, conn dbox.IConnection)error{
	ratio = -ratio
	if c.RM!=0{
		gdrj.GetPLModel("PL9","ID11",
			c.Year,c.Month,outletid,c.SKUID,"","",
			ratio*c.RM,0,0,"COGS",conn,
			custs,prods,pcs,ccs,plmodels,
			false,true)
	}

	if c.Labour!=0{
		gdrj.GetPLModel("PL14","ID11",
			c.Year,c.Month,outletid,c.SKUID,"","",
			ratio*c.Labour,0,0,"COGS",conn,
			custs,prods,pcs,ccs,plmodels,
			false,true)
	}

	if c.FixedCost!=0{
		gdrj.GetPLModel("PL19","ID11",
			c.Year,c.Month,outletid,c.SKUID,"","",
			ratio*c.FixedCost,0,0,"COGS",conn,
			custs,prods,pcs,ccs,plmodels,
			false,true)
	}

	if c.Energy!=0{
		gdrj.GetPLModel("PL74","ID11",
			c.Year,c.Month,outletid,c.SKUID,"","",
			ratio*c.Energy,0,0,"COGS",conn,
			custs,prods,pcs,ccs,plmodels,
			false,true)
	}

	if c.Depreciation!=0{
		gdrj.GetPLModel("PL21","ID11",
			c.Year,c.Month,outletid,c.SKUID,"","",
			ratio*c.Energy,0,0,"COGS",conn,
			custs,prods,pcs,ccs,plmodels,
			false,true)
	}

	c.OtherCost = c.COGS - c.RM - c.Labour - c.Energy - c.FixedCost - c.Depreciation
	if c.Depreciation!=0{
		gdrj.GetPLModel("PL20","ID11",
			c.Year,c.Month,outletid,c.SKUID,"","",
			ratio*c.Energy,0,0,"COGS",conn,
			custs,prods,pcs,ccs,plmodels,
			false,true)
	}

	return nil	
}