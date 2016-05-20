package controller

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/knot/knot.v1"
	"time"
)

type UploadDataController struct {
	App
}

func CreateUploadDataController(s *knot.Server) *UploadDataController {
	var controller = new(UploadDataController)
	controller.Server = s
	return controller
}

func (d *UploadDataController) GetUploadedFiles(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	result := make([]gdrj.UploadData, 0)

	cursor, err := gocore.Find(new(gdrj.UploadData), nil)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	err = cursor.Fetch(&result, 0, false)
	if cursor != nil {
		cursor.Close()
	}
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	return helper.CreateResult(true, temp(), "")
}

func temp() []*gdrj.UploadData {
	o1 := new(gdrj.UploadData)
	o1.ID = "file001"
	o1.Filename = "csv_01"
	o1.PhysicalName = "csv_01.csv"
	o1.Desc = "sample file"
	o1.DataType = "csv"
	o1.Date = time.Now()
	o1.Account = []string{"john", "doe"}
	o1.Status = "done"
	o1.Note = "the note is sample file"
	o1.Pid = "1232"

	return []*gdrj.UploadData{o1}
}
