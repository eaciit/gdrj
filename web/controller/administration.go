package controller

import (
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type AdministrationController struct {
	App
}

func CreateAdminisrationController(s *knot.Server) *AdministrationController {
	var controller = new(AdministrationController)
	controller.Server = s
	return controller
}

func (a *AdministrationController) GetAccess(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	data, err := gocore.GetAccess(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "success")

}
func (a *AdministrationController) Getaccessdropdown(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson
	data, err := gocore.Getaccessdropdown()
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "")
}
func (a *AdministrationController) EditAccess(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	data, err := gocore.FindAccess(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data["tAccess"], "success")
}

func (a *AdministrationController) DeleteAccess(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	err := gocore.DeleteAccess(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "delete access success")
}

func (a *AdministrationController) SaveAccess(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	if err := gocore.SaveAccess(payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "save access success")
}
