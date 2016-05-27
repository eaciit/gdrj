package gdrj

import (
	"errors"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type LedgerAccount struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //LedgerAccount
	Title         string
	G1            string
	G2            string
	G3            string
	G4            string
}

func (t *LedgerAccount) RecordID() interface{} {
	return t.ID
}

func (t *LedgerAccount) TableName() string {
	return "ledgeraccount"
}

func LedgerAccountGetByID(id string) *LedgerAccount {
	t := new(LedgerAccount)
	DB().GetById(t, id)
	return t
}

func LedgerAccountGetAll() ([]*LedgerAccount, error) {
	cursor, err := DB().Find(new(LedgerAccount), nil)
	if err != nil {
		return nil, err
	}

	result := []*LedgerAccount{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func FindLedgerAccountLikeId(id string, take, skip int) (arla []*LedgerAccount) {
	conf := toolkit.M{}.Set("skip", skip)
	if take > 0 {
		conf.Set("take", take)
	}

	arla = make([]*LedgerAccount, 0, 0)
	c, e := Find(new(LedgerAccount), dbox.Contains("_id", id), conf)
	if e != nil {
		return
	}

	_ = c.Fetch(&arla, 0, false)
	return
}

func (t *LedgerAccount) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *LedgerAccount) Delete() error {
	e := Delete(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "delete", e.Error()))
	}
	return e
}
