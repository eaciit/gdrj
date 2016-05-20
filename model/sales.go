package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type Sales struct {
	orm.ModelBase       `json:"-" bson:"-"`
	ID                  string `json:"_id" bson:"_id"`
	Date                time.Time
	OutletID            string
	SKUID               string
	SalesQty            int
	SalesGrossAmount    float64
	SalesTaxAmount      float64
	SalesDiscountAmount float64
	SalesNetAmount      float64
}

func (s *Sales) RecordID() interface{} {
	return s.ID
}

func (s *Sales) TableName() string {
	return "sales"
}

func SalesGetByID(id string) *Sales {
	s := new(Sales)
	DB().GetById(s, id)
	return s
}

func (s *Sales) Save() error {
	e := Save(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "save", e.Error()))
	}
	return e
}

func (s *Sales) Delete() error {
	e := Delete(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "delete", e.Error()))
	}
	return e
}
