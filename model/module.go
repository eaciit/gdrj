package gdrj

import (
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

// ==================================== Module

type Module struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Name          string
	Description   string
	BuildPath     string
	IsCompiled    bool //if false do extract and build
	LastCompile   time.Time
	ExecFile      string
	AddParam      []string //except base param, startperiode,endperiode,outletid,skuid
}

func (m *Module) RecordID() interface{} {
	return m.ID
}

func (m *Module) TableName() string {
	return "module"
}

func (m *Module) PreSave() {
	if m.ID == "" {
		m.ID = toolkit.RandomString(32)
	}

	if !m.IsCompiled {
		//Extract and build, save exec file
		m.IsCompiled = true
		m.LastCompile = time.Now().UTC()
	}
	//save using base,
}

// func (m *Module) IsCompiled() bool {
// 	return m.ExePath != ""
// }
