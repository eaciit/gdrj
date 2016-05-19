package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type CostCenter struct {
	orm.ModelBase `json:"-" bson:"-"`
	CCID          string `json:"_id" bson:"_id"`
	Name          string
	CostGroup01   string
	CostGroup02   string
	CostGroup03   string
	BranchID      string
	BranchType    BranchTypeEnum
}

func (c *CostCenter) RecordID() interface{} {
	return c.CCID
}

func (c *CostCenter) TableName() string {
	return "costcenter"
}

func ProductGetByID(id string) *CostCenter {
	c := new(CostCenter)
	DB().GetById(c, id)
	return c
}

func (c *CostCenter) Save() error {
	e := Save(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "save", e.Error()))
	}
	return e
}

func (c *CostCenter) Delete() error {
	e := Delete(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "delete", e.Error()))
	}
	return e
}
