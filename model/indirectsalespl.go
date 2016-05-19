package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type IndirectSalesPL struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Year          int
	Month         time.Month
	PCID          string
	CCID          string
	PLItemID      string
	Amount        float64
}

func (i *IndirectSalesPL) RecordID() interface{} {
	return i.ID
}

func (i *IndirectSalesPL) TableName() string {
	return "indirectsalespl"
}

func IndirectSalesPLGetByID(id string) *IndirectSalesPL {
	i := new(IndirectSalesPL)
	DB().GetById(i, id)
	return i
}

func (i *IndirectSalesPL) Save() error {
	e := Save(i)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", i.TableName(), "save", e.Error()))
	}
	return e
}

func (i *IndirectSalesPL) Delete() error {
	e := Delete(i)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", i.TableName(), "delete", e.Error()))
	}
	return e
}
