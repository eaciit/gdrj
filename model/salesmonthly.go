package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type SalesMonthly struct {
	orm.ModelBase       `json:"-" bson:"-"`
	ID                  string `json:"_id" bson:"_id"`
	Year                int
	Month               time.Month
	OutletID            string
	SKUID               string
	SalesQty            int
	SalesGrossAmount    float64 //will be use for allocation formula
	SalesTaxAmount      float64
	SalesDiscountAmount float64
	SalesNetAmount      float64
}

func (s *SalesMonthly) RecordID() interface{} {
	return s.ID
}

func (s *SalesMonthly) TableName() string {
	return "salesmonthly"
}

func SalesMonthlyGetByID(id string) *SalesMonthly {
	s := new(SalesMonthly)
	DB().GetById(s, id)
	return s
}

func (s *SalesMonthly) Save() error {
	e := Save(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v", s.TableName(), "save", e.Error()))
	}
	return e
}

func (s *SalesMonthly) Delete() error {
	e := Delete(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v", s.TableName(), "delete", e.Error()))
	}
	return e
}
