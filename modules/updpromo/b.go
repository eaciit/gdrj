package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

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
	Ref1     float64
	Current  float64
	Expect   float64
	Absorbed float64
}

type allocmap map[string]*plalloc

var plallocs = allocmap{}
var totals = allocmap{}
var ples = allocmap{}
var f = dbox.Eq("key.trxsrc", "RECLASSPROMOSPGRDMT")
var fsalesrd = dbox.Eq("key.customer_reportchannel", "RD")

func adjustAllocs(allocsmap *allocmap, key string, current, expect, absorbed, ref1 float64) {
	allocs := *allocsmap
	alloc := allocs[key]
	if alloc == nil {
		alloc = new(plalloc)
		alloc.Key = key
	}
	alloc.Current += current
	alloc.Expect += expect
	alloc.Ref1 += ref1
	alloc.Absorbed += absorbed
	allocs[key] = alloc
	*allocsmap = allocs
}

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
		Where(fsalesrd).
		//Group("key.date_fiscal", "key.customer_branchid").
		//Aggr(dbox.AggrSum, "$PL8A", "PL8A").
		Select().
		Cursor(nil)
	defer cursor.Close()

	count := cursor.Count()
	i := 0
	mstone := 0
	t0 = time.Now()

	totalsgapromo := map[string]float64{}
	for {
		ratio := toolkit.M{}
		if e := cursor.Fetch(&ratio, 1, false); e != nil {
			break
		}
		i++
		makeProgressLog("Processing", i, count, 5, &mstone, t0)

		keyratio := ratio.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := keyratio.GetString("date_fiscal")
		key := toolkit.Sprintf("%s_%s",
			fiscal,
			keyratio.GetString("customer_branchid"))
		salesvalue := ratio.GetFloat64("PL8A")
		spgpromo := ratio.GetFloat64("PL29A") + ratio.GetFloat64("PL31")

		adjustAllocs(&totals, keyratio.GetString("date_fiscal"), 0, spgpromo, 0, 0)
		if salesvalue != 0 || spgpromo != 0 {
			adjustAllocs(&plallocs, key, spgpromo, 0, 0, salesvalue)
		}

		totalsgapromo[fiscal] += spgpromo
		for k, v := range ratio {
			if (strings.HasPrefix(k, "PL29A") || strings.HasPrefix(k, "PL31")) &&
				k != "PL29A" && k != "PL31A" {
				adjustAllocs(&ples, toolkit.Sprintf("%s_%s", keyratio.GetString("date_fiscal"), k), v.(float64), 0, 0, 0)
			}
		}
	}

	for k, v := range ples {
		fiscal := strings.Split(k, "_")[0]
		v.Ref1 = toolkit.Div(v.Current, totalsgapromo[fiscal])
	}

	for k, v := range plallocs {
		if v.Ref1 == 0 {
			delete(plallocs, k)
		} else {
			key := strings.Split(v.Key, "_")[0]
			branchid := strings.Split(v.Key, "_")[1]
			if strings.HasPrefix(branchid, "CD") {
				total := totals[key]
				total.Ref1 += v.Ref1
				total.Current += v.Current
			} else {
				delete(plallocs, k)
			}
		}
	}

	for _, v := range plallocs {
		key := strings.Split(v.Key, "_")[0]
		total := totals[key]
		v.Expect = v.Ref1 * total.Expect / total.Ref1
	}

	toolkit.Printfn("Allocs:\n%s\n", toolkit.JsonStringIndent(plallocs, " "))
	return nil
}

func makeProgressLog(reference string, i, count, step int, current *int, tstart time.Time) int {
	perstep := count * step / 100
	icurrent := *current
	if icurrent == 0 {
		icurrent = perstep
	}
	pct := i * 100 / count
	if i >= icurrent {
		toolkit.Printfn("Processing %s, %d of %d [%d pct] in %s",
			reference, i, count, pct, time.Since(tstart).String())
		icurrent += perstep
	}
	*current = icurrent
	return icurrent
}

func processTable(tn string) error {
	toolkit.Printfn("Deleting old data")
	conn.NewQuery().From(tn).
		Where(dbox.Eq("key.trxsrc", "RECLASSPROMOSPGRDMT")).
		Delete().Exec(nil)

	toolkit.Printfn("Start processing allocation")
	cursor, _ := conn.NewQuery().From(tn).
		//Where(dbox.Eq("key.trxsrc", "VDIST"), dbox.Eq("key.customer_reportchannel", "RD")).
		//Where(dbox.Eq("key.date_fiscal", "2015-2016"), dbox.Eq("key.customer_customergroup", "CR")).
		//Where(dbox.Eq("key.date_fiscal", "2014-2015")).
		//Where(dbox.Eq("key.trxsrc", "RECLASSPROMOSPGRDMT")).
		Where(fsalesrd).
		Select().Cursor(nil)
	defer cursor.Close()

	//plmodels := masters["plmodel"].(map[string]*gdrj.PLModel)
	count := cursor.Count()
	i := 0
	step := count / 20
	mstone := step
	t0 = time.Now()
	for {
		mr := toolkit.M{}
		ef := cursor.Fetch(&mr, 1, false)
		if ef != nil {
			break
		}

		i++
		makeProgressLog("Processing", i, count, 5, &mstone, t0)
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		branchid := key.GetString("customer_branchid")

		keysales := toolkit.Sprintf("%s_%s", fiscal, branchid)
		alloc := plallocs[keysales]
		if alloc == nil {
			alloc = new(plalloc)
		}

		sales := mr.GetFloat64("PL8A")
		for k, _ := range mr {
			if (strings.HasPrefix(k, "PL29A") || strings.HasPrefix(k, "PL31")) &&
				k != "PL29A" && k != "PL31A" {
				//if alloc.Current == 0 {
				ple := ples[toolkit.Sprintf("%s_%s", fiscal, k)]
				if ple != nil {
					newv := toolkit.Div(sales*alloc.Expect*ple.Ref1, alloc.Ref1)
					mr.Set(k, newv)
				} else {
					mr.Set(k, 0)
				}
				/*
					            } else {
										newv := v.(float64) * toolkit.Div(alloc.Expect, alloc.Current)
										mr.Set(k, newv)
									}
								}
				*/
			}
		}

		CalcSum(mr)
		//esave := conn.NewQuery().From(tn + "_copy").
		esave := conn.NewQuery().From(tn).
			Save().Exec(toolkit.M{}.Set("data", mr))
		if esave != nil {
			return esave
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
