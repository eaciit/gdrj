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

var (
	t0                                time.Time
	custgroup, prodgroup, plcode, ref string
	value, fiscalyear                 int
	globalval                         float64
	mapkeysvalue                      map[string]float64
	masters                           = toolkit.M{}
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

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj,
		nil, nil)
	//toolkit.M{}.Set("take", 10))
	if e != nil {
		return nil
	}
	return c
}

func prepmaster() {
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

func prepmasterclean() {

	toolkit.Println("--> Sub Channel")
	csr, _ := conn.NewQuery().From("subchannels").Cursor(nil)
	subchannels := toolkit.M{}
	defer csr.Close()
	for {
		m := toolkit.M{}
		e := csr.Fetch(&m, 1, false)
		if e != nil {
			break
		}
		subchannels.Set(m.GetString("_id"), m.GetString("title"))
	}
	masters.Set("subchannels", subchannels)

	customers := toolkit.M{}
	toolkit.Println("--> Customer")
	ccb := getCursor(new(gdrj.Customer))
	defer ccb.Close()
	for {
		cust := new(gdrj.Customer)
		e := ccb.Fetch(cust, 1, false)
		if e != nil {
			break
		}

		customers.Set(cust.ID, cust)
	}
	masters.Set("customers", customers)

	branchs := toolkit.M{}
	cmb := getCursor(new(gdrj.MasterBranch))
	defer cmb.Close()
	for {
		stx := toolkit.M{}
		e := cmb.Fetch(&stx, 1, false)
		if e != nil {
			break
		}

		branchs.Set(stx.Get("_id", "").(string), stx)
	}
	masters.Set("branchs", branchs)

	rdlocations := toolkit.M{}
	crdloc, _ := conn.NewQuery().From("outletgeo").Cursor(nil)
	defer crdloc.Close()
	for {
		stx := toolkit.M{}
		e := crdloc.Fetch(&stx, 1, false)
		if e != nil {
			break
		}

		rdlocations.Set(stx.GetString("_id"), stx)
	}
	masters.Set("rdlocations", rdlocations)
}

func main() {
	t0 = time.Now()
	mapkeysvalue = make(map[string]float64)

	flag.IntVar(&value, "value", 0, "representation of value need to be allocation. Default is 0")
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.StringVar(&plcode, "plcode", "", "PL Code to Inject")
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
	prepmasterclean()

	toolkit.Println("Start Data Process...")

	toolkit.Printfn("Preparing the data")

	amount := toolkit.ToFloat64(value/(12*10), 6, toolkit.RoundingAuto)
	skuids := []string{"40011932", "40007859", "40009107", "40009106", "40008381",
		"40011511", "40008651", "40007573", "40007868", "40008741"}

	for i := 1; i <= 12; i++ {
		Date := time.Date(fiscalyear, time.Month(i), 1, 0, 0, 0, 0, time.UTC).AddDate(-1, 3, 0)
		//40011932, 40007859, 40009107, 40009106, 40008381,
		//40011511, 40008651, 40007573, 40007868, 40008741
		for _, skuid := range skuids {
			tcustomer := new(gdrj.Customer)
			tproduct := gdrj.ProductGetBySKUID(skuid)
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
			spl.Ref = "COGS-MANUAL"
			spl.PC = tpc
			spl.CC = tcc

			plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)
			spl.AddData("PL9", amount, plmodels)
			spl.CleanAndClasify(masters)
			spl.CalcSum(masters)

			// gdrj.Save(spl)
			conn.NewQuery().From("salespls-2").
				Save().Exec(toolkit.M{}.Set("data", spl))
		}

		toolkit.Printfn("Saving %d of %d in %s", i, 12,
			time.Since(t0).String())
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

// -value=-25838428343 -year=2015
