package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"os"
	"strings"
	"time"
)

var conn dbox.IConnection

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

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, dbox.Eq("keyaccount", "KEY"), nil)
	if e != nil {
		return nil
	}
	return c
}

func prepMaster() {
	cust := new(gdrj.Customer)

	keyCustList := []*gdrj.KeyCustName{}

	ccust := getCursor(cust)
	defer ccust.Close()
	var e error
	for e = ccust.Fetch(cust, 1, false); e == nil; {
		keyCust := new(gdrj.KeyCustName)
		keyCust.ID = cust.VDIST_ID
		keyCust.Name = cust.Name
		keyCustList = append(keyCustList, keyCust)
		cust = new(gdrj.Customer)
		e = ccust.Fetch(cust, 1, false)
	}

	processData(keyCustList, ccust.Count())
}

func processData(data []*gdrj.KeyCustName, count int) {
	prefixList := []string{"D.C.", "PT. ", "MDS/MSM - ", "DC ", "***", "MDS - ", "PT.", "MSM - ", "MDS ", "MDS- ", "PT "}
	skippedList := []string{"TIP TOP", "MITRA TOKO DISCOUNT", "HPM CIPUTRA WORLD MALL", "FOOD MART", "SAT CIREBON",
		"MARTINA PRIMAKARYA", "SUMBER ALFARIA", "FARMER FM99", "GRIYA CENTER", "FARMER MARKET", "LOTTE",
		"HARI HARI", "FARMERS MARKET", "LULU HYPERMARKET", "FMT MAXX BOX", "RANCH MARKET", "TOWN SQUARE",
		"JASON SUPERMARKET", "HERO SUPERMARKET", "GUARDIAN", "INTI IDOLA ANUGERAH", "LEMBANG PASAR SWALAYAN",
		"TIP TOP", "MEGA M", "HYPERMART", "RAMAYANA", "BIG SEMERU", "INDOMARCO PRISMATAMA", "YOGYA", "HYPERMAKET"}
	t0 := time.Now()
	for i, val := range data {
		var unPrefix string
		for _, prefix := range prefixList {
			if strings.Contains(val.Name, prefix) {
				unPrefix = strings.TrimPrefix(val.Name, prefix)
				break
			} else {
				unPrefix = val.Name
			}
		}
		for _, skip := range skippedList {
			if strings.Contains(unPrefix, skip) {
				val.KeyName = strings.SplitAfter(unPrefix, skip)[0]
				break
			} else {
				val.KeyName = strings.Split(unPrefix, " ")[0]
			}
		}
		toolkit.Printfn("Processing %d of %d %s in %s",
			i, count, val.KeyName,
			time.Since(t0).String())
		gdrj.Save(val)
	}
}

/*func addFieldCust() {
	cust := new(gdrj.Customer)
	ccust := getCursor(cust)
	defer ccust.Close()
	var e error
	count := ccust.Count()
	i := 0
	t0 := time.Now()
	for e = ccust.Fetch(cust, 1, false); e == nil; {
		i++
		cust.VDIST_ID = strings.SplitAfter(cust.ID, cust.BranchID)[1]
		toolkit.Printfn("Processing %d of %d %s in %s",
			i, count, cust.VDIST_ID,
			time.Since(t0).String())
		cust.Save()
		cust = new(gdrj.Customer)
		e = ccust.Fetch(cust, 1, false)
	}
}*/

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("Reading Master")
	prepMaster()
	// addFieldCust()

	toolkit.Println("END...")

}
