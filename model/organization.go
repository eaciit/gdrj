package gdrj

import (
	"github.com/eaciit/orm/v1"
)

type Organization struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            string `json:"_id" bson:"_id"`
	FullName      string
	Position      string
	Image         string
	Color         string
	Items         []Organization
}

func (o *Organization) TableName() string {
	return "organization"
}

func (o *Organization) RecordID() interface{} {
	return o.ID
}
func (o *Organization) GetOrganization() error {
	if err := Get(o, o.ID); err != nil {
		return err
	}
	return nil
}
func OrganizationGetByID(id string) *Organization {
	d := new(Organization)
	DB().GetById(d, id)
	return d
}
