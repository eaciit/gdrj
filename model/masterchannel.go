package gdrj

import (
	"github.com/eaciit/orm/v1"
)

type MasterChannel struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Name          string
}

func (c *MasterChannel) RecordID() interface{} {
	return c.ID
}

func (c *MasterChannel) TableName() string {
	return "masterchannel"
}

func MasterChannelGetAll() ([]*MasterChannel, error) {
	cursor, err := DB().Find(new(MasterChannel), nil)
	if err != nil {
		return nil, err
	}

	result := []*MasterChannel{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
