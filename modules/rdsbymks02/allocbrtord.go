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

func validplcode(k string) bool {
	if k == "PL7A" {
		return true
	} else if k == "PL28" {
		return true
	} else if strings.HasPrefix(k, "PL29A") ||
		strings.HasPrefix(k, "PL31") ||
		strings.HasPrefix(k, "PL33") ||
		strings.HasPrefix(k, "PL34") ||
		strings.HasPrefix(k, "PL35") {
		return true
	}
	return false
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
	cursor, _ := conn.NewQuery().From(calctablename).
		Where(dbox.Or(dbox.Eq("key.customer_branchid", "CD04"), dbox.Eq("key.customer_branchid", "CD11"))).
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
		key := mr.Get("key", toolkit.M{}).(toolkit.M)

		salesvalue := mr.GetFloat64("PL8A")
		fiscal := key.GetString("date_fiscal")
		branchid := key.GetString("customer_branchid")
		channelid := key.GetString("customer_channelid")

		keysales := toolkit.Sprintf("%s_%s", fiscal, branchid)
		if channelid == "I1" {
			adjustAllocs(&totals, keysales, salesvalue, 0, 0, salesvalue)
		} else {
			adjustAllocs(&totals, keysales, 0, 0, 0, salesvalue)
		}
	}

	for _, v := range totals {
		v.Expect = toolkit.Div(v.Current, v.Ref1)
	}

	toolkit.Printfn("Sales Alloc:\n%s", toolkit.JsonStringIndent(totals, " "))
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
	toolkit.Printfn("Start processing allocation")
	cursor, _ := conn.NewQuery().From(calctablename).
		Where(dbox.And(
		dbox.Ne("key.customer_channelid", "I1"),
		dbox.Ne("key.customer_trxsrc", "rdsbymkselem"),
		dbox.Or(dbox.Eq("key.customer_branchid", "CD04"),
			dbox.Eq("key.customer_branchid", "CD11")))).
		Select().
		Cursor(nil)
	defer cursor.Close()

	//plmodels := masters["plmodel"].(map[string]*gdrj.PLModel)
	qsave := conn.NewQuery().SetConfig("multiexec", true).From(desttablename).Save()

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

		//-- logging
		i++
		makeProgressLog("Processing", i, count, 5, &mstone, t0)
		toolkit.Printfn("Processing: %s", toolkit.JsonString(mr))

		//-- keyes
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		id := mr.GetString("_id")
		fiscal := key.GetString("date_fiscal")
		branchid := key.GetString("customer_branchid")
		//channelid := key.GetString("customer_channelid")

		//--- scaledown
		keysales := toolkit.Sprintf("%s_%s", fiscal, branchid)
		total := totals[keysales]
		if total.Expect == 0 {
			continue
		}
		ratio := total.Expect

		//--- reverse it
		mrr := toolkit.M{}
		mrrkey := toolkit.M{}
		for k, v := range key {
			mrrkey.Set(k, v)
		}
		mrrkey.Set("trxsrc", "rdsbymkselem")
		mrr.Set("key", mrrkey)
		mrr.Set("_id", id+"_reverse")

		for k, v := range mr {
			codevalid := validplcode(k)
			if codevalid {
				value := v.(float64)
				if value != 0 {
					plvalue := -v.(float64) * ratio
					toolkit.Printfn("plvalue: %v - %v - %v", v, plvalue, ratio)
					mrr.Set(k, plvalue)
				}
			}
		}

		gdrj.CalcSum(mrr, masters)
		esave1 := qsave.Exec(toolkit.M{}.Set("data", mrr))
		if esave1 != nil {
			return esave1
		}

		//--- copy to rd
		mrrd := toolkit.M{}
		mrrdkey := toolkit.M{}
		for k, v := range key {
			mrrdkey.Set(k, v)
		}
		mrrdkey.Set("trxsrc", "rdsbymkselem")
		mrrdkey.Set("customer_channelid", "I1")
		mrrdkey.Set("customer_reportchannel", "RD")
		mrrdkey.Set("customer_channelname", "RD")
		mrrd.Set("key", mrrdkey)
		mrrd.Set("_id", id+"_rd")

		for k, v := range mr {
			codevalid := validplcode(k)
			if codevalid {
				value := v.(float64)
				if value != 0 {
					plvalue := v.(float64) * ratio
					mrrd.Set(k, plvalue)
				}
			}
		}

		gdrj.CalcSum(mrrd, masters)
		esave2 := qsave.Exec(toolkit.M{}.Set("data", mrrd))
		if esave2 != nil {
			return esave1
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
