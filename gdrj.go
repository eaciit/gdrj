package main

import (
	_ "eaciit/gdrj/web"
	_ "eaciit/gdrj/web2"

	"eaciit/gdrj/web/installation"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	// "net/http"
	// "regexp"
	// "strings"
)

func main() {
	port := new(gocore.Ports)
	port.ID = "port"
	if err := port.GetPort(); err != nil {
		toolkit.Printf("Error get port: %s \n", err.Error())
	}
	if port.Port == 0 {
		if err := setup.Port(port); err != nil {
			toolkit.Printf("Error set port: %s \n", err.Error())
		}
	}

	flagAddress := toolkit.Sprintf("localhost:%v", toolkit.ToString(port.Port))

	knot.DefaultOutputType = knot.OutputTemplate
	knot.StartContainer(&knot.AppContainerConfig{
		Address: flagAddress,
	})
}
