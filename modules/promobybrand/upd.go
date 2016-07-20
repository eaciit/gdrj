package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"time"

	"strings"

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
	sourcetablename             = "salespls-summary"
	calctablename               = "salespls-summary"
	desttablename               = "salespls-summary"
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
	masters                     = toolkit.M{}
)

type plalloc struct {
	ID               string `bson:"_id" json:"_id"`
	Key              string
	Key1, Key2, Key3 string
	Ref1             float64
	Current          float64
	Expect           float64
	Absorbed         float64
}

var (
	spgpromoratio = map[string]map[string]float64{
		"2015-2016": {
			"spg":   0.222142232,
			"promo": 0.777857768,
		},
		"2014-2015": {
			"spg":   0.191526236,
			"promo": 0.808473764,
		},
	}

	destinationtable = "salespls-summary"
	trxsource        = "promobybrand"
	spgaccount       = "PL31C"
	promoaccount     = "PL29A32"
)

func main() {
	setinitialconnection()
	prepmastercalc()
	conn.NewQuery().From(destinationtable).Where(dbox.Eq("key.trxsrc", trxsource)).Delete().Exec(nil)

	cursor, _ := conn.NewQuery().From("tmpsgpromobalancing").Select().Cursor(nil)
	defer cursor.Close()

	for {
		rm := toolkit.M{}
		e := cursor.Fetch(&rm, 1, false)
		if e != nil {
			toolkit.Printfn("error: %s", e.Error())
			return
		}

		fiscal := rm.GetString("year")
		brand := rm.GetString("brand")
		value := rm.GetFloat64("inject")

		if value != 0 {
			processTable(fiscal, brand, value)
		}
	}
}

func processTable(fiscal, brand string, value float64) error {
	connsave, _ := modules.GetDboxIConnection("db_godrej")
	defer connsave.Close()

	qsave := connsave.NewQuery().SetConfig("multiexec", true).From(destinationtable).Save()
	ratio := spgpromoratio[fiscal]
	fiscals := strings.Split(fiscal, "-")
	yr0 := toolkit.ToInt(fiscals[0], toolkit.RoundingAuto)
	for i := 1; i <= 12; i++ {
		dt := time.Date(yr0, time.Month(i), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		gddate := gdrj.NewDate(dt.Year(), int(dt.Month()), dt.Day())

		trx := toolkit.M{}
		trx.Set(spgaccount, ratio["spg"]*value)
		trx.Set(promoaccount, ratio["promo"]*value)

		trxkey := toolkit.M{}
		trxkey.Set("report_channelid", "I2")
		trxkey.Set("date_fiscal", fiscal)
		trxkey.Set("date_year", dt.Year())
		trxkey.Set("date_month", dt.Month())
		trxkey.Set("date_quartertxt", gddate.QuarterTxt)
		trxkey.Set("customer_custtype", "")
		trxkey.Set("customer_branchid", "CD02")
		trxkey.Set("customer_branchname", "JAKARTA")
		trxkey.Set("customer_channelname", "GT")
		trxkey.Set("customer_keyaccount", "GNT")
		trxkey.Set("customer_reportchannel", "GT")
		trxkey.Set("trxsrc", trxsource)
		trxkey.Set("product_brand", brand)

		id := toolkit.Sprintf("%d-%d-%d|%s|%s", dt.Year(), dt.Month(), dt.Day(), brand, trxsource)
		trx.Set("key", trxkey)
		trx.Set("_id", id)
		toolkit.Printfn("Processing %s", id)

		gdrj.CalcSum(trx, masters)
		esave := qsave.Exec(toolkit.M{}.Set("data", trx))
		if esave != nil {
			return esave
		}
	}
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
