package controller

import (
	"eaciit/gdrjprod/web/helper"
	"eaciit/gdrjprod/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type SessionController struct {
	App
}

func CreateSessionController(s *knot.Server) *SessionController {
	var controller = new(SessionController)
	controller.Server = s
	return controller
}

func (a *SessionController) GetSession(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetForms(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	data, err := gocore.GetSession(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "success")

}

func (a *SessionController) SetExpired(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	err := gocore.SetExpired(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "Set Expired Success")
}
