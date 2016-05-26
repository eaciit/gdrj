package gdrj

import (
<<<<<<< HEAD
	//"github.com/eaciit/toolkit"
=======
	// "github.com/eaciit/toolkit"
>>>>>>> c58687dbd216236ed1143541cfe35844cd62ec71
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
