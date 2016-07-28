package controller

import (
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	"net/http"
)

type PageController struct {
	App
	Params toolkit.M
}

func CreatePageController(AppName string) *PageController {
	var controller = new(PageController)
	controller.Params = toolkit.M{"AppName": AppName}
	return controller
}

func (w *PageController) GetParams() toolkit.M {
	w.Params.Set("AntiCache", toolkit.RandomString(20))
	return w.Params
}

func (w *PageController) Index(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-index.html"

	return w.GetParams()
}

func (w *PageController) Login(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.ViewName = "page-login.html"

	return w.GetParams()
}

func (w *PageController) DataBrowser(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-databrowser.html"

	return w.GetParams()
}

func (w *PageController) UploadData(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-uploaddata.html"

	return w.GetParams()
}

func (w *PageController) ReportChartComparison(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report.html"

	return toolkit.M{"subreport": "page-report-chart-comparison.html"}
}

func (w *PageController) AllocationFlow(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-allocation-flow.html"

	return w.GetParams()
}

func (w *PageController) Access(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-access.html"

	return w.GetParams()
}

func (w *PageController) Group(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-group.html"

	return w.GetParams()
}

func (w *PageController) Session(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-session.html"

	return w.GetParams()
}

func (w *PageController) Log(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-log.html"

	return w.GetParams()
}

func (w *PageController) AdminTable(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-admintable.html"

	return w.GetParams()
}

func (w *PageController) User(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-user.html"

	return w.GetParams()
}

func (w *PageController) Organization(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-organization.html"

	return w.GetParams()
}

func (w *PageController) PNLPerformance(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-pnlperformance-new.html"

	return w.GetParams()
}

func (w *PageController) PNLPerformanceOld(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-pnlperformance.html"

	return w.GetParams()
}

func (w *PageController) BranchAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-branchanalysis.html"

	return w.GetParams()
}

func (w *PageController) BranchGroupAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-branchgroupanalysis.html"

	return w.GetParams()
}

func (w *PageController) KeyAccountAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-keyaccount.html"

	return w.GetParams()
}

func (w *PageController) RDAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-rdanalysis.html"

	return w.GetParams()
}

func (w *PageController) Dashboard(r *knot.WebContext) interface{} {
	http.Redirect(r.Writer, r.Request, "home", http.StatusTemporaryRedirect)

	return w.GetParams()
}

func (w *PageController) CustomAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-customanalysis.html"

	return w.GetParams()
}

func (w *PageController) Home(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-landing.html"

	return w.GetParams()
}

func (w *PageController) GrowthAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-growthanalysis.html"

	return w.GetParams()
}

func (w *PageController) RDvsBranchAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-rd-vs-branch-analysis.html"

	return w.GetParams()
}

func (w *PageController) ContributionAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-contribution.html"

	return w.GetParams()
}

func (w *PageController) DistributionAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-distribution.html"

	return w.GetParams()
}

func (w *PageController) SalesReturnAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-sales-return.html"

	return w.GetParams()
}

func (w *PageController) YearCompare(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-year-compare.html"

	return w.GetParams()
}

func (w *PageController) MarketingEfficiency(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-marketing-efficiency.html"

	return w.GetParams()
}

func (w *PageController) ReportDynamic(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-dynamic.html"

	return w.GetParams()
}

func (w *PageController) Report(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-other-analysis.html"

	return w.GetParams()
}

func (w *PageController) BrandAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-brand.html"

	return w.GetParams()
}

func (w *PageController) GNAAnalysis(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-sga.html"

	return w.GetParams()
}

func (w *PageController) GNAAnalysisOld(r *knot.WebContext) interface{} {
	gocore.WriteLog(r.Session("sessionid", ""), "access", r.Request.URL.String())
	r.Config.OutputType = knot.OutputTemplate
	r.Config.LayoutTemplate = LayoutFile
	r.Config.ViewName = "page-report-gna.html"

	return w.GetParams()
}
