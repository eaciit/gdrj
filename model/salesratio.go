package gdrj

import (
	//"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type SalesRatio struct {
	orm.ModelBase       `json:"-" bson:"-"`
	ID                  string `json:"_id" bson:"_id"`
	Year                int
	Month               int
	OutletID            string
	SKUID               string
	Ratio          float64
    Amount  float64
    BrandCategoryID, BranchID, PCID string
}

func (s *SalesRatio) RecordID() interface{} {
	s.ID = toolkit.Sprintf("%d_%d_%s_%s", s.Year, s.Month, s.OutletID, s.SKUID)
    return s.ID
}

func (s *SalesRatio) TableName() string {
	return "salesratios"
}

