package main

import "fmt"
import "github.com/eaciit/dbox"
import "github.com/eaciit/toolkit"
import _ "github.com/eaciit/dbox/dbc/json"
import _ "github.com/eaciit/dbox/dbc/mongo"
import "path/filepath"
import "eaciit/gdrj/model"
import "os"
import "time"

var ci = dbox.ConnectionInfo{"localhost:27017", "ecgodrej", "", "", nil}
var month time.Month = 4
var day = 12
var max = 10000
var pldatamodel = new(gdrj.PLDataModel).TableName()

func main() {
	// doInsert(2015)
	// doInsert(2016)
}

func doInsert(year int) {
	conn, err := dbox.NewConnection("mongo", &ci)
	if err != nil {
		fmt.Println(err.Error())
	}
	defer conn.Close()

	err = conn.Connect()
	if err != nil {
		fmt.Println(err.Error())
	}

	dataPNL := GetPNL(fmt.Sprintf("alloc%d", year))
	dataCustomer := GetCustomer()
	dataBrand := GetBrand()
	dataPLModel := GetPLModel()

	for _, eachPNL := range dataPNL {
		totalPercentage := 0.0
		allPercentage := []float64{}

		for i := 0; i < max; i++ {
			percentage := (toolkit.RandFloat(1, 3) + 0.1) * 0.0001
			allPercentage = append(allPercentage, percentage)
			totalPercentage = totalPercentage + percentage
		}

		leftPercentage := (1.0 - totalPercentage) / float64(max)

		for i := 0; i < max; i++ {
			customer := dataCustomer[toolkit.RandInt(len(dataCustomer))]
			brand := dataBrand[toolkit.RandInt(len(dataBrand))]

			percentage := allPercentage[i] + leftPercentage
			allPercentage[i] = percentage

			pc := new(gdrj.ProfitCenter)
			pc.ID = toolkit.RandomString(4)
			pc.BrandID = brand.ID

			date := new(gdrj.Date)
			date.Date = time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
			date.Month = month
			date.Year = year

			ls := new(gdrj.LedgerSummary)
			ls.ID = fmt.Sprintf("%v_%v_%v_%v_%v_%v_%v_%v_%v", year, month, date.Date.Day(), customer.ID, eachPNL.PLCODE, brand.ID, toolkit.RandInt(100000), toolkit.RandInt(100000), toolkit.RandInt(100000))
			ls.Year = year
			ls.Month = month
			ls.Date = date
			ls.Customer = &customer
			ls.PLCode = eachPNL.PLCODE
			ls.SKUID = brand.ID
			ls.PC = pc
			ls.Value1 = percentage * eachPNL.Value

			err = conn.NewQuery().Insert().From(pldatamodel).Exec(toolkit.M{"data": ls})
			if err != nil {
				fmt.Println(err.Error())
			}
			fmt.Printf("-- %d inserted\n", i)
		}
	}
}

type PNL struct {
	PLCODE string
	Value  float64
}

func GetCustomer() []gdrj.Customer {
	conn, err := dbox.NewConnection("mongo", &ci)
	if err != nil {
		fmt.Println(err.Error())
	}
	defer conn.Close()

	err = conn.Connect()
	if err != nil {
		fmt.Println(err.Error())
	}

	csr, err := conn.NewQuery().Select().From("customer").Take(100).Cursor(nil)
	if err != nil {
		fmt.Println(err.Error())
	}

	data := []gdrj.Customer{}

	err = csr.Fetch(&data, 0, false)
	if err != nil {
		fmt.Println(err.Error())
	}

	csr.Close()

	return data
}

func GetPLModel() []gdrj.PLModel {
	conn, err := dbox.NewConnection("mongo", &ci)
	if err != nil {
		fmt.Println(err.Error())
	}
	defer conn.Close()

	err = conn.Connect()
	if err != nil {
		fmt.Println(err.Error())
	}

	csr, err := conn.NewQuery().Select().From("plmodel").Cursor(nil)
	if err != nil {
		fmt.Println(err.Error())
	}

	data := []gdrj.PLModel{}

	err = csr.Fetch(&data, 0, false)
	if err != nil {
		fmt.Println(err.Error())
	}

	csr.Close()

	return data
}

func GetBrand() []gdrj.Brand {
	conn, err := dbox.NewConnection("mongo", &ci)
	if err != nil {
		fmt.Println(err.Error())
	}
	defer conn.Close()

	err = conn.Connect()
	if err != nil {
		fmt.Println(err.Error())
	}

	csr, err := conn.NewQuery().Select().From("brand").Cursor(nil)
	if err != nil {
		fmt.Println(err.Error())
	}

	data := []gdrj.Brand{}

	err = csr.Fetch(&data, 0, false)
	if err != nil {
		fmt.Println(err.Error())
	}

	csr.Close()

	return data
}

func GetPNL(which string) []PNL {
	basePath, _ := os.Getwd()
	loc := filepath.Join(basePath, fmt.Sprintf("%s.json", which))
	conn, err := dbox.NewConnection("json", &dbox.ConnectionInfo{loc, "", "", "", nil})
	if err != nil {
		fmt.Println(err.Error())
	}

	err = conn.Connect()
	if err != nil {
		fmt.Println(err.Error())
	}

	csr, err := conn.NewQuery().Select().Cursor(nil)
	if err != nil {
		fmt.Println(err.Error())
	}

	data := []PNL{}

	err = csr.Fetch(&data, 0, false)
	if err != nil {
		fmt.Println(err.Error())
	}

	csr.Close()

	return data
}
