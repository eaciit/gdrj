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
	ratiototrf      = float64(0.352367849)
	sourcetablename = "salespls-summary"
	calctablename   = "salespls-summary"
	desttablename   = "sgadata"
	t0              time.Time
	masters         = toolkit.M{}
	sgayrs          = map[string]float64{}
	directratios    = map[string]float64{
		"2014-2015": 0.1979,
		"2015-2016": 0.1763,
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
)

func main() {
	setinitialconnection()
	prepmastercalc()
	buildratio()
	conn.NewQuery().From(desttablename).Delete().Exec(nil)
	tstart := time.Now()
	rcount := len(sgayrs)
	i := 0
	for k, v := range sgayrs {
		i++
		//makeProgressLog("Processing "+k, i, rcount, 100, &mstone, tstart)
		toolkit.Printfn("Processing %d of %d %s",
			i, rcount, time.Since(tstart).String())
		processTable(k, v)
	}
	//processRDBranch()
}

func buildratio() {
	connselect, _ := modules.GetDboxIConnection("db_godrej")
	defer connselect.Close()

	cursor, _ := connselect.NewQuery().
		From(calctablename).
		Select().Cursor(nil)
	defer cursor.Close()

	i := 0
	count := cursor.Count()
	toolkit.Printfn("Record found: %d", count)
	mstone := 0
	t0 = time.Now()
	for {
		mr := toolkit.M{}
		e := cursor.Fetch(&mr, 1, false)
		if e != nil {
			toolkit.Printfn("Break: %s", e.Error())
			break
		}
		i++
		makeProgressLog("Build Ratio", i, count, 5, &mstone, t0)

		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		mth := key.GetInt("date_month")
		channelid := key.GetString("customer_channelid")
		branchid := key.GetString("customer_branchid")
		sga := mr.GetFloat64("PL94A")
		if sga != 0 {
			keysga := toolkit.Sprintf("%s_%d_%s_%s", fiscal, mth, branchid, channelid)
			sgayrs[keysga] = sgayrs[keysga] + sga
		}
	}
}

func processTable(key string, totalvalue float64) {
	connsave, _ := modules.GetDboxIConnection("db_godrej")
	defer connsave.Close()
	qsave := connsave.NewQuery().SetConfig("multiexec", true).From(desttablename).Save()

	connselect, _ := modules.GetDboxIConnection("db_godrej")
	defer connselect.Close()

	keys := strings.Split(key, "_")
	keyfiscal, keymonth, keybranch, keychannel := keys[0],
		toolkit.ToInt(keys[1], toolkit.RoundingAuto),
		keys[2], keys[3]

	cursor, _ := connselect.NewQuery().
		From(calctablename).
		Where(dbox.Eq("key.date_fiscal", keyfiscal), dbox.Eq("key.date_month", keymonth),
		dbox.Eq("key.customer_branchid", keybranch), dbox.Eq("key.customer_channelid", keychannel)).
		Select().Cursor(nil)
	defer cursor.Close()

	i := 0
	//count := cursor.Count()
	//toolkit.Printfn("Processing: %s Record found: %d", key, count)
	//mstone := 0
	t0 = time.Now()
	expected := directratios[keyfiscal] * totalvalue
	absorbed := float64(0)
	for {
		mr := toolkit.M{}
		e := cursor.Fetch(&mr, 1, false)
		if e != nil {
			//toolkit.Printfn("Break: %s", e.Error())
			break
		}
		i++
		/*
			makeProgressLog(toolkit.Sprintf("Processing %s", key),
				i, count, 5, &mstone, t0)
		*/
		mrid := mr.GetString("_id")
		key := mr.Get("key", toolkit.M{}).(toolkit.M)

		hasSga := false
		msga := toolkit.M{}
		for k, v := range mr {
			if strings.HasPrefix(k, "PL33") ||
				strings.HasPrefix(k, "PL34") ||
				strings.HasPrefix(k, "PL35") {
				sgavalue := mr.GetFloat64(k)
				if sgavalue != 0 {
					hasSga = true
				}
				absorbed += sgavalue
				msga.Set(k, v)
			}
		}

		if absorbed <= expected {
			key.Set("sgaalloc", "Direct")
		} else {
			key.Set("sgaalloc", "Allocated")
		}

		msga.Set("_id", mrid)
		msga.Set("key", key)
		if hasSga {
			gdrj.CalcSum(msga, masters)
			sgasave := qsave.Exec(toolkit.M{}.Set("data", msga))
			if sgasave != nil {
				toolkit.Printfn("Error: %s", sgasave.Error())
				os.Exit(100)
			}
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
