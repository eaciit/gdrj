package gocore

import (
	"eaciit/gdrj/model"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type DataBrowser struct {
	orm.ModelBase
	ID         string `json:"_id",bson:"_id"`
	TableNames string
	MetaData   []*StructInfo
}

type StructInfo struct {
	Field         string
	Label         string
	DataType      string
	Format        string
	Align         string
	ShowIndex     int
	HiddenField   bool
	Lookup        bool
	Sortable      bool
	SimpleFilter  bool
	AdvanceFilter bool
	Aggregate     string
}

func (b *DataBrowser) TableName() string {
	return "databrowser"
}

func (b *DataBrowser) RecordID() interface{} {
	return b.ID
}

func GetFileList(search toolkit.M) ([]gdrj.UploadData, error) {
	var query *dbox.Filter
	if search.Has("key") && search.Has("val") {
		key := toolkit.ToString(search.Get("key", ""))
		val := toolkit.ToString(search.Get("val", ""))
		if key != "" && val != "" {
			query = dbox.Contains(key, val)
		}
	}

	data := []gdrj.UploadData{}
	cursor, err := gdrj.Find(new(gdrj.UploadData), query, nil)
	if err != nil {
		return nil, err
	}
	if err := cursor.Fetch(&data, 0, false); err != nil {
		return nil, err
	}
	defer cursor.Close()
	return data, nil
}

func GetDataBrowserList() ([]DataBrowser, error) {
	result := make([]DataBrowser, 0)

	cursor, err := Find(new(DataBrowser), nil)
	if err != nil {
		return nil, err
	}

	err = cursor.Fetch(&result, 0, false)
	if cursor != nil {
		cursor.Close()
	}
	if err != nil {
		return nil, err
	}

	return result, nil
}

func GetTableList() (toolkit.Ms, error) {
	result, err := GetDataBrowserList()
	if err != nil {
		return nil, err
	}
	var tableList toolkit.Ms
	for _, val := range result {
		tablename := toolkit.M{}
		tablename.Set("_id", val.ID)
		tablename.Set("TableNames", val.TableNames)
		tableList = append(tableList, tablename)
	}

	return tableList, nil
}
