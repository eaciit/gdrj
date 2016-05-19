package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

//Date	TruckID	Driver	Branch	CustID

type TruckAssignment struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Date          time.Time
	Driver        []string //name, not mandatory
	BranchID      string
	CustomerID    string
}

func (t *TruckAssignment) RecordID() interface{} {
	return t.ID
}

func (t *TruckAssignment) TableName() string {
	return "truck"
}

func TruckAssignmentGetByID(id string) *TruckAssignment {
	t := new(TruckAssignment)
	DB().GetById(t, id)
	return t
}

func (t *TruckAssignment) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *TruckAssignment) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
