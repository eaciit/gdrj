package gdrj

import (
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"gopkg.in/mgo.v2/bson"
	"strings"
)

type SGAPayload struct {
	Year int

	BranchNames  []string
	BranchLvl2   []string
	BranchGroups []string
	CostGroups   []string

	Groups []string
}

type SGA struct {
	orm.ModelBase      `json:"-" bson:"-"`
	ID                 string `json:"_id" bson:"_id"`
	BranchID           string
	BranchArea         string
	BranchName         string
	BranchLvl2         string
	BranchGroup        string
	Account            string
	AccountDescription string
	AccountGroup       string
	CostGroup          string
	Year               int
	Amount             float64
	IsElimination      bool
}

func (b *SGA) RecordID() interface{} {
	return b.ID
}

func (b *SGA) TableName() string {
	return "rawdatapl-sga-sum4analysis"
}

func SGAGetAll(payload *SGAPayload) ([]*SGA, error) {
	filters := []*dbox.Filter{}

	if payload.Year > 0 {
		filters = append(filters, dbox.Eq("year", payload.Year))
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
	if len(payload.CostGroups) > 0 {
		subFilters := []*dbox.Filter{}
		for _, each := range payload.CostGroups {
			subFilters = append(subFilters, dbox.Eq("costgroup", each))
		}
		filters = append(filters, dbox.Or(subFilters...))
	}

	pipe := []bson.M{}

	if len(filters) > 0 {
		fb := DB().Connection.Fb()
		fb.AddFilter(dbox.And(filters...))

		if matches, err := fb.Build(); err == nil {
			pipe = append(pipe, bson.M{"$match": matches})
		}
	}

	for i, group := range payload.Groups {
		payload.Groups[i] = strings.ToLower(group)
	}
	payload.Groups = append(payload.Groups, strings.ToLower("Year"))
	payload.Groups = append(payload.Groups, strings.ToLower("AccountGroup"))
	payload.Groups = append(payload.Groups, strings.ToLower("AccountDescription"))

	ids := bson.M{}
	for _, group := range payload.Groups {
		ids[group] = fmt.Sprintf("$%s", group)
	}

	groups := bson.M{
		"_id":    ids,
		"amount": bson.M{"$sum": "$amount"},
	}
	pipe = append(pipe, bson.M{"$group": groups})

	projects := bson.M{
		"amount": "$amount",
	}
	for _, group := range payload.Groups {
		projects[group] = fmt.Sprintf("$_id.%s", group)
	}
	pipe = append(pipe, bson.M{"$project": projects})

	for _, p := range pipe {
		fmt.Printf("----- %#v\n", p)
	}

	result := []*SGA{}

	db, session, err := new(PLFinderParam).ConnectToDB()
	if err != nil {
		return nil, err
	}
	defer session.Close()

	err = db.C(new(SGA).TableName()).Pipe(pipe).AllowDiskUse().All(&result)
	if err != nil {
		return nil, err
	}

	return result, nil
}
