package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"math"
	"strings"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

var conn dbox.IConnection
var count int
var ratioTableName string

var (
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
	masters                     = toolkit.M{}
)

type promoratio struct {
	SPG, Promo float64
}

var promoElementRatios = map[string]promoratio{
	"2014-2015": promoratio{0.19152315, 0.80847685},
	"2015-2016": promoratio{0.2221404765, 0.7778683875},
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

type plalloc struct {
	Key      string
	Current  float64
	Expect   float64
	Absorbed float64
}

var plallocs = map[string]*plalloc{}
var salestotals = map[string]*plalloc{}

func main() {
	t0 = time.Now()

	setinitialconnection()
	defer gdrj.CloseDb()
	prepmastercalc()

	toolkit.Println("Start data query...")
	tablenames := []string{
		"salespls-summary"}

	for _, tn := range tablenames {
		e := buildRatio(tn)
		if e != nil {
			toolkit.Printfn("Build ratio error: %s - %s", tn, e.Error())
			return
		}

		e = processTable(tn)
		if e != nil {
			toolkit.Printfn("Process table error: %s - %s", tn, e.Error())
			return
		}
	}
}

func buildRatio(tn string) error {
	cursor, _ := conn.NewQuery().From(tn).
		//Where(dbox.Eq("key.trxsrc", "VDIST"), dbox.Eq("key.customer_reportchannel", "RD")).
		//Where(dbox.Eq("key.date_fiscal", "2014-2015")).
		Select().Cursor(nil)
	defer cursor.Close()

	tstart := time.Now()
	count := cursor.Count()
	current := 0
	i := 0
	for {
		mr := toolkit.M{}
		if e := cursor.Fetch(&mr, 1, false); e != nil {
			break
		}

		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		//yr := key.GetInt("date_year")
		//mth := key.GetInt("date_month")
		fiscal := key.GetString("date_fiscal")
		kc := key.GetString("customer_customergroup")

		if kc != "" {
			keysales := toolkit.Sprintf("%s_%s", fiscal, kc)
			salesvalue := mr.GetFloat64("PL8A")
			salestotal := salestotals[keysales]
			if salestotal == nil {
				salestotal = new(plalloc)
				salestotal.Key = keysales
			}
			salestotal.Current += salesvalue
			salestotals[keysales] = salestotal
		}
		i++
		current = makeProgressLog("Build Sales Ratio", i, count, 5, current, tstart)
	}

	//rawdatapl_promospg11072016_target
	ctarget, _ := conn.NewQuery().From("rawdatapl_promospg11072016_target").
		Select().Cursor(nil)
	defer ctarget.Close()

	tstart = time.Now()
	count = ctarget.Count()
	current = 0
	i = 0

	for {
		mr := toolkit.M{}
		if e := ctarget.Fetch(&mr, 1, false); e != nil {
			break
		}

		yr := mr.GetInt("year")
		//mth := mr.GetInt("period")
		//dt := gdrj.NewDate(yr, mth, 1)
		/*
			        			dt := time.Date(yr, time.Month(mth), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
								yr = dt.Year()
								mth = int(dt.Month())
		*/
		//fiscal := dt.Fiscal
		fiscal := toolkit.Sprintf("%d-%d", yr, yr+1)
		promoratios := promoElementRatios[fiscal]
		kc := mr.GetString("keyaccountcode")

		if kc != "" {
			gl := mr.GetString("account")
			promovalue := mr.GetFloat64("amountinidr_target")
			for _, v := range []string{"spg", "promo"} {
				keypromo := toolkit.Sprintf("%s_%s_%s_%s", fiscal, kc, gl, v)
				alloc := plallocs[keypromo]
				if alloc == nil {
					alloc = new(plalloc)
					alloc.Key = keypromo
				}
				multi := promoratios.SPG
				if v != "spg" {
					multi = promoratios.Promo
				}
				alloc.Expect += promovalue * multi
				plallocs[keypromo] = alloc
			}
		}
		i++
		current = makeProgressLog("Build Promotion Ratio", i, count, 5, current, tstart)
	}

	return nil
}

func makeProgressLog(reference string, i, count, step, current int, tstart time.Time) int {
	perstep := count * step / 100
	if current == 0 {
		current = perstep
	}
	pct := i * 100 / count
	if i >= current {
		toolkit.Printfn("Processing %s, %d of %d [%d pct] in %s",
			reference, i, count, pct, time.Since(tstart).String())
		current += perstep
	}
	return current
}

func processTable(tn string) error {
	cursor, _ := conn.NewQuery().From(tn).
		//Where(dbox.Eq("key.trxsrc", "VDIST"), dbox.Eq("key.customer_reportchannel", "RD")).
		//Where(dbox.Eq("key.date_fiscal", "2015-2016"), dbox.Eq("key.customer_customergroup", "CR")).
		//Where(dbox.Eq("key.date_fiscal", "2014-2015")).
		Select().Cursor(nil)
	defer cursor.Close()

	plmodels := masters["plmodel"].(map[string]*gdrj.PLModel)
	count := cursor.Count()
	i := 0
	step := count / 20
	mstone := step
	absorsedsales := float64(0)
	for {
		mr := toolkit.M{}
		ef := cursor.Fetch(&mr, 1, false)
		if ef != nil {
			break
		}

		i++
		if i >= mstone {
			pct := i * 100 / count
			toolkit.Printfn("Processing %s, %d of %d [%d pct] in %s",
				tn, i, count, pct, time.Since(t0).String())
			mstone += step
		}

		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		kc := key.GetString("customer_customergroup")
		//year := key.GetInt("date_year")
		//month := key.GetInt("date_month")
		fiscal := key.GetString("date_fiscal")

		sales := mr.GetFloat64("PL8A")
		absorsedsales += sales
		//keysales := toolkit.Sprintf("%d_%d_%s", year, month, kc)
		keysales := toolkit.Sprintf("%s_%s", fiscal, kc)
		salestotal := salestotals[keysales]

		//plmodelcheck := ""
		for k, plmodel := range plmodels {
			//plmodel := plmodels[k]
			if plmodel.GLReff != "" &&
				plmodel.PLHeader1 == "Advt & Promo Expenses" {
				newv := float64(0)
				//keypromo := toolkit.Sprintf("%d_%d_%s_%s", year, month, kc, plmodel.GLReff)
				spgOrPromo := "spg"
				if !strings.HasPrefix(plmodel.PLHeader2, "SPG") {
					spgOrPromo = "promo"
				}
				keypromo := toolkit.Sprintf("%s_%s_%s_%s", fiscal, kc, plmodel.GLReff, spgOrPromo)
				alloc := plallocs[keypromo]
				if alloc != nil && salestotal != nil {
					newv = -toolkit.Div(alloc.Expect*sales, salestotal.Current)
					alloc.Absorbed += newv
					plallocs[keypromo] = alloc
					/*
						                    if plmodelcheck == "" {
												plmodelcheck = plmodel.ID
												toolkit.Printfn("Update %s - %s : %f", mr.GetString("_id"), plmodelcheck, newv)
											}
					*/
				} else if salestotal == nil {
					//toolkit.Printfn("Issue for %s %s", keysales, keypromo)
				}
				mr.Set(k, float64(newv))
			}
		}

		/*
			if mr.GetFloat64(plmodelcheck) != 0 {
				toolkit.Printfn("%s previously has value", mr.GetString("_id"))
			}
		*/

		CalcSum(mr)
		/*
			        if mr.GetFloat64(plmodelcheck) == 0 {
						toolkit.Printfn("%s after calc has no value", mr.GetString("_id"))
					}
					plmodelcheck = ""
		*/
		esave := conn.NewQuery().From(tn).Save().Exec(toolkit.M{}.Set("data", mr))
		if esave != nil {
			return esave
		}
	}

	toolkit.Printfn("Done. Sales absorsed: %f", absorsedsales)
	for k, v := range plallocs {
		if math.Abs(v.Expect+v.Absorbed) > 10 {
			toolkit.Printfn("%s: Expected: %f Absorbed: %f", k, v.Expect, v.Absorbed)
		}
	}

	return nil
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
			//toolkit.Println(k)
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

func CalcSum_(tkm toolkit.M) toolkit.M {
	var netsales, cogs, grossmargin, sellingexpense,
		sga, opincome, directexpense, indirectexpense,
		royaltiestrademark, advtpromoexpense, operatingexpense,
		freightexpense, nonoprincome, ebt, taxexpense,
		percentpbt, eat, totdepreexp, damagegoods, ebitda, ebitdaroyalties, ebitsga,
		grosssales, discount, advexp, promoexp, spgexp float64

	exclude := []string{"PL8A", "PL14A", "PL74A", "PL26A", "PL32A", "PL39A", "PL41A", "PL44A",
		"PL74B", "PL74C", "PL32B", "PL94B", "PL94C", "PL39B", "PL41B", "PL41C", "PL44B", "PL44C", "PL44D", "PL44E",
		"PL44F", "PL6A", "PL0", "PL28", "PL29A", "PL31"}
	//"PL94A",
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
		if k == "_id" {
			continue
		}

		if inexclude(k) {
			continue
		}

		// arrk := strings.Split(k, "_")

		plmodel, exist := plmodels[k]
		if !exist {
			//toolkit.Println(k)
			continue
		}
		Amount := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto)
		// PLHeader1
		// PLHeader2
		// PLHeader3
		// switch v.Group1 {
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

	return tkm
}

func buildmap(holder interface{},
	fnModel func() orm.IModel,
	filter *dbox.Filter,
	fnIter func(holder interface{}, obj interface{})) interface{} {
	crx, ecrx := gdrj.Find(fnModel(), filter, nil)
	if ecrx != nil {
		toolkit.Printfn("Cursor Error: %s", ecrx.Error())
		os.Exit(100)
	}
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
