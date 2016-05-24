package controller

import (
	"github.com/eaciit/knot/knot.v1"
)

type WebController struct {
	App
}

func CreateWebController(s *knot.Server) *WebController {
	var controller = new(WebController)
	controller.Server = s
	return controller
}

func (w *WebController) Index(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-index.html")

	return true
}

func (w *WebController) Login(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	// r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-login.html")

	return true
}

func (w *WebController) DataBrowser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-databrowser.html")

	return true
}

func (w *WebController) UploadData(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-uploaddata.html")

	return true
}
