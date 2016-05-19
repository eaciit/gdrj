package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "time"
)

type Truck struct {
	orm.ModelBase `json:"-" bson:"-"`
	TruckID       string `json:"_id" bson:"_id"`
	BranchID      string
	PlateNo       string
	Year          int
}

func (t *Truck) RecordID() interface{} {
	return t.TruckID
}

func (t *Truck) TableName() string {
	return "truck"
}

func TruckGetByID(id string) *Truck {
	t := new(Truck)
	DB().GetById(t, id)
	return t
}

func (t *Truck) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *Truck) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
