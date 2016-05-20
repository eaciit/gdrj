package main

import (
	gdrj "eaciit/gdrj/model"
	"fmt"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	// "math"
	"os"
	"runtime"
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())

	conn, err := prepareConnection()

	if err != nil {
		fmt.Printf("Error connecting to database: %s \n", err.Error())
		os.Exit(1)
	}

	err = gdrj.SetDb(conn)
	if err != nil {
		fmt.Printf("Error set database to gdrj: %s \n", err.Error())
		os.Exit(1)
	}

	genproductdata()

}

func genproductdata() {
	arrstrbrand := []string{"HIT", "Stella", "mitu", "CleanPack", "Carera"}
	arrconfig := []string{"big", "medium", "small"}

	for i := 1; i <= 2; i++ {

		gproduct := new(gdrj.Product)
		gproduct.SKUID = toolkit.Sprintf("SKU%06d", i)
		gproduct.Name = fmt.Sprintf("%v - %v", arrstrbrand[i%5], arrconfig[i%3])
		gproduct.Config = arrconfig[i%3]
		gproduct.Brand = arrstrbrand[i%5]
		gproduct.LongName = fmt.Sprintf("[%v] %v - %v", toolkit.Sprintf("SKU%06d", i), arrstrbrand[i%5], arrconfig[i%3])

		err := gproduct.Save()
		if err != nil {
			fmt.Printf("%v \n", err.Error())
		}
	}

	return
}

func prepareConnection() (dbox.IConnection, error) {
	var config = toolkit.M{}.Set("timeout", 5)
	ci := &dbox.ConnectionInfo{"localhost:27017", "godrej", "", "", config}
	c, e := dbox.NewConnection("mongo", ci)
	if e != nil {
		return nil, e
	}

	e = c.Connect()
	if e != nil {
		return nil, e
	}

	return c, nil
}
