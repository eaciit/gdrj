package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type COGSConsolidate struct {
	orm.ModelBase       `json:"-" bson:"-"`
	ID                  string `json:"_id" bson:"_id"`
	Month               time.Month
	Year                int
	BrandCategory       string
	SubCategory         string
	DistributionChannel string
	SAPCode             string
	ProductDescription  string
	GPS_Quantity        int
	GPS_PriceUnit       float64
	GPS_Amount          float64
	DiscountAmount      float64
	NPS_Quantity        int
	NPS_PriceUnit       float64
	NPS_Amount          float64
	COGS_PerUnit        float64
	COGS_Amount         float64
	GP_PerUnit          float64
	GP_Amount           float64
	GP_Percent          float64
	Advt_Amount         float64
	PromotionAmount     float64
	TotalAPAmount       float64
	NetProfitAmount     float64
	NetProfitPercent    float64
}

func (co *COGSConsolidate) RecordID() interface{} {
	return co.ID
}

func (co *COGSConsolidate) TableName() string {
	return "rawcogsconsolidate"
}

func COGSConsolidateGetByID(id string) *COGSConsolidate {
	co := new(COGSConsolidate)
	DB().GetById(co, id)
	return co
}

func (co *COGSConsolidate) Save() error {
	e := Save(co)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", co.TableName(), "save", e.Error()))
	}
	return e
}

func (co *COGSConsolidate) Delete() error {
	e := Delete(co)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", co.TableName(), "delete", e.Error()))
	}
	return e
}
