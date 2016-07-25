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

func main() {

	setinitialconnection()
	defer gdrj.CloseDb()

	t0 := time.Now()

	prepmaster()

	getpromodata()

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

	count := cbrand.Count()
	t0 := time.Now()
	defer cbrand.Close()
	var e error

	for e = cbrand.Fetch(&brand, 1, false); e == nil; {
		brandlist = append(brandlist, brand.Name)
		brand = new(gdrj.Brand)
		e = cbrand.Fetch(&brand, 1, false)
	}

	toolkit.Printfn("Processing %d data in %s",
		count, time.Since(t0).String())

	return
}

func getpromodata() {
	promoConn, _ := modules.GetDboxIConnection("db_godrej")
	defer promoConn.Close()

	promodata := toolkit.M{}
	cpromodata, _ := promoConn.NewQuery().Select().From("temp_promo").Cursor(nil)

	defer cpromodata.Close()
	count := cpromodata.Count()
	totalData += count
	t0 := time.Now()

	i := 0
	jobs := make(chan *gdrj.Promo, count)
	toolkit.Println("Prepare Worker")
	for wi := 0; wi < 10; wi++ {
		go workerPromo(wi, jobs)
	}
	var err error

	for err = cpromodata.Fetch(&promodata, 1, false); err == nil; {
		i++
		promo := new(gdrj.Promo)

		promo.ID = promodata["_id"].(bson.ObjectId)
		promo.EntityID = promodata.GetString("EntityID")
		promo.Year = promodata.GetInt("Year")
		promo.Period = promodata.GetInt("Period")
		promo.Account = toolkit.ToString(promodata.GetInt("Account"))
		promo.AccountDescription = promodata.GetString("AccountDescription")
		promo.Grouping = promodata.GetString("Grouping")
		promo.APProposalNo = promodata.GetString("APProposalNo")
		promo.CCID = promodata.GetString("CCID")
		promo.PCID = promodata.GetString("PCID")
		promo.AmountinIDR = promodata.GetFloat64("AmountinIDR")
		promo.CustomerName = promodata.GetString("CustomerName")
		promo.City = promodata.GetString("City")
		promo.ChannelID = promodata.GetString("ChannelID")
		promo.BranchID = promodata.GetString("BranchID")
		promo.KeyAccountGroup = promodata.GetString("KeyAccountGroup")
		promo.KeyAccountCode = promodata.GetString("KeyAccountCode")
		promo.SKUID_BrandCat = toolkit.ToString(promodata.GetInt("SKUID_BrandCat"))
		promo.BrandName = promodata.GetString("BrandName")
		for _, val := range brandlist {
			if strings.Contains(strings.ToUpper(promo.BrandName), val) {
				promo.Brand = val
			}
		}

		toolkit.Printfn("Processing %d of %d data in %s",
			i, count, time.Since(t0).String())

		promodata = toolkit.M{}
		err = cpromodata.Fetch(&promodata, 1, false)

		jobs <- promo
	}
	close(jobs)
	mwg.Wait()

	return
}

func workerPromo(wi int, jobs chan *gdrj.Promo) {
	workerConn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerConn.Close()

	for job := range jobs {
		workerConn.NewQuery().From(new(gdrj.Promo).TableName()).
			Save().Exec(toolkit.M{}.Set("data", job))
	}

	defer mwg.Done()
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
