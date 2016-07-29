package gdrj

import (
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type SGAPayload struct {
	Year         int
	BranchNames  []string
	BranchGroups []string
	CostGroups   []string
}

type SGA struct {
	orm.ModelBase      `json:"-" bson:"-"`
	ID                 string `json:"_id" bson:"_id"`
	BranchID           string
	BranchArea         string
	BranchName         string
	BranchGroup        string
	Account            string
	AccountDescription string
	AccountGroup       string
	CostGroup          string
	Year               int
	Amount             float64
}

func (b *SGA) RecordID() interface{} {
	return b.ID
}

func (b *SGA) TableName() string {
	return "rawdatapl-sga-sum4analysis"
}

func SGAGetAll(payload *SGAPayload) ([]*SGA, error) {
	filters := []*dbox.Filter{dbox.Eq("year", payload.Year)}

	if len(payload.BranchNames) > 0 {
		subFilters := []*dbox.Filter{}
		for _, each := range payload.BranchNames {
			subFilters = append(subFilters, dbox.Eq("branchname", each))
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
	if len(payload.CostGroups) > 0 {
		subFilters := []*dbox.Filter{}
		for _, each := range payload.CostGroups {
			subFilters = append(subFilters, dbox.Eq("costgroup", each))
		}
		filters = append(filters, dbox.Or(subFilters...))
	}

	args := toolkit.M{"where": filters}
	cursor, err := DB().Find(new(SGA), args)
	if err != nil {
		return nil, err
	}

	result := []*SGA{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
