package gdrj

import "github.com/eaciit/toolkit"

//"github.com/eaciit/dbox"

type LedgerSummary struct {
	ID                     string
	PC                     *ProfitCenter
	CC                     *CostCenter
	CompanyCode            string
	LedgerAccount          string
	Customer               *Customer
	Product                *Product
	Date                   *Date
	Value1, Value2, Value3 float64
}

func (s *LedgerSummary) RecordID() interface{} {
	return toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
}

func (s *LedgerSummary) TableName() string {
	return "LedgerSummary"
}
