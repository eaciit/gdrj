package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type SalesHeader struct {
	orm.ModelBase       `json:"-" bson:"-"`
	ID                  string `json:"_id" bson:"_id"`
	Date                time.Time
	BranchID            string
	OutletID            string
	SalesTaxAmount      float64
	SalesDiscountAmount float64
}

func (sh *SalesHeader) RecordID() interface{} {
	return sh.ID
}

func (sh *SalesHeader) TableName() string {
	return "rawsalesheader"
}

func SalesHeaderGetByID(id string) *SalesHeader {
	sh := new(SalesHeader)
	DB().GetById(sh, id)
	return sh
}

func (sh *SalesHeader) Save() error {
	e := Save(sh)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", sh.TableName(), "save", e.Error()))
	}
	return e
}

func (sh *SalesHeader) Delete() error {
	e := Delete(sh)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", sh.TableName(), "delete", e.Error()))
	}
	return e
}
