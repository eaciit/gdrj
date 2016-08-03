package gdrj

import (
	"github.com/eaciit/orm/v1"
)

type MasterBranchLvl2 struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID
	Name          string
}

func (c *MasterBranchLvl2) RecordID() interface{} {
	return c.ID
}

func (c *MasterBranchLvl2) TableName() string {
	return "masterbranchlvl2"
}

func MasterBranchLvl2GetAll() ([]*MasterBranchLvl2, error) {
	cursor, err := DB().Find(new(MasterBranchLvl2), nil)
	if err != nil {
		return nil, err
	}

	result := []*MasterBranchLvl2{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
