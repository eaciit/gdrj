package main

import (
	"eaciit/gdrj/controller"
	"eaciit/gdrj/installation"
	"eaciit/gdrj/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	"net/http"
	"path/filepath"
	"runtime"
)

var (
	server *knot.Server
)

func main() {
	runtime.GOMAXPROCS(4)
	// setup.ConfigPath = controller.GDRJ_CONFIG_PATH
	gdrj.ConfigPath = controller.GDRJ_CONFIG_PATH

	server = new(knot.Server)

	port := new(gdrj.Ports)
	port.ID = "port"
	if err := port.GetPort(); err != nil {
		toolkit.Printf("Error get port: %s \n", err.Error())
	}
	if port.Port == 0 {
		if err := setup.Port(port); err != nil {
			toolkit.Printf("Error set port: %s \n", err.Error())
		}
	}

	server.Address = toolkit.Sprintf("localhost:%v", toolkit.ToString(port.Port))
	server.RouteStatic("res", filepath.Join(controller.AppBasePath, "web", "assets"))
	server.RouteStatic("image", filepath.Join(controller.AppBasePath, "web", "assets", "img"))
	server.Register(controller.CreateWebController(server), "")
	server.Register(controller.CreateLoginController(server), "")

	// server.Route("/", func(r *knot.WebContext) interface{} {
	// 	http.Redirect(r.Writer, r.Request, "/web/index", 301)
	// 	return true
	// })

	server.Route("/", func(r *knot.WebContext) interface{} {
		sessionid := r.Session("sessionid", "")
		if sessionid == "" {
			http.Redirect(r.Writer, r.Request, "/web/login", 301)
		} else {
			http.Redirect(r.Writer, r.Request, "/web/index", 301)
		}

		return true
	})

	if err := setAclDatabase(); err != nil {
		toolkit.Printf("Error set database to efs: %s \n", err.Error())
	}

	server.Listen()
}

func setAclDatabase() error {
	if err := gdrj.InitialSetDatabase(); err != nil {
		return err
	}

	if gdrj.GetConfig("default_username") == nil {
		gdrj.SetConfig("default_username", "eaciit")
		gdrj.SetConfig("default_password", "Password.1")
	}

	if err := gdrj.PrepareDefaultUser(); err != nil {
		return err
	}
	return nil
}
