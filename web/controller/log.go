package controller

import (
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type LogController struct {
	App
}

func CreateLogController(s *knot.Server) *LogController {
	var controller = new(LogController)
	controller.Server = s
	return controller
}

func (a *LogController) GetLog(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetForms(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	data, err := gocore.GetLog(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "success")

}
