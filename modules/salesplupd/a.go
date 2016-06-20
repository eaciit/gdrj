package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	//"runtime"

	"sync"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"

	"flag"
	_ "strings"
)

var mutex = new(sync.Mutex)
var conn dbox.IConnection
var (
	compute              string
	periodFrom, periodTo int
	dateFrom, dateTo     time.Time
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

var masters, masterbranchs = toolkit.M{}, toolkit.M{}

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj,
		nil, nil)
	//toolkit.M{}.Set("take", 10))
	if e != nil {
		return nil
	}
	return c
}

var subchannels = toolkit.M{}

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

func prepMaster() {
	toolkit.Println("--> SUBCHANNEL")
	c, _ := conn.NewQuery().From("subchannels").Cursor(nil)
	defer c.Close()

	for {
		m := toolkit.M{}
		e := c.Fetch(&m, 1, false)
		if e != nil {
			break
		}
		subchannels.Set(m.GetString("_id"), m.GetString("title"))
	}

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

	masterbranchs = toolkit.M{}
	cmb := getCursor(new(gdrj.MasterBranch))
	defer cmb.Close()
	for {
		stx := new(gdrj.MasterBranch)
		e := cmb.Fetch(stx, 1, false)
		if e != nil {
			break
		}

		masterbranchs.Set(stx.ID, stx.Name)
	}
}

func makeDateFromInt(i int, endofmth bool) time.Time {
	yr := int(toolkit.ToFloat64(float64(i)/float64(100), 0, toolkit.RoundingDown))
	m := i - 100*yr
	dt := time.Date(yr, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
	if endofmth {
		dt = dt.AddDate(0, 1, 0).AddDate(0, 0, -1)
	}
	return dt
}

var pldatas = map[string]*gdrj.PLDataModel{}

var t0 time.Time

func main() {
	flag.IntVar(&periodFrom, "from", 0, "YYYYMM representation of period from. Default is 0")
	flag.IntVar(&periodTo, "to", 0, "YYYYMM representation of period to. Default is 0 (equal to from)")
	flag.Parse()
	if periodFrom == 0 && periodTo == 0 {
		dateFrom = makeDateFromInt(201404, false)
	} else {
		dateFrom = makeDateFromInt(periodFrom, false)
	}
	dateTo = makeDateFromInt(periodTo, true)

	setinitialconnection()
	defer gdrj.CloseDb()

	t0 = time.Now()
	toolkit.Printfn("Model Updater v 1.0")
	toolkit.Printfn("Compute: %s", compute)

	var f *dbox.Filter
	if periodFrom == 0 && periodTo == 0 {
		toolkit.Printfn("Period: All")
	} else if periodTo == 0 {
		toolkit.Printfn("Period: %s",
			toolkit.Date2String(dateFrom, "MMM-yyyy"))
		f = dbox.Eq("date.date", dateFrom)
	} else {
		toolkit.Printfn("Period: %s to %s",
			toolkit.Date2String(dateFrom, "dd-MMM-yyyy"),
			toolkit.Date2String(dateTo, "dd-MMM-yyyy"))
		f = dbox.And(dbox.Gte("date.date", dateFrom), dbox.Lte("date.date", dateTo))
	}
	toolkit.Printfn("Run :%v", t0)

	toolkit.Println("Reading Master")
	prepMaster()

	toolkit.Println(masterbranchs)

	//spl := new(gdrj.SalesPL)
	//toolkit.Println("Delete existing")
	//conn.NewQuery().From(spl.TableName()).Delete().Exec(nil)

	//f = dbox.Eq("_id", "CN/GBP/15000011_10")
	c, _ := gdrj.Find(new(gdrj.SalesPL), f, nil)
	defer c.Close()

	count := c.Count()
	jobs := make(chan *gdrj.SalesPL, count)
	result := make(chan string, count)
	for wi := 0; wi < 10; wi++ {
		go workerProc(wi, jobs, result)
	}

	toolkit.Printfn("START ... %d records", count)
	step := count / 100
	limit := step
	i := 0
	for {
		stx := new(gdrj.SalesPL)
		e := c.Fetch(stx, 1, false)
		if e != nil {
			break
		}

		if i == 1000 {
			//break
		}

		i++
		jobs <- stx
		if i >= limit {
			toolkit.Printfn("Processing %d of %d (%d pct) in %s",
				i, count, i*100/count, time.Since(t0).String())
			limit += step
		}
	}
	close(jobs)

	count = i
	step = count / 100
	limit = step
	for ri := 0; ri < i; ri++ {
		<-result

		if ri >= limit {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				ri, count, ri*100/count, time.Since(t0).String())
			limit += step
		}
	}
}

func workerProc(wi int, jobs <-chan *gdrj.SalesPL, result chan<- string) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

	var spl *gdrj.SalesPL
	for spl = range jobs {

		//-- update channel and subchannel
		/*
			subchannel := subchannels.GetString(spl.Customer.CustType)
			if spl.Customer.ChannelID == "I1" {
				spl.Customer.ReportChannel = "RD"
				spl.Customer.ReportSubChannel = "RD"
			} else if spl.Customer.ChannelID == "I3" {
				spl.Customer.ReportChannel = "MT"
				if subchannel == "" {
					spl.Customer.ReportSubChannel = subchannels.GetString("M3")
				} else {
					spl.Customer.ReportSubChannel = subchannel
				}
			} else if spl.Customer.ChannelID == "I4" {
				spl.Customer.ReportChannel = "IT"
				spl.Customer.ReportSubChannel = "IT"
			} else if spl.Customer.ChannelID == "I6" {
				spl.Customer.ReportChannel = "Motoris"
				spl.Customer.ReportSubChannel = "Motoris"
			} else {
				spl.Customer.ChannelID = "I2"
				spl.Customer.ReportChannel = "GT"
				subchannel := subchannels.GetString(spl.Customer.CustType)
				if subchannel == "" {
					spl.Customer.ReportSubChannel = "R18 - Lain-lain"
				} else {
					spl.Customer.ReportSubChannel = subchannel
				}
			}
		*/
		//-- For fix branch name
		spl.Customer.BranchName = toolkit.ToString(masterbranchs.Get(spl.Customer.BranchID, ""))

		//-- For export
		// if strings.Contains(spl.ID, "EXPORT") {
		// 	spl.Customer.ChannelID = "EXP"
		// 	spl.Customer.ChannelName = "Export"

		// 	spl.Customer.ReportChannel = "EXPORT"
		// 	spl.Customer.ReportSubChannel = "EXPORT"
		// }

		//--Recalculate the PL Model value
		// spl.CalcSum(masters)

		workerConn.NewQuery().From(spl.TableName()).
			Save().Exec(toolkit.M{}.Set("data", spl))

		result <- spl.ID
	}
}
