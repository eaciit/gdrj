package gdrj

import (
	"fmt"
	"time"

	"github.com/eaciit/orm/v1"
)

type SalesTrx struct {
	orm.ModelBase  `bson:"-" json:"-"`
	ID             string `bson:"_id" json:"_id"`
	SalesHeaderID  string
	LineNo         int
	SKUID          string
	SKUID_VDIST    string
	OutletID       string
	Date           time.Time
	Year, Month    int
	Fiscal         string
	SalesQty       float64
	GrossAmount    float64
	DiscountAmount float64
	TaxAmount      float64
	NetAmount      float64

	HeaderValid   bool
	ProductValid  bool
	CustomerValid bool
	PCValid       bool

	Customer *Customer
	Product  *Product
	PC       *ProfitCenter
}

func (s *SalesTrx) TableName() string {
	return "salestrxs"
}

func (s *SalesTrx) RecordID() interface{} {
	s.ID = s.PrepareID().(string)
	return s.ID
}

func (s *SalesTrx) PrepareID() interface{} {
	return fmt.Sprintf("%s_%d", s.SalesHeaderID, s.LineNo)
}
