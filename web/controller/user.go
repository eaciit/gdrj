package controller

import (
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type UserController struct {
	App
}

func CreateUserController(s *knot.Server) *UserController {
	var controller = new(UserController)
	controller.Server = s
	return controller
}

func (a *UserController) GetUser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetForms(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	data, err := gocore.GetUser(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "Success")
}
func (a *UserController) FindUser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	data, err := gocore.FindUser(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data["tUser"], "Success")

}

func (a *UserController) Search(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	data, err := gocore.SearchUser(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "Success")
}

func (a *UserController) DeleteUser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	err := gocore.DeleteUser(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "Delete User Success")
}
func (a *UserController) GetAccess(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	err := r.GetPayload(&payload)
	if err != nil {
		return helper.CreateResult(true, nil, err.Error())
	}
	AccessGrants, err := gocore.GetAccessUser(payload)

	return helper.CreateResult(true, AccessGrants, "")
}

func (a *UserController) SaveUser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	if err := gocore.SaveUser(payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "save user success")
}

func (a *UserController) ChangePass(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	if err := gocore.ChangePass(payload); err != nil {
		return helper.CreateResult(true, nil, err.Error())
	}
	return helper.CreateResult(true, nil, "Change Password Success")
}
