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
	reforsrc        = "ref"
	trxsrc          = "COGSMATERIALADJUST"
	basefield       = "PL8A"
	allocfield      = "PL9"
)

type plalloc struct {
	ID                     string `bson:"_id" json:"_id"`
	Key                    string
	Txt1, Txt2, Txt3       string
	Ref1                   float64
	Current                float64
	Expect                 float64
	Absorbed               float64
	Ratio1, Ratio2, Ratio3 float64
}

type allocmap map[string]*plalloc

var (
	yrtotals = allocmap{}
	ratios   = allocmap{}
	totals   = map[string]float64{
		"2014-2015": -50041697769.24013,
		"2015-2016": -53588372484.758606,
	}
	miles = map[string][]*plalloc{
		"2014-2015": []*plalloc{},
		"2015-2016": []*plalloc{},
	}
)

func main() {
	setinitialconnection()
	conn.NewQuery().From(desttablename).
		Where(dbox.Eq("key.trxsrc", "nakulrd")).
		Delete().
		Exec(nil)

	prepmastercalc()
	buildratio()
	for _, v := range []string{"2015-2016", "2014-2015"} {
		processTable(v)
	}
}

func buildratio() {
	connratio, _ := modules.GetDboxIConnection("db_godrej")
	defer connratio.Close()

	ftrx := &dbox.Filter{}
	if reforsrc == "ref" {
		ftrx = dbox.Eq("key.ref", trxsrc)
	} else {
		dbox.Eq("key.trxsrc", trxsrc)
	}

	csp, _ := connratio.NewQuery().From(calctablename).
		Where(dbox.Eq("key.customer_channelid", "I3"),
		dbox.Eq("key.customer_customergroup", "")).
		Select().Cursor(nil)
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
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("fiscal")
		ka := key.GetString("customer_customergroup")
		name := key.GetString("customer_customergroupname")
		if ka != "" {
			basevalue := mr.GetFloat64(basefield)
			keyratio := fiscal + "_" + ka + "_" + name
			adjustAllocs(&ratios, keyratio, 0, 0, 0, basevalue)
			adjustAllocs(&yrtotals, fiscal, 0, 0, 0, basevalue)
		}
	}

	for k, v := range ratios {
		kts := strings.Split(k, "_")
		fiscal := kts[0]
		v.Txt1 = kts[1]
		v.Txt2 = kts[2]
		v.Ratio1 = toolkit.Div(v.Ref1, yrtotals[kts[0]].Ref1)
		v.Expect = v.Ratio1 * totals[fiscal]

		miles[fiscal] = append(miles[fiscal], v)
	}
}

func processTable(fiscal string) {
	connsave, _ := modules.GetDboxIConnection("db_godrej")
	defer connsave.Close()
	qsave := connsave.NewQuery().SetConfig("multiexec", true).From(desttablename).Save()

	connselect, _ := modules.GetDboxIConnection("db_godrej")
	defer connselect.Close()

	cursor, _ := connselect.NewQuery().
		From(calctablename).
		Where(dbox.Eq("key.date_fiscal", fiscal),
		dbox.Eq("key.ref", trxsrc),
		dbox.Eq("key.customer_channelid", "I3")).
		Select().Cursor(nil)
	defer cursor.Close()

	allocs := miles[fiscal]
	allocidx := 0

	absorbed := float64(0)
	group := allocs[0].Txt1
	groupname := allocs[1].Txt2

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
		key.Set("customer_customergroup", group)
		key.Set("customer_customergroupname", groupname)
		mr.Set("key", key)

		gdrj.CalcSum(mr, masters)
		esave := qsave.Exec(toolkit.M{}.Set("data", mr))
		if esave != nil {
			toolkit.Printfn("Erorr: %s", esave.Error())
			os.Exit(100)
		}

		allocv := mr.GetFloat64(allocfield)
		absorbed += allocv

		if absorbed <= allocs[allocidx].Expect {
			allocidx++
			if allocidx >= len(allocs) {
				allocidx = 0
			}
			absorbed = float64(0)
			group = allocs[0].Txt1
			groupname = allocs[1].Txt2
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
