package controller

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type ReportController struct {
	App
}

func CreateReportController(s *knot.Server) *ReportController {
	var controller = new(ReportController)
	controller.Server = s
	return controller
}

func (m *ReportController) GetDataBranch(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.BranchGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Branch{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataBrand(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.BrandGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Brand{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataHCostCenterGroup(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HCostCenterGroupGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HCostCenterGroup{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataEntity(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.EntityGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HCostCenterGroup{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataChannel(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.ChannelGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Channel{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataHGeographi(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HGeographiGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HGeographi{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataCustomer(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	param := struct {
		Keyword string `json:"keyword"`
	}{}

	if err := r.GetForms(&param); err != nil {
		return helper.CreateResult(false, []*gdrj.Customer{}, err.Error())
	}

	res, err := gdrj.CustomerGetContains(param.Keyword)
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Customer{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataCustomerGroup(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.CustomerGroupGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.CustomerGroup{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataHBrandCategory(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HBrandCategoryGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HBrandCategory{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataProduct(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.ProductGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Product{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataLedgerAccount(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.LedgerAccountGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.LedgerAccount{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataKeyAccount(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.KeyAccountGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.KeyAccount{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataAnalysisIdea(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gocore.AnalysisIdeaGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gocore.AnalysisIdea{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetSalesHeaderList(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result, err := gdrj.GetSalesHeaderList()
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return result
}

func (m *ReportController) GetDecreasedQty(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result, err := gdrj.GetDecreasedQty()
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return result
}

func (m *ReportController) GetIncreasedPrice(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result, err := gdrj.GetIncreasedPrice()
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return result
}

func (m *ReportController) GetOutletIDList(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	result, err := gdrj.GetOutletID(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return result
}

func (m *ReportController) GetPLModel(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result, err := gdrj.PLModelGetAll()
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return result
}

func (m *ReportController) GetPNLData(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson
	res := new(toolkit.Result)

	payload := new(gdrj.SalesPLParam)
	if err := r.GetPayload(payload); err != nil {
		res.SetError(err)
		return res
	}

	data, err := payload.GetData()
	if err != nil {
		res.SetError(err)
		return res
	}

	plmodels, err := gdrj.PLModelGetAll()
	if err != nil {
		res.SetError(err)
		return res
	}

	res.SetData(toolkit.M{
		"Data":     data,
		"PLModels": plmodels,
	})

	return res
}

func (m *ReportController) GetPNLDataDetail(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson
	res := new(toolkit.Result)

	payload := new(gdrj.SalesPLDetailParam)
	if err := r.GetPayload(payload); err != nil {
		res.SetError(err)
		return res
	}

	data, err := payload.GetData()
	if err != nil {
		res.SetError(err)
		return res
	}

	res.SetData(data)

	return res
}

func (m *ReportController) GenerateRandomLedgerSummary(r *knot.WebContext) interface{} {
	return "ok"

	gocore.GenerateDummySalesLinePL()
	gocore.GenerateDummyLedgerSummary()

	return "ok"
}
