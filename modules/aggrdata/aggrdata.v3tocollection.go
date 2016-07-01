package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	// "strings"

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
	tablename  string
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

	tablename = toolkit.Sprintf("salespls-%d", fiscalyear)

	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Preparing data query...")

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)
	speriode = eperiode.AddDate(0, 0, -1)

	seeds := make([]time.Time, 0, 0)
	seeds = append(seeds, speriode)
	for {
		speriode = speriode.AddDate(0, 1, 0)
		if !speriode.Before(eperiode) {
			break
		}
		seeds = append(seeds, speriode)
	}

	toolkit.Println("Starting worker query...")
	result := make(chan toolkit.M, len(seeds))
	filterchan := make(chan *dbox.Filter, len(seeds))
	for i := 0; i < 3; i++ {
		go workerproc(i, filterchan, result)
	}

	for _, v := range seeds {
		filterchan <- dbox.And(dbox.Gte("date.date", v), dbox.Lt("date.date", v.AddDate(0, 1, 0)))
	}
	close(filterchan)

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

		if i%step == 0 {
			toolkit.Printfn("Month %d of %d, Received in %s",
				i, len(seeds), time.Since(t0).String())
		}

		t1 := time.Now()

		for k, v := range a {
			tkm, _ := toolkit.ToM(v)
			toolkit.Println(k)
			tkm.Set("_id", k)
			_ = conn.NewQuery().
				From("salespls-summary").
				SetConfig("multiexec", true).
				Save().Exec(toolkit.M{}.Set("data", a))
		}

		if i%step == 0 {
			toolkit.Printfn("Month %d of %d, Saved in %s",
				i, len(seeds), time.Since(t1).String())
		}
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func workerproc(wi int, filters <-chan *dbox.Filter, result chan<- toolkit.M) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()
	tkm := toolkit.M{}

	filter := new(dbox.Filter)
	for filter = range filters {
		csr, _ := workerconn.NewQuery().Select("date", "customer", "product.brand", "pldatas").
			From(tablename).
			Where(filter).
			Cursor(nil)

		scount := csr.Count()
		step := scount / 100

		if step == 0 {
			step = 1
		}

		for {
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

		}

		result <- tkm
		csr.Close()
	}
}
