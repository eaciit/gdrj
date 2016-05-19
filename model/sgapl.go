package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type SGAPL struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Year          int
	Month         time.Month
	PCID          string
	CCID          string
	PLItemID      string
	Amount        float64
}

func (s *SGAPL) RecordID() interface{} {
	return s.ID
}

func (s *SGAPL) TableName() string {
	return "sgapl"
}

func SGAPLGetByID(id string) *SGAPL {
	s := new(SGAPL)
	DB().GetById(s, id)
	return s
}

func (s *SGAPL) Save() error {
	e := Save(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "save", e.Error()))
	}
	return e
}

func (s *SGAPL) Delete() error {
	e := Delete(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "delete", e.Error()))
	}
	return e
}
