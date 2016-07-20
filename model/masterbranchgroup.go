package gdrj

import (
	"github.com/eaciit/orm/v1"
)

type MasterBranchGroup struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Name          string
}

func (c *MasterBranchGroup) RecordID() interface{} {
	return c.ID
}

func (c *MasterBranchGroup) TableName() string {
	return "masterbranchgroup"
}

func MasterBranchGroupGetAll() ([]*MasterBranchGroup, error) {
	cursor, err := DB().Find(new(MasterBranchGroup), nil)
	if err != nil {
		return nil, err
	}

	result := []*MasterBranchGroup{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
