package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type InventoryLevel struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Year          int
	Month         time.Month
	BranchID      string
	SKUID         string
	QtyOpen       int
	QtyReceive    int
	QtySold       int
	QtyOther      int
	QtyBalance    int
}

func (i *InventoryLevel) RecordID() interface{} {
	return i.ID
}

func (i *InventoryLevel) TableName() string {
	return "inventorylevel"
}

func InventoryLevelGetByID(id string) *InventoryLevel {
	i := new(InventoryLevel)
	DB().GetById(i, id)
	return i
}

func (i *InventoryLevel) Save() error {
	e := Save(i)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", i.TableName(), "save", e.Error()))
	}
	return e
}

func (i *InventoryLevel) Delete() error {
	e := Delete(i)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", i.TableName(), "delete", e.Error()))
	}
	return e
}
