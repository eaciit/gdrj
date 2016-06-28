package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type SubChannel struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //SubChannelID
	Title         string
}

func (e *SubChannel) RecordID() interface{} {
	return e.ID
}

func (e *SubChannel) TableName() string {
	return "subchannels"
}

func SubChannelGetByID(id string) *SubChannel {
	e := new(SubChannel)
	DB().GetById(e, id)
	return e
}

func SubChannelGetAll() ([]*SubChannel, error) {
	cursor, err := DB().Find(new(SubChannel), nil)
	if err != nil {
		return nil, err
	}

	result := []*SubChannel{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}

func (e *SubChannel) Save() error {
	err := Save(e)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", e.TableName(), "save", err.Error()))
	}
	return err
}

func (e *SubChannel) Delete() error {
	err := Delete(e)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", e.TableName(), "delete", err.Error()))
	}
	return err
}
