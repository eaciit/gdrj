package gocore

import (
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
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

type Organization struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string         `json:"_id" bson:"_id"`
	FullName      string         `json:"FullName" bson:"FullName"`
	Position      string         `json:"Position" bson:"Position"`
	Image         string         `json:"Image" bson:"Image"`
	Color         string         `json:"Color" bson:"Color"`
	Items         []Organization `json:"Items" bson:"Items"`
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
	if err := Get(data, key); err != nil {
		return err
	}
	return data.Value
}

func SetConfig(key string, value interface{}) {
	o := new(Configuration)
	o.ID = key
	o.Value = value
	Save(o)
}

func RemoveConfig(key string) {
	o := new(Configuration)
	o.ID = key
	Delete(o)
}

func ClearPLCache() {
	csr, err := Find(new(Configuration), nil)
	if err != nil {
		return
	}
	defer csr.Close()

	confs := []*Configuration{}
	err = csr.Fetch(&confs, 0, false)
	if err != nil {
		return
	}

	for _, conf := range confs {
		if strings.HasPrefix(conf.ID, "pl_") {
			Delete(conf)
		}
	}
}

// pl_

func (p *Ports) TableName() string {
	return "port"
}

func (p *Ports) RecordID() interface{} {
	return p.ID
}

func (p *Ports) GetPort() error {
	if err := Get(p, p.ID); err != nil {
		return err
	}

	return nil
}

func SetPort(_port *Ports, value interface{}) error {
	_port.Port = toolkit.ToInt(value, toolkit.RoundingAuto)
	if err := Save(_port); err != nil {
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

func (o *Organization) TableName() string {
	return "organizations"
}

func (o *Organization) RecordID() interface{} {
	return o.ID
}

func GetOrganizationByID(id string) ([]Organization, error) {
	result := make([]Organization, 0)

	dboxf := dbox.And(dbox.Contains("_id", id))
	cursor, err := Find(new(Organization), dboxf)
	if err != nil {
		return nil, err
	}

	err = cursor.Fetch(&result, 0, false)
	if cursor != nil {
		cursor.Close()
	}
	if err != nil {
		return nil, err
	}

	return result, nil
}

func GetDB(key string) interface{} {
	data := new(Databases)
	if err := Get(data, key); err != nil {
		return err
	}

	return data.Data
}

func SetDB(value interface{}) {
	o := new(Databases)
	o.Data = value
	Save(o)
}
