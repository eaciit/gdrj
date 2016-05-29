package gdrj

import (
	// "github.com/eaciit/toolkit"
	"github.com/eaciit/orm/v1"
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
	return "ledgertrans"
}
