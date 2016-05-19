package gdrj

import (
	"errors"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/json"
	_ "github.com/eaciit/dbox/dbc/jsons"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

var _db *orm.DataContext
var _conn dbox.IConnection
var ConfigPath string
var _dbErr error

func SetDb(conn dbox.IConnection) error {
	CloseDb()

	e := conn.Connect()
	if e != nil {
		_dbErr = errors.New("gdrj.SetDB: Test Connect: " + e.Error())
		return _dbErr
	}

	_db = orm.New(conn)
	return nil
}

func CloseDb() {
	if _db != nil {
		_db.Close()
	}
}

func DB() *orm.DataContext {
	return _db
}

func Delete(o orm.IModel) error {
	e := DB().Delete(o)
	if e != nil {
		return errors.New("Delete: " + e.Error())
	}
	return e

}

func Save(o orm.IModel) error {
	e := DB().Save(o)
	if e != nil {
		return errors.New("Save: " + e.Error())
	}
	return e
}

func Get(o orm.IModel, id interface{}) error {
	e := DB().GetById(o, id)
	if e != nil {
		return errors.New("Get: " + e.Error())
	}
	return e
}

func Find(o orm.IModel, filter *dbox.Filter, config toolkit.M) (dbox.ICursor, error) {
	var filters []*dbox.Filter
	if filter != nil {
		filters = append(filters, filter)
	}

	dconf := toolkit.M{}.Set("where", filters)
	if config != nil {
		if config.Has("take") {
			dconf.Set("limit", config["take"])
		}
		if config.Has("skip") {
			dconf.Set("skip", config["skip"])
		}
		if config.Has("order") && toolkit.TypeName(config["order"]) == "[]string" {
			dconf.Set("order", config["order"])
		}
	}

	c, e := DB().Find(o, dconf)
	if e != nil {
		return nil, errors.New("Find: " + e.Error())
	}
	return c, nil
}
