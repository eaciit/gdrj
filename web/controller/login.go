package controller

import (
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type LoginController struct {
	App
}

func CreateLoginController(s *knot.Server) *LoginController {
	var controller = new(LoginController)
	controller.Server = s
	return controller
}

func (l *LoginController) ProcessLogin(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, "", err.Error())
	}

	sessid, err := new(gocore.Login).LoginProcess(payload)
	if err != nil {
		return helper.CreateResult(false, "", err.Error())
	}
	r.SetSession("sessionid", sessid)

	return helper.CreateResult(true, toolkit.M{}.Set("status", true).Set("sessionid", sessid), "Login Success")
}

func (l *LoginController) Logout(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson
	r.SetSession("sessionid", "")
	return helper.CreateResult(true, nil, "Logout Success")
}

func (l *LoginController) ResetPassword(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	err := r.GetPayload(&payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	if err = new(gocore.Login).ResetPassword(payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "Reset Password Success")
}

func (l *LoginController) SavePassword(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	err := r.GetPayload(&payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	if err = new(gocore.Login).SavePassword(payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "Save Password Success")
}

func (l *LoginController) Authenticate(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}

	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	result, err := new(gocore.Login).Authenticate(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, result, "Authenticate Success")
}
