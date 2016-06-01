package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

//
// ID
// Region
// Zone
// National

type HGeographi struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //Area
	Location      string
	Region        string
	Zone          string
	National      string
}

func (h *HGeographi) RecordID() interface{} {
	return h.ID
}

func (h *HGeographi) TableName() string {
	return "hgeographi"
}

func HGeographiGetByID(id string) *HGeographi {
	b := new(HGeographi)
	DB().GetById(b, id)
	return b
}

func HGeographiGetAll() ([]*HGeographi, error) {
	cursor, err := DB().Find(new(HGeographi), nil)
	if err != nil {
		return nil, err
	}

	result := []*HGeographi{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}

func (h *HGeographi) Save() error {
	err := Save(h)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", h.TableName(), "save", err.Error()))
	}
	return err
}

func (h *HGeographi) Delete() error {
	err := Delete(h)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", h.TableName(), "delete", err.Error()))
	}
	return err
}
