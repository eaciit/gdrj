package controller

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
	"path/filepath"
	"time"
)

type DataBrowserController struct {
	App
}

func CreateDataBrowserController(s *knot.Server) *DataBrowserController {
	var controller = new(DataBrowserController)
	controller.Server = s
	return controller
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

func (d *DataBrowserController) UploadFileBrowser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	fileLocation := filepath.Join(GDRJ_DATA_PATH, "file")

	uploadData := new(gdrj.UploadData)
	uploadData.ID = toolkit.RandomString(32)
	err, oldName, newName := helper.UploadFileHandler(r, "userfile", fileLocation, uploadData.ID)
	if err != nil {
		return helper.CreateResult(false, "", err.Error())
	}
	uploadData.Filename = oldName
	uploadData.PhysicalName = newName
	uploadData.Desc = r.Request.FormValue("desc")
	uploadData.Date = time.Now().UTC()
	uploadData.Datacount = 0 /*task to do*/
	uploadData.Process = 0
	uploadData.Status = "ready"
	uploadData.Note = ""
	uploadData.Pid = "" /*task to do*/
	uploadData.Other = ""

	if err := uploadData.Save(); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "")
}

func (d *DataBrowserController) GetFileBrowser(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	val := toolkit.ToString(payload.Get("search", ""))

	keyword := toolkit.M{}.Set("key", "_id").Set("val", val)
	data, err := gocore.GetFileList(keyword)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	return helper.CreateResult(true, data, "")
}
