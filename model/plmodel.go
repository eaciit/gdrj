package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type PLModel struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //PLCode
	OrderIndex    string
	PLHeader1     string
	PLHeader2     string
	PLHeader3     string
	Amount        float64
}

func (t *PLModel) RecordID() interface{} {
	return t.ID
}

func (t *PLModel) TableName() string {
	return "plmodel"
}

func PLModelGetByID(id string) *PLModel {
	t := new(PLModel)
	DB().GetById(t, id)
	return t
}

func (t *PLModel) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *PLModel) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
