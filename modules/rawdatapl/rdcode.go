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
	"gopkg.in/mgo.v2/bson"
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

type alloc struct {
	Total  float64
	Ratios []*gdrj.SalesRatio
}

var (
	//ledgers = toolkit.M{}
	plmodels = toolkit.M{}
	pcs      = toolkit.M{}
	ccs      = toolkit.M{}
	prods    = toolkit.M{}
	custs    = toolkit.M{}
	ratios   = map[string]*alloc{}
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

	pc := new(gdrj.ProfitCenter)
	cc := new(gdrj.CostCenter)
	
	toolkit.Println("--> PC")
	cpc := getCursor(pc)
	defer cpc.Close()
	for e = cpc.Fetch(pc, 1, false); e == nil; {
		pcs.Set(pc.ID, pc)
		pc = new(gdrj.ProfitCenter)
		e = cpc.Fetch(pc, 1, false)
	}

	toolkit.Println("--> CC")
	ccc := getCursor(cc)
	defer ccc.Close()
	for e = ccc.Fetch(cc, 1, false); e == nil; {
		ccs.Set(cc.ID, cc)
		cc = new(gdrj.CostCenter)
		e = ccc.Fetch(cc, 1, false)
	}

	
	toolkit.Println("--> Outlet")
	cust := new(gdrj.Customer)
	ccust := getCursor(cust)
	defer ccust.Close()
	for e = ccust.Fetch(cust, 1, false); e == nil; {
		custs.Set(cust.ID, cust)
		cust = new(gdrj.Customer)
		e = ccust.Fetch(cust, 1, false)
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
}

var rdcusts = toolkit.M{}

//var cogss = map[string]*cogs{}
func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Reading Master")
	prepMaster()

	
	toolkit.Println("START...")
	crx, err := conn.NewQuery().
        From(new(gdrj.RawDataPL).TableName()).
        Where(dbox.In("src","31052016SAP_DISC-RDJKT","30052016SAP_EXPORT")).
		Cursor(nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count := crx.Count()
	jobs := make(chan gdrj.RawDataPL, count)
	result := make(chan string, count)

	for wi := 1; wi < 10; wi++ {
		go worker(wi, jobs, result)
	}

	i := 0
	step := count / 100
	limit := step
	t0 := time.Now()
	for {
		//st := new(gdrj.SalesTrx)
		datas := []gdrj.RawDataPL{}
		err = crx.Fetch(&datas, 1000, false)
		if err != nil {
			toolkit.Printfn("Exit loop: %s", err.Error())
			break
		}

		if len(datas) > 0 {
			for _, data := range datas {
				i++
				jobs <- data
			}
		
            if i >= limit {
                toolkit.Printfn("Calc %d of %d (%dpct) in %s", i, count, i*100/count,
                    time.Since(t0).String())
                limit += step
            }
        }

		if len(datas) < 1000 {
			break
		}
	}
	close(jobs)

	toolkit.Println("Saving")
	limit = step
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

func worker(wi int, jobs <-chan gdrj.RawDataPL, r chan<- string) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

    for m := range jobs {
		if rdcusts.Has(m.OutletID){
            m.RDoutletID = rdcusts.Get(m.OutletID).(string)
        } else {
            cust := func(m gdrj.RawDataPL)*gdrj.Customer{
                custs, e := workerConn.NewQuery().From(new(gdrj.Customer).TableName()).
                    Where(dbox.And(
						dbox.Eq("name",&bson.RegEx{Pattern:m.OutletName, Options:"i"}), 
						dbox.Eq("channelid","I1"),
						dbox.Eq("branchid",m.BusA))).
					Take(1).
                    Cursor(nil)
                cust := new(gdrj.Customer)
                if e!=nil{
                    return cust
                } 
                defer custs.Close()
                custs.Fetch(cust,1,false)
                return cust
            }(m)
            if cust.ID=="" {
                m.RDoutletID="ZRD"
            } else {
                m.RDoutletID=cust.ID
            }
            rdcusts.Set(m.OutletID,m.RDoutletID)
        }
		workerConn.NewQuery().From(m.TableName()).Save().Exec(toolkit.M{}.Set("data",m))
	    r <- "OK " + m.OutletName
	}
}
