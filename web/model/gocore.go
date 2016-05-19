package gocore

import (
	"errors"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/toolkit"
	"os"
)

var ConfigPath string

func validateConfig() error {
	if ConfigPath == "" {
		return errors.New("gocore.validateConfig: ConfigPath is empty")
	}
	_, e := os.Stat(ConfigPath)
	if e != nil {
		return errors.New("gocore.validateConfig: " + e.Error())
	}
	return nil
}

func getConnection() (dbox.IConnection, error) {
	if e := validateConfig(); e != nil {
		return nil, errors.New("gocore.GetConnection: " + e.Error())
	}
	c, e := dbox.NewConnection("jsons", &dbox.ConnectionInfo{ConfigPath, "", "", "", toolkit.M{}.Set("newfile", true)})
	if e != nil {
		return nil, errors.New("gocore.GetConnection: " + e.Error())
	}
	e = c.Connect()
	if e != nil {
		return nil, errors.New("gocore.GetConnection: Connect: " + e.Error())
	}
	return c, nil
}
