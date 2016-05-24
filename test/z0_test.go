package efs

import (
	gdrj "eaciit/gdrj/model"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/json"
	_ "github.com/eaciit/dbox/dbc/jsons"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"os"
	"testing"
	// "time"
)

var wd, _ = os.Getwd()

func prepareconnection() (conn dbox.IConnection, err error) {
	// conn, err = dbox.NewConnection("mongo",
	// 	&dbox.ConnectionInfo{"192.168.0.200:27017", "efspttgcc", "", "", toolkit.M{}.Set("timeout", 3)})
	conn, err = dbox.NewConnection("mongo",
		&dbox.ConnectionInfo{"localhost:27017", "godrej", "", "", toolkit.M{}.Set("timeout", 3)})
	// conn, err = dbox.NewConnection("jsons",
	// 	&dbox.ConnectionInfo{wd, "", "", "", toolkit.M{}.Set("newfile", true)})
	if err != nil {
		return
	}

	err = conn.Connect()
	return
}

func TestInitialSetDatabase(t *testing.T) {
	// t.Skip("Skip : Comment this line to do test")
	conn, err := prepareconnection()

	if err != nil {
		t.Errorf("Error connecting to database: %s \n", err.Error())
	}

	err = gdrj.SetDb(conn)
	if err != nil {
		t.Errorf("Error set database to gdrj: %s \n", err.Error())
	}
}

func TestRandomLogic(t *testing.T) {
	t.Skip("Skip : Comment this line to do test")
	// sid := "bid1EWFRZwL-at1uyFvzJYUjPu3yuh3j"

	// ds := new(efs.Statements)
	// err := efs.Get(ds, sid)
	// if err != nil {
	// 	t.Errorf("Error to get statement by id, found : %s \n", err.Error())
	// 	return
	// }
	// tsv, _, _ := ds.Run(nil)
	// tsv.ID = toolkit.RandomString(32)
	// tsv.Title = "v.2015"

	// tsv.Element[0].ValueNum = 10000
	// tsv.Element[2].ValueNum = 28
	// tsv.Element[3].ValueNum = 32
	// tsv.Element[4].ValueNum = 42
	// tsv.Element[9].Formula = []string{"fn:IF((AND(@3>=20, @4>=30, @5>=40)), 100, 0)"}

	// ins := toolkit.M{}.Set("data", tsv)
	// ds.Run(ins)
}

func TestRandomCode(t *testing.T) {
	t.Skip("Skip : Comment this line to do test")
	conn, err := dbox.NewConnection("csv",
		&dbox.ConnectionInfo{toolkit.Sprintf("%v/sampletrans.csv", wd), "", "", "", toolkit.M{}.Set("useheader", true)})
	if err != nil {
		return
	}

	err = conn.Connect()
	if err != nil {
		return
	}

	c, err := conn.NewQuery().Select().Cursor(nil)
	if err != nil {
		return
	}

	defer c.Close()

	// arrtkm := make([]*efs.LedgerTrans, 0, 0)
	// // arrtkm := make([]toolkit.M, 0, 0)
	// err = c.Fetch(&arrtkm, 0, false)
	// // for k, v := range arrtkm[0] {
	// // 	toolkit.Printfn("%v - %v", k, toolkit.TypeName(v))
	// // }
	// toolkit.Printfn("%v", arrtkm[0])

	return
}

func TestCreateProduct(t *testing.T) {
	t.Skip("Skip : Comment this line to do test")
	gproduct := new(gdrj.Product)
	// gproduct.ID = toolkit.RandomString(32)
	gproduct.ID = "P001"
	gproduct.Name = "HIT"
	gproduct.Config = "HIT Merah"
	gproduct.Brand = "HIT"
	gproduct.LongName = "..."

	err := gproduct.Save()
	toolkit.Println(err)

	return
}

func TestDeleteProduct(t *testing.T) {
	t.Skip("Skip : Comment this line to do test")

	p := gdrj.ProductGetBySKUID("P001")
	toolkit.Println(p)

	err := p.Delete()
	toolkit.Println(err)

	return
}

func TestCreateUpload(t *testing.T) {
	t.Skip("Skip : Comment this line to do test")
	tupload := new(gdrj.UploadData)
	tupload.ID = toolkit.RandomString(32)
	tupload.Filename = "truckcostsample.csv"
	tupload.Status = "ready"
	tupload.Datacount = 3

	tupload.Save()

	return
}

func TestProcessTruck(t *testing.T) {
	// t.Skip("Skip : Comment this line to do test")
	tupload := gdrj.UploadDataGetByID("efs30813RaqSOG5bW7s3aD2xOr-fL7Xm")
	err := tupload.ProcessData(toolkit.Sprintf("%v/truckcostsample.csv", wd))
	toolkit.Println(err)
	return
}
