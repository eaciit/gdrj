package controller

import (
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

func (w *WebController) ReportDistribution(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-report.html")

	return toolkit.M{"subreport": "page-report-distribution.html"}
}

func (w *WebController) ReportGeneralTrade(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-report.html")

	return toolkit.M{"subreport": "page-report-general-trade.html"}
}

func (w *WebController) ReportMarketEfficiency(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-report.html")

	return toolkit.M{"subreport": "page-report-market-efficiency.html"}
}

func (w *WebController) ReportSGNA(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-report.html")

	return toolkit.M{"subreport": "page-report-sgna.html"}
}

func (w *WebController) ReportChartComparison(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-report.html")

	return toolkit.M{"subreport": "page-report-chart-comparison.html"}
}

func (w *WebController) AllocationFlow(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-allocation-flow.html")

	return true
}

func (w *WebController) Access(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-access.html")

	return true
}

func (w *WebController) Group(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-group.html")

	return true
}

func (w *WebController) Session(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-session.html")

	return true
}

func (w *WebController) User(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-user.html")

	return true
}

func (w *WebController) Organization(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.IncludeFiles = IncludeFiles
	r.Config.ViewName = View("page-organization.html")

	return true
}
