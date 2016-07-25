package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/csv"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"gopkg.in/mgo.v2/bson"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	wd, _     = os.Getwd()
	brandlist = []string{}
	conn      dbox.IConnection
	mwg       sync.WaitGroup
	totalData int
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

func getstep(count int) int {
	v := count / 100
	if v == 0 {
		return 1
	}
	return v
}

func main() {

	setinitialconnection()
	defer gdrj.CloseDb()

	t0 := time.Now()

	prepmaster()

	getdiscountdata()

	toolkit.Println("\n\n========= END OF PROCESS =========")
	toolkit.Printfn("Processing %d data in %s",
		totalData, time.Since(t0).String())

}

func prepmaster() {
	brand := new(gdrj.Brand)
	cbrand, err := gdrj.Find(brand, nil, nil)
	if err != nil {
		return
	}

	defer cbrand.Close()
	var e error

	for {
		e = cbrand.Fetch(&brand, 1, false)
		brandlist = append(brandlist, brand.Name)
		brand = new(gdrj.Brand)
		if e != nil {
			toolkit.Println("EOF fetching master data")
			break
		}
	}

	return
}

func getdiscountdata() {
	discountConn, _ := modules.GetDboxIConnection("db_godrej")
	defer discountConn.Close()

	cdisountdata, _ := discountConn.NewQuery().Select().From("temp_discount").Cursor(nil)

	defer cdisountdata.Close()
	count := cdisountdata.Count()
	totalData += count
	t0 := time.Now()
	step := getstep(count) * 5

	iscount := 0
	jobs := make(chan toolkit.M, count)
	result := make(chan string, count)
	toolkit.Println("Prepare Worker")

	for wi := 0; wi < 4; wi++ {
		mwg.Add(1)
		go workerDiscount(1, jobs, result)
	}
	var err error
	discountdata := toolkit.M{}
	for {
		iscount++
		discountdata = toolkit.M{}

		err = cdisountdata.Fetch(&discountdata, 1, false)

		if err != nil {
			toolkit.Println("EOF fetching Discount Data")
			break
		}
		jobs <- discountdata

		if iscount%step == 0 {
			toolkit.Printfn("Sending %d of %d (%d %%) in %s", iscount, count, iscount*100/count,
				time.Since(t0).String())
		}

	}
	close(jobs)

	for ri := 0; ri < count; ri++ {
		<-result

		if ri%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d %%) in %s",
				ri, count, ri*100/count, time.Since(t0).String())
		}
	}

	return
}

func workerDiscount(wi int, jobs <-chan toolkit.M, result chan<- string) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From(new(gdrj.DiscountActivity).TableName()).
		SetConfig("multiexec", true).
		Save()
	discountdata := toolkit.M{}
	for discountdata = range jobs {
		discount := new(gdrj.DiscountActivity)
		discount.ID = discountdata["_id"].(bson.ObjectId)
		discount.EntityID = discountdata.GetString("entityid")
		discount.Year = discountdata.GetInt("year")
		discount.Period = discountdata.GetInt("period")
		discount.Account = toolkit.ToString(discountdata.GetInt("account"))
		discount.Material = toolkit.ToString(discountdata.GetInt("material"))
		discount.AccountDescription = discountdata.GetString("accountdescription")
		discount.PCID = discountdata.GetString("pcid")
		if toolkit.TypeName(discountdata.Get("amountinidr")) == "int" {
			discount.AmountinIDR = toolkit.ToFloat64(discountdata.GetInt("amountinidr"), 6, toolkit.RoundingAuto)
		} else {
			discount.AmountinIDR = discountdata.GetFloat64("amountinidr")
		}
		discount.CustomerName = discountdata.GetString("customername")
		discount.City = discountdata.GetString("city")
		discount.ChannelID = discountdata.GetString("channelid")
		discount.ChannelName = discountdata.GetString("channelname")
		discount.BranchID = discountdata.GetString("branchid")
		discount.KeyAccountGroup = discountdata.GetString("keyaccountgroup")
		discount.KeyAccountCode = discountdata.GetString("keyaccountcode")
		discount.Order = discountdata.GetString("order")
		if toolkit.TypeName(discountdata["longtextorder"]) == "string" {
			discount.LongTextOrder = discountdata.GetString("longtextorder")
		} else {
			discount.LongTextOrder = toolkit.ToString(discountdata.GetFloat64("longtextorder"))
		}
		for _, val := range brandlist {
			if strings.Contains(strings.ToUpper(discount.LongTextOrder), val) {
				discount.Brand = val
			}
		}
		discount.BusinessArea = discountdata.GetString("businessarea")

		err := qSave.Exec(toolkit.M{}.Set("data", discount))
		if err != nil {
			toolkit.Printfn("Unable to save %s = %s",
				discount.ID, err.Error())
			os.Exit(200)
		}
		result <- "worker #" + toolkit.ToString(wi) + "is done"
	}
}
