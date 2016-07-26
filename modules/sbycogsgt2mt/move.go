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
	ratiototrf      = float64(0.352367849)
	sourcetablename = "salespls-summary"
	calctablename   = "salespls-summary"
	desttablename   = "salespls-summary"
	t0              time.Time
	masters         = toolkit.M{}
	move            = float64(-5000000000)
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
	trxsrc       = "sbycogsmove2016"
)

func main() {
	setinitialconnection()
	conn.NewQuery().From(desttablename).
		Where(dbox.Eq("key.trxsrc", trxsrc)).
		Delete().
		Exec(nil)

	prepmastercalc()
	//buildratio()
	for _, v := range []string{"2015-2016"} {
		processTable(v)
	}
	//processRDBranch()
}

func processTable(fiscalyr string) {
	connsave, _ := modules.GetDboxIConnection("db_godrej")
	defer connsave.Close()
	qsave := connsave.NewQuery().SetConfig("multiexec", true).From(desttablename).Save()

	connselect, _ := modules.GetDboxIConnection("db_godrej")
	defer connselect.Close()

	cursor, _ := connselect.NewQuery().
		From(calctablename).
		Where(dbox.Ne("key.trxsrc", trxsrc), dbox.Eq("key.date_fiscal", fiscalyr),
		dbox.Eq("key.customer_branchid", "CD04")).
		Select().Cursor(nil)
	defer cursor.Close()

	i := 0
	count := cursor.Count()
	toolkit.Printfn("Record found: %d", count)
	mstone := 0
	t0 = time.Now()
	expected := move
	absorbed := float64(0)
	for {
		mr := toolkit.M{}
		e := cursor.Fetch(&mr, 1, false)
		if e != nil {
			toolkit.Printfn("Break: %s", e.Error())
			break
		}
		i++
		makeProgressLog("Processing", i, count, 5, &mstone, t0)

		mrid := mr.GetString("_id")
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		channelid := key.GetString("customer_channelid")

		if channelid == "I2" {
			matlocal := mr.GetFloat64("PL9")
			absorbed += matlocal

			if matlocal != 0 {
				mreverse := toolkit.M{}
				mreverse.Set("_id", mrid+"_"+trxsrc+"_reverse")
				mreversekey := toolkit.M{}
				for k, v := range key {
					mreversekey.Set(k, v)
				}
				mreversekey.Set("customer_customergroup", "")
				mreversekey.Set("customer_customergroupname", "")
				mreversekey.Set("trxsrc", trxsrc)
				mreverse.Set("key", mreversekey)
				mreverse.Set("PL9", -matlocal)
				gdrj.CalcSum(mreverse, masters)
				esave := qsave.Exec(toolkit.M{}.Set("data", mreverse))
				if esave != nil {
					toolkit.Printfn("Error: " + esave.Error())
					os.Exit(100)
				}

				mrd := toolkit.M{}
				mrd.Set("_id", mrid+"_"+trxsrc)
				mrdkey := toolkit.M{}
				for k, v := range key {
					mrdkey.Set(k, v)
				}
				mrdkey.Set("customer_channelid", "I3")
				mrdkey.Set("customer_reportchannel", "MT")
				mrdkey.Set("customer_customertype", "MT")
				mrdkey.Set("customer_channelname", "MT")
				mrdkey.Set("customer_reportsubchannel", "Mini")
				mrdkey.Set("trxsrc", trxsrc)
				mrd.Set("key", mrdkey)
				mrd.Set("PL9", matlocal)
				gdrj.CalcSum(mrd, masters)
				esave = qsave.Exec(toolkit.M{}.Set("data", mrd))
				if esave != nil {
					toolkit.Printfn("Error: " + esave.Error())
					os.Exit(100)
				}

				if absorbed <= expected {
					break
				}
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
