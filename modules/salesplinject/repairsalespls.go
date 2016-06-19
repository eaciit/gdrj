package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"

	"sync"
	"time"
)

var conn dbox.IConnection
var count, scount, iscount, step int
var t0 time.Time
var mwg sync.WaitGroup
var masters toolkit.M

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

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("START...")
	prepmaster()

	crx, err := gdrj.Find(new(gdrj.SalesPL),
		nil,
		toolkit.M{})

	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count = crx.Count()

	jobs := make(chan *gdrj.SalesPL, count)
	toolkit.Println("Prepare Worker")
	for wi := 0; wi < 10; wi++ {
		mwg.Add(1)
		go worker(wi, jobs)
	}

	toolkit.Println("Total Data : ", count)
	step = count / 100
	i := 0
	t0 = time.Now()
	for {
		i++
		st := new(gdrj.SalesPL)
		e := crx.Fetch(&st, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		jobs <- st

		if i%step == 0 {
			toolkit.Printfn("Processing %d of %d (%d) in %s",
				i, count, i/step,
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

	var j *gdrj.SalesPL
	table := toolkit.Sprintf("%v-1", j.TableName())

	for j = range jobs {

		// DO Repair

		j.CalcSum(masters)

		workerConn.NewQuery().From(table).
			Save().Exec(toolkit.M{}.Set("data", j))

		iscount++

		if step == 0 {
			step = 1000
		}

		if iscount%step == 0 {
			toolkit.Printfn("Saved %d of %d (%d) in %s",
				iscount, scount, iscount/step,
				time.Since(t0).String())
		}
	}

	mwg.Done()
}
