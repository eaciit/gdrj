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
	"strings"
	"sync"
	"time"
)

var (
	startperiode time.Time = time.Now().AddDate(-1, 0, 0)
	endperiode   time.Time = time.Now()
	arroutletid  []string
	arrskuid     []string

	//Add log variable

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
	fstartperiode := flag.String("startperiode", "", "start periode for selection data in format yyyy/mm/dd or dd/mm/yyyy. separated dot(.), dash(-) are permited")
	fendperiode := flag.String("endperiode", "", "end periode for selection data in format yyyy/mm/dd or dd/mm/yyyy. separated dot(.), dash(-) are permited")
	foutletid := flag.String("outletid", "", "outletid for filtering data in json string from array string")
	fskuid := flag.String("skuid", "", "skuid for filtering data in json string from array string")
	flogname := flag.String("log", "", "filename for save log")

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

	//set log

}

func getfilter(cat string, from, to time.Time) (dboxf *dbox.Filter) {
	ardboxf := make([]*dbox.Filter, 0, 0)
	switch cat {
	case "monthly":
		ardboxf = append(ardboxf, dbox.Eq("month", from.Month()))
		ardboxf = append(ardboxf, dbox.Eq("year", from.Year()))
	default:
		ardboxf = append(ardboxf, dbox.Gte("date", from))
		ardboxf = append(ardboxf, dbox.Lt("date", to))
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
			dboxf = getfilter("monthly", tperiode, nil)
		} else {
			dboxf = getfilter("monthly", endperiode, nil)
		}
		i += 1

		go func(gdboxf *dbox.Filter, tperiode time.Time) {
			csm, err := gdrj.Find(new(gdrj.SalesMonthly), gdboxf, toolkit.M{}.Set("order", []string{"skuid", "outletid"}))
			if err != nil {
				wg.Done()
				return
			}
			defer csm.Close()

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

		dboxf := getfilter("daily", souttm, eouttm)

		wg.Add(1)
		go func(gdboxf *dbox.Filter) {
			csm, err := gdrj.Find(new(gdrj.Sales), gdboxf, toolkit.M{}.Set("order", []string{"skuid", "outletid"}))
			if err != nil {
				wg.Done()
				return
			}
			defer csm.Close()

			arsales := make([]*gdrj.Sales, 0, 0)
			err = csm.Fetch(&arsales, 0, false)
			if err != nil {
				wg.Done()
				return
			}

			tsalesmonthly := new(gdrj.SalesMonthly)
			for _, sales := range arsales {

				if tsalesmonthly.SKUID != sales.SKUID || tsalesmonthly.OutletID != sales.OutletID {
					err = gdrj.Save(tsalesmonthly)
					if err != nil {
						wg.Done()
						return
					}

					tsalesmonthly = new(gdrj.SalesMonthly)
					tdboxf := dbox.And(dbox.Eq("skuid", sales.SKUID), dbox.Eq("outletid", sales.OutletID), dbox.Eq("year", sales.Date.Year()), dbox.Eq("month", sales.Date.Month()))
					xcsm, err := gdrj.Find(tsalesmonthly, tdboxf, nil)
					if err != nil {
						wg.Done()
						return
					}

					err = xcsm.Fetch(&tsalesmonthly, 1, false)
					if err != nil && !strings.Contains(strings.ToLower(err.Error()), "not found") {
						wg.Done()
						return
					}
				}

				tsalesmonthly.Year = sales.Year
				tsalesmonthly.Month = sales.Month
				tsalesmonthly.OutletID = sales.OutletID
				tsalesmonthly.SKUID = sales.SKUID

			}

			if tsalesmonthly.SKUID != "" {
				err = gdrj.Save(tsalesmonthly)
			}

			if err != nil {
				wg.Done()
				return
			}

			wg.Done()
		}(dboxf)
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
