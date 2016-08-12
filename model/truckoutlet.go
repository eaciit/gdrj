package gdrj

import (
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
)

type TruckOutlet struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //BrandID

	NumOutlet int
	NumTruct  int

	BranchName   string
	BranchLvl2   string
	BranchGroup  string
	IDBranchLvl2 string

	Key *TruckOutletKey
}

type TruckOutletKey struct {
	BranchID string
	Fiscal   string
}

func (c *TruckOutlet) RecordID() interface{} {
	return c.ID
}

func (c *TruckOutlet) TableName() string {
	return "truck_branch_fiscal"
}

type TruckOutletPayload struct {
	BreakdownBy string
	FiscalYear  string

	BranchNames  []string
	BranchLvl2   []string
	BranchGroups []string
}

func (payload *TruckOutletPayload) TruckOutletGetAll() ([]*TruckOutlet, error) {
	filters := []*dbox.Filter{}

	fmt.Printf("----- %#v\n", payload)

	if payload.FiscalYear != "" {
		filters = append(filters, dbox.Eq("key.fiscal", payload.FiscalYear))
	}
	if len(payload.BranchNames) > 0 {
		subFilters := []*dbox.Filter{}
		for _, each := range payload.BranchNames {
			subFilters = append(subFilters, dbox.Eq("branchname", each))
		}
		filters = append(filters, dbox.Or(subFilters...))
	}
	if len(payload.BranchLvl2) > 0 {
		subFilters := []*dbox.Filter{}
		for _, each := range payload.BranchLvl2 {
			subFilters = append(subFilters, dbox.Eq("branchlvl2", each))
		}
		filters = append(filters, dbox.Or(subFilters...))
	}
	if len(payload.BranchGroups) > 0 {
		subFilters := []*dbox.Filter{}
		for _, each := range payload.BranchGroups {
			subFilters = append(subFilters, dbox.Eq("branchgroup", each))
		}
		filters = append(filters, dbox.Or(subFilters...))
	}

	var filter *dbox.Filter
	if len(filters) > 0 {
		filter = dbox.And(filters...)
	}

	cursor, err := Find(new(TruckOutlet), filter, nil)
	if err != nil {
		return nil, err
	}

	result := []*TruckOutlet{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
