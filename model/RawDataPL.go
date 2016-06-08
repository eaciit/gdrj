package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type RawDataPL struct {
	orm.ModelBase      `json:"-" bson:"-"`
	ID                 string `json:"_id" bson:"_id"`
	Period             int
	Year               int
	EntityID           string
	BusA               string
	Account            string
	AccountDescription string
	AccountInfo        string
	Grouping           string
	CCID               string
	CostCenterName     string
	PCID               string
	SKUID              string
	ProductName        string
	OutletID           string
	OutletName         string
	APGrouping         string
	APProposalNo       string
	AmountinIDR        float64
	AmountinUSD        float64
	Other              string
	RDoutletID string
	Src                string
}

func (t *RawDataPL) RecordID() interface{} {
	return t.ID
}

func (t *RawDataPL) TableName() string {
	return "rawdatapl"
}

func RawDataPLGetByID(id string) *RawDataPL {
	t := new(RawDataPL)
	DB().GetById(t, id)
	return t
}

func (t *RawDataPL) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *RawDataPL) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
