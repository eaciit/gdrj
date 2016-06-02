package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "time"
)

type PLStructure struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //PLItemID
	PLGroup       string
	PLSubGroup    string
	Name          string
	Notes         string
}

func (p *PLStructure) RecordID() interface{} {
	return p.ID
}

func (p *PLStructure) TableName() string {
	return "plstructure"
}

func PLStructureGetByID(id string) *PLStructure {
	p := new(PLStructure)
	DB().GetById(p, id)
	return p
}

func (p *PLStructure) Save() error {
	e := Save(p)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", p.TableName(), "save", e.Error()))
	}
	return e
}

func (p *PLStructure) Delete() error {
	e := Delete(p)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", p.TableName(), "delete", e.Error()))
	}
	return e
}
