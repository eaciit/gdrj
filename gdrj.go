package main

import (
	_ "eaciit/gdrj/web"
	_ "eaciit/gdrj/web2"

	"eaciit/gdrj/web/installation"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/kingpin"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	// "net/http"
	// "regexp"
	// "strings"
)

func main() {
	kingpin.Parse()

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
	// otherRoutes := map[string]knot.FnContent{
	// 	"/": func(r *knot.WebContext) interface{} {
	// 		prefix := web1.AppName

	// 		regex := regexp.MustCompile("/" + prefix + "/web/report/[a-zA-Z0-9_]+(/.*)?$")
	// 		rURL := r.Request.URL.String()

	// 		if regex.MatchString(rURL) {
	// 			args := strings.Split(strings.Replace(rURL, "/"+prefix+"/web/report/", "", -1), "/")

	// 			toolkit.Println("------", args)
	// 			r.Config.OutputType = web1.WebController.
	// 			// return "ASdf"

	// 			return web1.WebController.PageReport(r, args)
	// 			// return nil
	// 		}

	// 		sessionid := r.Session("sessionid", "")
	// 		if sessionid == "" {
	// 			http.Redirect(r.Writer, r.Request, "/"+prefix+"/web/login", 301)
	// 		} else {
	// 			http.Redirect(r.Writer, r.Request, "/"+prefix+"/web/report/dashboard", 301)
	// 		}

	// 		return true
	// 	},
	// }

	knot.DefaultOutputType = knot.OutputTemplate
	knot.StartContainer(&knot.AppContainerConfig{
		Address: flagAddress,
	})
}
