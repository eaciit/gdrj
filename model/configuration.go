package gdrj

import (
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

const (
	CONF_DB_ACL  string = "db_acl"
	CONF_DB_GDRJ string = "db_godrej"
)

type Databases struct {
	orm.ModelBase
	ID   string      `json:"_id",bson:"_id"`
	Data interface{} `json:"data",bson:"data"`
}

type Ports struct {
	orm.ModelBase
	ID   string `json:"_id",bson:"_id"`
	Port int    `json:"port",bson:"port"`
}

type Configuration struct {
	orm.ModelBase
	ID    string `json:"_id",bson:"_id"`
	Value interface{}
}

func (a *Configuration) TableName() string {
	return "configurations"
}

func (a *Configuration) RecordID() interface{} {
	return a.ID
}

func GetConfig(key string, args ...string) interface{} {
	data := new(Configuration)
	if err := GetCtx(data, key); err != nil {
		return err
	}
	return data.Value
}

func SetConfig(key string, value interface{}) {
	o := new(Configuration)
	o.ID = key
	o.Value = value
	SaveCtx(o)
}

func (p *Ports) TableName() string {
	return "port"
}

func (p *Ports) RecordID() interface{} {
	return p.ID
}

func (p *Ports) GetPort() error {
	if err := GetCtx(p, p.ID); err != nil {
		return err
	}

	return nil
}

func SetPort(_port *Ports, value interface{}) error {
	_port.Port = toolkit.ToInt(value, toolkit.RoundingAuto)
	if err := SaveCtx(_port); err != nil {
		return err
	}

	return nil
}

func (a *Databases) TableName() string {
	return "databases"
}

func (a *Databases) RecordID() interface{} {
	return a.ID
}

func GetDB(key string) interface{} {
	data := new(Databases)
	if err := GetCtx(data, key); err != nil {
		return err
	}

	return data.Data
}

func SetDB(value interface{}) {
	o := new(Databases)
	o.Data = value
	SaveCtx(o)
}
