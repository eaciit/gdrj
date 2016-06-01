package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type Product struct {
	orm.ModelBase   `json:"-" bson:"-"`
	ID              string `bson:"_id" json:"_id"` //SKUID
	Name            string
	ProdCategory    string
	Brand           string
	BrandCategoryID string
	PCID            string
	ProdSubCategory string
	ProdSubBrand    string
	ProdVariant     string
	ProdDesignType  string
}

func (p *Product) RecordID() interface{} {
	return p.ID
}

func (p *Product) TableName() string {
	return "product"
}

func ProductGetBySKUID(id string) *Product {
	p := new(Product)
	DB().GetById(p, id)
	return p
}

func ProductGetAll() ([]*Product, error) {
	cursor, err := DB().Find(new(Product), nil)
	if err != nil {
		return nil, err
	}

	result := []*Product{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}

func (p *Product) Save() error {
	e := Save(p)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v", p.TableName(), "save", e.Error()))
	}
	return e
}

func (p *Product) Delete() error {
	e := Delete(p)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v", p.TableName(), "delete", e.Error()))
	}
	return e
}
