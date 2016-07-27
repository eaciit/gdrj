package gdrj

import (
	"github.com/eaciit/orm/v1"
)

type MasterFunction struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Name          string
}

func (c *MasterFunction) RecordID() interface{} {
	return c.ID
}

func (c *MasterFunction) TableName() string {
	return "masterfunction"
}

func MasterFunctionGetAll() ([]*MasterFunction, error) {
	cursor, err := DB().Find(new(MasterFunction), nil)
	if err != nil {
		return nil, err
	}

	result := []*MasterFunction{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
