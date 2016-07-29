package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0     time.Time
	gtable string
)

var mastercostcenter = toolkit.M{}
var masterbranch = toolkit.M{}
var masterbranchgroup = toolkit.M{}
var masteraccountgroup = toolkit.M{}

func prepdatacostcenter() {
	toolkit.Println("--> Get Data cost center")

	// filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().From("costcenter").Cursor(nil)
	defer csr.Close()

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		mastercostcenter.Set(tkm.GetString("_id"), tkm)
	}
}

func prepdatabranch() {
	toolkit.Println("--> Get branch center")

	// filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().From("masterbranch").Cursor(nil)
	defer csr.Close()

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		masterbranch.Set(tkm.GetString("_id"), tkm)
	}
}

func prepdataaccountgroup() {
	toolkit.Println("--> Get account group")

	// filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().From("masteraccountgroup").Cursor(nil)
	defer csr.Close()

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		masteraccountgroup.Set(tkm.GetString("accountdescription"), tkm.GetString("accountgroup"))
	}
}

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
	t0 = time.Now()
	flag.StringVar(&gtable, "table", "", "tablename")
	flag.Parse()

	setinitialconnection()

	// prepdatabranch()
	// prepdatacostcenter()
	prepdataaccountgroup()

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	toolkit.Println("Start data query...")
	csr, _ := workerconn.NewQuery().Select().From(gtable).Cursor(nil)
	defer csr.Close()

	scount := csr.Count()

	jobs := make(chan toolkit.M, scount)
	result := make(chan int, scount)
	for wi := 0; wi < 10; wi++ {
		go workersave(wi, jobs, result)
	}

	iscount := 0
	step := getstep(scount) * 5

	for {
		iscount++
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		jobs <- tkm

		if iscount%step == 0 {
			toolkit.Printfn("Sending %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
				time.Since(t0).String())
		}

	}

	close(jobs)

	for ri := 0; ri < scount; ri++ {
		<-result

		if ri%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				ri, scount, ri*100/scount, time.Since(t0).String())
		}
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func workersave(wi int, jobs <-chan toolkit.M, result chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From(toolkit.Sprintf("%s-res", gtable)).
		SetConfig("multiexec", true).
		Save()

	trx := toolkit.M{}
	for trx = range jobs {
		// key, _ := toolkit.ToM(trx["_id"])
		// trx.Set("key", key)
		// trx.Set("_id", toolkit.Sprintf("%d|%s|%s|%s|%s|%s|%s|%s", key.GetInt("year"),
		// 	key.GetString("branchid"),
		// 	key.GetString("branchname"),
		// 	key.GetString("brancharea"),
		// 	key.GetString("account"),
		// 	key.GetString("accountdescription"),
		// 	key.GetString("costgroup"),
		// 	key.GetString("src")))

		// tdate := time.Date(trx.GetInt("year"), time.Month(trx.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).
		// 	AddDate(0, 3, 0)
		// gdrjdate := gdrj.SetDate(tdate)

		// trx.Set("gdrjdate", gdrjdate)

		// cc := trx.GetString("ccid")
		// trx.Set("branchid", "CD00")
		// trx.Set("branchname", "OTHER")
		// trx.Set("brancharea", "OTHER")
		// trx.Set("costgroup", "OTHER")
		trx.Set("accountgroup", "OTHER")
		// trx.Set("min_amountinidr", -trx.GetFloat64("amountinidr"))

		// if mastercostcenter.Has(cc) {
		// 	mcc := mastercostcenter[cc].(toolkit.M)
		// 	brid := mcc.GetString("branchid")

		// 	trx.Set("branchid", brid)
		// 	trx.Set("costgroup", mcc.GetString("costgroup01"))

		// 	if masterbranch.Has(brid) {
		// 		trx.Set("branchname", masterbranch[brid].(toolkit.M).GetString("name"))
		// 		trx.Set("brancharea", masterbranch[brid].(toolkit.M).GetString("area"))
		// 	}
		// }

		accdesc := trx.GetString("accountdescription")
		trx.Set("accountgroup", masteraccountgroup.GetString(accdesc))

		// if trx.GetString("costgroup") == "" {
		// 	trx.Set("costgroup", "OTHER")
		// }

		// if trx.GetString("branchname") == "" {
		// 	trx.Set("branchname", "OTHER")
		// }

		// if trx.GetString("brancharea") == "" {
		// 	trx.Set("brancharea", "OTHER")
		// }

		if trx.GetString("accountgroup") == "" {
			trx.Set("accountgroup", "OTHER")
		}

		err := qSave.Exec(toolkit.M{}.Set("data", trx))
		if err != nil {
			toolkit.Println(err)
		}

		result <- 1
	}
}
