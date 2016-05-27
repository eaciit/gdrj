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

func (m *ReportController) GetDataRegion(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HGeographiGetAll()
	if err != nil {
		return []*gdrj.HGeographi{}
	}

	return res
}
