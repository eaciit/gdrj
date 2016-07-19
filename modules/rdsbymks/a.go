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
	yearttxt                    = "2016"
	sourcetablename             = "salespls-summary-" + yearttxt + "-vdistrd"
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
	fiscal1 := toolkit.ToInt(yearttxt, toolkit.RoundingAuto)
	fiscal0 := fiscal1 - 1
	fiscaltxt := toolkit.Sprintf("%d-%d", fiscal0, fiscal1)
	cursor, _ := conn.NewQuery().From(calctablename).
		Where(dbox.Eq("key.date_fiscal", fiscaltxt)).
		//Group("key.customer_reportchannel").
		//Aggr(dbox.AggrSum, "PL8A", "PL8A").
		//Select().
		Cursor(nil)
	defer cursor.Close()

	i := 0
	count := cursor.Count()
	t0 := time.Now()
	mstone := 0
	total := float64(0)
	for {
		mtgtratio := toolkit.M{}
		efetch := cursor.Fetch(&mtgtratio, 1, false)
		if efetch != nil {
			break
		}
		i++
		makeProgressLog("MT/GT Ratio", i, count, 5, &mstone, t0)
		key := mtgtratio.Get("key", toolkit.M{}).(toolkit.M)
		reportchannel := key.GetString("customer_reportchannel")
		if reportchannel == "MT" || reportchannel == "GT" {
			sales := mtgtratio.GetFloat64("PL8A")
			total += sales
			adjustAllocs(&totals, reportchannel, sales, 0, 0, 0)
		}
	}
	for _, alloc := range totals {
		alloc.Expect = alloc.Current / total
		alloc.Ref1 = total
	}
	toolkit.Printfn("MT/GT Ratio: %s", toolkit.JsonString(totals))

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
	cursor, _ := conn.NewQuery().From(sourcetablename).
		Select().Cursor(nil)
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

		i++
		makeProgressLog("Processing", i, count, 5, &mstone, t0)
		//key := mr.Get("key", toolkit.M{}).(toolkit.M)
		//fiscal := key.GetString("date_fiscal")

		mrid := mr.GetString("_id")
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		salesvalue := mr.GetFloat64("PL8A")
		grossvalue := mr.GetFloat64("PL2")

		for channel, total := range totals {
			mrk := toolkit.M{}
			mrkkey := toolkit.M{}
			for k, v := range key {
				mrkkey.Set(k, v)
			}
			mrkkey.Set("trxsrc", "pushrdreversesbymks")
			mrkkey.Set("customer_reportchannel", channel)
			mrkkey.Set("customer_channelname", channel)
			if channel == "MT" {
				mrkkey.Set("customer_channelid", "I3")
			} else if channel == "GT" {
				mrkkey.Set("customer_channelid", "I2")
			}

			mrsales := -salesvalue * total.Expect
			mrgross := -grossvalue * total.Expect
			mrdiscount := mrsales - mrgross
			mrk.Set("key", mrkkey)
			mrk.Set("PL1", mrgross)
			mrk.Set("PL7", mrdiscount)
			mrk.Set("PL8A", mrsales)

			mrk.Set("_id", toolkit.Sprintf("%s|pushrdreverse|%s", mrid, channel))
			gdrj.CalcSum(mrk, masters)
			esavereverse := qsave.Exec(toolkit.M{}.Set("data", mrk))
			if esavereverse != nil {
				return esavereverse
			}
		}

		for k, v := range mr {
			if strings.HasPrefix(k, "PL") {
				if k == "PL8" || k == "PL2" {
					mr.Set(k, v)
				} else {
					mr.Set(k, float64(0))
				}
			}
		}

		key.Set("trxsrc", "rdsbymks")
		mr.Set("key", key)
		gdrj.CalcSum(mr, masters)
		esave := qsave.Exec(toolkit.M{}.Set("data", mr))
		if esave != nil {
			return esave
		}
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
