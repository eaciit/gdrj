package gdrj

import (
	"errors"
	"github.com/eaciit/toolkit"
)

type RawCustomerAddressVdist struct {
	GDRJModel `json:"-" bson:"-"`
	ID        string `json:"_id" bson:"_id"`
	BRSAP     string
	CS_NO     string
	CS_ADDR   string
	CS_POST   string
}

func (mp *RawCustomerAddressVdist) RecordID() interface{} {
	return mp.ID
}

func (mp *RawCustomerAddressVdist) TableName() string {
	return "rawcustomeraddressvdist"
}

func RawCustomerAddressVdistGetByID(id string) *RawCustomerAddressVdist {
	mp := new(RawCustomerAddressVdist)
	DB().GetById(mp, id)
	return mp
}

func RawCustomerAddressVdistGetAll() ([]*RawCustomerAddressVdist, error) {
	cursor, err := DB().Find(new(RawCustomerAddressVdist), nil)
	if err != nil {
		return nil, err
	}

	result := []*RawCustomerAddressVdist{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (mp *RawCustomerAddressVdist) Save() error {
	e := Save(mp)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", mp.TableName(), "save", e.Error()))
	}
	return e
}

func (mp *RawCustomerAddressVdist) Delete() error {
	e := Delete(mp)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", mp.TableName(), "delete", e.Error()))
	}
	return e
}
