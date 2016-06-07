package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type KeyCustName struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string `bson:"_id" json:"_id"`
	Name          string
	KeyName       string
}

func (c *KeyCustName) RecordID() interface{} {
	return c.ID
}

func (c *KeyCustName) TableName() string {
	return "keycustomer"
}

func KeyCustNameGetByID(id string) *KeyCustName {
	c := new(KeyCustName)
	DB().GetById(c, id)
	return c
}

func (c *KeyCustName) Save() error {
	e := Save(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "save", e.Error()))
	}
	return e
}

func (c *KeyCustName) Delete() error {
	e := Delete(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "delete", e.Error()))
	}
	return e
}
