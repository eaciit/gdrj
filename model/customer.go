package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type ChannelTypeEnum int

const (
	ExportChannel              ChannelTypeEnum = 1
	GeneralTradeChannel                        = 2
	ModernTradeChannel                         = 3
	IndustrialTradeChannel                     = 4
	MotoristChannel                            = 5
	RegionalDistributorChannel                 = 6
)

type Customer struct {
	orm.ModelBase `json:"-" bson:"-"`
	CustomerID    string `json:"_id" bson:"_id"`
	Name          string
	KeyAccount    string
	Channel       ChannelTypeEnum
	Group         string
	National      string
	Zone          string
	Region        string
	Area          string
}

func (c *Customer) RecordID() interface{} {
	return c.CustomerID
}

func (c *Customer) TableName() string {
	return "customer"
}

func CustomerGetByID(id string) *Customer {
	c := new(Customer)
	DB().GetById(c, id)
	return c
}

func (c *Customer) Save() error {
	e := Save(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "save", e.Error()))
	}
	return e
}

func (c *Customer) Delete() error {
	e := Delete(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "delete", e.Error()))
	}
	return e
}

func (c ChannelTypeEnum) String() string {

	switch c {
	case ExportChannel:
		return "Export"
	case GeneralTradeChannel:
		return "General Trade"
	case ModernTradeChannel:
		return "Modern Trade"
	case IndustrialTradeChannel:
		return "Industrial Trade"
	case MotoristChannel:
		return "Motorist"
	case RegionalDistributorChannel:
		return "Regional Distributor"
	}

	return "unknown"
}
