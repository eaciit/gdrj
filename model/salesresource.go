package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type SalesResource struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	BranchID      string
	Year          int
	Month         time.Month
	Truck         int
	Driver        int
	SalesPerson   int
	OfficeStaff   int
}

//Year	Month	Truck	Driver	SalesPerson	OfficeStaff
func (s *SalesResource) RecordID() interface{} {
	return s.ID
}

func (s *SalesResource) TableName() string {
	return "salesresource"
}

func SalesResourceGetByID(id string) *SalesResource {
	s := new(SalesResource)
	DB().GetById(s, id)
	return s
}

func (s *SalesResource) Save() error {
	e := Save(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "save", e.Error()))
	}
	return e
}

func (s *SalesResource) Delete() error {
	e := Delete(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "delete", e.Error()))
	}
	return e
}
