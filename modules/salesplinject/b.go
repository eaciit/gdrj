package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	//"runtime"

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
var (
	compute              string
	periodFrom, periodTo int
	dateFrom, dateTo     time.Time
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

var masters = toolkit.M{}

/*
func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj,
		nil, nil)
		//toolkit.M{}.Set("take", 10))
	if e != nil {
		return nil
	}
	return c
}
*/

func BuildMap(holder interface{},
	fnModel func() orm.IModel,
	filter *dbox.Filter,
	fnIter func(holder interface{}, obj interface{})) interface{} {
	crx, _ := gdrj.Find(fnModel(), filter, nil)
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
		nil,
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
		nil,
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
		nil,
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
		nil,
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.COGSConsolidate)
			o := obj.(*gdrj.COGSConsolidate)
			cogsid := toolkit.Sprintf("%d_%d_%s", o.Year, int(o.Month), o.SAPCode)
			h[cogsid] = o
		}).(map[string]*gdrj.COGSConsolidate))

	freights := map[string]*gdrj.RawDataPL{}
	depreciation := map[string]*gdrj.RawDataPL{}
	royalties := map[string]*gdrj.RawDataPL{}
	promos := map[string]*gdrj.RawDataPL{}
	sgas := map[string]map[string]*gdrj.RawDataPL{}

	if compute == "none" {
		return
	}

	var fperiods *dbox.Filter
	if periodFrom == 0 && periodTo == 0 {
		//-- do nothing
	} else if periodTo == 0 {
		dt := makeDateFromInt(periodFrom, false).AddDate(0, -3, 0)
		fperiods = dbox.And(dbox.Eq("year", dt.Year()), dbox.Eq("period", dt.Month()))
	} else {
		iperiod := periodFrom
		periods := []*dbox.Filter{}
		for {
			if iperiod < periodFrom {
				break
			}

			dt := makeDateFromInt(iperiod, false)
			dtf := dt.AddDate(0, -3, 1)
			periods = append(periods, dbox.And(dbox.Eq("year", dtf.Year()), dbox.Eq("period", dtf.Month())))
			dt = dt.AddDate(0, 1, 0)
			iperiod = dt.Year()*100 + int(dt.Month())

			if iperiod > periodTo {
				break
			}
		}
		fperiods = dbox.Or(periods...)
	}
	toolkit.Println("--> RAW Data PL")
	toolkit.Printfn("Filter: %s", toolkit.JsonString(fperiods))
	masters.Set("rpl", BuildMap(nil,
		func() orm.IModel {
			return new(gdrj.RawDataPL)
		},
		fperiods,
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
			} else if strings.HasSuffix(o.Src, "DEPRECIATION") {
				depreciationid := toolkit.Sprintf("%d_%d_%s", dt.Year(), int(dt.Month()), o.BusA)
				dpr, exist := depreciation[depreciationid]
				if !exist {
					dpr = new(gdrj.RawDataPL)
				}
				dpr.AmountinIDR += o.AmountinIDR
				depreciation[depreciationid] = dpr
			} else if strings.HasSuffix(o.Src, "ROYALTI") {
				royaltyid := toolkit.Sprintf("%d_%d", dt.Year(), int(dt.Month()))
				royalti, exist := royalties[royaltyid]
				if !exist {
					royalti = new(gdrj.RawDataPL)
				}
				royalti.AmountinIDR += o.AmountinIDR
				royalties[royaltyid] = royalti
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
	masters.Set("depreciation", depreciation)
	masters.Set("promo", promos)
	masters.Set("sga", sgas)
	masters.Set("royalties", royalties)
}

func makeDateFromInt(i int, endofmth bool) time.Time {
	yr := int(toolkit.ToFloat64(float64(i)/float64(100), 0, toolkit.RoundingDown))
	m := i - 100*yr
	dt := time.Date(yr, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
	if endofmth {
		dt = dt.AddDate(0, 1, 0).AddDate(0, 0, -1)
	}
	return dt
}

var pldatas = map[string]*gdrj.PLDataModel{}

var t0 time.Time

func main() {
	flag.StringVar(&compute, "compute", "all", "type of computation will be run")
	flag.IntVar(&periodFrom, "from", 0, "YYYYMM representation of period from. Default is 0")
	flag.IntVar(&periodTo, "to", 0, "YYYYMM representation of period to. Default is 0 (equal to from)")
	flag.Parse()
	if periodFrom == 0 && periodTo == 0 {
		dateFrom = makeDateFromInt(201404, false)
	} else {
		dateFrom = makeDateFromInt(periodFrom, false)
	}
	dateTo = makeDateFromInt(periodTo, true)

	setinitialconnection()
	defer gdrj.CloseDb()

	t0 = time.Now()
	toolkit.Printfn("Model Builder v 1.0")
	toolkit.Printfn("Compute: %s", compute)

	var f *dbox.Filter
	if periodFrom == 0 && periodTo == 0 {
		toolkit.Printfn("Period: All")
	} else if periodTo == 0 {
		toolkit.Printfn("Period: %s",
			toolkit.Date2String(dateFrom, "MMM-yyyy"))
		f = dbox.Eq("date", dateFrom)
	} else {
		toolkit.Printfn("Period: %s to %s",
			toolkit.Date2String(dateFrom, "dd-MMM-yyyy"),
			toolkit.Date2String(dateTo, "dd-MMM-yyyy"))
		f = dbox.And(dbox.Gte("date", dateFrom), dbox.Lte("date", dateTo))
	}
	toolkit.Printfn("Run :%v", t0)

	toolkit.Println("Reading Master")
	prepMaster()

	//spl := new(gdrj.SalesPL)
	//toolkit.Println("Delete existing")
	//conn.NewQuery().From(spl.TableName()).Delete().Exec(nil)

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

			if stx.Customer != nil && stx.Customer.ChannelID == "I1" {
				continue
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
