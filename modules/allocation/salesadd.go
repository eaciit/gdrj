package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

var conn dbox.IConnection
var count int

// var mwg sync.WaitGroup

var (
	t0                                time.Time
	custgroup, prodgroup, plcode, ref string
	value, fiscalyear                 int
	globalval                         float64
	mapkeysvalue                      map[string]float64
	masters                           toolkit.M
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
	mapkeysvalue = make(map[string]float64)

	flag.IntVar(&value, "value", 0, "representation of value need to be allocation. Default is 0")
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.StringVar(&ref, "ref", "", "Reference from document or other. Default is blank")
	flag.Parse()

	if value == 0 {
		toolkit.Println("Value are mandatory to fill")
		os.Exit(1)
	}

	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Get Data Master...")
	prepmaster()

	toolkit.Println("Start Data Process...")

	toolkit.Printfn("Preparing the data")

	amount := toolkit.ToFloat64(value/12, 6, toolkit.RoundingAuto)
	for i := 1; i <= 12; i++ {
		Date := time.Date(fiscalyear, time.Month(i), 1, 0, 0, 0, 0, time.UTC).AddDate(-1, 3, 0)

		tcustomer := new(gdrj.Customer)
		tproduct := gdrj.ProductGetBySKUID("40011932")
		tpc := gdrj.ProfitCenterGetByID(toolkit.Sprintf("CD02%v", tproduct.BrandCategoryID))
		tcc := new(gdrj.CostCenter)

		tcustomer.Name = "CUSTOMER VIRTUAL"
		tcustomer.BranchID = "CD02"
		tcustomer.ChannelID = "I3"
		tcustomer.ChannelName = "MT"
		tcustomer.CustomerGroup = "MD"
		tcustomer.CustomerGroupName = "Modern Market"

		spl := new(gdrj.SalesPL)
		spl.Date = gdrj.SetDate(Date)

		spl.Customer = tcustomer
		spl.Product = tproduct
		spl.Source = "ADJUST"
		spl.Ref = "SALES"
		spl.PC = tpc
		spl.CC = tcc

		spl.GrossAmount = amount
		spl.NetAmount = amount

		plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)
		spl.AddData("PL1", amount, plmodels)
		spl.CalcSum(masters)

		gdrj.Save(spl)

		toolkit.Printfn("Saving %d of %d in %s", i, 12,
			time.Since(t0).String())
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}
