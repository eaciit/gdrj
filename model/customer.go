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
	ID            string `json:"_id" bson:"_id"` //OutletID
	CustomerID    string
	Plant         string
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
	return c.ID
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

func ToChannelEnum(d int) ChannelTypeEnum {
	switch d {
	case 1:
		return ExportChannel
	case 2:
		return GeneralTradeChannel
	case 3:
		return ModernTradeChannel
	case 4:
		return IndustrialTradeChannel
	case 5:
		return MotoristChannel
	case 6:
		return RegionalDistributorChannel
	}
	return 0
}
