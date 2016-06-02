package gdrj

import (
	"errors"
	"github.com/eaciit/toolkit"
)

type MappingProfitCenter struct {
	GDRJModel           `json:"-" bson:"-"`
	ID                  string `json:"_id" bson:"_id"` //Material
	BranchID            string
	MaterialDescription string
	ProfitCenter        string
}

func (mp *MappingProfitCenter) RecordID() interface{} {
	return mp.ID
}

func (mp *MappingProfitCenter) TableName() string {
	return "mappingprofitcenter"
}

func MappingProfitCenterGetByID(id string) *MappingProfitCenter {
	mp := new(MappingProfitCenter)
	DB().GetById(mp, id)
	return mp
}

func MappingProfitCenterGetAll() ([]*MappingProfitCenter, error) {
	cursor, err := DB().Find(new(MappingProfitCenter), nil)
	if err != nil {
		return nil, err
	}

	result := []*MappingProfitCenter{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (mp *MappingProfitCenter) Save() error {
	e := Save(mp)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", mp.TableName(), "save", e.Error()))
	}
	return e
}

func (mp *MappingProfitCenter) Delete() error {
	e := Delete(mp)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", mp.TableName(), "delete", e.Error()))
	}
	return e
}
