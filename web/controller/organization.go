package controller

import (
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	// "github.com/eaciit/dbox"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type OrganizationController struct {
	App
}

func CreateOrganizationController(s *knot.Server) *OrganizationController {
	var controller = new(OrganizationController)
	controller.Server = s
	return controller
}
func (o *OrganizationController) GetDiagramConfig(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	gocore.ConfigPath = GDRJ_CONFIG_PATH
	result, err := gocore.GetOrganizationByID(toolkit.ToString(payload["id"]))
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, result, "sukses")
}
