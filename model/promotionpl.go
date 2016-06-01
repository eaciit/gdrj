package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type PromotionPL struct {
	orm.ModelBase    `json:"-" bson:"-"`
	ID               string `json:"_id" bson:"_id"`
	Year             int
	Month            time.Month
	ClaimRefNo       string
	SKUID_VDIST      string
	SKUID_SAP        string
	ExpenseProposal  string
	DiscountProposal string
	OutletNo         string
	OutletName       string
}

func (p *PromotionPL) RecordID() interface{} {
	return p.ID
}

func (p *PromotionPL) TableName() string {
	return "promotionpl"
}

func PromotionPLGetByID(id string) *PromotionPL {
	p := new(PromotionPL)
	DB().GetById(p, id)
	return p
}

func (p *PromotionPL) Save() error {
	e := Save(p)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", p.TableName(), "save", e.Error()))
	}
	return e
}

func (p *PromotionPL) Delete() error {
	e := Delete(p)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", p.TableName(), "delete", e.Error()))
	}
	return e
}
