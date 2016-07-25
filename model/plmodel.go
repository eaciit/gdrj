package gdrj

import (
	"errors"

	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

var (
	NetMarginPLCode   string = "PL74D"
	NetMarginPLHeader string = "Net Margin"
)

type PLModel struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //PLCode
	OrderIndex    string
	PLHeader1     string
	PLHeader2     string
	PLHeader3     string
	Amount        float64
	GLReff        string
}

func (t *PLModel) RecordID() interface{} {
	return t.ID
}

func (t *PLModel) TableName() string {
	return "plmodel"
}

func PLModelGetByID(id string) *PLModel {
	t := new(PLModel)
	DB().GetById(t, id)
	return t
}

func PLModelGetAll(s *PLFinderParam) ([]*PLModel, error) {
	cursor, err := DB().Find(new(PLModel), nil)
	if err != nil {
		return nil, err
	}

	result := []*PLModel{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	hasNetMargin := false
	for _, each := range result {
		// put Adv & Promo below the Gross Margin
		if each.ID == "PL32A" {
			each.OrderIndex = "PL0027A"
		}

		// if net margin is not yet added to pnl
		if each.PLHeader3 == NetMarginPLHeader && !hasNetMargin {
			hasNetMargin = true
		}
	}

	// if net margin is not yet added to pnl
	// inject fake one, the amount will be calculated from gross sales - a&p
	if !hasNetMargin {
		plNetMargin := new(PLModel)
		plNetMargin.ID = NetMarginPLCode
		plNetMargin.PLHeader1 = NetMarginPLHeader
		plNetMargin.PLHeader2 = plNetMargin.PLHeader1
		plNetMargin.PLHeader3 = plNetMargin.PLHeader1
		plNetMargin.OrderIndex = "PL0027C"
		result = append(result, plNetMargin)
	}

	isSGARequest := false
	if s != nil {
		if s.Flag == "gna" {
			isSGARequest = true
		}
	}

	if !isSGARequest {
		parseResult := []*PLModel{}
		for _, each := range result {
			if each.ID == "PL94A" || each.PLHeader1 != "G&A Expenses" {
				parseResult = append(parseResult, each)
			}
		}

		result = parseResult
	}

	return result, nil
}

func (t *PLModel) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *PLModel) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
