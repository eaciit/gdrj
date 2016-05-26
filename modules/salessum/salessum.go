package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	// "errors"
	"flag"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"os"
	"sync"
	"time"
)

var (
	startperiode time.Time = time.Now().AddDate(-1, 0, 0)
	endperiode   time.Time = time.Now()
	arroutletid  []string
	arrskuid     []string

	arsalesmonthly []*gdrj.SalesMonthly
	mutex          = &sync.Mutex{}
)

func setinitialconnection() {
	conn, err := modules.GetDboxIConnection("db_godrej")

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

func setinitialvariable() {
	fstartperiode := flag.String("startperiode", "", "config file")
	fendperiode := flag.String("endperiode", "", "snapshot filepath")
	foutletid := flag.String("outletid", "", "_id of the config (if array)")
	fskuid := flag.String("skuid", "", "process id number for identify snapshot active")

	flag.Parse()

	if rt := modules.ToDate(toolkit.ToString(*fstartperiode)); !rt.IsZero() {
		startperiode = rt
	}

	if rt := modules.ToDate(toolkit.ToString(*fendperiode)); !rt.IsZero() {
		endperiode = rt
	}

	rstr := make([]string, 0, 0)
	if str := toolkit.ToString(*foutletid); str != "" {
		_ = toolkit.UnjsonFromString(toolkit.ToString(*foutletid), &rstr)
	}

	if len(rstr) > 0 {
		arroutletid = append(arroutletid, rstr...)
		rstr = make([]string, 0, 0)
	}

	if str := toolkit.ToString(*fskuid); str != "" {
		_ = toolkit.UnjsonFromString(toolkit.ToString(*foutletid), &rstr)
	}

	if len(rstr) > 0 {
		arrskuid = append(arrskuid, rstr...)
	}

}

func getfilter(cat string, to time.Time) (dboxf *dbox.Filter) {
	ardboxf := make([]*dbox.Filter, 0, 0)
	switch cat {
	case "monthly":
		ardboxf = append(ardboxf, dbox.Eq("month", to.Month()))
		ardboxf = append(ardboxf, dbox.Eq("year", to.Year()))
	case "daily":
		ardboxf = append(ardboxf, dbox.Gte("date", to.AddDate(0, -1, 0)))
		ardboxf = append(ardboxf, dbox.Lte("date", to))
	default:
		ardboxf = append(ardboxf, dbox.Gte("date", to.AddDate(0, -1, 0)))
		ardboxf = append(ardboxf, dbox.Lte("date", to))
	}

	iarrskuid := []interface{}{}
	iarroutletid := []interface{}{}

	for _, v := range arrskuid {
		iarrskuid = append(iarrskuid, v)
	}

	for _, v := range arroutletid {
		iarroutletid = append(iarroutletid, v)
	}

	if len(arrskuid) > 0 {
		ardboxf = append(ardboxf, dbox.In("skuid", iarrskuid...))
	}

	if len(arroutletid) > 0 {
		ardboxf = append(ardboxf, dbox.In("skuid", iarroutletid...))
	}

	dboxf = dbox.And(ardboxf...)

	return
}

func clearsalesmonthlydata(outtm chan time.Time) {
	//Find(o orm.IModel, filter *dbox.Filter, config toolkit.M) (dbox.ICursor, error)
	var i int = 0
	var tperiode time.Time = startperiode
	var wg sync.WaitGroup

	for tperiode.Before(endperiode) {
		wg.Add(1)

		dboxf := new(dbox.Filter)

		tperiode = startperiode.AddDate(0, i, 0)
		if tperiode.Before(endperiode) {
			dboxf = getfilter("monthly", tperiode)
		} else {
			dboxf = getfilter("monthly", endperiode)
		}
		i += 1

		go func(gdboxf *dbox.Filter, tperiode time.Time) {
			csm, err := gdrj.Find(new(gdrj.SalesMonthly), gdboxf, toolkit.M{}.Set("order", []string{"skuid", "outletid"}))
			if err != nil {
				wg.Done()
				return
			}

			arsalesmonthly := make([]*gdrj.SalesMonthly, 0, 0)
			err = csm.Fetch(&arsalesmonthly, 0, false)
			if err != nil {
				wg.Done()
				return
			}

			for _, v := range arsalesmonthly {
				err = v.Delete()
				if err != nil {
					wg.Done()
					return
				}
			}

			outtm <- time.Date(tperiode.Year(), tperiode.Month(), 1, 0, 0, 0, 0, time.Local)
			wg.Done()
			return
		}(dboxf, tperiode)

	}

	wg.Wait()
	close(outtm)
}

func processsalesmonthlydata(outtms <-chan time.Time) {
	var wg sync.WaitGroup

	for souttm := range outtms {
		eouttm := souttm.AddDate(0, 1, 0)
		if souttm.After(endperiode) {
			toolkit.Println("NOT PROCESS : ", souttm, " to ", eouttm)
			continue
		}

		if souttm.Before(startperiode) {
			souttm = startperiode
		}

		if eouttm.After(endperiode) {
			eouttm = endperiode.AddDate(0, 0, 1)
		}

		toolkit.Println("PROCESS : ", souttm, " to ", eouttm)
	}

	wg.Wait()
}

func main() {
	var mwg sync.WaitGroup

	setinitialconnection()
	setinitialvariable()

	defer gdrj.CloseDb()
	toolkit.Println("START DATE : [", startperiode, "] END DATE : [", endperiode, "]")

	outtm := make(chan time.Time)
	mwg.Add(1)
	go func(xouttm chan time.Time) {
		clearsalesmonthlydata(xouttm)
		mwg.Done()
	}(outtm)

	mwg.Add(1)
	go func(xouttm chan time.Time) {
		processsalesmonthlydata(xouttm)
		mwg.Done()
	}(outtm)

	mwg.Wait()

	br := gdrj.BranchGetByID("MD01")
	toolkit.Println(br)
}
