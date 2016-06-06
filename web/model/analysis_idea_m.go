package gocore

import (
	"github.com/eaciit/orm/v1"
)

type AnalysisIdea struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Order         int    `json:"order" bson:"order"`
	Name          string `json:"name" bson:"name"`
}

func (a *AnalysisIdea) TableName() string {
	return "analysis_idea"
}

func (a *AnalysisIdea) RecordID() interface{} {
	return a.ID
}

func AnalysisIdeaGetByID(id string) *AnalysisIdea {
	o := new(AnalysisIdea)
	if err := Get(o, id); err != nil {
		return nil
	}

	return o
}

func AnalysisIdeaGetAll() ([]*AnalysisIdea, error) {
	cursor, err := Find(new(AnalysisIdea), nil)
	if err != nil {
		return nil, err
	}

	result := []*AnalysisIdea{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}
