package controller

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/web/helper"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	"path/filepath"
	//"strconv"
	//"strings"
)

type AllocationFlowController struct {
	App
}

func CreateAllocationFlowController(s *knot.Server) *AllocationFlowController {
	var controller = new(AllocationFlowController)
	controller.Server = s
	return controller
}

func (d *AllocationFlowController) GetModules(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson
	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	search := payload.GetString("search")
	data, err := new(gdrj.Module).Get(search)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "")
}

func (d *AllocationFlowController) GetAppliedModules(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result := []toolkit.M{
		{"_id": "n001", "Name": "Module Lorem"},
		{"_id": "n002", "Name": "Module Ipsum"},
		{"_id": "n003", "Name": "Module Dolor"},
		{"_id": "n004", "Name": "Module Sit"},
		{"_id": "n005", "Name": "Module Amet"},
	}

	return helper.CreateResult(true, result, "")
}

func (d *AllocationFlowController) SaveModules(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	var compressedSource = filepath.Join(AppBasePath, "modules")
	err, fileName := helper.UploadHandler(r, "file", compressedSource)
	if r.Request.FormValue("mode") != "editor" { /*edit gak selalu harus upload file baru*/
		if err != nil {
			return helper.CreateResult(false, nil, "Upload error: " + err.Error())
		}
	}
	
	modules := new(gdrj.Module)
	modules.ID = r.Request.FormValue("Name")
	modules.Name = r.Request.FormValue("Name")
	modules.Description = r.Request.FormValue("Description")
	//modules.BuildPath = ""
	//modules.BuildPath = r.Request.FormValue("buildpath")
	//modules.IsCompiled, err = strconv.ParseBool(r.Request.FormValue("iscompiled"))
	modules.IsCompiled = false
	params := []toolkit.M{}
	e := toolkit.UnjsonFromString(r.Request.FormValue("Params"),&params)
	if e==nil && len(params)>0 {
		paramkeys := []string{}
		for k, _ := range params[0]{
			paramkeys = append(paramkeys, k)
		}
		modules.AddParam = paramkeys
	} 
	//toolkit r.Request.FormValue("Params")
	//modules.AddParam = strings.Split(params, ",")
	//modules.AddParam

	/*
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	*/

	if fileName != "" {
		if err = modules.ExtractFile(compressedSource, fileName); err != nil {
			return helper.CreateResult(false, nil, "Extract: " + err.Error())
		}
	}

	if !modules.IsCompiled {
		if err := modules.BuildFile(modules.Name, AppBasePath); err != nil {
			return helper.CreateResult(false, nil, "Compiled: " + err.Error())
		}
	}

	if err := gdrj.Save(modules); err != nil {
		return helper.CreateResult(false, nil, "Save: " + err.Error())
	}

	return helper.CreateResult(true, modules, "")
}

func (d *AllocationFlowController) EditModules(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	data := new(gdrj.Module)
	if err := r.GetPayload(&data); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	if err := gdrj.Get(data, data.ID); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, data, "")
}

func (d *AllocationFlowController) RemoveModules(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); !helper.HandleError(err) {
		return helper.CreateResult(false, nil, err.Error())
	}

	idArray := payload.Get("id",[]interface{}{}).([]interface{})

	for _, id := range idArray {
		o := new(gdrj.Module)
		o.ID = id.(string)
		/*if err := o.Delete(compressedSource); err != nil {
			return helper.CreateResult(false, nil, err.Error())
		}*/
	}

	return helper.CreateResult(true, nil, "")
}
