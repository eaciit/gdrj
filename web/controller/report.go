package controller

import (
	"eaciit/gdrj/model"
	"github.com/eaciit/knot/knot.v1"
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
		return []*gdrj.Branch{}
	}

	return res
}

func (m *ReportController) GetDataBrand(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.BrandGetAll()
	if err != nil {
		return []*gdrj.Brand{}
	}

	return res
}

func (m *ReportController) GetDataHCostCenterGroup(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HCostCenterGroupGetAll()
	if err != nil {
		return []*gdrj.HCostCenterGroup{}
	}

	return res
}

func (m *ReportController) GetDataEntity(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.EntityGetAll()
	if err != nil {
		return []*gdrj.HCostCenterGroup{}
	}

	return res
}

func (m *ReportController) GetDataChannel(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.ChannelGetAll()
	if err != nil {
		return []*gdrj.Channel{}
	}

	return res
}

func (m *ReportController) GetDataHGeographi(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HGeographiGetAll()
	if err != nil {
		return []*gdrj.HGeographi{}
	}

	return res
}

func (m *ReportController) GetDataCustomer(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.CustomerGetAll()
	if err != nil {
		return []*gdrj.Customer{}
	}

	return res
}

func (m *ReportController) GetDataHBrandCategory(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HBrandCategoryGetAll()
	if err != nil {
		return []*gdrj.HBrandCategory{}
	}

	return res
}

func (m *ReportController) GetDataProduct(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.ProductGetAll()
	if err != nil {
		return []*gdrj.Product{}
	}

	return res
}

func (m *ReportController) GetDataLedgerAccount(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.LedgerAccountGetAll()
	if err != nil {
		return []*gdrj.LedgerAccount{}
	}

	return res
}
