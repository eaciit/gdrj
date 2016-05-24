package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type Brand struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Name          string
}

func (b *Brand) RecordID() interface{} {
	return b.ID
}

func (b *Brand) TableName() string {
	return "brand"
}

func BrandGetByID(id string) *Brand {
	b := new(Brand)
	DB().GetById(b, id)
	return b
}

func (b *Brand) Save() error {
	err := Save(b)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", b.TableName(), "save", err.Error()))
	}
	return err
}

func (b *Brand) Delete() error {
	err := Delete(b)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", b.TableName(), "delete", err.Error()))
	}
	return err
}
