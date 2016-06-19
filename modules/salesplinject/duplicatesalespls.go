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
	t0                                         time.Time
	fiscalyear, iscount, scount, gscount, step int
	mwg                                        sync.WaitGroup
	ref                                        string
	masters                                    toolkit.M
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

func main() {
	t0 = time.Now()
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.StringVar(&ref, "ref", "", "Reference from document or other. Default is blank")
	flag.Parse()

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)

	setinitialconnection()
	defer gdrj.CloseDb()

	prepmaster()

	toolkit.Println("Start Data Process...")
	// filter := dbox.And(dbox.Gte("date.date", speriode), dbox.Lt("date.date", eperiode), dbox.Gt("grossamount", 0))
	filter := dbox.Eq("date.fiscal", "2015-2016")
	// filter = dbox.Eq("_id", "RK/IMN/15000001_1")
	c, _ := gdrj.Find(new(gdrj.SalesPL), filter, nil)
	defer c.Close()

	scount = c.Count()
	iscount = 0
	step = scount / 100
	gscount = 0

	jobs := make(chan *gdrj.SalesPL, count)
	toolkit.Println("Prepare Worker")
	for wi := 0; wi < 10; wi++ {
		mwg.Add(1)
		go worker(wi, jobs)
	}

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
			toolkit.Printfn("Sending %d of %d (%d) in %s", iscount, scount, iscount/step,
				time.Since(t0).String())
		}

	}

	close(jobs)
	mwg.Wait()

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func worker(wi int, jobs <-chan *gdrj.SalesPL) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()
	defer mwg.Done()

	var j *gdrj.SalesPL
	table := toolkit.Sprintf("%v-1", j.TableName())

	for j = range jobs {

		gscount++

		aplmodel := j.PLDatas
		for k, _ := range aplmodel {
			if strings.Contains(k, "PL42") || strings.Contains(k, "PL43") || strings.Contains(k, "PL44") || strings.Contains(k, "PL44A") {
				delete(aplmodel, k)
			}
		}

		j.PLDatas = aplmodel
		j.CalcSum(masters)

		e := workerConn.NewQuery().From(table).
			Save().Exec(toolkit.M{}.Set("data", j))

		if e != nil {
			toolkit.Printfn("Unable to save %s = %s",
				j.ID, e.Error())
		}

		if step == 0 {
			step = 100
		}

		if gscount%step == 0 {
			toolkit.Printfn("Saved %d of %d (%d) in %s",
				gscount, scount, gscount/step,
				time.Since(t0).String())
		}
	}
}
