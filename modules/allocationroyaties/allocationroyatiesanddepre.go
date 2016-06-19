package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
	"sync"
	"time"
)

var conn dbox.IConnection
var count int

// var mwg sync.WaitGroup

var (
	t0                                                time.Time
	custgroup, prodgroup, plcode, ref                 string
	value, fiscalyear, iscount, gscount, scount, step int
	mapsperiodgross, mapsperiodroyalties              map[string]float64
	mapsperiodindirect, mapsperioddirect              map[string]float64
	mapsperioddamage                                  map[string]float64
	masters                                           toolkit.M
	mwg                                               sync.WaitGroup
	gdirect, gindirect, gdamage                       float64
)

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

func buildmap(holder interface{},
	fnModel func() orm.IModel,
	filter *dbox.Filter,
	fnIter func(holder interface{}, obj interface{})) interface{} {
	crx, _ := gdrj.Find(fnModel(), filter, nil)
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

func prepmaster() {
	masters = toolkit.M{}

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

func getroyalties() {
	filter := dbox.And(dbox.Eq("src", "ROYALTY"), dbox.Eq("year", fiscalyear-1))
	croy, _ := gdrj.Find(new(gdrj.RawDataPL), filter, nil)
	defer croy.Close()

	sroy := croy.Count()
	toolkit.Printfn("data royalties %d", sroy)
	for {
		troy := new(gdrj.RawDataPL)
		e := croy.Fetch(&troy, 1, false)
		if e != nil {
			break
		}

		date := time.Date(troy.Year, time.Month(troy.Period), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		pval := toolkit.Sprintf("%d_%d", date.Year(), int(date.Month()))

		mapsperiodroyalties[pval] += troy.AmountinIDR

	}

	subtot := 0.0
	for _, v := range mapsperiodroyalties {
		subtot += v
	}
	toolkit.Printfn("subtotal royalties : %v", subtot)
}

func getdepreciation() {
	filter := dbox.And(dbox.Eq("src", "DEPRECIATION"), dbox.Eq("year", fiscalyear-1))
	croy, _ := gdrj.Find(new(gdrj.RawDataPL), filter, nil)
	defer croy.Close()

	sroy := croy.Count()
	toolkit.Printfn("data depreciation %d", sroy)
	for {
		troy := new(gdrj.RawDataPL)
		e := croy.Fetch(&troy, 1, false)
		if e != nil {
			break
		}

		date := time.Date(troy.Year, time.Month(troy.Period), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		pval := toolkit.Sprintf("%d_%d", date.Year(), int(date.Month()))

		if strings.Contains(troy.Grouping, "Factory") {
			mapsperioddirect[pval] += troy.AmountinIDR
		} else {
			mapsperiodindirect[pval] += troy.AmountinIDR
		}
	}

	subtot := 0.0
	for k, v := range mapsperioddirect {
		toolkit.Printfn("%v,%v", k, v)
		subtot += v
	}
	toolkit.Printfn("subtotal direct depre : %v", subtot)

	subtot = 0.0
	for k, v := range mapsperiodindirect {
		toolkit.Printfn("%v,%v", k, v)
		subtot += v
	}
	toolkit.Printfn("subtotal indirect depre : %v", subtot)
}

func getdamage() {
	filter := dbox.And(dbox.Eq("src", "DAMAGEGOODS"), dbox.Eq("year", fiscalyear-1))
	croy, _ := gdrj.Find(new(gdrj.RawDataPL), filter, nil)
	defer croy.Close()

	sroy := croy.Count()
	gamount := 0.0
	toolkit.Printfn("data damage goods %d", sroy)
	for {

		troy := new(gdrj.RawDataPL)
		e := croy.Fetch(&troy, 1, false)
		if e != nil {
			break
		}

		gamount += troy.AmountinIDR

	}

	for i := 1; i <= 12; i++ {
		date := time.Date(fiscalyear-1, time.Month(i), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		pval := toolkit.Sprintf("%d_%d", date.Year(), int(date.Month()))

		mapsperioddamage[pval] += gamount / 12
	}

	subtot := 0.0
	for k, v := range mapsperioddamage {
		toolkit.Printfn("%v,%v", k, v)
		subtot += v
	}
	toolkit.Printfn("subtotal damage goods : %v", subtot)
}

func main() {
	t0 = time.Now()
	mapsperiodgross = make(map[string]float64)
	mapsperiodroyalties = make(map[string]float64)
	mapsperiodindirect = make(map[string]float64)
	mapsperioddirect = make(map[string]float64)
	mapsperioddamage = make(map[string]float64)

	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.StringVar(&ref, "ref", "", "Reference from document or other. Default is blank")
	flag.Parse()

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)

	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Get Data Master...")
	prepmaster()

	toolkit.Println("Count Royaties Data Process...")
	getroyalties()

	toolkit.Println("Count Depreciation Data Process...")
	getdepreciation()

	toolkit.Println("Count Damage Data Process...")
	getdamage()

	toolkit.Println("Start Get Gross Ratio...")
	cgrossratio, _ := conn.NewQuery().Select().From("tmproyaltysalesgrossratio").Cursor(nil)
	defer cgrossratio.Close()

	for {

		tgr := toolkit.M{}
		e := cgrossratio.Fetch(&tgr, 1, false)
		if e != nil {
			break
		}

		key := toolkit.Sprintf("%v_%v", tgr.Get("year", ""), tgr.Get("month", ""))
		mapsperiodgross[key] = toolkit.ToFloat64(tgr.Get("amount", 0), 6, toolkit.RoundingAuto)

	}

	toolkit.Println("Start Data Process...")
	filter := dbox.And(dbox.Gte("date.date", speriode), dbox.Lt("date.date", eperiode), dbox.Gt("grossamount", 0))
	// filter = dbox.Eq("_id", "RK/IMN/15000001_1")
	c, _ := gdrj.Find(new(gdrj.SalesPL), filter, nil)
	defer c.Close()

	scount = c.Count()
	iscount = 0
	gscount = 0
	step = scount / 100
	// step = 1000

	jobs := make(chan *gdrj.SalesPL, count)
	toolkit.Println("Prepare Worker")
	for wi := 0; wi < 10; wi++ {
		mwg.Add(1)
		go worker(wi, jobs)
	}
	// ====================================
	// for {
	// 	iscount++

	// 	spl := new(gdrj.SalesPL)
	// 	e := c.Fetch(spl, 1, false)
	// 	if e != nil {
	// 		toolkit.Println("EOF")
	// 		break
	// 	}

	// 	pval := toolkit.Sprintf("%d_%d", spl.Date.Year, spl.Date.Month)
	// 	mapsperiodgross[pval] += spl.GrossAmount

	// 	if iscount%step == 0 {
	// 		toolkit.Printfn("Preparing %d of %d (%d) in %s", iscount, scount, iscount/step,
	// 			time.Since(t0).String())
	// 	}
	// }

	// c.ResetFetch()
	// iscount = 0
	// ===========================
	for {
		iscount++

		spl := new(gdrj.SalesPL)
		e := c.Fetch(spl, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		jobs <- spl
		if iscount%step == 0 {
			toolkit.Printfn("Processing %d of %d (%d) in %s", iscount, scount, iscount/step,
				time.Since(t0).String())
		}

	}

	close(jobs)
	mwg.Wait()

	toolkit.Printfn("Saved %d of %d (%d) in %s",
		gscount, scount, gscount/step,
		time.Since(t0).String())

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())

	toolkit.Printfn("Checlist %v : %v : %v",
		gdirect, gindirect, gdamage)
}

func worker(wi int, jobs <-chan *gdrj.SalesPL) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()
	defer mwg.Done()

	var j *gdrj.SalesPL
	table := j.TableName()
	plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)

	for j = range jobs {

		gscount++

		aplmodel := j.PLDatas
		for k, _ := range aplmodel {
			if k == "PL25" || k == "PL26A" ||
				k == "PL42" || k == "PL43" || k == "PL44" || k == "PL44A" {
				delete(aplmodel, k)
			}
		}

		j.PLDatas = aplmodel

		key := toolkit.Sprintf("%d_%d", j.Date.Year, int(j.Date.Month))

		ratio := j.GrossAmount / mapsperiodgross[key]
		totroyaltyline := -ratio * mapsperiodroyalties[key]
		totindirectline := toolkit.ToFloat64(ratio*mapsperiodindirect[key], 2, toolkit.RoundingUp)
		totdirectline := ratio * mapsperioddirect[key]
		totdamagegoodsline := -ratio * mapsperioddamage[key]

		gdamage += totdamagegoodsline
		gindirect += totindirectline
		gdirect += totdirectline

		if mapsperiodgross[key] == 0 {
			continue
		}

		// PL42	PL0058	Total Depreciation Exp	Depreciation - Direct
		// PL43	PL0059	Total Depreciation Exp	Depreciation - Indirect
		// PL44	PL0060	Total Depreciation Exp	Damaged Goods

		j.AddDataCC("PL25", totroyaltyline, "", plmodels)
		j.AddDataCC("PL42", totdirectline, "", plmodels)
		j.AddDataCC("PL43", totindirectline, "", plmodels)
		j.AddDataCC("PL44", totdamagegoodsline, "", plmodels)

		j.CalcSum(masters)

		e := workerConn.NewQuery().From(table).
			Save().Exec(toolkit.M{}.Set("data", j))

		if e != nil {
			toolkit.Printfn("Unable to save %s = %s",
				j.ID, e.Error())
		}

		if gscount%step == 0 {
			toolkit.Printfn("Saved %d of %d (%d) in %s",
				gscount, scount, gscount/step,
				time.Since(t0).String())
		}
	}
}
