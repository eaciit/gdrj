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

type UploadDataController struct {
	App
}

func CreateUploadDataController() *UploadDataController {
	var controller = new(UploadDataController)
	return controller
}
func (d *UploadDataController) UploadFile(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	fileLocation := filepath.Join(GDRJ_DATA_PATH, "file")

	uploadData := new(gdrj.UploadData)
	uploadData.ID = toolkit.RandomString(32)
	err, oldName, newName, ext := helper.UploadFileHandler(r, "userfile", fileLocation, uploadData.ID)
	if err != nil {
		return helper.CreateResult(false, "", err.Error())
	}
	uploadData.Filename = oldName
	uploadData.PhysicalName = newName
	uploadData.Desc = r.Request.FormValue("desc")
	uploadData.DataType = ext
	uploadData.FieldId = r.Request.FormValue("fieldid")
	uploadData.DocName = r.Request.FormValue("model")
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

func (d *UploadDataController) GetUploadedFiles(r *knot.WebContext) interface{} {
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

func (d *UploadDataController) ProcessData(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := toolkit.M{}
	if err := r.GetPayload(&payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}
	uploadData := gdrj.UploadDataGetByID(payload.GetString("_id"))
	locFile := filepath.Join(GDRJ_DATA_PATH, "file", uploadData.PhysicalName)

	if err := uploadData.ProcessData(locFile); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, nil, "")
}
