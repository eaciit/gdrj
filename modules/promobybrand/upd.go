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
	plcodes = []string{"PL7A", "PL29A*", "Pl31*", "PL28",
		"PL33*", "PL34*", "PL35*"}
	branchids                   = []string{"CD04", "CD11"}
	trxsource                   = "rdsbymksadj"
	sourcetablename             = "salespls-summary"
	calctablename               = "salespls-summary"
	desttablename               = "salespls-summary"
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
	masters                     = toolkit.M{}
)

type plalloc struct {
	Key      string
	Ref1     float64
	Current  float64
	Expect   float64
	Absorbed float64
}

type allocmap map[string]*plalloc

var plallocs = allocmap{}
var targets = allocmap{}
var totals = allocmap{}

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
		e := buildRatio(calctablename)
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

	cratios, _ := conn.NewQuery().From("rawpromobybrand").Select().Cursor(nil)
	defer cratios.Close()
	for {
		mr := toolkit.M{}
		eratio := cratios.Fetch(&mr, 1, false)
		if eratio != nil {
			break
		}
		keytarget := mr.GetString("_id")
		value := mr.GetFloat64("target")
		adjustAllocs(&targets, keytarget, value, 0, 0, 0)
	}

	cursor, _ := conn.NewQuery().From(calctablename).
		Select().
		Cursor(nil)
	defer cursor.Close()

	i := 0
	count := cursor.Count()
	t0 := time.Now()
	mstone := 0

	for {
		mr := toolkit.M{}
		efetch := cursor.Fetch(&mr, 1, false)
		if efetch != nil {
			break
		}
		i++
		makeProgressLog("Build Ratio", i, count, 5, &mstone, t0)
		//-- keyes
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		keyaccountid := key.GetString("customer_customergroupname")
		brandid := key.GetString("product_brand")

		keytarget := toolkit.Sprintf("%s_%s",
			fiscal, brandid)
		target := targets[keytarget]
		if target == nil {
			continue
		}

		keyalloc := toolkit.Sprintf("%s_%s_%s",
			fiscal, keyaccountid, brandid)
		keyttotal := toolkit.Sprintf("%s_%s",
			fiscal, keyaccountid)

		sales := mr.GetFloat64("PL8A")
		spg := mr.GetFloat64("PL31")
		promo := mr.GetFloat64("PL29A")

		adjustAllocs(&plallocs, keyalloc, spg+promo, 0, 0, sales)
		adjustAllocs(&totals, keyttotal, spg+promo, 0, 0, sales)
	}

	for kalloc, valloc := range plallocs {
		kallocs := strings.Split(kalloc, "_")
		keyttotal := toolkit.Sprintf("%s_%s", kallocs[0], kallocs[1])
		keytarget := toolkit.Sprintf("%s_%s", kallocs[0], kallocs[2])

		total := totals[keyttotal]
		target := targets[keytarget]
		valloc.Expect = target.Current + valloc.Current/total.Current
	}

	toolkit.Printfn("PL Alloc:\n%s", toolkit.JsonStringIndent(plallocs, " "))
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
	connsave, _ := modules.GetDboxIConnection("db_godrej")
	defer connsave.Close()

	toolkit.Printfn("Start processing allocation")
	cursor, _ := conn.NewQuery().From(calctablename).
		Cursor(nil)
	defer cursor.Close()

	plmodels := masters.Get("plmodel", map[string]*gdrj.PLModel{}).(map[string]*gdrj.PLModel)
	qsave := connsave.NewQuery().SetConfig("multiexec", true).From(desttablename).Save()

	count := cursor.Count()
	i := 0
	mstone := 0
	t0 = time.Now()
	for {
		mr := toolkit.M{}
		ef := cursor.Fetch(&mr, 1, false)
		if ef != nil {
			break
		}

		//-- logging
		i++
		makeProgressLog("Processing", i, count, 5, &mstone, t0)

		//-- keyes
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		keyaccountid := key.GetString("customer_customergroupname")
		brandid := key.GetString("product_brand")

		//--- scaledown
		keyalloc := toolkit.Sprintf("%s_%s_%s",
			fiscal, keyaccountid, brandid)
		alloc := plallocs[keyalloc]
		if alloc == nil {
			continue
		}
		adjustment := alloc.Expect - alloc.Current
		sales := mr.GetFloat64("PL8A")
		salesratio := toolkit.Div(sales, alloc.Ref1)

		spgpromototal := float64(0)
		spgpromoratios := map[string]float64{}
		for plid, plvalue := range mr {
			validpl := validatePLID(plid, plmodels)
			if validpl {
				f64plvalue := plvalue.(float64)
				spgpromototal += f64plvalue
				spgpromoratios[plid] = spgpromoratios[plid] + f64plvalue
			}
		}

		for plid, plvalue := range mr {
			validpl := validatePLID(plid, plmodels)
			if validpl {
				spgpromoratio := spgpromoratios[plid]
				f64plvalue := plvalue.(float64)
				newvalue := toolkit.Div(
					spgpromoratio*salesratio*adjustment,
					spgpromototal) + f64plvalue
				mr.Set(plid, newvalue)
			}
		}

		gdrj.CalcSum(mr, masters)
		esave2 := qsave.Exec(toolkit.M{}.Set("data", mr))
		if esave2 != nil {
			return esave2
		}
		//key := mr.Get("key", toolkit.M{}).(toolkit.M)
		//fiscal := key.GetString("date_fiscal")
	}
	return nil
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

func validatePLID(plid string, plmodels map[string]*gdrj.PLModel) bool {
	//-- exit if summary
	if plid == "PL29A" || plid == "31" {
		return false
	}

	//-- gte plmodel and exit if no model
	plmodel := plmodels[plid]
	if plmodel == nil {
		return false
	}

	if strings.HasPrefix(plmodel.PLHeader2, "SPG Exp") {
		return true
	} else if strings.HasPrefix(plmodel.PLHeader2, "Promotions Expense") {
		return true
	}
	return false
}
