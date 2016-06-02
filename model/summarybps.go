package gdrj

import (
	"errors"
	"github.com/eaciit/toolkit"
)

type SummaryBPS struct {
	GDRJModel     `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Provinsi      string
	Population    float64
	City          float64
	Urban         float64
	Family        float64
	CitySpending  float64
	UrbanSpending float64
}

func (sb *SummaryBPS) RecordID() interface{} {
	return sb.ID
}

func (sb *SummaryBPS) TableName() string {
	return "summarybps"
}

func SummaryBPSGetByID(id string) *SummaryBPS {
	sb := new(SummaryBPS)
	DB().GetById(sb, id)
	return sb
}

func (sb *SummaryBPS) Save() error {
	e := Save(sb)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", sb.TableName(), "save", e.Error()))
	}
	return e
}

func (sb *SummaryBPS) Delete() error {
	e := Delete(sb)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", sb.TableName(), "delete", e.Error()))
	}
	return e
}
