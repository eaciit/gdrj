package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type LedgerMaster struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //LedgerMaster
	Title         string
	H1            string
	H2            string
	H3            string
	G1            string
	G2            string
	G3            string
	G4            string
}

func (t *LedgerMaster) RecordID() interface{} {
	return t.ID
}

func (t *LedgerMaster) TableName() string {
	return "ledgermaster"
}

func LedgerMasterGetByID(id string) *LedgerMaster {
	t := new(LedgerMaster)
	DB().GetById(t, id)
	return t
}

func (t *LedgerMaster) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *LedgerMaster) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
