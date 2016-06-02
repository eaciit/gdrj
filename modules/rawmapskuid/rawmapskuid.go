package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"os"
	"sync"
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

func main() {
	var mwg sync.WaitGroup
	setinitialconnection()
	defer gdrj.CloseDb()
	tkmmap := toolkit.M{}

	toolkit.Println("START...")

	crx, err := gdrj.Find(new(gdrj.MappingInventory), nil, nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}

	arrmap := []*gdrj.MappingInventory{}
	_ = crx.Fetch(&arrmap, 0, false)
	for _, v := range arrmap {
		tkmmap.Set(v.SKUID_VDIST, v.ID)
	}
	crx.Close()

	cr, err := gdrj.Find(new(gdrj.SalesDetail), dbox.Eq("skuid_sapbi", ""), nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer cr.Close()
	iseof := false

	for !iseof {
		arrsalesdetail := []*gdrj.SalesDetail{}
		err = cr.Fetch(&arrsalesdetail, 1000, false)

		if len(arrsalesdetail) < 1000 {
			iseof = true
		}
		mwg.Add(1)
		go func(xsd []*gdrj.SalesDetail) {
			for _, v := range xsd {
				tv := toolkit.ToString(tkmmap.Get(v.SKUID_VDIST, ""))
				toolkit.Printf(".")
				v.SKUID_SAPBI = tv
				_ = gdrj.Save(v)
			}
			mwg.Done()
		}(arrsalesdetail)

	}
	mwg.Wait()
	toolkit.Println("END...")
}
