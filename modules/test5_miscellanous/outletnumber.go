package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/csv"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"os"
	"time"
)

var (
	conn      dbox.IConnection
	group     string
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

func main() {

	setinitialconnection()
	defer gdrj.CloseDb()

	t0 := time.Now()

	grouplist := []string{"date_month", "date_quartertxt", "customer_channelname",
		"customer_branchname", "product_brand", "customer_channelid"}

	for _, group = range grouplist {
		getoutletdata()
	}

	toolkit.Println("\n\n========= END OF ALL PROCESS =========")
	toolkit.Printfn("Processing %d data in %s",
		totalData, time.Since(t0).String())
}

func getoutletdata() {
	outletnumbConn, _ := modules.GetDboxIConnection("db_godrej")
	defer outletnumbConn.Close()

	tablename := "outlet_number_date_fiscal_" + group
	coutletnumb, _ := outletnumbConn.NewQuery().Select().From(tablename).Cursor(nil)

	defer coutletnumb.Close()
	count := coutletnumb.Count()
	totalData += count
	t0 := time.Now()

	iscount := 0

	collection := "_" + tablename
	toolkit.Println("Creating", collection)

	var err error
	for {
		iscount++

		outletdata := toolkit.M{}
		err = coutletnumb.Fetch(&outletdata, 1, false)
		if err != nil {
			break
		}
		newdata := toolkit.M{}
		key, _ := toolkit.ToM(outletdata.Get("_id"))
		newdata.Set("key", key)
		newdata.Set("qty", outletdata.GetInt("qty"))
		newdata.Set("_id", key.GetString("date_fiscal")+"_"+toolkit.ToString(key.Get(group)))

		outletnumbConn.NewQuery().
			From(collection).
			SetConfig("multiexec", true).
			Save().
			Exec(toolkit.M{}.Set("data", newdata))

		toolkit.Printfn("Processing %d of %d (%d %%) in %s", iscount, count, iscount*100/count,
			time.Since(t0).String())
	}

	toolkit.Println("collection", collection, " has been created")

	return
}
