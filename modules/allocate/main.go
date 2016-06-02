package main

import (
	"eaciit/gdrj/modules"
	"os"

	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
)

var (
	conn dbox.IConnection
	log  *toolkit.LogEngine
	e    error
)

func main() {

	//-- prepare log and connection
	log, _ = toolkit.NewLog(true, false, "", "", "")
	conn, e = modules.GetDboxIConnection("db_godrej")
	if e != nil {
		log.Error("Can't open connection: " + e.Error())
		os.Exit(200)
	}
	defer conn.Close()
	defer log.Close()

	//-- do alloc
}
