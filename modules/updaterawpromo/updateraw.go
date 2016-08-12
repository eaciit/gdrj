package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	// "strings"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0     time.Time
	gtable string
)

var masters = toolkit.M{}

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

func prepmaster4cogsperunitcontribperunit() {
	toolkit.Println("--> Master Ratio salespls-summary-4cogssga-1.1")

	// filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().From("salespls-summary-4cogssga-1.1").Cursor(nil)
	defer csr.Close()
	ratio := toolkit.M{}

	scount := csr.Count()
	iscount := 0
	step := getstep(scount) * 20

	t1 := time.Now()
	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		key := toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"), dtkm.GetString("product_skuid"))
		v := ratio.GetFloat64(key) + tkm.GetFloat64("PL74B")
		ratio.Set(key, v)

		iscount++
		if iscount%step == 0 {
			toolkit.Printfn("Reading %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
				time.Since(t1).String())
		}
	}

	i := 0
	for k, v := range ratio {
		i++
		toolkit.Println("RATIO : ", k, " : ", v)
		if i > 15 {
			break
		}
	}

	masters.Set("ratiocogscontrib", ratio)

}

func generatedata4tructanalysis() {

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()
	t0 := time.Now()

	toolkit.Println("Start data query...")
	csr, _ := workerconn.NewQuery().Select().From(gtable).Cursor(nil)
	defer csr.Close()

	scount := csr.Count()

	iscount := 0
	step := getstep(scount) * 10

	dataresults := toolkit.M{}
	listkey := []toolkit.M{toolkit.M{}, toolkit.M{}, toolkit.M{}, toolkit.M{}, toolkit.M{}}

	for {

		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		date := tkm.Get("date", time.Time{}).(time.Time)
		gdrjdate := gdrj.NewDate(date.Year(), int(date.Month()), date.Day())
		branchid := tkm.GetString("branchid")

		// key := toolkit.M{}.Set("branchid", branchid).
		// 	Set("fiscal", gdrjdate.Fiscal).
		// 	Set("month", date.Month()).
		// 	Set("year", date.Year())

		arrid := []string{toolkit.Sprintf("%s_%s_%d_%d", branchid, gdrjdate.Fiscal, date.Month(), date.Year()),
			toolkit.Sprintf("%s_%d_%d", gdrjdate.Fiscal, date.Month(), date.Year()),
			toolkit.Sprintf("%s_%s", branchid, gdrjdate.Fiscal),
			toolkit.Sprintf("%s", branchid),
			toolkit.Sprintf("%s", gdrjdate.Fiscal),
		}

		arrkey := []toolkit.M{toolkit.M{}.Set("branchid", branchid).Set("fiscal", gdrjdate.Fiscal).Set("month", date.Month()).Set("year", date.Year()),
			toolkit.M{}.Set("fiscal", gdrjdate.Fiscal).Set("month", date.Month()).Set("year", date.Year()),
			toolkit.M{}.Set("branchid", branchid).Set("fiscal", gdrjdate.Fiscal),
			toolkit.M{}.Set("branchid", branchid),
			toolkit.M{}.Set("fiscal", gdrjdate.Fiscal),
		}

		for i, _ := range arrid {
			tdata := dataresults.Get(arrid[i], toolkit.M{}).(toolkit.M)
			toutlet := tdata.Get("outlet", toolkit.M{}).(toolkit.M)
			ttruct := tdata.Get("truct", toolkit.M{}).(toolkit.M)

			outletid := toolkit.Sprintf("%s_%s", branchid, tkm.GetString("outletid"))
			truckid := tkm.GetString("truckid")

			toutlet.Set(outletid, 1)
			ttruct.Set(truckid, 1)

			tdata.Set("key", arrkey[i])
			tdata.Set("outlet", toutlet)
			tdata.Set("truct", ttruct)
			dataresults.Set(arrid[i], tdata)

			listkey[i].Set(arrid[i], 1)
		}

		iscount++
		if iscount%step == 0 {
			toolkit.Printfn("Read %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
				time.Since(t0).String())
		}

	}

	scount = len(dataresults)
	iscount = 0
	step = getstep(scount) * 10
	for k, arrkey := range listkey {
		qSave := workerconn.NewQuery().
			From(toolkit.Sprintf("%s-4analysisidea-%d", gtable, k)).
			SetConfig("multiexec", true).
			Save()

		for key, _ := range arrkey {
			tdataresult := dataresults.Get(key, toolkit.M{}).(toolkit.M)
			toutlet := tdataresult.Get("outlet", toolkit.M{}).(toolkit.M)
			ttruct := tdataresult.Get("truct", toolkit.M{}).(toolkit.M)
			tkey := tdataresult.Get("key", toolkit.M{}).(toolkit.M)

			tkm := toolkit.M{}
			tkm.Set("_id", key)
			tkm.Set("key", tkey)
			tkm.Set("numoutlet", len(toutlet))
			tkm.Set("numtruct", len(ttruct))

			branchid := tkey.GetString("branchid")
			if branchid != "" {
				branchgroup := masterbranch.Get(branchid, toolkit.M{}).(toolkit.M)
				tkm.Set("branchname", branchgroup.GetString("name"))
				tkm.Set("branchgroup", branchgroup.GetString("branchgroup"))
				tkm.Set("branchlvl2", branchgroup.GetString("branchlvl2"))
				tkm.Set("idbranchlvl2", branchgroup.GetString("idbranchlvl2"))
			}

			err := qSave.Exec(toolkit.M{}.Set("data", tkm))
			if err != nil {
				toolkit.Println(err)
			}

			iscount++
			if iscount%step == 0 {
				toolkit.Printfn("Saved %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
					time.Since(t0).String())
			}
		}
	}

	toolkit.Println("Generated Done in : ", time.Since(t0).String())
	os.Exit(1)
}

func main() {
	t0 = time.Now()
	flag.StringVar(&gtable, "table", "", "tablename")
	// flag.IntVar(&year, "year", 2014, "2014 year")
	flag.Parse()

	gtable = "salespls-summary-4custinv_count-1.0-salesinvoice"

	setinitialconnection()
	prepdatabranch()
	// prepdatacostcenter()
	// prepdataaccountgroup()
	// prepdatabranchgroup()
	// generatedata4tructanalysis()

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
	// f := dbox.Eq("key.date_fiscal", "2014-2015")
	csr, _ := workerconn.NewQuery().Select().From(gtable).Cursor(nil)
	defer csr.Close()

	scount := csr.Count()

	jobs := make(chan toolkit.M, scount)
	result := make(chan int, scount)
	for wi := 0; wi < 10; wi++ {
		go workersave(wi, jobs, result)
	}

	iscount := 0
	step := getstep(scount) * 10

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
		From(toolkit.Sprintf("%s-mv", gtable)).
		SetConfig("multiexec", true).
		Save()

	trx := toolkit.M{}
	for trx = range jobs {
		// date := gdrj.NewDate(trx.GetInt("Year"), trx.GetInt("Month"), 1)
		// trx.Set("gdrj_fiscal", date.Fiscal)
		key := trx.Get("_id", toolkit.M{}).(toolkit.M)
		trx.Set("key", key)

		id := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s", key.GetString("date_fiscal"),
			key.GetInt("date_month"), key.GetInt("date_year"), key.GetString("customer_branchid"),
			key.GetString("customer_branchname"), key.GetString("customer_channelid"),
			key.GetString("customer_custtype"), key.GetString("customer_reportsubchannel"), key.GetString("customer_channelname"), key.GetString("customer_reportchannel"),
			key.GetString("customer_keyaccount"), key.GetString("customer_customergroupname"), key.GetString("customer_customergroup"),
			key.GetString("customer_areaname"), key.GetString("customer_region"), key.GetString("customer_zone"),
			key.GetString("trxsrc"), key.GetString("source"), key.GetString("ref"))

		trx.Set("_id", id)

		// // tdate := time.Date(trx.GetInt("year"), time.Month(trx.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).
		// // 	AddDate(0, 3, 0)
		// // gdrjdate := gdrj.SetDate(tdate)

		// // trx.Set("gdrjdate", gdrjdate)

		// cc := trx.GetString("ccid")
		// // trx.Set("branchid", "CD00")
		// // trx.Set("branchname", "OTHER")
		// // trx.Set("brancharea", "OTHER")
		// // trx.Set("costgroup", "OTHER")
		// // trx.Set("accountgroup", "OTHER")
		// // trx.Set("branchgroup", "OTHER")

		// // key.Set("customer_branchgroup", "OTHER")

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

		// // branchid := trx.GetString("branchid")
		// if trx.GetString("accountdescription") == "#N/A" {
		// 	trx.Set("accountdescription", "CONSUMABLE STORES & SPARES")
		// }

		// if trx.GetString("grouping") == "#N/A" {
		// 	trx.Set("grouping", "General and administrative expenses")
		// }

		// accdesc := trx.GetString("accountdescription")
		// trx.Set("accountgroup", masteraccountgroup.GetString(accdesc))

		// arrstrcheck := []string{"branchid", "branchname", "brancharea", "costgroup", "accountgroup", "branchgroup"}
		// for _, v := range arrstrcheck {
		// 	if trx.GetString(v) == "" {
		// 		trx.Set(v, "OTHER")
		// 		if v == "branchid" {
		// 			trx.Set(v, "CD00")
		// 		}
		// 	}
		// }

		// trx.Set("addinfo", "")
		// if trx.GetString("branchid") == "HD11" && strings.Contains(trx.GetString("costcentername"), "Jkt") {
		// 	trx.Set("addinfo", "Jakarta")
		// }

		// trx.Set("iselimination", false)
		// if trx.GetString("src") == "ELIMINATION_SGA" {
		// 	trx.Set("iselimination", true)
		// }
		// //=== For data rawdata mode

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

		// //idbranchlvl2

		// //===========================================

		// //=== For data salespls-summary mode consolidate

		// // key := trx.Get("key", toolkit.M{}).(toolkit.M)
		// // branchid := key.GetString("customer_branchid")

		// // branchgroup := masterbranch.Get(branchid, toolkit.M{}).(toolkit.M)
		// // key.Set("customer_branchgroup", branchgroup.GetString("branchgroup"))
		// // key.Set("customer_branchlvl2", branchgroup.GetString("branchlvl2"))

		// // if key.GetString("customer_branchgroup") == "" {
		// // 	key.Set("customer_branchgroup", "OTHER")
		// // }

		// // if key.GetString("customer_branchlvl2") == "" {
		// // 	key.Set("customer_branchlvl2", "OTHER")
		// // }

		// // /*other fix*/
		// // if key.GetString("customer_reportsubchannel") == "R3" {
		// // 	key.Set("customer_reportsubchannel", "R3 - Retailer Umum")
		// // }

		// // if key.GetString("customer_region") == "" || key.GetString("customer_region") == "Other" {
		// // 	key.Set("customer_region", "OTHER")
		// // }

		// // if key.GetString("customer_zone") == "" || key.GetString("customer_zone") == "Other" {
		// // 	key.Set("customer_zone", "OTHER")
		// // }

		// // trx.Set("key", key)
		// //============================================

		// // For cogs consolidate
		// // arrstr := []string{"rm_perunit", "lc_perunit", "pf_perunit", "other_perunit", "fixed_perunit", "depre_perunit", "cogs_perunit"}
		// // for _, v := range arrstr {
		// // 	xval := trx.GetFloat64(v) * 6
		// // 	trx.Set(v, xval)
		// // }
		// // ====================

		// // i := 1
		// // ratio := float64(3337787.02099609) / float64(207880004972.979)
		// // key := trx.Get("key", toolkit.M{}).(toolkit.M)
		// // if key.GetString("date_fiscal") == "2014-2015" {
		// // 	for k, _ := range trx {
		// // 		arrk := strings.Split(k, "_")
		// // 		if (len(arrk) > 1 && arrk[1] == "Allocated") || k == "PL94A" {
		// // 			val := trx.GetFloat64(k)
		// // 			xval := val + (val * ratio)
		// // 			trx.Set(k, xval)
		// // 		}
		// // 	}
		// // }

		// ============================================================================
		// ============================================================================
		// ============================================================================
		// ratiocogscontrib := masters.Get("ratiocogscontrib", toolkit.M{}).(toolkit.M)
		// key := toolkit.Sprintf("%d_%d_%s", trx.GetInt("year"), trx.GetInt("month"), trx.GetString("sapcode"))

		// salesexist := false
		// if ratiocogscontrib.Has(key) {
		// 	salesexist = true
		// }

		// date := gdrj.NewDate(trx.GetInt("year"), trx.GetInt("month"), 1)

		// ntrx := toolkit.M{}
		// ntrx.Set("_id", toolkit.Sprintf("%s-%s", key, toolkit.RandomString(5)))
		// ntrx.Set("key", key)
		// ntrx.Set("gdrj_fiscal", date.Fiscal)
		// ntrx.Set("c_year", trx.GetInt("year"))
		// ntrx.Set("c_month", trx.GetInt("month"))
		// ntrx.Set("c_skuid", trx.GetString("sapcode"))
		// ntrx.Set("c_cogs", trx.GetFloat64("cogs_amount"))
		// ntrx.Set("salesexist", salesexist)
		// ntrx.Set("cogscontrib", ratiocogscontrib.GetFloat64(key))
		// ============================================================================
		// ============================================================================

		err := qSave.Exec(toolkit.M{}.Set("data", trx))
		if err != nil {
			toolkit.Println(err)
		}

		result <- 1
	}
}
