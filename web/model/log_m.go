package gocore

import (
	"eaciit/gdrj/model"
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type Log struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string `bson:"_id" json:"_id"`
	Name          string
	Action        string
	Reference     string
	Time          time.Time
	Description   string
}

func (l *Log) TableName() string {
	return "logs"
}

func (l *Log) RecordID() interface{} {
	return l.ID
}

func (l *Log) Save() error {
	e := gdrj.Save(l)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", l.TableName(), "save", e.Error()))
	}
	return e
}

func WriteLog(sessionId interface{}, access, reference string) error {
	userid, err := GetUserName(sessionId)
	if err != nil {
		return err
	}

	log := new(Log)
	log.ID = toolkit.RandomString(32)
	log.Name = userid.FullName
	log.Action = access
	log.Reference = reference
	log.Time = time.Now()

	if access == "login" || access == "logout" {
		log.Description = log.Name + " " + access + " at " + log.Time.String()
	} else {
		log.Description = log.Name + " is accessing page " + log.Reference + " at " + log.Time.String()
	}

	if err := log.Save(); err != nil {
		return err
	}

	return nil
}
