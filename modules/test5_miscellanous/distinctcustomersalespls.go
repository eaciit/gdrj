package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"sync"
	"time"

	"github.com/eaciit/dbox"
	// "github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"

	"flag"
	// "strings"
)

var mutex = new(sync.Mutex)
var conn dbox.IConnection
var (
	compute              string
	periodFrom, periodTo int
	dateFrom, dateTo     time.Time
	fiscalyear           int
	gtablename           = "salespls"
	stablename           = "salespls-minifycust"
)
var masters = toolkit.M{}

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

	t0 := time.Now()
	flag.IntVar(&fiscalyear, "year", 2016, "fiscal year to process. default is 2016")
	flag.Parse()

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)
	speriode = eperiode.AddDate(0, 0, -1)
	stablename = toolkit.Sprintf("%s-%d", stablename, fiscalyear)
	gtablename = toolkit.Sprintf("%s-%d", gtablename, fiscalyear)

	setinitialconnection()
	defer gdrj.CloseDb()

	seeds := make([]time.Time, 0, 0)
	seeds = append(seeds, speriode)
	for {
		speriode = speriode.AddDate(0, 0, 1)
		if !speriode.Before(eperiode) {
			break
		}
		seeds = append(seeds, speriode)
	}

	getresult := make(chan int, len(seeds))
	toolkit.Println("Starting worker query...")
	ix := 0
	for _, v := range seeds {
		ix++
		filter := dbox.Eq("date.date", v)
		go workerproc(ix, filter, getresult)
	}

	toolkit.Println("Waiting result query... : ", ix)
	for i := 1; i <= ix; i++ {
		n := <-getresult
		toolkit.Printfn("Saving %d of %d (%d pct) in %s : %d",
			i, ix, i*100/ix, time.Since(t0).String(), n)
	}

	toolkit.Printfn("All done in %s", time.Since(t0).String())
}

func workerproc(wi int, filter *dbox.Filter, getresult chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	csr, _ := workerconn.NewQuery().Select().
		From(gtablename).
		Where(filter).
		Cursor(nil)

	i := 0
	qSave := workerconn.NewQuery().
		From(stablename).
		SetConfig("multiexec", true).
		Save()

	for {
		i++
		spl := new(gdrj.SalesPL)
		e := csr.Fetch(spl, 1, false)
		if e != nil {
			break
		}

		tkm := toolkit.M{}.Set("_id", toolkit.Sprintf("%d|%s|%s|%s|%s|%s|%s|%s|%s",
			spl.Date.Month, spl.Date.QuarterTxt, spl.Date.Fiscal,
			spl.Customer.ID, spl.Customer.Name, spl.Customer.ChannelID,
			spl.Customer.ChannelName, spl.Customer.BranchName, spl.Product.Brand))

		tkm.Set("date_month", spl.Date.Month)
		tkm.Set("date_quarter", spl.Date.QuarterTxt)
		tkm.Set("date_fiscal", spl.Date.Fiscal)
		tkm.Set("customer_id", spl.Customer.ID)
		tkm.Set("customer_name", spl.Customer.Name)
		tkm.Set("customer_channelid", spl.Customer.ChannelID)
		tkm.Set("customer_channelname", spl.Customer.ChannelName)
		tkm.Set("customer_branchname", spl.Customer.BranchName)
		tkm.Set("product_brand", spl.Product.Brand)

		err := qSave.Exec(toolkit.M{}.Set("data", tkm))
		if err != nil {
			toolkit.Printfn("Save data : %v", err)
		}
	}

	getresult <- csr.Count()

}
