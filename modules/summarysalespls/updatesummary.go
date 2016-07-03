package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
	masters                     = toolkit.M{}
)

func buildmap(holder interface{},
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

func prepmastercalc() {
	toolkit.Println("--> PL MODEL")
	masters.Set("plmodel", buildmap(map[string]*gdrj.PLModel{},
		func() orm.IModel {
			return new(gdrj.PLModel)
		},
		nil,
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.PLModel)
			o := obj.(*gdrj.PLModel)
			h[o.ID] = o
		}).(map[string]*gdrj.PLModel))
}

func prepmasterrevadv() {
	toolkit.Println("--> Advertisement Revision")
	advertisements := toolkit.M{}

	csradv, _ := conn.NewQuery().From("rawdatapl_ads30062016").
		Where(dbox.Eq("year", fiscalyear-1)).
		Cursor(nil)

	defer csradv.Close()
	for {
		m := toolkit.M{}
		e := csradv.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		Date := time.Date(m.GetInt("year"), time.Month(m.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		key := toolkit.Sprintf("%d_%d", Date.Year(), Date.Month())

		if len(m.GetString("brand")) > 2 {
			key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("brand"))))
		}

		tadv := toolkit.M{}
		if advertisements.Has(key) {
			tadv = advertisements.Get(key).(toolkit.M)
		}

		skey := "PL28I"
		tstr := strings.TrimSpace(strings.ToUpper(m.GetString("accountdescription")))
		switch tstr {
		case "ADVERTISEMENT - INTERNET":
			skey = "PL28A"
		case "ADVERTISEMENT - PRODN - DESIGN - DVLOPMNT":
			skey = "PL28B"
		case "ADVERTISEMENT - TV":
			skey = "PL28C"
		case "MARKET RESEARCH":
			skey = "PL28D"
		case "FAIRS & EVENTS":
			skey = "PL28E"
		case "AGENCY FEES":
			skey = "PL28F"
		case "ADVERTISEMENT - POP MATERIALS":
			skey = "PL28G"
		case "SPONSORSHIP":
			skey = "PL28H"
		}

		v := tadv.GetFloat64(skey) + m.GetFloat64("amountinidr")
		tadv.Set(skey, v)
		advertisements[key] = tadv
	}

	masters.Set("advertisements", advertisements)
}

func prepmasterratio() {
	toolkit.Println("--> Master Ratio")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary").Cursor(nil)
	defer csr.Close()
	ratio := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		key := toolkit.Sprintf("%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
		keybrand := toolkit.Sprintf("%s_%s", key, dtkm.GetString("product_brand"))

		v := ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		v = ratio.GetFloat64(keybrand) + tkm.GetFloat64("grossamount")
		ratio.Set(keybrand, v)
	}

	masters.Set("ratio", ratio)
}

func prepmastersalesreturn() {
	toolkit.Println("--> Sales Return")
	salesreturns := toolkit.M{}

	csrsr, _ := conn.NewQuery().From("salestrxs-return").
		Where(dbox.Eq("fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))).
		Cursor(nil)

	defer csrsr.Close()
	for {
		m := toolkit.M{}
		e := csrsr.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		ctkm, _ := toolkit.ToM(m.Get("customer"))
		ptkm, _ := toolkit.ToM(m.Get("product"))

		key := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
			m.GetString("fiscal"), m.GetInt("month"), m.GetInt("year"),
			ctkm.GetString("branchid"), ctkm.GetString("branchname"), ctkm.GetString("keyaccount"),
			ctkm.GetString("channelid"), ctkm.GetString("channelname"), ctkm.GetString("reportchannel"),
			ctkm.GetString("reportsubchannel"), ctkm.GetString("zone"), ctkm.GetString("region"),
			ctkm.GetString("areaname"), ctkm.GetString("customergroup"), ctkm.GetString("customergroupname"),
			ctkm.GetString("custtype"), ptkm.GetString("brand"), "VDIST", "", "")

		v := m.GetFloat64("grossamount") + salesreturns.GetFloat64(key)
		salesreturns.Set(key, v)

	}

	i := 0
	for k, v := range salesreturns {
		toolkit.Println(k, " : ", v)
		i++
		if i == 5 {
			break
		}
	}

	masters.Set("salesreturns", salesreturns)
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
	data = make(map[string]float64)
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.Parse()

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	setinitialconnection()
	defer gdrj.CloseDb()

	prepmastersalesreturn()
	// prepmasterratio()
	// prepmastercalc()
	// prepmasterrevadv()

	toolkit.Println("Start data query...")
	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := workerconn.NewQuery().Select().Where(filter).From("salespls-summary").Cursor(nil)
	defer csr.Close()

	scount = csr.Count()

	jobs := make(chan toolkit.M, scount)
	result := make(chan int, scount)
	for wi := 0; wi < 10; wi++ {
		go workersave(wi, jobs, result)
	}

	iscount = 0
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

func CleanAddCustomerGroupName(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	dtkm.Set("customer_customergroupname", dtkm.GetString("customer_groupname"))
	tkm.Set("key", dtkm)
}

func CalcRatio(tkm toolkit.M) {
	if !masters.Has("ratio") {
		return
	}

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	ratio := masters.Get("ratio").(toolkit.M)

	keymonth := toolkit.Sprintf("%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
	keymonthbrand := toolkit.Sprintf("%s_%s", keymonth, dtkm.GetString("product_brand"))

	rtkm := toolkit.M{}
	rtkm.Set("month", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(keymonth)))
	rtkm.Set("monthbrand", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(keymonthbrand)))

	tkm.Set("ratio", rtkm)
}

func CalcRoyalties(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	netsales := tkm.GetFloat64("PL8A")

	if dtkm.GetString("date_fiscal") == "2015-2016" {
		tkm.Set("PL25", -netsales*0.0285214610603953)
	} else {
		tkm.Set("PL25", -netsales*0.0282568801711491)
	}
}

func CalcAdvertisementsRev(tkm toolkit.M) {
	if !masters.Has("advertisements") {
		return
	}

	tkm.Set("PL28", float64(0)).Set("PL28A", float64(0)).Set("PL28B", float64(0)).Set("PL28C", float64(0)).Set("PL28D", float64(0)).
		Set("PL28E", float64(0)).Set("PL28F", float64(0)).Set("PL28G", float64(0)).Set("PL28H", float64(0)).Set("PL28I", float64(0))

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	dratio, _ := toolkit.ToM(tkm.Get("ratio"))

	advertisements := masters.Get("advertisements").(toolkit.M)

	tkm01 := toolkit.M{}
	tkm02 := toolkit.M{}

	key01 := toolkit.Sprintf("%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
	if advertisements.Has(key01) {
		tkm01 = advertisements.Get(key01).(toolkit.M)
	}

	if len(dtkm.GetString("product_brand")) > 2 {
		key02 := toolkit.Sprintf("%s_%s", key01, dtkm.GetString("product_brand"))
		if advertisements.Has(key02) {
			tkm02 = advertisements.Get(key02).(toolkit.M)
		}
	}

	for k, v := range tkm01 {
		fv := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto) * -dratio.GetFloat64("month")
		fv += tkm.GetFloat64(k)
		tkm.Set(k, fv)
	}

	for k, v := range tkm02 {
		fv := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto) * -dratio.GetFloat64("monthbrand")
		fv += tkm.GetFloat64(k)
		tkm.Set(k, fv)
	}

	return
}

func CalcSalesReturn(tkm toolkit.M) {
	if !masters.Has("salesreturns") {
		return
	}

	tkm.Set("salesreturn", float64(0))

	dtkm, _ := toolkit.ToM(tkm.Get("key"))

	salesreturns := masters.Get("salesreturns").(toolkit.M)
	key := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
		dtkm.GetString("date_fiscal"), dtkm.GetInt("date_month"), dtkm.GetInt("date_year"),
		dtkm.GetString("customer_branchid"), dtkm.GetString("customer_branchname"), dtkm.GetString("customer_keyaccount"),
		dtkm.GetString("customer_channelid"), dtkm.GetString("customer_channelname"), dtkm.GetString("customer_reportchannel"),
		dtkm.GetString("customer_reportsubchannel"), dtkm.GetString("customer_zone"), dtkm.GetString("customer_region"),
		dtkm.GetString("customer_areaname"), dtkm.GetString("customer_customergroup"), dtkm.GetString("customer_customergroupname"),
		dtkm.GetString("customer_custtype"), dtkm.GetString("brand"), dtkm.GetString("trxsrc"),
		dtkm.GetString("source"), dtkm.GetString("ref"))

	toolkit.Println(key)

	tkm.Set("salesreturn", salesreturns.GetFloat64(key))

	return
}

func CalcSalesVDist20142015(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("trxsrc") != "VDIST" || dtkm.GetString("date_fiscal") != "2014-2015" {
		return
	}

	if dtkm.GetString("customer_channelid") == "I1" {
		v := tkm.GetFloat64("discountamount")
		tkm.Set("PL8", -v)
	} else {
		v := tkm.GetFloat64("discountamount")
		tkm.Set("PL7", -v)
	}
}

func CalcSum(tkm toolkit.M) {
	var netsales, cogs, grossmargin, sellingexpense,
		sga, opincome, directexpense, indirectexpense,
		royaltiestrademark, advtpromoexpense, operatingexpense,
		freightexpense, nonoprincome, ebt, taxexpense,
		percentpbt, eat, totdepreexp, damagegoods, ebitda, ebitdaroyalties, ebitsga,
		grosssales, discount, advexp, promoexp, spgexp float64

	exclude := []string{"PL8A", "PL14A", "PL74A", "PL26A", "PL32A", "PL39A", "PL41A", "PL44A",
		"PL74B", "PL74C", "PL32B", "PL94B", "PL94C", "PL39B", "PL41B", "PL41C", "PL44B", "PL44C", "PL44D", "PL44E",
		"PL44F", "PL6A", "PL0", "PL28", "PL29A", "PL31", "PL94A"}

	plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)

	inexclude := func(f string) bool {
		for _, v := range exclude {
			if v == f {
				return true
			}
		}

		return false
	}

	for k, v := range tkm {
		if k == "_id" || k == "key" {
			continue
		}

		ar01k := strings.Split(k, "_")

		if inexclude(ar01k[0]) {
			continue
		}

		plmodel, exist := plmodels[ar01k[0]]
		if !exist {
			// toolkit.Println(k)
			continue
		}
		Amount := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto)
		switch plmodel.PLHeader1 {
		case "Net Sales":
			netsales += Amount
		case "Direct Expense":
			directexpense += Amount
		case "Indirect Expense":
			indirectexpense += Amount
		case "Freight Expense":
			freightexpense += Amount
		case "Royalties & Trademark Exp":
			royaltiestrademark += Amount
		case "Advt & Promo Expenses":
			advtpromoexpense += Amount
		case "G&A Expenses":
			sga += Amount
		case "Non Operating (Income) / Exp":
			nonoprincome += Amount
		case "Tax Expense":
			taxexpense += Amount
		case "Total Depreciation Exp":
			if plmodel.PLHeader2 == "Damaged Goods" {
				damagegoods += Amount
			} else {
				totdepreexp += Amount
			}
		}

		// switch v.Group2 {
		switch plmodel.PLHeader2 {
		case "Gross Sales":
			grosssales += Amount
		case "Discount":
			discount += Amount
		case "Advertising Expenses":
			advexp += Amount
		case "Promotions Expenses":
			promoexp += Amount
		case "SPG Exp / Export Cost":
			spgexp += Amount
		}
	}

	cogs = directexpense + indirectexpense
	grossmargin = netsales + cogs
	sellingexpense = freightexpense + royaltiestrademark + advtpromoexpense
	operatingexpense = sellingexpense + sga
	opincome = grossmargin + operatingexpense
	ebt = opincome + nonoprincome //asume nonopriceincome already minus
	percentpbt = 0
	if ebt != 0 {
		percentpbt = taxexpense / ebt * 100
	}
	eat = ebt + taxexpense
	ebitda = totdepreexp + damagegoods + opincome
	ebitdaroyalties = ebitda - royaltiestrademark
	ebitsga = opincome - sga
	ebitsgaroyalty := ebitsga - royaltiestrademark

	tkm.Set("PL0", grosssales)
	tkm.Set("PL6A", discount)
	tkm.Set("PL8A", netsales)
	tkm.Set("PL14A", directexpense)
	tkm.Set("PL74A", indirectexpense)
	tkm.Set("PL26A", royaltiestrademark)
	tkm.Set("PL32A", advtpromoexpense)
	tkm.Set("PL94A", sga)
	tkm.Set("PL39A", nonoprincome)
	tkm.Set("PL41A", taxexpense)
	tkm.Set("PL44A", totdepreexp)

	tkm.Set("PL28", advexp)
	tkm.Set("PL29A", promoexp)
	tkm.Set("PL31", spgexp)
	tkm.Set("PL74B", cogs)
	tkm.Set("PL74C", grossmargin)
	tkm.Set("PL32B", sellingexpense)
	tkm.Set("PL94B", operatingexpense)
	tkm.Set("PL94C", opincome)
	tkm.Set("PL39B", ebt)
	tkm.Set("PL41B", percentpbt)
	tkm.Set("PL41C", eat)
	tkm.Set("PL44B", opincome)
	tkm.Set("PL44C", ebitda)
	tkm.Set("PL44D", ebitdaroyalties)
	tkm.Set("PL44E", ebitsga)
	tkm.Set("PL44F", ebitsgaroyalty)
}

func workersave(wi int, jobs <-chan toolkit.M, result chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary").
		SetConfig("multiexec", true).
		Save()

	trx := toolkit.M{}
	for trx = range jobs {
		CalcSalesReturn(trx)
		// CleanAddCustomerGroupName(trx)
		// CalcRatio(trx)
		// CalcAdvertisementsRev(trx)
		// CalcRoyalties(trx)
		// CalcSalesVDist20142015(trx)
		// CalcSum(trx)

		err := qSave.Exec(toolkit.M{}.Set("data", trx))
		if err != nil {
			toolkit.Println(err)
		}

		result <- 1
	}
}
