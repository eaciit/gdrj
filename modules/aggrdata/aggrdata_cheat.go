package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
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

func main() {
	t0 = time.Now()
	data = make(map[string]float64)
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.Parse()

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Start data query...")

	// filter := dbox.Eq("date.fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	// eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	// speriode := eperiode.AddDate(-1, 0, 0)

	// filter := dbox.And(dbox.Gte("date.date", speriode), dbox.Lt("date.date", eperiode))

	// c, _ := gdrj.Find(new(gdrj.SalesPL), filter, nil)
	// defer c.Close()
	csr, _ := conn.NewQuery().Select().From("pl_customer_channelid_date_fiscal").Cursor(nil)
	defer csr.Close()

	scount = csr.Count()
	iscount = 0
	step := scount / 100

	for {
		iscount++
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("_id"))

		if dtkm.GetString("date_fiscal") == "2014-2015" {
			v := tkm.GetFloat64("PL7")
			tkm.Set("PL7", -v)

			v = tkm.GetFloat64("PL8")
			tkm.Set("PL8", -v)
		}

		_ = workerconn.NewQuery().
			From("pl_customer_channelid_date_fiscal-test").
			SetConfig("multiexec", true).
			Save().Exec(toolkit.M{}.Set("data", tkm))

		if iscount > step {
			step += scount / 100
			toolkit.Printfn("Processing %d of %d in %s", iscount, scount,
				time.Since(t0).String())
		}

		if iscount == 20 {
			break
		}

	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}
