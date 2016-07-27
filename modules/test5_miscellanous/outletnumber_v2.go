package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/csv"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"os"
	"sync"
	"time"
)

var (
	wd, _        = os.Getwd()
	brandlist    = []string{}
	conn         dbox.IConnection
	mwg          sync.WaitGroup
	totalData    int
	group        string
	outletreport = toolkit.M{}
	repordata    = toolkit.M{}
	outletlist   = []string{}

	namatabel string
	mutex     = &sync.Mutex{}
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

func getstep(count int) int {
	v := count / 100
	if v == 0 {
		return 1
	}
	return v
}

func main() {

	setinitialconnection()
	defer gdrj.CloseDb()

	t0 := time.Now()

	// grouplist := []string{"date_month", "date_quartertxt", "customer_channelname",
	// 	"customer_branchname", "product_brand"}
	// tablelist := []string{"salespls-minifycust-2015", "salespls-minifycust-2016"}
	namatabel = "salespls_minifycust"

	group = "date_month"
	getoutletdata()

	// group = "date_quartertxt"
	// getoutletdata()

	// group = "customer_channelname"
	// 	getoutletdata()

	// group = "customer_branchname"
	// 	getoutletdata()

	// group = "product_brand"
	// 	getoutletdata()

	toolkit.Println("\n\n========= END OF PROCESS =========")
	toolkit.Printfn("Processing %d data in %s",
		totalData, time.Since(t0).String())

}

func getoutletdata() {
	outletnumbConn, _ := modules.GetDboxIConnection("db_godrej")
	defer outletnumbConn.Close()

	coutletnumb, _ := outletnumbConn.NewQuery().Select().From(namatabel).Cursor(nil)

	defer coutletnumb.Close()
	count := coutletnumb.Count()
	totalData += count
	t0 := time.Now()
	step := getstep(count) * 5

	iscount := 0
	jobs := make(chan *gdrj.OutletNumber, count)
	shutdownChannel := make(chan string, count)
	toolkit.Println("Prepare Worker for ", group)

	for wi := 0; wi < 10; wi++ {
		go workerOutlet(wi, jobs, shutdownChannel)
	}
	var err error
	for {
		iscount++

		outletdata := new(gdrj.OutletNumber)
		err = coutletnumb.Fetch(outletdata, 1, false)

		if err != nil {
			toolkit.Println("EOF fetching Outlet Data ", group)
			break
		}
		jobs <- outletdata

		if iscount%step == 0 {
			toolkit.Printfn("Sending %d of %d (%d %%) in %s", iscount, count, iscount*100/count,
				time.Since(t0).String())
		}

	}
	close(jobs)

	for ri := 0; ri < count; ri++ {
		<-shutdownChannel

		if ri%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d %%) in %s",
				ri, count, ri*100/count, time.Since(t0).String())
		}
	}

	tablename := "test_outlet_number_date_fiscal_" + group
	outletnumbConn.NewQuery().
		From(tablename).
		SetConfig("multiexec", true).
		Save().
		Exec(toolkit.M{}.Set("data", repordata))
	return
}

func workerOutlet(wi int, jobs <-chan *gdrj.OutletNumber, shutdownChannel chan<- string) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	/*tablename := "test_outlet_number_date_fiscal_" + group

	qSave := workerconn.NewQuery().
		From(tablename).
		SetConfig("multiexec", true).
		Save()*/
	outletdata := new(gdrj.OutletNumber)
	for outletdata = range jobs {
		// defer func() { shutdownChannel <- true }()
		// report := toolkit.M{}
		keyreport := outletdata.Fiscal + "_"
		switch group {
		case "date_month":
			keyreport += toolkit.ToString(outletdata.Month)
		case "date_quartertxt":
			keyreport += outletdata.Quarter
		case "customer_channelname":
			keyreport += outletdata.ChannelName
		case "customer_branchname":
			keyreport += outletdata.BranchName
		case "product_brand":
			keyreport += outletdata.Brand
		}
		mutex.Lock()
		repordata.Set("_id", keyreport)
		mutex.Unlock()

		mutex.Lock()
		isExist := outletreport.Has(keyreport)
		mutex.Unlock()
		if isExist {
			mutex.Lock()
			outletlist = outletreport[keyreport].([]string)
			mutex.Unlock()
			mutex.Lock()
			isExist = toolkit.HasMember(outletlist, outletdata.CustomerName)
			mutex.Unlock()
			if !isExist {
				mutex.Lock()
				outletlist = append(outletlist, outletdata.CustomerName)
				mutex.Unlock()
				mutex.Lock()
				outletreport[keyreport] = outletlist
				mutex.Unlock()
			}
		} else {
			mutex.Lock()
			outletlist = []string{outletdata.CustomerName}
			mutex.Unlock()
			mutex.Lock()
			outletreport.Set(keyreport, outletlist)
			mutex.Unlock()
		}

		mutex.Lock()
		repordata.Set("qty", len(outletlist))
		mutex.Unlock()

		key := toolkit.M{}
		key.Set("date_fiscal", outletdata.Fiscal)
		switch group {
		case "date_month":
			key.Set(group, outletdata.Month)
		case "date_quartertxt":
			key.Set(group, outletdata.Quarter)
		case "customer_channelname":
			key.Set(group, outletdata.ChannelName)
		case "customer_branchname":
			key.Set(group, outletdata.BranchName)
		case "product_brand":
			key.Set(group, outletdata.Brand)
		}
		mutex.Lock()
		repordata.Set("key", key)
		mutex.Unlock()

		// qSave.Exec(toolkit.M{}.Set("data", repordata))
		/*if err != nil {
			toolkit.Printfn("Unable to save %s = %s",
				report["_id"], err.Error())
			os.Exit(200)
		}*/
		shutdownChannel <- "done"
	}
	return
}
