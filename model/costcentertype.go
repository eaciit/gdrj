package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

// CostCenterType
// ID
// Name

type CostCenterType struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //CCTypeID
	Name          string
}

func (c *CostCenterType) RecordID() interface{} {
	return c.ID
}

func (c *CostCenterType) TableName() string {
	return "costcentertype"
}

func CostCenterTypeGetByID(id string) *CostCenterType {
	b := new(CostCenterType)
	DB().GetById(b, id)
	return b
}

func (c *CostCenterType) Save() error {
	err := Save(c)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", c.TableName(), "save", err.Error()))
	}
	return err
}

func (c *CostCenterType) Delete() error {
	err := Delete(c)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", c.TableName(), "delete", err.Error()))
	}
	return err
}
