package gdrj

import (
	"github.com/eaciit/orm/v1"
)

type MasterBranch struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Name          string
}

func (c *MasterBranch) RecordID() interface{} {
	return c.ID
}

func (c *MasterBranch) TableName() string {
	return "masterbranch"
}

func MasterBranchGetAll() ([]*MasterBranch, error) {
	cursor, err := DB().Find(new(MasterBranch), nil)
	if err != nil {
		return nil, err
	}

	result := []*MasterBranch{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
