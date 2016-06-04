package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"
	"runtime"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "strings"
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

var (
    pcs = toolkit.M{}
)

func getCursor(obj orm.IModel)dbox.ICursor{
    c, e := gdrj.Find(obj,nil,nil)
    if e!=nil{
        return nil
    }
    return c
}

func prepMaster(){
    pc:=new(gdrj.ProfitCenter)
    cpc := getCursor(pc)
    if cpc==nil{
        os.Exit(200)
    }
    defer cpc.Close()
    
    var e error
    for ;e==nil;e=cpc.Fetch(pc,1,false){
        toolkit.Println("PC: ", pc.ID, toolkit.JsonString(pc))
        pcs.Set(pc.ID,pc)
    }
}

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	setinitialconnection()
	defer gdrj.CloseDb()
    
    prepMaster()
}
