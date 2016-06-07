package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type COGSConsolidate struct {
	orm.ModelBase                                                                   `json:"-" bson:"-"`
	ID                                                                              string `json:"_id" bson:"_id"`
	Month                                                                           time.Month
	Year                                                                            int
	BrandCategory, SubCategory, DistributionChannel, SAPCode, ProductDescription    string
	GPS_Quantity, GPS_PriceUnit, GPS_Amount, Discount_Amount, NPS_Quantity          float64
	NPS_PriceUnit, NPS_Amount, RM_PerUnit, RM_Amount, LC_PerUnit, LC_Amount         float64
	PF_PerUnit, PF_Amount, Other_PerUnit, Other_Amount, Fixed_PerUnit, Fixed_Amount float64
	Depre_PerUnit, Depre_Amount, COGS_PerUnit, COGS_Amount, GP_PerUnit, GPN_Amount  float64
	GPN_Percent, GPG_PerUnit, GPG_Amount, GPG_Percent, Advt_Amount, Promo_Amount    float64
	TotalAP_Amount, NetProfit_Amount, NetProfit_Percent                             float64
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
	// co.ID = toolkit.ToString(co.Year) + "_" + toolkit.ToString(co.Month) + "_" + co.SAPCode
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
