package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
    "time"
)

var conn dbox.IConnection
var count int

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

func getCursor(obj orm.IModel)dbox.ICursor{
    c, e := gdrj.Find(obj,nil,nil)
    if e!=nil{
        return nil
    }
    return c
}

func main(){
    setinitialconnection()

    salestrx := new(gdrj.SalesTrx)
    c, e:= gdrj.Find(salestrx,nil,nil)
    defer c.Close()

    i:=0
    count:=c.Count()
    step:=count/1000
    limit:=step

    t0 := time.Now()
    for {
        salestrx = new(gdrj.SalesTrx)
        e = c.Fetch(salestrx,1,false)
        if e!=nil{
            break
        }

        i++
        if i>=limit{
            toolkit.Printfn("%d of %d [%.2f pct] in %s",
                i,count,float64(i)*100.0/float64(count),
                time.Since(t0).String())
            limit+=step
        }
    }
}