package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type DirectSalesPL struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Year          int
	Month         time.Month
	OutletID      string
	SKUID         string
	PCID          string
	CCID          string
	PLItemID      string
	Amount        float64
}

func (d *DirectSalesPL) RecordID() interface{} {
	return d.ID
}

func (d *DirectSalesPL) TableName() string {
	return "directsalespl"
}

func DirectSalesPLGetByID(id string) *DirectSalesPL {
	d := new(DirectSalesPL)
	DB().GetById(d, id)
	return d
}

func (d *DirectSalesPL) Save() error {
	e := Save(d)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", d.TableName(), "save", e.Error()))
	}
	return e
}

func (d *DirectSalesPL) Delete() error {
	e := Delete(d)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", d.TableName(), "delete", e.Error()))
	}
	return e
}
