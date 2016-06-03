package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type RawCustSAPRD struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	CS_CODE       string
	CS_NAME       string
	CS_AREA       string
	CS_AREATXT    string
	CS_CITY       string
	CS_CITYTXT    string
	CS_CITYGRP    string
	CS_GRPTXT     string
	CS_CHANNEL    string
	FL_INTRA      string
	FL_ACTV       string
	CS_CODENEW    string
	CS_SAP        string
	CS_VDIST      string
}

func (co *RawCustSAPRD) RecordID() interface{} {
	return co.ID
}

func (co *RawCustSAPRD) TableName() string {
	return "rawcustsaprd"
}

func RawCustSAPRDGetByID(id string) *RawCustSAPRD {
	co := new(RawCustSAPRD)
	DB().GetById(co, id)
	return co
}

func (co *RawCustSAPRD) Save() error {
	e := Save(co)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", co.TableName(), "save", e.Error()))
	}
	return e
}

func (co *RawCustSAPRD) Delete() error {
	e := Delete(co)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", co.TableName(), "delete", e.Error()))
	}
	return e
}
