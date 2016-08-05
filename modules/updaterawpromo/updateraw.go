package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"strings"
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

// var masterbranchgroup = toolkit.M{}
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

func prepdatabranchgroup() {
	toolkit.Println("--> Get branch group")

	// filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().From("masterbranchgroup").Cursor(nil)
	defer csr.Close()

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		masterbranchgroup.Set(tkm.GetString("_id"), tkm)
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
	// flag.IntVar(&year, "year", 2014, "2014 year")
	flag.Parse()

	setinitialconnection()

	prepdatabranch()
	// prepdatacostcenter()
	prepdataaccountgroup()
	// prepdatabranchgroup()

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	toolkit.Println("Start data query...")
	// arrfilter := []*dbox.Filter{}
	// for i := 4; i < 10; i++ {
	// 	toolkit.Printfn("%d - 2014", i)
	// 	f := dbox.And(dbox.Eq("year", 2014), dbox.Eq("month", i))
	// 	arrfilter = append(arrfilter, f)
	// }

	// f := dbox.Or(arrfilter...)
	f := dbox.Eq("key.date_fiscal", "2014-2015")
	csr, _ := workerconn.NewQuery().Select().Where(f).From(gtable).Cursor(nil)
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
		// key := trx.Get("_id", toolkit.M{}).(toolkit.M)
		// trx.Set("key", key)

		// id := toolkit.Sprintf("%d|%s|%s|%s|%s|%s|%s|%s", key.GetInt("year"), key.GetString("branchid"),
		// 	key.GetString("branchname"), key.GetString("brancharea"), key.GetString("account"),
		// 	key.GetString("accountdescription"), key.GetString("costgroup"), key.GetString("addinfo"))

		// trx.Set("_id", id)

		// tdate := time.Date(trx.GetInt("year"), time.Month(trx.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).
		// 	AddDate(0, 3, 0)
		// gdrjdate := gdrj.SetDate(tdate)

		// trx.Set("gdrjdate", gdrjdate)

		// cc := trx.GetString("ccid")
		// trx.Set("branchid", "CD00")
		// trx.Set("branchname", "OTHER")
		// trx.Set("brancharea", "OTHER")
		// trx.Set("costgroup", "OTHER")
		// trx.Set("accountgroup", "OTHER")
		// trx.Set("branchgroup", "OTHER")

		// key.Set("customer_branchgroup", "OTHER")

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

		// branchid := trx.GetString("branchid")

		// accdesc := trx.GetString("accountdescription")
		// trx.Set("accountgroup", masteraccountgroup.GetString(accdesc))

		// if trx.GetString("costgroup") == "" {
		// 	trx.Set("costgroup", "OTHER")
		// }

		// if trx.GetString("branchname") == "" {
		// 	trx.Set("branchname", "OTHER")
		// }

		// if trx.GetString("brancharea") == "" {
		// 	trx.Set("brancharea", "OTHER")
		// }

		// if trx.GetString("accountgroup") == "" {
		// 	trx.Set("accountgroup", "OTHER")
		// }

		// if trx.GetString("branchgroup") == "" {
		// 	trx.Set("branchgroup", "OTHER")
		// }

		// if trx.GetString("accountdescription") == "#N/A" {
		// 	trx.Set("accountdescription", "CONSUMABLE STORES & SPARES")
		// }

		// if trx.GetString("grouping") == "#N/A" {
		// 	trx.Set("grouping", "General and administrative expenses")
		// }

		//=== For data rawdata mode

		// branchid := trx.GetString("branchid")
		// if !masterbranch.Has(branchid) {
		// 	branchid = "CD00"
		// }

		// branchgroup := masterbranch.Get(branchid, toolkit.M{}).(toolkit.M)
		// trx.Set("branchgroup", branchgroup.GetString("branchgroup"))
		// trx.Set("branchlvl2", branchgroup.GetString("branchlvl2"))
		// trx.Set("idbranchlvl2", branchgroup.GetString("idbranchlvl2"))

		// if branchid == "HD11" && trx.GetString("addinfo") == "Jakarta" && trx.GetString("ccid") != "HD110313" {
		// 	trx.Set("branchgroup", "Jakarta")
		// }

		// if trx.GetString("branchgroup") == "" {
		// 	trx.Set("branchgroup", "OTHER")
		// }

		// if trx.GetString("branchlvl2") == "" {
		// 	trx.Set("branchlvl2", "OTHER")
		// }

		//idbranchlvl2

		//===========================================

		//=== For data salespls-summary mode consolidate

		// key := trx.Get("key", toolkit.M{}).(toolkit.M)
		// branchid := key.GetString("customer_branchid")

		// branchgroup := masterbranch.Get(branchid, toolkit.M{}).(toolkit.M)
		// key.Set("customer_branchgroup", branchgroup.GetString("branchgroup"))
		// key.Set("customer_branchlvl2", branchgroup.GetString("branchlvl2"))

		// if key.GetString("customer_branchgroup") == "" {
		// 	key.Set("customer_branchgroup", "OTHER")
		// }

		// if key.GetString("customer_branchlvl2") == "" {
		// 	key.Set("customer_branchlvl2", "OTHER")
		// }

		// /*other fix*/
		// if key.GetString("customer_reportsubchannel") == "R3" {
		// 	key.Set("customer_reportsubchannel", "R3 - Retailer Umum")
		// }

		// if key.GetString("customer_region") == "" || key.GetString("customer_region") == "Other" {
		// 	key.Set("customer_region", "OTHER")
		// }

		// if key.GetString("customer_zone") == "" || key.GetString("customer_zone") == "Other" {
		// 	key.Set("customer_zone", "OTHER")
		// }

		// trx.Set("key", key)
		//============================================

		// For cogs consolidate
		// arrstr := []string{"rm_perunit", "lc_perunit", "pf_perunit", "other_perunit", "fixed_perunit", "depre_perunit", "cogs_perunit"}
		// for _, v := range arrstr {
		// 	xval := trx.GetFloat64(v) * 6
		// 	trx.Set(v, xval)
		// }
		// ====================

		// trx.Set("addinfo", "")
		// if trx.GetString("branchid") == "HD11" && strings.Contains(trx.GetString("costcentername"), "Jkt") {
		// 	trx.Set("addinfo", "Jakarta")
		// }

		// i := 1
		ratio := float64(3337787021) / float64(207883342760)
		key := trx.Get("key", toolkit.M{}).(toolkit.M)
		if key.GetString("date_fiscal") == "2014-2015" {
			for k, _ := range trx {
				arrk := strings.Split(k, "_")
				if (len(arrk) > 1 && arrk[1] == "Allocated") || k == "PL94A" {
					// i++
					val := trx.GetFloat64(k)
					xval := val + (val * ratio)
					trx.Set(k, xval)
					// if i < 20 {
					// 	toolkit.Println(k, " : ", val, " - > ", xval, " || ", ratio)
					// }
				}
			}
		}

		err := qSave.Exec(toolkit.M{}.Set("data", trx))
		if err != nil {
			toolkit.Println(err)
		}

		result <- 1
	}
}
