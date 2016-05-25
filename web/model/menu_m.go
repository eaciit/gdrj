package gocore

import (
	"github.com/eaciit/orm/v1"
)

type Menu struct {
	orm.ModelBase
	ID string `json:"_id",bson:"_id"`

	AccessId  string `json:"AccessId",bson:"AccessId"`
	Title     string `json:"title",bson:"title"`
	Childrens []Menu `json:"childrens",bson:"childrens"`
	Link      string `json:"link",bson:"link"`
}

func (a *Menu) TableName() string {
	return "menus"
}

func (a *Menu) RecordID() interface{} {
	return a.ID
}
