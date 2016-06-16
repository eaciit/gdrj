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
	//branch,channel,group
	flag.StringVar(&custgroup, "custgroup", "global", "group of customer. Default is global")
	//brand,group,skuid
	flag.StringVar(&prodgroup, "prodgroup", "global", "group of product. Default is global")
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.StringVar(&plcode, "plcode", "", "PL Code to take the value. Default is blank")
	flag.StringVar(&ref, "ref", "", "Reference from document or other. Default is blank")
	flag.Parse()

	eperiode := time.Date(fiscalyear, 4, 1, 0, 0, 0, 0, time.UTC)
	speriode := eperiode.AddDate(-1, 0, 0)

	filter := dbox.And(dbox.Gte("date.date", speriode), dbox.Lt("date.date", eperiode))

	if plcode == "" || value == 0 {
		toolkit.Println("PLCode and Value are mandatory to fill")
		os.Exit(1)
	}

	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Get Data Master...")
	prepmaster()

	toolkit.Println("Start Data Process...")
	c, _ := gdrj.Find(new(gdrj.SalesPL), filter, nil)
	defer c.Close()

	splcount := c.Count()
	step := splcount / 100
	i := 0

	for {
		i++

		spl := new(gdrj.SalesPL)
		e := c.Fetch(spl, 1, false)
		if e != nil {
			break
		}
		key := toolkit.Sprintf("%d_%d", spl.Date.Month, spl.Date.Year)
		k := ""
		switch custgroup {
		case "branch":
			key = toolkit.Sprintf("%v_%v", key, spl.Customer.BranchID)
		case "channel":
			k = toolkit.Sprintf("%v|%v", spl.Customer.BranchID, spl.Customer.ChannelID)
			key = toolkit.Sprintf("%v_%v", key, k)
		case "group":
			k = toolkit.Sprintf("%v|%v", spl.Customer.BranchID, spl.Customer.CustomerGroup)
			key = toolkit.Sprintf("%v_%v", key, k)
		default:
			key = toolkit.Sprintf("%v_", key)
		}

		switch prodgroup {
		case "brand":
			key = toolkit.Sprintf("%v_%v", key, spl.Product.Brand)
		case "group":
			k = toolkit.Sprintf("%v|%v", spl.Product.Brand, spl.Product.BrandCategoryID)
			key = toolkit.Sprintf("%v_%v", key, k)
		case "skuid":
			// toolkit.Printfn("%v|%v|%v", spl.Product.Brand, spl.Product.BrandCategoryID, spl.Product.ID)
			k = toolkit.Sprintf("%v|%v|%v", spl.Product.Brand, spl.Product.BrandCategoryID, spl.Product.ID)
			key = toolkit.Sprintf("%v_%v", key, k)
		default:
			key = toolkit.Sprintf("%v_", key)
		}

		mapkeysvalue[key] += spl.GrossAmount
		globalval += spl.GrossAmount

		if i > step {
			step += splcount / 100
			toolkit.Printfn("Processing %d of %d in %s", i, splcount,
				time.Since(t0).String())
		}

	}

	toolkit.Printfn("Preparing the data")
	mcount := len(mapkeysvalue)
	i = 0
	for k, v := range mapkeysvalue {
		i++

		akey := strings.Split(k, "_")
		tcustomer := new(gdrj.Customer)
		tproduct := new(gdrj.Product)

		if len(akey) > 2 && akey[2] != "" {
			switch custgroup {
			case "branch":
				tcustomer.BranchID = akey[2]
			case "channel":
				skey := strings.Split(akey[2], "|")
				tcustomer.BranchID = skey[0]
				if len(skey) > 1 {
					tcustomer.ChannelID = skey[1]
				}
			case "group":
				skey := strings.Split(akey[2], "|")
				tcustomer.BranchID = skey[0]
				if len(skey) > 1 {
					tcustomer.CustomerGroup = skey[1]
				}
			}
		}

		if len(akey) > 3 && akey[3] != "" {
			switch prodgroup {
			case "brand":
				tproduct.Brand = akey[3]
			case "group":
				skey := strings.Split(akey[3], "|")
				tproduct.Brand = skey[0]
				if len(skey) > 1 {
					tproduct.BrandCategoryID = skey[1]
				}
			case "skuid":
				skey := strings.Split(akey[3], "|")
				tproduct.Brand = skey[0]
				if len(skey) > 1 {
					tproduct.BrandCategoryID = skey[1]
				}
				if len(skey) > 2 {
					tproduct.ID = skey[2]
				}
			}
		}

		spl := new(gdrj.SalesPL)
		spl.ID = toolkit.Sprintf("%v%v%v%v", akey[0], akey[1], "", "")
		spl.Date = gdrj.SetDate(time.Date(toolkit.ToInt(akey[1], toolkit.RoundingAuto),
			time.Month(toolkit.ToInt(akey[0], toolkit.RoundingAuto)),
			1, 0, 0, 0, 0, time.UTC))
		spl.Customer = tcustomer
		spl.Product = tproduct
		spl.Source = "ADJUST"
		spl.Ref = ref

		spl.PC = new(gdrj.ProfitCenter)
		spl.CC = new(gdrj.CostCenter)

		amount := toolkit.ToFloat64(value, 6, toolkit.RoundingAuto) * (v / globalval)
		plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)
		spl.AddData(plcode, amount, plmodels)
		spl.CalcSum(masters)

		gdrj.Save(spl)

		toolkit.Printfn("Saving %d of %d in %s", i, mcount,
			time.Since(t0).String())
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}
