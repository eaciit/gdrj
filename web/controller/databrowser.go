package controller

import (
	"eaciit/gdrjprod/model"
	"eaciit/gdrjprod/web/helper"
	"eaciit/gdrjprod/web/model"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type DataBrowserController struct {
	App
}

func CreateDataBrowserController(s *knot.Server) *DataBrowserController {
	var controller = new(DataBrowserController)
	controller.Server = s
	return controller
}

func (d *DataBrowserController) GetDataBrowserMetaData(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	err := r.GetPayload(&payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	param := toolkit.M{
		"page":      1,
		"take":      1,
		"skip":      0,
		"pageSize":  10,
		"tablename": payload.GetString("tablename"),
	}

	_, _, dataDS, err := gocore.ConnectToDatabase(param)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, dataDS, "")
}

func (d *DataBrowserController) GetDataBrowser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result := toolkit.M{}

	payload := toolkit.M{}
	err := r.GetPayload(&payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	count, data, dataDS, err := gocore.ConnectToDatabase(payload)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	result.Set("DataCount", count)
	result.Set("DataValue", data)
	result.Set("dataresult", dataDS)

	return helper.CreateResult(true, result, "")
}

func (d *DataBrowserController) GetDataBrowsers(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result, err := gocore.GetDataBrowserList()
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, result, "")
}

func (d *DataBrowserController) GetTableList(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result, err := gocore.GetTableList()
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, result, "")
}

func (d *DataBrowserController) SaveData(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	imodel := gdrj.GetModelData(payload.GetString("tableName"))
	if err := toolkit.Serde(payload["data"], imodel, ""); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	if err := gdrj.Save(imodel); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, imodel, "")
}
