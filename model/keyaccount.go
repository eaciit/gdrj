package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type KeyAccount struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"` //KeyAccount
	Name          string
}

func (k *KeyAccount) RecordID() interface{} {
	return k.ID
}

func (k *KeyAccount) TableName() string {
	return "keyaccount"
}

func KeyAccountGetByID(id string) *KeyAccount {
	b := new(KeyAccount)
	DB().GetById(b, id)
	return b
}

func KeyAccountGetAll() ([]*KeyAccount, error) {
	cursor, err := DB().Find(new(KeyAccount), nil)
	if err != nil {
		return nil, err
	}

	result := []*KeyAccount{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}

func (k *KeyAccount) Save() error {
	err := Save(k)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", k.TableName(), "save", err.Error()))
	}
	return err
}

func (k *KeyAccount) Delete() error {
	err := Delete(k)
	if err != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v ", k.TableName(), "delete", err.Error()))
	}
	return err
}
