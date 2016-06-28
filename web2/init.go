package web2

import (
	"eaciit/gdrj/web/controller"
	// "eaciit/gdrj/web/installation"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	// "net/http"
	"path/filepath"
	// "regexp"
	"runtime"
	// "strings"
	"os"
)

var (
	AppName  string = "web2"
	basePath string = (func(dir string, err error) string { return dir }(os.Getwd()))

// 	server *knot.Server
)

func init() {
	app := knot.NewApp(AppName)
	app.ViewsPath = filepath.Join(basePath, AppName, "view")

	runtime.GOMAXPROCS(4)
	gocore.ConfigPath = controller.GDRJ_CONFIG_PATH
	gocore.ClearPLCache()

	// port := new(gocore.Ports)
	// port.ID = "port"
	// if err := port.GetPort(); err != nil {
	// 	toolkit.Printf("Error get port: %s \n", err.Error())
	// }
	// if port.Port == 0 {
	// 	if err := setup.Port(port); err != nil {
	// 		toolkit.Printf("Error set port: %s \n", err.Error())
	// 	}
	// }

	// server.Address = toolkit.Sprintf("localhost:%v", toolkit.ToString(port.Port))
	app.Static("res", filepath.Join(controller.AppBasePath, "web", "assets"))
	app.Static("image", filepath.Join(controller.AppBasePath, "web", "assets", "img"))
	app.Register(controller.CreatePageController(AppName))
	app.Register(controller.CreateLoginController())
	app.Register(controller.CreateDataBrowserController())
	app.Register(controller.CreateUploadDataController())
	app.Register(controller.CreateReportController())
	app.Register(controller.CreateAllocationFlowController())
	app.Register(controller.CreateAdminisrationController())
	app.Register(controller.CreateSessionController())
	app.Register(controller.CreateUserController())
	app.Register(controller.CreateGroupController())
	app.Register(controller.CreateOrganizationController())
	app.Register(controller.CreateLogController())

	// app.Route("/", func(r *knot.WebContext) interface{} {
	// 	regex := regexp.MustCompile("/web/report/[a-zA-Z0-9_]+(/.*)?$")
	// 	rURL := r.Request.URL.String()

	// 	if regex.MatchString(rURL) {
	// 		args := strings.Split(strings.Replace(rURL, "/web/report/", "", -1), "/")
	// 		return WebController.PageReport(r, args)
	// 	}

	// 	sessionid := r.Session("sessionid", "")
	// 	if sessionid == "" {
	// 		http.Redirect(r.Writer, r.Request, "/web/login", 301)
	// 	} else {
	// 		http.Redirect(r.Writer, r.Request, "/web/report/dashboard", 301)
	// 	}

	// 	return true
	// })

	if err := setAclDatabase(); err != nil {
		toolkit.Printf("Error set acl database : %s \n", err.Error())
	}

	// server.Listen()

	// app.LayoutTemplate = "_template.html"
	knot.RegisterApp(app)
}

func setAclDatabase() error {
	if err := gocore.InitialSetDatabase(); err != nil {
		return err
	}

	if gocore.GetConfig("default_username") == nil {
		gocore.SetConfig("default_username", "eaciit")
		gocore.SetConfig("default_password", "Password.1")
	}

	if err := gocore.PrepareDefaultUser(); err != nil {
		return err
	}
	return nil
}
