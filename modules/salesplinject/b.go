package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	"runtime"

	"strings"
	"sync"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"

	"flag"
)

var mutex = new(sync.Mutex)
var conn dbox.IConnection
var compute string

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
	c, e := gdrj.Find(obj, 
		nil, nil)
		//toolkit.M{}.Set("take", 10))
	if e != nil {
		return nil
	}
	return c
}

func BuildMap(holder interface{},
	fnModel func() orm.IModel,
	fnIter func(holder interface{}, obj interface{})) interface{} {
	crx := getCursor(fnModel())
	defer crx.Close()
	for {
		s := fnModel()
		e := crx.Fetch(s, 1, false)
		if e != nil {
			break
		}
		fnIter(holder, s)
	}
	return holder
}

func prepMaster() {
	toolkit.Println("--> CC")
	ccs := BuildMap(map[string]*gdrj.CostCenter{},
		func() orm.IModel {
			return new(gdrj.CostCenter)
		},
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.CostCenter)
			o := obj.(*gdrj.CostCenter)
			h[o.ID] = o
		}).(map[string]*gdrj.CostCenter)
	masters.Set("costcenter", ccs)

	toolkit.Println("--> Ledger")
	ledgers := BuildMap(map[string]*gdrj.LedgerMaster{},
		func() orm.IModel {
			return new(gdrj.LedgerMaster)
		},
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.LedgerMaster)
			o := obj.(*gdrj.LedgerMaster)
			h[o.ID] = o
		}).(map[string]*gdrj.LedgerMaster)
	masters.Set("ledger", ledgers)

	toolkit.Println("--> PL Model")
	masters.Set("plmodel", BuildMap(map[string]*gdrj.PLModel{},
		func() orm.IModel {
			return new(gdrj.PLModel)
		},
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.PLModel)
			o := obj.(*gdrj.PLModel)
			h[o.ID] = o
		}).(map[string]*gdrj.PLModel))

	toolkit.Println("--> COGS")
	masters.Set("cogs", BuildMap(map[string]*gdrj.COGSConsolidate{},
		func() orm.IModel {
			return new(gdrj.COGSConsolidate)
		},
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.COGSConsolidate)
			o := obj.(*gdrj.COGSConsolidate)
			cogsid := toolkit.Sprintf("%d_%d_%s", o.Year, int(o.Month), o.SAPCode)
			h[cogsid] = o
		}).(map[string]*gdrj.COGSConsolidate))

	freights := map[string]*gdrj.RawDataPL{}
	promos := map[string]*gdrj.RawDataPL{}
	sgas := map[string]map[string]*gdrj.RawDataPL{}

	if compute == "none" {
		return
	}

	toolkit.Println("--> RAW Data PL")
	masters.Set("rpl", BuildMap(nil,
		func() orm.IModel {
			return new(gdrj.RawDataPL)
		},
		func(holder, obj interface{}) {
			o := obj.(*gdrj.RawDataPL)
			if strings.Contains(o.Src, "RD") || strings.Contains(o.Src, "EXPORT") {
				return
			}

			dt := time.Date(o.Year, time.Month(o.Period), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
			if strings.HasSuffix(o.Src, "FREIGHT") {
				freightid := toolkit.Sprintf("%d_%d_%s", dt.Year(), int(dt.Month()), o.BusA)
				frg, exist := freights[freightid]
				if !exist {
					frg = new(gdrj.RawDataPL)
				}
				frg.AmountinIDR += o.AmountinIDR
				freights[freightid] = frg
			} else if strings.HasSuffix(o.Src, "SGAPL") {
				if strings.Contains(o.Grouping, "Factory") {
					return
				}

				groupingid := strings.Replace(o.Grouping, " - Office", "", -1)
				sgaid := toolkit.Sprintf("%d_%d", dt.Year(), dt.Month())
				asga, exist := sgas[sgaid]
				if !exist {
					asga = map[string]*gdrj.RawDataPL{}
				}
				sga, exist := asga[groupingid]
				if !exist {
					sga = new(gdrj.RawDataPL)
					*sga = *o
				}
				sga.AmountinIDR += o.AmountinIDR
				asga[groupingid] = sga
				sgas[sgaid] = asga
			} else {
				apgrouping := "promo"
				if strings.Contains(o.APGrouping, "CD") {
					apgrouping = "bonus"
				} else if strings.Contains(o.APGrouping, "Advert") {
					apgrouping = "atl"
				} else if strings.Contains(o.APGrouping, "SPG") {
					apgrouping = "spg"
				}
				ledger, exist := ledgers[o.Account]
				if exist {
					title := strings.ToLower(ledger.Title)
					if strings.Contains(title, "gondola") || strings.Contains(title, "motoris") || strings.Contains(title, "mailer") {
						apgrouping = "Gondola"
					}
				}
				promoid := toolkit.Sprintf("%d_%d_%s",
					dt.Year(), dt.Month(), apgrouping)
				prm, exist := promos[promoid]
				if !exist {
					prm = new(gdrj.RawDataPL)
				}
				prm.AmountinIDR += o.AmountinIDR
				promos[promoid] = prm
			}
		}))

	masters.Set("freight", freights)
	masters.Set("promo", promos)
	masters.Set("sga", sgas)
}

var pldatas = map[string]*gdrj.PLDataModel{}

var t0 time.Time

func main() {
	flag.StringVar(&compute, "compute", "all", "type of computation will be run")
	flag.Parse()

	runtime.GOMAXPROCS(runtime.NumCPU())
	setinitialconnection()
	defer gdrj.CloseDb()

	t0 = time.Now()
	toolkit.Println("Reading Master")
	prepMaster()

	//spl := new(gdrj.SalesPL)
	//toolkit.Println("Delete existing")
	//conn.NewQuery().From(spl.TableName()).Delete().Exec(nil)

	var f *dbox.Filter
	//f = dbox.And(dbox.Eq("year",2014),dbox.Eq("month",9))
	//f = dbox.Eq("_id","CN/BBD/14000019_1")
	c, _ := gdrj.Find(new(gdrj.SalesTrx), f, nil)
	defer c.Close()

	globalSales := float64(0)
	branchSales := map[string]float64{}
	brandSales := map[string]float64{}

	count := c.Count()
	toolkit.Printfn("Calc ratio ... %d records", count)
	step := count / 1000
	limit := step
	i := 0
	if compute != "none" {
		for {
			/*
				buffersize:=1000
				stxs := []*gdrj.SalesTrx{}
				e := c.Fetch(&stxs,buffersize,false)
				if e!=nil{
					break
				}
				for _, stx := range stxs{
			*/
			stx := new(gdrj.SalesTrx)
			e := c.Fetch(stx, 1, false)
			if e != nil {
				break
			}
			globalSales += stx.NetAmount

			if stx.Customer != nil {
				branchSale, _ := branchSales[stx.Customer.BranchID]
				branchSale += stx.NetAmount
				branchSales[stx.Customer.BranchID] = branchSale
			}

			if stx.Product != nil {
				brandSale, _ := brandSales[stx.Product.Brand]
				brandSale += stx.NetAmount
				brandSales[stx.Product.Brand] = brandSale
			}

			masters.Set("globalsales", globalSales)
			masters.Set("branchsales", branchSales)
			masters.Set("brandsales", brandSales)

			i++

			if i == 1000 {
				//break
			}

			if i >= limit {
				toolkit.Printfn("Calculating %d of %d (%.2f pct) in %s",
					i, count, float64(i)*float64(100)/float64(count), time.Since(t0).String())
				limit += step
			}
			/*
				}
				if len(stxs)<buffersize{
					break
				}
			*/
		}
	}

	jobs := make(chan *gdrj.SalesTrx, count)
	result := make(chan string, count)
	for wi := 0; wi < 10; wi++ {
		go workerProc(wi, jobs, result)
	}

	c.ResetFetch()
	toolkit.Printfn("START ... %d records - computation type: %s", count, compute)
	step = count / 100
	limit = step
	i = 0
	for {
		stx := new(gdrj.SalesTrx)
		e := c.Fetch(stx, 1, false)
		if e != nil {
			break
		}

		if i == 1000 {
			//break
		}

		i++
		jobs <- stx
		if i >= limit {
			toolkit.Printfn("Processing %d of %d (%d pct) in %s",
				i, count, i*100/count, time.Since(t0).String())
			limit += step
		}
	}
	close(jobs)

	count = i
	step = count / 100
	limit = step
	for ri := 0; ri < i; ri++ {
		<-result

		if ri >= limit {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				ri, count, ri*100/count, time.Since(t0).String())
			limit += step
		}
	}
}

func workerProc(wi int, jobs <-chan *gdrj.SalesTrx, result chan<- string) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

	var j *gdrj.SalesTrx
	for j = range jobs {
		spl := gdrj.TrxToSalesPL(workerConn, j, masters,
			toolkit.M{}.Set("compute", compute))
		workerConn.NewQuery().From(spl.TableName()).
			Save().Exec(toolkit.M{}.Set("data", spl))
		result <- spl.ID
	}
}
