package gdrj

import (
	"github.com/eaciit/orm/v1"
	"time"
)

// ==================================== Module

type Module struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Name          string
	Description   string
	ExePath       string
	LastCompiled  time.Time
}

func (m *Module) RecordID() interface{} {
	return m.ID
}

func (m *Module) TableName() string {
	return "module"
}

func (m *Module) IsCompiled() bool {
	return m.ExePath != ""
}

// ==================================== AppliedModule

type AppliedModule struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Modules       []*Module
	LastExecution time.Time
}

func (am *AppliedModule) RecordID() interface{} {
	return am.ID
}

func (am *AppliedModule) TableName() string {
	return "applied_module"
}
