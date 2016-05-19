package gocore

import (
	"errors"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

var _ctx *orm.DataContext
var _ctxErr error

func ctx() *orm.DataContext {
	var _conn dbox.IConnection
	var econn error
	if _ctx == nil {
		if _conn == nil {
			_conn, econn = getConnection()
			if econn != nil {
				_ctxErr = errors.New("Connection error: " + econn.Error())
				return nil
			}
		}
		_ctx = orm.New(_conn)
	}
	return _ctx
}

func Delete(o orm.IModel) error {
	e := ctx().Delete(o)
	if e != nil {
		return errors.New("Core.Delete: " + e.Error())
	}
	return e

}

func Save(o orm.IModel) error {
	e := ctx().Save(o)
	if e != nil {
		return errors.New("Core.Save: " + e.Error())
	}
	return e
}

func Get(o orm.IModel, id interface{}) error {
	e := ctx().GetById(o, id)
	if e != nil {
		return errors.New("Core.Get: " + e.Error())
	}
	return e
}

func Find(o orm.IModel, filter *dbox.Filter) (dbox.ICursor, error) {
	var filters []*dbox.Filter
	if filter != nil {
		filters = append(filters, filter)
	}
	c, e := ctx().Find(o, toolkit.M{}.Set("where", filters))
	if e != nil {
		return nil, errors.New("Core.Find: " + e.Error())
	}
	return c, nil
}
