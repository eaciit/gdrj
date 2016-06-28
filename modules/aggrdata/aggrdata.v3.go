package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"strings"

	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	// "sync"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0         time.Time
	fiscalyear int
	data       map[string]float64
	tablename  = "salespls"
	alldata    = toolkit.M{}
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

func main() {
	t0 = time.Now()
	data = make(map[string]float64)
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.Parse()

	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Preparing data query...")

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)
	// speriode := eperiode.AddDate(0, -1, 0)

	seeds := make([]time.Time, 0, 0)
	seeds = append(seeds, speriode)
	for {
		speriode = speriode.AddDate(0, 0, 1)
		if !speriode.Before(eperiode) {
			break
		}
		seeds = append(seeds, speriode)
	}

	toolkit.Println("Starting worker query...")
	result := make(chan toolkit.M, len(seeds))
	for i, v := range seeds {
		filter := dbox.Eq("date.date", v)
		go workerproc(i, filter, result)
	}

	step := len(seeds) / 100
	if step == 0 {
		step = 1
	}
	// "date.fiscal","date.quartertxt","date.month", "customer.branchname", "customer.keyaccount",
	// "customer.channelid", "customer.channelname", "customer.reportchannel", "customer.reportsubchannel",
	// "customer.zone", "customer.region", "customer.areaname","product.brand"
	toolkit.Println("Waiting result query...")
	for i := 1; i <= len(seeds); i++ {
		a := <-result
		for k, v := range a {
			lasttkm := toolkit.M{}
			newtkm, _ := toolkit.ToM(v)
			if alldata.Has(k) {
				lasttkm = alldata[k].(toolkit.M)
			}

			for tk, tv := range newtkm {
				df := toolkit.ToFloat64(tv, 6, toolkit.RoundingAuto) + lasttkm.GetFloat64(tk)
				lasttkm.Set(tk, df)
			}
			alldata.Set(k, lasttkm)
		}

		if i%step == 0 {
			toolkit.Printfn("Worker %d of %d (%d), Done in %s",
				i, len(seeds), (i / step), time.Since(t0).String())
		}
	}

	listdimension := []string{"date.fiscal,customer.channelid,customer.channelname",
		"date.fiscal,customer.channelid,customer.channelname,customer.reportsubchannel",
		"date.fiscal,customer.channelid,customer.channelname,customer.zone",
		"date.fiscal,customer.channelid,customer.channelname,customer.areaname",
		"date.fiscal,customer.channelid,customer.channelname,customer.region",
		"date.fiscal,customer.branchname",
		"date.fiscal,product.brand",
		"date.fiscal,customer.zone",
		"date.fiscal,customer.areaname",
		"date.fiscal,customer.region",
		"date.fiscal,customer.keyaccount",
		"date.fiscal,date.month,customer.channelid,customer.channelname",
		"date.fiscal,date.month,customer.branchname",
		"date.fiscal,date.month,customer.brand",
		"date.fiscal,date.month,customer.areaname",
		"date.fiscal,date.month,customer.region",
		"date.fiscal,date.month,customer.keyaccount",
		"date.fiscal,date.quartertxt,customer.channelid,customer.channelname",
		"date.fiscal,date.quartertxt,customer.branchname",
		"date.fiscal,date.quartertxt,product.brand",
		"date.fiscal,date.quartertxt,customer.areaname",
		"date.fiscal,date.quartertxt,customer.region",
		"date.fiscal,date.quartertxt,customer.keyaccount",
		"date.fiscal,customer.reportchannel,customer.reportsubchannel",
		"date.fiscal,customer.customergroupname",
		"date.fiscal,customer.channelid,customer.channelname,customer.branchname",
		"date.fiscal,customer.channelid,customer.channelname,customer.reportsubchannel"}

	resdimension := make(chan int, len(listdimension))
	dimension := make(chan string, len(listdimension))

	for i := 0; i < 15; i++ {
		go workerbuilddimension(i, dimension, resdimension)
	}

	// for i := 0; i < 10; i++ {
	// 	go workersavedata(i, detaildata, ressavedata)
	// }

	toolkit.Printfn("Prepare saving collection, Create dimension")
	for _, str := range listdimension {
		dimension <- str
		// toolkit.Printfn("SEND : %v", str)
	}
	close(dimension)

	// alldatarows := 0
	toolkit.Printfn("Waiting dimension result")
	for i := 0; i < len(listdimension); i++ {
		<-resdimension
		toolkit.Printfn("%v Dimension created", i)
	}
	// close(detaildata)

	// step = alldatarows / 100
	// if step == 0 {
	// 	step = 1
	// }
	// toolkit.Printfn("Saving dimension result")
	// for i := 0; i < alldatarows; i++ {
	// 	<-ressavedata
	// 	if i%step == 0 {
	// 		toolkit.Printfn("Data saved %d of %d (%d), Done in %s",
	// 			i, alldatarows, (i / step), time.Since(t0).String())
	// 	}
	// }

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func workerproc(wi int, filter *dbox.Filter, result chan<- toolkit.M) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()
	tkm := toolkit.M{}
	// "date.fiscal","date.quartertxt","date.month", "customer.branchname", "customer.keyaccount",
	// "customer.channelid", "customer.channelname", "customer.reportchannel", "customer.reportsubchannel",
	// "customer.zone", "customer.region", "customer.areaname","product.brand"
	csr, _ := workerconn.NewQuery().Select("date", "customer", "product.brand", "pldatas").
		From(tablename).
		Where(filter).
		Cursor(nil)

	defer csr.Close()

	scount := csr.Count()
	iscount := 0
	step := scount / 100

	if step == 0 {
		step = 1
	}

	for {
		iscount++
		spl := new(gdrj.SalesPL)
		e := csr.Fetch(spl, 1, false)
		if e != nil {
			break
		}

		key := toolkit.Sprintf("%s|%s|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s", spl.Date.Fiscal, spl.Date.QuarterTxt, spl.Date.Month,
			spl.Customer.BranchName, spl.Customer.KeyAccount, spl.Customer.ChannelID, spl.Customer.ChannelName,
			spl.Customer.ReportChannel, spl.Customer.ReportSubChannel, spl.Customer.Zone, spl.Customer.Region,
			spl.Customer.AreaName, spl.Product.Brand)

		dtkm := toolkit.M{}
		if tkm.Has(key) {
			dtkm = tkm[key].(toolkit.M)
		}

		tv := spl.GrossAmount + dtkm.GetFloat64("grossamount")
		dtkm.Set("grossamount", tv)

		tv = spl.NetAmount + dtkm.GetFloat64("netamount")
		dtkm.Set("netamount", tv)

		tv = spl.DiscountAmount + dtkm.GetFloat64("discountamount")
		dtkm.Set("discountamount", tv)

		tv = spl.SalesQty + dtkm.GetFloat64("salesqty")
		dtkm.Set("salesqty", tv)

		for k, v := range spl.PLDatas {
			tv := v.Amount + dtkm.GetFloat64(k)
			dtkm.Set(k, tv)
		}

		tkm.Set(key, dtkm)

		if iscount == 10 {
			break
		}

	}

	result <- tkm

	toolkit.Printfn("Go %d. Processing done in %s",
		wi,
		time.Since(t0).String())
}

func workerbuilddimension(wi int, dimension <-chan string, resdimension chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()
	//"date.fiscal", "customer.channelid", "customer.channelname"
	sortkeys := []string{"date.fiscal", "date.quartertxt", "date.month",
		"customer.branchname", "customer.keyaccount", "customer.channelid", "customer.channelname", "customer.reportchannel",
		"customer.reportsubchannel", "customer.zone", "customer.region", "customer.areaname", "product.brand"}

	str := ""
	for str = range dimension {
		// toolkit.Println(str)
		payload := new(gdrj.PLFinderParam)
		payload.Breakdowns = strings.Split(str, ",")
		tablename := toolkit.Sprintf("1-%v", payload.GetTableName())

		tkm := toolkit.M{}
		for key, val := range alldata {
			// toolkit.Printfn("%s", key)
			arrkey := strings.Split(key, "|")
			// toolkit.Printfn("%d - %d", len(sortkeys), len(arrkey))
			dkey := ""
			for i, v := range sortkeys {
				for _, vx := range payload.Breakdowns {
					if vx == v {
						if len(dkey) > 0 {
							dkey = toolkit.Sprintf("%s|%s", dkey, arrkey[i])
						} else {
							dkey = arrkey[i]
						}
					}
				}
			}

			stkm, _ := toolkit.ToM(val)
			dtkm := toolkit.M{}
			if tkm.Has(dkey) {
				dtkm = tkm[dkey].(toolkit.M)
			}

			for k, v := range stkm {
				fv := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto) + dtkm.GetFloat64(k)
				dtkm.Set(k, fv)
			}

			tkm.Set(dkey, dtkm)
		}

		i := 0
		count := len(tkm)

		for k, v := range tkm {
			i++
			a, _ := toolkit.ToM(v)
			id := toolkit.M{}
			arrk := strings.Split(k, "|")
			for ix, sv := range payload.Breakdowns {
				tsv := strings.Replace(sv, ".", "_", -1)
				id.Set(tsv, arrk[ix])
			}

			a.Set("_id", k)
			a.Set("key", id)

			_ = workerconn.NewQuery().
				From(tablename).
				SetConfig("multiexec", true).
				Save().Exec(toolkit.M{}.Set("data", a))

			toolkit.Printfn("Saving dimension %v, %d of %d", str, i, count)
			// detaildata <- toolkit.M{}.Set(tablename, a)
		}

		resdimension <- len(tkm)
		toolkit.Println("SUM Data : ", len(tkm))
	}
}

/*func workersavedata(wi int, detaildata <-chan toolkit.M, ressavedata chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	tkm := toolkit.M{}
	//qs := map[string]dbox.IQuery{}
	for tkm = range detaildata {
		for tbl, dt := range tkm {
			//q, exist := qs[tbl]
			//if !exist {
			q := workerconn.NewQuery().From(tbl).
				SetConfig("multiexec", true).
				Save()
			//	qs[tbl] = q
			//}
			esave := q.Exec(toolkit.M{}.Set("data", dt))
			if esave != nil {
				toolkit.Printfn("Can't save %s - %s : %v", tbl, esave.Error(), dt)
				//os.Exit(100)
			}
			ressavedata <- 1
		}
	}
}*/
