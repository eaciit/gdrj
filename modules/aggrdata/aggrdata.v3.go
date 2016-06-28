package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"strings"
	// "sync"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0         time.Time
	fiscalyear int
	data       map[string]float64
	tablename  = "salespls-1"
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
		"date.fiscal,customer.channelid,customer.channelname,customer.region"}

	resdimension := make(chan int, len(listdimension))
	dimension := make(chan string, len(listdimension))
	detaildata := make(chan toolkit.M)
	ressavedata := make(chan int)

	for i := 0; i < 3; i++ {
		go workerbuilddimension(i, dimension, detaildata, resdimension)
	}

	for i := 0; i < 10; i++ {
		go workersavedata(i, detaildata, ressavedata)
	}

	toolkit.Printfn("Prepare saving collection")
	for _, str := range listdimension {
		dimension <- str
	}
	close(dimension)

	alldatarows := 0
	for i := 0; i < len(listdimension); i++ {
		alldatarows += <-resdimension
	}
	close(detaildata)

	step = alldatarows / 100
	if step == 0 {
		step = 1
	}
	for i := 0; i < alldatarows; i++ {
		<-ressavedata
		if i%step == 0 {
			toolkit.Printfn("Data saved %d of %d (%d), Done in %s",
				i, alldatarows, (i / step), time.Since(t0).String())
		}
	}

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
			tv := v.Amount + tkm.GetFloat64(k)
			tkm.Set(k, tv)
		}

		tkm.Set(key, dtkm)

		if iscount == 3 {
			break
		}

	}

	result <- tkm

	toolkit.Printfn("Go %d. Processing done in %s",
		wi,
		time.Since(t0).String())
}

func workerbuilddimension(wi int, dimension <-chan string, detaildata chan<- toolkit.M, resdimension chan<- int) {
	//"date.fiscal", "customer.channelid", "customer.channelname"
	sortkeys := []string{"date.fiscal", "date.quartertxt", "date.month",
		"customer.branchname", "customer.keyaccount", "customer.channelid", "customer.channelname", "customer.reportchannel",
		"customer.reportsubchannel", "customer.zone", "customer.region", "customer.areaname", "product.brand"}

	str := ""
	for str = range dimension {
		payload := new(gdrj.PLFinderParam)
		payload.Breakdowns = strings.Split(str, ",")
		tablename := payload.GetTableName()

		tkm := toolkit.M{}
		for key, val := range alldata {
			arrkey := strings.Split(key, "|")
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

		for k, v := range tkm {
			a, _ := toolkit.ToM(v)
			id := toolkit.M{}
			arrk := strings.Split(k, "|")
			for i, sv := range payload.Breakdowns {
				tsv := strings.Replace(sv, ".", "_", -1)
				id.Set(tsv, arrk[i])
			}
			a.Set("_id", id)

			detaildata <- toolkit.M{}.Set(tablename, a)
		}

		resdimension <- len(tkm)
	}
}

func workersavedata(wi int, detaildata <-chan toolkit.M, ressavedata chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	tkm := toolkit.M{}
	for tkm = range detaildata {
		for tbl, dt := range tkm {
			workerconn.NewQuery().From(tbl).
				Save().
				Exec(toolkit.M{}.
				Set("data", dt))
			ressavedata <- 1
		}
	}
}
