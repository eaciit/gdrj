package gdrj

import (
	"errors"
	"github.com/eaciit/toolkit"
)

type MappingInventory struct {
	GDRJModel   `json:"-" bson:"-"`
	ID          string `json:"_id" bson:"_id"` //SKUID_SAP
	SKUID_VDIST string
}

func (mp *MappingInventory) RecordID() interface{} {
	return mp.ID
}

func (mp *MappingInventory) TableName() string {
	return "mappinginventory"
}

func MappingInventoryGetByID(id string) *MappingInventory {
	mp := new(MappingInventory)
	DB().GetById(mp, id)
	return mp
}

func MappingInventoryGetAll() ([]*MappingInventory, error) {
	cursor, err := DB().Find(new(MappingInventory), nil)
	if err != nil {
		return nil, err
	}

	result := []*MappingInventory{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (mp *MappingInventory) Save() error {
	e := Save(mp)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", mp.TableName(), "save", e.Error()))
	}
	return e
}

func (mp *MappingInventory) Delete() error {
	e := Delete(mp)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", mp.TableName(), "delete", e.Error()))
	}
	return e
}
