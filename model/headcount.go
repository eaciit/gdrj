//Year	Month	PCID	CCID	Branch	Level	HCQty

package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type HeadCount struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Year          int
	Month         time.Month
	PCID          string
	CCID          string
	BranchID      string
	Level         string
	Qty           int // Qty of employee in that level in month
}

func (h *HeadCount) RecordID() interface{} {
	return h.ID
}

func (h *HeadCount) TableName() string {
	return "headcount"
}

func HeadCountGetByID(id string) *HeadCount {
	h := new(HeadCount)
	DB().GetById(h, id)
	return h
}

func (h *HeadCount) Save() error {
	e := Save(h)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", h.TableName(), "save", e.Error()))
	}
	return e
}

func (h *HeadCount) Delete() error {
	e := Delete(h)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", h.TableName(), "delete", e.Error()))
	}
	return e
}
