package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type HBrandCategory struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	BrandID       string
	Name          string
}

func (h *HBrandCategory) RecordID() interface{} {
	return h.ID
}

func (h *HBrandCategory) TableName() string {
	return "hbrandcategory"
}

func HBrandCategoryGetByID(id string) *HBrandCategory {
	b := new(HBrandCategory)
	DB().GetById(b, id)
	return b
}
func HBrandCategoryGetAll() ([]*HBrandCategory, error) {
	cursor, err := DB().Find(new(HBrandCategory), nil)
	if err != nil {
		return nil, err
	}

	result := []*HBrandCategory{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (h *HBrandCategory) Save() error {
	err := Save(h)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", h.TableName(), "save", err.Error()))
	}
	return err
}

func (h *HBrandCategory) Delete() error {
	err := Delete(h)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", h.TableName(), "delete", err.Error()))
	}
	return err
}
