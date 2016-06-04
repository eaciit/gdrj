package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type SalesDetail struct {
	orm.ModelBase    `json:"-" bson:"-"`
	ID               string `json:"_id" bson:"_id"`
	Date             time.Time
	BranchID         string
	SalesHeaderID    string
	SKUID_SAPBI      string
	SKUID_VDIST      string
	SalesQty         int
	Price            float64
	SalesGrossAmount float64
	SalesNetAmount   float64
	AllocTaxAmount float64
	AllocDiscAmount float64
}

func (sd *SalesDetail) RecordID() interface{} {
	return sd.ID
}

func (sd *SalesDetail) TableName() string {
	return "rawsalesdetail"
}

func SalesDetailGetByID(id string) *SalesDetail {
	sd := new(SalesDetail)
	DB().GetById(sd, id)
	return sd
}

func (sd *SalesDetail) Save() error {
	e := Save(sd)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", sd.TableName(), "save", e.Error()))
	}
	return e
}

func (sd *SalesDetail) Delete() error {
	e := Delete(sd)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", sd.TableName(), "delete", e.Error()))
	}
	return e
}
