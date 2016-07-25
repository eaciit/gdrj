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
	sourcetablename = "salespls-summary"
	calctablename   = "salespls-summary"
	desttablename   = "salespls-summary"
	t0              time.Time
	masters         = toolkit.M{}
	sgaalloc        = map[string]float64{
		"EXP": 0.08,
		"I4":  0.08,
		"I6":  0.105,
	}
)

type plalloc struct {
	ID                     string `bson:"_id" json:"_id"`
	Key                    string
	Key1, Key2, Key3       string
	Ref1                   float64
	Current                float64
	Expect                 float64
	Absorbed               float64
	Ratio1, Ratio2, Ratio3 float64
}

type allocmap map[string]*plalloc

var (
	plallocs    = allocmap{}
	advtotals   = allocmap{}
	advyears    = allocmap{}
	spgtotals   = allocmap{}
	promototals = allocmap{}
	disctotals  = allocmap{}

	discyrkas  = allocmap{}
	spgyrkas   = allocmap{}
	promoyrkas = allocmap{}
	spgyrs     = allocmap{}
	promoyrs   = allocmap{}
	spgmths    = allocmap{}
	promomths  = allocmap{}
	discgts    = map[string]float64{
		"2014-2015": 30601500000,
		"2015-2016": 20754700000,
	}
	gtsales = allocmap{}
)

func main() {
	setinitialconnection()
	prepmastercalc()
	buildratio()
	processTable()
}

func buildratio_() {
	connratio, _ := modules.GetDboxIConnection("db_godrej")
	defer connratio.Close()

	csr, _ := connratio.NewQuery().From("rawdatapl_ads30062016").Select().Cursor(nil)
	defer csr.Close()
	i := 0
	count := csr.Count()
	t0 := time.Now()
	mstone := 0
	for {
		mr := toolkit.M{}
		if ef := csr.Fetch(&mr, 1, false); ef != nil {
			break
		}
		i++
		makeProgressLog("Build ads ratio", i, count, 5, &mstone, t0)

		gdrjdate := mr.Get("gdrjdate", toolkit.M{}).(toolkit.M)
		fiscal := gdrjdate.GetString("fiscal")
		month := gdrjdate.GetInt("month")
		brand := mr.GetString("brand")
		value := -mr.GetFloat64("amountinidr")
		keyperiodbrand := toolkit.Sprintf("%s_%d_%s", fiscal, month, brand)
		adjustAllocs(&advtotals, keyperiodbrand, 0, value, 0, 0)
		adjustAllocs(&advyears, fiscal, 0, value, 0, 0)
	}

	csp, _ := connratio.NewQuery().From("tmppromodiscountjacobus").Select().Cursor(nil)
	defer csp.Close()
	i = 0
	count = csp.Count()
	t0 = time.Now()
	mstone = 0
	for {
		mr := toolkit.M{}
		if ef := csp.Fetch(&mr, 1, false); ef != nil {
			break
		}
		i++
		makeProgressLog("SPG & Promo by KA Ratio", i, count, 5, &mstone, t0)
		fiscal := mr.GetString("fiscal")
		kaid := mr.GetString("kaid")
		keyfiscalka := toolkit.Sprintf("%s_%s", fiscal, kaid)
		spgv := -mr.GetFloat64("newspg")
		promov := -mr.GetFloat64("newpromo")
		adjustAllocs(&spgyrkas, keyfiscalka, 0, spgv, 0, 0)
		adjustAllocs(&promoyrkas, keyfiscalka, 0, promov, 0, 0)
	}

	cspm, _ := connratio.NewQuery().From("rawdatapl_promospg11072016").Select().Cursor(nil)
	defer cspm.Close()
	i = 0
	count = cspm.Count()
	t0 = time.Now()
	mstone = 0
	for {
		mr := toolkit.M{}
		if ef := cspm.Fetch(&mr, 1, false); ef != nil {
			break
		}
		i++
		makeProgressLog("SPG & Promo by KA Ratio Monthhly", i, count, 5, &mstone, t0)
		dt := mr.Get("gdrjdate", toolkit.M{}).(toolkit.M)
		fiscal := dt.GetString("fiscal")
		month := dt.GetInt("month")
		amt := -mr.GetFloat64("amountinidr")
		keyperiod := toolkit.Sprintf("%s_%d", fiscal, month)
		grouping := strings.ToLower(mr.GetString("grouping"))
		if strings.Contains(grouping, "spg") {
			adjustAllocs(&spgmths, keyperiod, 0, amt, 0, 0)
			adjustAllocs(&spgyrs, fiscal, 0, 0, 0, amt)
		} else if strings.Contains(grouping, "promo") {
			adjustAllocs(&promomths, keyperiod, 0, amt, 0, 0)
			adjustAllocs(&promoyrs, fiscal, 0, 0, 0, amt)
		}
	}

	for _, v := range spgmths {
		fiscal := strings.Split(v.Key, "_")[0]
		spgyr := spgyrs[fiscal]
		v.Ratio1 = toolkit.Div(v.Expect, spgyr.Ref1)
		for _, v1 := range spgyrkas {
			keysyrka := strings.Split(v1.Key, "_")
			newkey := toolkit.Sprintf("%s_%s", v.Key, keysyrka[1])
			valloc := v.Ratio1 * v1.Expect
			adjustAllocs(&spgtotals, newkey, 0, valloc, 0, 0)
		}
	}

	for _, v := range promomths {
		fiscal := strings.Split(v.Key, "_")[0]
		spgyr := promoyrs[fiscal]
		v.Ratio1 = toolkit.Div(v.Expect, spgyr.Ref1)
		for _, v1 := range promoyrkas {
			keysyrka := strings.Split(v1.Key, "_")
			newkey := toolkit.Sprintf("%s_%s", v.Key, keysyrka[1])
			valloc := v.Ratio1 * v1.Expect
			adjustAllocs(&promototals, newkey, 0, valloc, 0, 0)
			toolkit.Printfn("Allocation for %s => ratio:%f alloc:%f",
				newkey, v.Ratio1, valloc)
		}
	}

	ctrx, _ := connratio.NewQuery().From(calctablename).Select().Cursor(nil)
	i = 0
	count = ctrx.Count()
	t0 = time.Now()
	mstone = 0
	for {
		mr := toolkit.M{}
		if ef := ctrx.Fetch(&mr, 1, false); ef != nil {
			break
		}
		i++
		makeProgressLog("Finalizing", i, count, 5, &mstone, t0)

		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		month := key.GetInt("date_month")
		kaid := key.GetString("customer_customergroup")
		brand := key.GetString("product_brand")
		if brand == "" {
			brand = "HIT"
		}

		keyperiodka := toolkit.Sprintf("%s_%d_%s", fiscal, month, kaid)
		keyperiodbrand := toolkit.Sprintf("%s_%d_%s", fiscal, month, brand)
		keyfiscalka := toolkit.Sprintf("%s_%s", fiscal, kaid)

		sales := mr.GetFloat64("PL8A")
		adjustAllocs(&advtotals, keyperiodbrand, 0, 0, 0, sales)
		adjustAllocs(&spgyrkas, keyfiscalka, 0, 0, 0, sales)
		adjustAllocs(&promoyrkas, keyfiscalka, 0, 0, 0, sales)
		adjustAllocs(&spgtotals, keyperiodka, 0, 0, 0, sales)
		adjustAllocs(&promototals, keyperiodka, 0, 0, 0, sales)
	}
}

func buildratio() {
	connratio, _ := modules.GetDboxIConnection("db_godrej")
	defer connratio.Close()

	csp, _ := connratio.NewQuery().From("tmppromodiscountjacobus").Select().Cursor(nil)
	defer csp.Close()
	i := 0
	count := csp.Count()
	t0 := time.Now()
	mstone := 0
	for {
		mr := toolkit.M{}
		if ef := csp.Fetch(&mr, 1, false); ef != nil {
			break
		}
		i++
		makeProgressLog("Disc, SPG & Promo by KA Ratio", i, count, 5, &mstone, t0)
		fiscal := mr.GetString("fiscal")
		kaid := mr.GetString("kaid")
		keyfiscalka := toolkit.Sprintf("%s_%s", fiscal, kaid)
		disc := -mr.GetFloat64("discount")
		spgv := -mr.GetFloat64("newspg")
		promov := -mr.GetFloat64("newpromo")
		adjustAllocs(&discyrkas, keyfiscalka, 0, disc, 0, 0)
		adjustAllocs(&spgyrkas, keyfiscalka, 0, spgv, 0, 0)
		adjustAllocs(&promoyrkas, keyfiscalka, 0, promov, 0, 0)
	}

	ctrx, _ := connratio.NewQuery().From(calctablename).Select().Cursor(nil)
	i = 0
	count = ctrx.Count()
	t0 = time.Now()
	mstone = 0
	for {
		mr := toolkit.M{}
		if ef := ctrx.Fetch(&mr, 1, false); ef != nil {
			break
		}
		i++
		makeProgressLog("Finalizing", i, count, 5, &mstone, t0)

		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		//month := key.GetInt("date_month")
		kaid := key.GetString("customer_customergroup")
		brand := key.GetString("product_brand")
		if brand == "" {
			brand = "HIT"
		}

		keyfiscalka := toolkit.Sprintf("%s_%s", fiscal, kaid)

		sales := mr.GetFloat64("PL8A")
		adjustAllocs(&discyrkas, keyfiscalka, 0, 0, 0, sales)
		adjustAllocs(&spgyrkas, keyfiscalka, 0, 0, 0, sales)
		adjustAllocs(&promoyrkas, keyfiscalka, 0, 0, 0, sales)

		if key.GetString("customer_channelid") == "I2" {
			adjustAllocs(&gtsales, fiscal, 0, 0, 0, sales)
		}
	}
}

func processTable() {
	connsave, _ := modules.GetDboxIConnection("db_godrej")
	defer connsave.Close()
	qsave := connsave.NewQuery().SetConfig("multiexec", true).From(desttablename).Save()

	connselect, _ := modules.GetDboxIConnection("db_godrej")
	defer connselect.Close()

	cursor, _ := connselect.NewQuery().
		From(calctablename).Select().Cursor(nil)
	defer cursor.Close()

	deletedids := []string{}

	i := 0
	count := cursor.Count()
	mstone := 0
	t0 = time.Now()
	for {
		mr := toolkit.M{}
		e := cursor.Fetch(&mr, 1, false)
		if e != nil || i >= count {
			break
		}
		i++
		makeProgressLog("Processing", i, count, 5, &mstone, t0)

		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		channelid := key.GetString("customer_channelid")
		//period := key.GetInt("date_month")
		//brand := key.GetString("product_brand")
		keyaccountid := key.GetString("customer_customergroup")

		//keyperiod := toolkit.Sprintf("%s_%d", fiscal, period)
		keyfiscalka := toolkit.Sprintf("%s_%s", fiscal, keyaccountid)
		/*
			keyperiodaccount := toolkit.Sprintf("%s_%d_%s",
				fiscal, period, keyaccountid)
		*/
		//keyperiodbrand := toolkit.Sprintf("%s_%d_%s", fiscal, period, brand)

		sales := mr.GetFloat64("PL8A")
		for k, _ := range mr {
			if isPL(k) {
				newv := float64(0)

				//--- discount
				if strings.HasPrefix(k, "PL7A") {
					disctotal := discyrkas[keyfiscalka]
					if disctotal != nil {
						newv = toolkit.Div(sales*disctotal.Expect,
							disctotal.Ref1)
					}
					if channelid == "I2" {
						newv += toolkit.Div(sales*discgts[fiscal],
							gtsales[fiscal].Ref1)
					}
				} else
				//-- spg
				if k == "PL31C" {
					total := spgyrkas[keyfiscalka]
					if total != nil {
						newv = sales * total.Expect / total.Ref1
						//adjustAllocs(&spgyrkas, keyfiscalka, 0, 0, 0, newv)
					}
				} else
				//-- promo
				if k == "PL29A32" {
					total := promoyrkas[keyfiscalka]
					if total != nil {
						newv = sales * total.Expect / total.Ref1
						//adjustAllocs(&promoyrkas, keyfiscalka, 0, 0, 0, newv)
					}
				}

				mr.Set(k, newv)
			}
		}

		gdrj.CalcSum(mr, masters)

		isDeleted := true
		for k, v := range mr {
			if strings.HasPrefix(k, "PL") && v != 0 {
				isDeleted = false
			}
		}

		mrid := mr.GetString("_id")
		if isDeleted {
			deletedids = append(deletedids, mrid)
		} else {
			esave := qsave.Exec(toolkit.M{}.Set("data", mr))
			if esave != nil {
				toolkit.Printfn("Error: %s", esave.Error())
				return
			}
		}
	}

	//-- scale
	/*
		cursor.ResetFetch()
		i = 0
		count = cursor.Count()
		mstone = 0
		t0 = time.Now()
		for {
			mr := toolkit.M{}
			e := cursor.Fetch(&mr, 1, false)
			if e != nil || i >= count {
				break
			}
			i++
			makeProgressLog("Scale", i, count, 5, &mstone, t0)

			id := mr.GetString("_id")
			key := mr.Get("key", toolkit.M{}).(toolkit.M)
			fiscal := key.GetString("date_fiscal")
			//ka := key.GetString("customer_customergroup")

			//keyfiscalka := toolkit.Sprintf("%s_%s", fiscal, ka)
			if !toolkit.HasMember(deletedids, id) {
				for k, v := range mr {
					if isPL(k) {
						newv := v.(float64)
						//ads
						if k == "PL28I" {
							total := advyears[fiscal]
							if total != nil {
								newv = toolkit.Div(v.(float64)*total.Expect,
									total.Ref1)
							}
						} /*else //-- spg
						if k == "PL31C" {
							total := spgyrkas[keyfiscalka]
							if total != nil {
								newv = toolkit.Div(v.(float64)*total.Expect,
									total.Ref1)
							}
						} else
						//-- promo
						if k == "PL29A32" {
							total := promoyrkas[keyfiscalka]
							if total != nil {
								newv = toolkit.Div(v.(float64)*total.Expect,
									total.Ref1)
							}
						}
	*/
	/*
						mr.Set(k, newv)
					}
				}

				gdrj.CalcSum(mr, masters)
				esave := qsave.Exec(toolkit.M{}.Set("data", mr))
				if esave != nil {
					toolkit.Printfn("Error: %s", esave.Error())
					return
				}
			}
		}
	*/

	toolkit.Printfn("Delete unneccessary data")
	for _, deletedid := range deletedids {
		connsave.NewQuery().From(desttablename).
			Where(dbox.Eq("_id", deletedid)).
			Delete().Exec(nil)
	}
}

func adjustAllocs(allocsmap *allocmap, key string, current, expect, absorbed, ref1 float64) {
	allocs := *allocsmap
	alloc := allocs[key]
	if alloc == nil {
		alloc = new(plalloc)
		alloc.Key = key
		alloc.ID = key
	}
	alloc.Current += current
	alloc.Expect += expect
	alloc.Ref1 += ref1
	alloc.Absorbed += absorbed
	allocs[key] = alloc
	*allocsmap = allocs
}

func makeProgressLog(reference string, i, count, step int, current *int, tstart time.Time) int {
	perstep := count * step / 100
	icurrent := *current
	if icurrent == 0 {
		icurrent = perstep
	}
	pct := i * 100 / count
	if i >= icurrent {
		toolkit.Printfn("%s, %d of %d [%d pct] in %s",
			reference, i, count, pct, time.Since(tstart).String())
		icurrent += perstep
	}
	*current = icurrent
	return icurrent
}

func isPL(id string) bool {
	if strings.HasPrefix(id, "PL7A") ||
		//strings.HasPrefix(id, "PL28") ||
		strings.HasPrefix(id, "PL29A") ||
		strings.HasPrefix(id, "PL31") {
		return true
	}
	return false
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
