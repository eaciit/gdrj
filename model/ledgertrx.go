package gdrj

import (
	// "github.com/eaciit/toolkit"
	"github.com/eaciit/orm/v1"
	//"github.com/eaciit/dbox"
	"time"
)

type LedgerTrx struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Year          int
	Month         time.Month
	Qtr           int
	Data          time.Time
	PeriodID      string
	CompanyCode   string
	PCID          string
	CCID          string
	LedgerAccount string
	Value         float64
}

func (t *LedgerTrx) RecordID() interface{} {
	return t.ID
}

func (t *LedgerTrx) TableName() string {
	return "LedgerTrx"
}

type Date struct {
	ID      string
	Date    time.Time
	Month   time.Month
	Quarter int
	Year    int
}

type LedgerSummary struct {
	ID       string
	PC       *ProfitCenter
	CC       *CostCenter
    CompanyCode string
    LedgerAccount string
	Customer *Customer
	Product  *Product
	Date     *Date
	Value1, Value2, Value3 float64
}

func (s *LedgerSummary) RecordID() interface{} {
	return toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
}

func (s *LedgerSummary) TableName() string {
	return "LedgerSummary"
}
