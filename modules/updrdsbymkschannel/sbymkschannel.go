package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

var conn dbox.IConnection
var count int
var ratioTableName string

var (
	ratiototrf      = float64(0.392)
	sourcetablename = "salespls-summary"
	calctablename   = "salespls-summary"
	desttablename   = "salespls-summary"
	t0              time.Time
	masters         = toolkit.M{}

	totalsales = map[string]float64{}

	ratios = map[string]map[string]float64{
		"CD04": {"GT": 0.1875, "Mini": 0.6094},
		"CD11": {"Super": 0.4, "Mini": 0.5},
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
	rdfiscals    = allocmap{}
	branchtotals = allocmap{}
	trxsrc       = "pushrdreversesbymks"
)

func main() {
	setinitialconnection()
	prepmastercalc()
	buildratio()

	for _, fiscal := range []string{"2014-2015", "2015-2016"} {
		for k, v := range ratios {
			for sc, r := range v {
				processTable(fiscal, k, sc, r)
			}
		}
	}
}

func buildratio() {
	toolkit.Printfn("Build Ratio")
	cursor, _ := conn.NewQuery().
		From(calctablename).
		Where(dbox.Eq("key.trxsrc", trxsrc)).
		Select().Cursor(nil)
	defer cursor.Close()

	for {
		mr := toolkit.M{}
		if e := cursor.Fetch(&mr, 1, false); e != nil {
			break
		}
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		subchannel := key.GetString("customer_reportsubchannel")

		if subchannel == "Hyper" {
			branchid := key.GetString("customer_branchid")
			keyfiscalbranch := fiscal + "_" + branchid
			sales := mr.GetFloat64("PL8A")
			totalsales[keyfiscalbranch] = totalsales[keyfiscalbranch] + sales
		}
	}
}

func processTable(fisclayr, branchid, subchannel string, ratio float64) {
	toolkit.Printfn("Processing %s %s %s",
		fisclayr, branchid, subchannel)
	expected := ratio * totalsales[fisclayr+"_"+branchid]
	if expected == 0 {
		return
	}

	connsave, _ := modules.GetDboxIConnection("db_godrej")
	defer connsave.Close()
	qsave := connsave.NewQuery().SetConfig("multiexec", true).From(desttablename).Save()

	connselect, _ := modules.GetDboxIConnection("db_godrej")
	defer connselect.Close()

	cursor, _ := connselect.NewQuery().
		From(calctablename).
		Where(dbox.Eq("key.trxsrc", trxsrc),
		dbox.Eq("key.date_fiscal", fisclayr),
		dbox.Eq("key.customer_reportsubchannel", "Hyper"),
		dbox.Eq("key.customer_branchid", branchid)).
		Order("PL8A").
		Select().Cursor(nil)
	defer cursor.Close()

	i := 0
	count := cursor.Count()
	mstone := 0
	t0 = time.Now()
	absorbed := float64(0)
	for {
		mr := toolkit.M{}
		e := cursor.Fetch(&mr, 1, false)
		if e != nil || i >= count {
			break
		}
		i++
		makeProgressLog(toolkit.Sprintf("Processing %s %s %s",
			fisclayr, branchid, subchannel),
			i, count, 5, &mstone, t0)

		key := mr.Get("key", toolkit.M{}).(toolkit.M)

		channelid := "I2"
		channelname := "GT"
		subchannelcode := "R3"
		if subchannel == "Mini" {
			channelid = "I3"
			channelname = "MT"
			subchannelcode = "Mini"
		} else if subchannel == "Super" {
			channelid = "I3"
			channelname = "MT"
			subchannelcode = "Super"
		}

		key.Set("customer_channelid", channelid)
		key.Set("customer_reportchannel", channelid)
		key.Set("customer_channename", channelname)
		key.Set("customer_reportsubchannel", subchannelcode)

		sales := mr.GetFloat64("PL8A")
		absorbed += sales
		mr.Set("key", key)

		esave := qsave.Exec(toolkit.M{}.Set("data", mr))
		if esave != nil {
			toolkit.Printfn("Error saving: %s", esave.Error())
			os.Exit(100)
		}

		if absorbed < expected {
			break
		}
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

var branchgroups = map[string]toolkit.M{}

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

	cbg, _ := conn.NewQuery().From("branchgroup").Select().Cursor(nil)
	defer cbg.Close()

	for {
		bg := toolkit.M{}
		if e := cbg.Fetch(&bg, 1, false); e != nil {
			break
		}
		id := bg.GetString("_id")
		branchgroups[id] = bg
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
