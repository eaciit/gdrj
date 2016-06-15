package gdrj

import (
	// "errors"
	"github.com/eaciit/orm/v1"
	// "github.com/eaciit/toolkit"
	// "time"
)

type RawSalesExpVdist struct {
	orm.ModelBase                              `json:"-" bson:"-"`
	ID                                         string `json:"_id" bson:"_id"`
	EntityID, BusA                             string
	Year                                       int
	Period                                     int
	Account, Description, OutletID, OutletName string
	SKUID, SKU_DESC                            string
	PCID                                       string
	CCID                                       string
	PLItemID                                   string
	Amount                                     float64
	Src                                        string
}

func (s *RawSalesExpVdist) RecordID() interface{} {
	return s.ID
}

func (s *RawSalesExpVdist) TableName() string {
	return "rawsalesexpvdist"
}

// func (s *SGAPL) Save() error {
// 	e := Save(s)
// 	if e != nil {
// 		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "save", e.Error()))
// 	}
// 	return e
// }

// func (s *SGAPL) Delete() error {
// 	e := Delete(s)
// 	if e != nil {
// 		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "delete", e.Error()))
// 	}
// 	return e
// }
