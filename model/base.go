package gdrj

import (
	"errors"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/json"
	_ "github.com/eaciit/dbox/dbc/jsons"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"math"
	"time"
)

var _db *orm.DataContext
var _conn dbox.IConnection
var _dbErr error

type GDRJModel struct {
	orm.ModelBase
	LastUpdate time.Time
}

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

type Date struct {
	ID         string
	Date       time.Time
	Month      time.Month
	Quarter    int
	YearTxt    string
	QuarterTxt string
	Year       int
	Fiscal string
}

func NewDate(yr, mth, dt int) *Date {
	return SetDate(time.Date(yr, time.Month(mth), dt, 0, 0, 0, 0, time.UTC))
}

func SetDate(dt time.Time) *Date{
	d := new(Date)
	d.Date = dt
	d.ID = toolkit.Date2String(d.Date, "YYYYMMdd")
	d.Month = d.Date.Month()
	d.Year = d.Date.Year()
	d.Quarter = int(math.Ceil(float64(d.Month)/3.0) - 1.0)
	if d.Quarter == 0 {
		d.Quarter = 4
	}
	if d.Month < 4 {
		d.QuarterTxt = toolkit.Sprintf("%d-%d Q%d",
			d.Year, d.Year+1, d.Quarter)
		d.Fiscal = toolkit.Sprintf("%d-%d", d.Year-1, d.Year)
	} else {
		d.QuarterTxt = toolkit.Sprintf("%d-%d Q%d",
			d.Year-1, d.Year, d.Quarter)
		d.Fiscal = toolkit.Sprintf("%d-%d", d.Year, d.Year+1)
	}
	return d
}
