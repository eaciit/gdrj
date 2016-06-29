package main

import (
	web "eaciit/gdrjprod/web"
	web2 "eaciit/gdrjprod/web2"

	"eaciit/gdrjprod/web/installation"
	"eaciit/gdrjprod/web/model"
	"fmt"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	"net/http"
	"strings"
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
	appConf := knot.AppContainerConfig{Address: flagAddress}
	otherRoutes := map[string]knot.FnContent{
		"/": func(r *knot.WebContext) interface{} {
			rURL := r.Request.URL.String()
			prefix := web.AppName
			if strings.Contains(rURL, web2.AppName) {
				prefix = web2.AppName
			}

			sessionid := r.Session("sessionid", "")
			if sessionid == "" {
				http.Redirect(r.Writer, r.Request, fmt.Sprintf("/%s/page/login", prefix), 301)
			} else {
				http.Redirect(r.Writer, r.Request, fmt.Sprintf("/%s/page/dashboard", prefix), 301)
			}

			return true
		},
	}

	knot.DefaultOutputType = knot.OutputTemplate
	knot.StartContainerWithFn(&appConf, otherRoutes)
}
