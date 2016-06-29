package controller

import (
	"eaciit/gdrjprod/web/helper"
	"eaciit/gdrjprod/web/model"
	"errors"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type LoginController struct {
	App
}

func CreateLoginController() *LoginController {
	var controller = new(LoginController)
	return controller
}

func (l *LoginController) GetSession(r *knot.WebContext) interface{} {

	r.Config.OutputType = knot.OutputJson
	sessionId := r.Session("sessionid", "")

	return helper.CreateResult(true, toolkit.M{}.Set("sessionid", sessionId), "")

}

func (l *LoginController) GetUserName(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson
	sessionId := r.Session("sessionid", "")

	if toolkit.ToString(sessionId) == "" {
		err := error(errors.New("Sessionid is not found"))
		return helper.CreateResult(false, nil, err.Error())
	}
	tUser, err := gocore.GetUserName(sessionId)

	if err != nil {
		return helper.CreateResult(false, nil, "Get username failed")
	}

	return helper.CreateResult(true, toolkit.M{}.Set("username", tUser.LoginID), "")
}

func (l *LoginController) GetAccessMenu(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	sessionId := r.Session("sessionid", "")

	results, err := gocore.GetAccessMenu(sessionId)
	if err != nil {
		helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, results, "Success")
}

func (l *LoginController) ProcessLogin(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, "", err.Error())
	}

	sessid, err := gocore.LoginProcess(payload)
	if err != nil {
		return helper.CreateResult(false, "", err.Error())
	}
	gocore.WriteLog(sessid, "login", r.Request.URL.String())
	r.SetSession("sessionid", sessid)

	return helper.CreateResult(true, toolkit.M{}.Set("status", true).Set("sessionid", sessid), "Login Success")
}

func (l *LoginController) Logout(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson
	gocore.WriteLog(r.Session("sessionid", ""), "logout", r.Request.URL.String())
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
	if err = gocore.ResetPassword(payload); err != nil {
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

	if err = gocore.SavePassword(payload); err != nil {
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

	result, err := gocore.Authenticate(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, result, "Authenticate Success")
}
