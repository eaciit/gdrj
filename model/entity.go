package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type Entity struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //EntityID
	Name          string
}

func (e *Entity) RecordID() interface{} {
	return e.ID
}

func (e *Entity) TableName() string {
	return "entity"
}

func EntityGetByID(id string) *Entity {
	e := new(Entity)
	DB().GetById(e, id)
	return e
}

func (e *Entity) Save() error {
	err := Save(e)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", e.TableName(), "save", err.Error()))
	}
	return err
}

func (e *Entity) Delete() error {
	err := Delete(e)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", e.TableName(), "delete", err.Error()))
	}
	return err
}
