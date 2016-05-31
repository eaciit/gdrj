package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type Channel struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Channel       string
}

func (c *Channel) RecordID() interface{} {
	return c.ID
}

func (c *Channel) TableName() string {
	return "channel"
}

func ChannelGetByID(id string) *Channel {
	b := new(Channel)
	DB().GetById(b, id)
	return b
}

func ChannelGetAll() ([]*Channel, error) {
	cursor, err := DB().Find(new(Channel), nil)
	if err != nil {
		return nil, err
	}

	result := []*Channel{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (c *Channel) Save() error {
	err := Save(c)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", c.TableName(), "save", err.Error()))
	}
	return err
}

func (c *Channel) Delete() error {
	err := Delete(c)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", c.TableName(), "delete", err.Error()))
	}
	return err
}
