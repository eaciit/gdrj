package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type RawCustSAPBranch struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	CSCODE        string
	CSNAME        string
	CSADDR1       string
	CSADDR2       string
	CSAREA        string
	CSAREATXT     string
	CSCITY        string
	CSCITYTXT     string
	RCSCITY       string
	RCSCITYTXT    string
	CSCITYGRP     string
	CSCHANNEL     string
	ACCTGRP       string
	CSGRPTXT      string
	CSPLANT       string
	LOCALGRP      string
	CSDEPO        string
	CSDEPOTXT     string
	FLINTRA       string
	FLACTV        string
	CSGROUP       string
	CSTYPE        string
	CSTYPETXT     string
	CSWETCODE     string
	CSWETTXT      string
	JOINDATE      string
	PSNO          string
	CSWEEKCALL    string
	RDDATASOURCE  string
}

func (co *RawCustSAPBranch) RecordID() interface{} {
	return co.ID
}

func (co *RawCustSAPBranch) TableName() string {
	return "rawcustsapbranch"
}

func RawCustSAPBranchGetByID(id string) *RawCustSAPBranch {
	co := new(RawCustSAPBranch)
	DB().GetById(co, id)
	return co
}

func (co *RawCustSAPBranch) Save() error {
	e := Save(co)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", co.TableName(), "save", e.Error()))
	}
	return e
}

func (co *RawCustSAPBranch) Delete() error {
	e := Delete(co)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", co.TableName(), "delete", e.Error()))
	}
	return e
}
