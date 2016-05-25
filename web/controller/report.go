package controller

import (
	"eaciit/gdrj/model"
	"fmt"
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

func (m *ReportController) GetDataSKU(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	forms := toolkit.M{}
	if err := r.GetForms(&forms); err != nil {
		return []string{}
	}

	return GenerateTempDataWithPrefix("SKU")
}

func (m *ReportController) GetDataOutlet(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	forms := toolkit.M{}
	if err := r.GetForms(&forms); err != nil {
		return []string{}
	}

	return GenerateTempDataWithPrefix("Outlet")
}

func GenerateTempDataWithPrefix(prefix string) []string {
	res := []string{}
	alphabet := "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	for _, char := range alphabet {
		res = append(res, fmt.Sprintf("%s %v", prefix, string(char)))
	}

	return res
}
