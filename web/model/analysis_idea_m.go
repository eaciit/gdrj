package gocore

import (
	"github.com/eaciit/orm/v1"
)

type AnalysisIdea struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Name          string `json:"name" bson:"name"`
}

func (a *AnalysisIdea) TableName() string {
	return "analysis_idea"
}

func (a *AnalysisIdea) RecordID() interface{} {
	return a.ID
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
