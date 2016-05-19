package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "time"
)

type TruckCost struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Date          string
	TruckID       string
	BranchID      string
	Mileage       int
	Gasoline      float64
	Parking       float64
	Driver        float64
	Maintenance   float64
	Other         float64
}

func (t *TruckCost) RecordID() interface{} {
	return t.ID
}

func (t *TruckCost) TableName() string {
	return "truckcost"
}

func TruckCostGetByID(id string) *TruckCost {
	t := new(TruckCost)
	DB().GetById(t, id)
	return t
}

func (t *TruckCost) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *TruckCost) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
