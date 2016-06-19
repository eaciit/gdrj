package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type CsvReport struct {
	orm.ModelBase                                             `bson:"-" json:"-"`
	ID                                                        string `bson:"_id" json:"_id"`
	BranchID, Branch, ChannelID, Channel, Date                string
	GrossAmount, DiscountAmount, ReturnAmount, ReturnDiscount float64
	InvoiceAmount, ReturnInvoiceAmount                        float64
}

func (c *CsvReport) TableName() string {
	return "csvreports"
}

func (c *CsvReport) RecordID() interface{} {
	return c.ID
}

func (c *CsvReport) Save() error {
	e := Save(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "save", e.Error()))
	}
	return e
}
