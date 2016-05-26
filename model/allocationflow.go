package gdrj

import (
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

var (
	BaseParams = []string{"startperiode", "endperiode", "outletid", "skuid"}
)

type AllocationFlow struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	Name          string
	Description   string
	Params        toolkit.M
	Modules       []*Module
	StartExec     time.Time
	EndExec       time.Time
	Logfile       string
	ExecBy        string //User login
}

func (m *AllocationFlow) RecordID() interface{} {
	return m.ID
}

func (m *AllocationFlow) TableName() string {
	return "allocationflow"
}

func (m *AllocationFlow) PreSave() {

	if m.ID == "" {
		m.ID = toolkit.RandomString(32)
	}
}

func (m *AllocationFlow) Exec() {
	return
}

func GetBaseAllocationParams() []string {
	return BaseParams
}
