package controller

import (
	"eaciit/gdrjprod/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
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
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-login.html")

	return true
}

func (w *WebController) DataBrowser(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-databrowser.html")

	return true
}

func (w *WebController) UploadData(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-uploaddata.html")

	return true
}

func (w *WebController) ReportChartComparison(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-report.html")

	return toolkit.M{"subreport": "page-report-chart-comparison.html"}
}

func (w *WebController) AllocationFlow(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-allocation-flow.html")

	return true
}

func (w *WebController) Access(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-access.html")

	return true
}

func (w *WebController) Group(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-group.html")

	return true
}

func (w *WebController) Session(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-session.html")

	return true
}

func (w *WebController) Log(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-log.html")

	return true
}

func (w *WebController) AdminTable(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-admintable.html")

	return true
}

func (w *WebController) User(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-user.html")

	return true
}

func (w *WebController) Organization(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-organization.html")

	return true
}

func (w *WebController) PageReport(r *knot.WebContext, args []string) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-report.html")

	if len(args) == 0 {
		return toolkit.M{"subreport": false}
	}

	var id, name string = args[0], ""
	var value1, value2, value3 string

	switch id {
	case "gross_sales_discount_and_net_sales":
		name = "Gross Sales, Discount, and Net Sales"
		value1 = "Gross Sales"
		value2 = "Discount"
		value3 = "Net Sales"
	}

	return toolkit.M{
		"id":     id,
		"name":   name,
		"value1": value1,
		"value2": value2,
		"value3": value3,
	}
}
