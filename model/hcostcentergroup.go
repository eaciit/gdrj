package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type HCostCenterGroup struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //HCCGroupID
	CCTypeID      string
	Name          string
}

func (h *HCostCenterGroup) RecordID() interface{} {
	return h.ID
}

func (h *HCostCenterGroup) TableName() string {
	return "hcostcentergroup"
}

func HCostCenterGroupGetByID(id string) *HCostCenterGroup {
	b := new(HCostCenterGroup)
	DB().GetById(b, id)
	return b
}

func (h *HCostCenterGroup) Save() error {
	err := Save(h)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", h.TableName(), "save", err.Error()))
	}
	return err
}

func (h *HCostCenterGroup) Delete() error {
	err := Delete(h)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", h.TableName(), "delete", err.Error()))
	}
	return err
}
