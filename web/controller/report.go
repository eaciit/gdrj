package controller

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/web/helper"
	// "fmt"
	"github.com/eaciit/dbox"
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

	res, err := gdrj.CustomerGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Customer{}, err.Error())
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

func (m *ReportController) SummaryGenerateDummyData(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	data := gdrj.SummaryGenerateDummyData()

	return data
}

func (m *ReportController) SummaryCalculateDataPivot(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := new(gdrj.PivotParam)
	if err := r.GetPayload(payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	var filter *dbox.Filter = nil
	var columns []string = payload.ParseDimensions()
	var datapoints []string = payload.ParseDataPoints()
	var fnTransform (func(m *toolkit.M) error) = nil

	data, err := gdrj.SummarizeLedgerSum(filter, columns, datapoints, fnTransform)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	data = payload.MapSummarizedLedger(data)
	metadata := payload.GetPivotConfig(data)

	res := toolkit.M{"data": data, "metadata": metadata}

	return helper.CreateResult(true, res, "")
}
