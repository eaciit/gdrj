package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"strings"
	"time"

	"github.com/eaciit/dbox"
	// "github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "math"
)

var conn dbox.IConnection
var count int
var ratioTableName string

var (
	ratiototrf      = float64(0.352367849)
	sourcetablename = "rawdatapl-sga-sum4analysis"
	calctablename   = "salespls-summary"
	desttablename   = "sgadata-rev"
	t0              time.Time
	masters         = toolkit.M{}
	sgasource       = map[string]float64{}
	sgacalc         = map[string]float64{}
	sgadirectratio  = map[string]float64{}
)

func getstep(count int) int {
	v := count / 100
	if v == 0 {
		return 1
	}
	return v
}

func main() {
	setinitialconnection()
	toolkit.Println("Prepare master for calculate")
	prepmastercalc()
	toolkit.Println("Create ratio data")
	buildratio()

	qSave := conn.NewQuery().
		From(desttablename).
		SetConfig("multiexec", true).
		Save()

	c, _ := conn.NewQuery().From(calctablename).Select().Cursor(nil)
	defer c.Close()

	tstart := time.Now()
	rcount := c.Count()
	step := getstep(rcount)
	i := 0
	for {
		res := toolkit.M{}
		if e := c.Fetch(&res, 1, false); e != nil {
			break
		}

		tkmdirect := toolkit.M{}
		tkmallocated := toolkit.M{}

		dskey := res.Get("key", toolkit.M{}).(toolkit.M)
		id := res.GetString("_id")

		key := toolkit.Sprintf("%s_%s", dskey.GetInt("date_fiscal"),
			dskey.GetString("customer_branchid"))

		for k, v := range res {
			ar01k := strings.Split(k, "_")
			if ar01k[0] == "PL33" || ar01k[0] == "PL34" || ar01k[0] == "PL35" {
				costgroup := ar01k[1]
				if costgroup == "Other" {
					costgroup = "OTHER"
				}
				skey := toolkit.Sprintf("%s_%s", key, costgroup)
				vtot64 := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto)
				val := sgadirectratio[skey] * vtot64
				valalloc := vtot64 - val

				tkmdirect.Set(k, val)
				tkmallocated.Set(k, valalloc)
			}
		}

		//set id
		tkmdirect.Set("_id", toolkit.Sprintf("%s|Direct", id))
		dskey.Set("sgaalloc", "Direct")
		tkmdirect.Set("key", dskey)
		//save direct
		err := qSave.Exec(toolkit.M{}.Set("data", tkmdirect))
		if err != nil {
			toolkit.Println(err)
		}
		//save direct

		//set id
		tkmallocated.Set("_id", toolkit.Sprintf("%s|Allocated", id))
		dskey.Set("sgaalloc", "Allocated")
		tkmallocated.Set("key", dskey)
		//save allocated
		err = qSave.Exec(toolkit.M{}.Set("data", tkmallocated))
		if err != nil {
			toolkit.Println(err)
		}
		//save allocated
		i += 1

		if i%step == 0 {
			toolkit.Printfn("Processing %d of %d %s",
				i, rcount, time.Since(tstart).String())
		}
	}
}

func buildratio() {
	for key, val := range sgacalc {
		dval := sgasource[key]
		sgadirectratio[key] = toolkit.Div(dval, val)
	}

	for k, v := range sgadirectratio {
		toolkit.Println(k, " : ", v)
	}
}

func prepmastercalc() {
	cbg, _ := conn.NewQuery().From(sourcetablename).Select().Cursor(nil)
	defer cbg.Close()

	for {
		bg := toolkit.M{}
		if e := cbg.Fetch(&bg, 1, false); e != nil {
			break
		}

		dskey := bg.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := toolkit.Sprintf("%d-%d", dskey.GetInt("year"), dskey.GetInt("year")+1)
		costgroup := dskey.GetString("costgroup")
		if costgroup == "OTHER" {
			costgroup = "Other"
		}

		key := toolkit.Sprintf("%s_%s_%s", fiscal,
			dskey.GetString("branchid"),
			costgroup)

		sgasource[key] += bg.GetFloat64("amount")
	}

	calcbg, _ := conn.NewQuery().From(calctablename).Select().Cursor(nil)
	defer calcbg.Close()

	for {
		bg := toolkit.M{}
		if e := calcbg.Fetch(&bg, 1, false); e != nil {
			break
		}

		dskey := bg.Get("key", toolkit.M{}).(toolkit.M)
		key := toolkit.Sprintf("%s_%s", dskey.GetString("date_fiscal"),
			dskey.GetString("customer_branchid"))

		for k, v := range bg {
			ar01k := strings.Split(k, "_")
			if ar01k[0] == "PL33" || ar01k[0] == "PL34" || ar01k[0] == "PL35" {
				costgroup := ar01k[1]

				skey := toolkit.Sprintf("%s_%s", key, costgroup)
				sgacalc[skey] += toolkit.ToFloat64(v, 6, toolkit.RoundingAuto)
			}
		}
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
