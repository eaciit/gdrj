package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type CustomerGroup struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //Group
	Name          string
}

func (c *CustomerGroup) RecordID() interface{} {
	return c.ID
}

func (c *CustomerGroup) TableName() string {
	return "customergroup"
}

func CustomerGroupGetByID(id string) *CustomerGroup {
	b := new(CustomerGroup)
	DB().GetById(b, id)
	return b
}

func CustomerGroupGetAll() ([]*CustomerGroup, error) {
	cursor, err := DB().Find(new(CustomerGroup), nil)
	if err != nil {
		return nil, err
	}

	result := []*CustomerGroup{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
func (c *CustomerGroup) Save() error {
	err := Save(c)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", c.TableName(), "save", err.Error()))
	}
	return err
}

func (c *CustomerGroup) Delete() error {
	err := Delete(c)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", c.TableName(), "delete", err.Error()))
	}
	return err
}
