package main

import "fmt"
import "github.com/eaciit/dbox"
import _ "github.com/eaciit/dbox/dbc/json"
import "path/filepath"
import "os"

func main() {
	pnlData := GetPNL()

	for _, pnl := range pnlData {
		fmt.Println(pnl)
	}
}

type PNL struct {
	PLCODE string
	Value  float64
}

func GetPNL() []PNL {
	basePath, _ := os.Getwd()
	loc := filepath.Join(basePath, "alloc.json")
	conn, err := dbox.NewConnection("json", &dbox.ConnectionInfo{loc, "", "", "", nil})
	if err != nil {
		fmt.Println(err.Error())
	}

	fmt.Println(loc)

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
