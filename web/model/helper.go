package gocore

import (
	"eaciit/gdrj/model"
	"github.com/eaciit/acl"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
)

func (l *Login) GetConnectionInfo(db_type string) (string, *dbox.ConnectionInfo) {
	conf, err := toolkit.ToM(GetDB(db_type))
	if err != nil {
		return "", nil
	}
	var setting toolkit.M
	if conf.Has("setting") {
		for _, val := range conf.Get("setting").(map[string]interface{}) {
			setting, _ = toolkit.ToM(val)
		}
	}
	setting.Set("timeout", 3)

	ci := dbox.ConnectionInfo{
		conf.GetString("host"),
		conf.GetString("db"),
		conf.GetString("user"),
		conf.GetString("pass"),
		setting,
	}

	return conf.GetString("driver"), &ci
}

func prepareconnection(db_type string) (conn dbox.IConnection, err error) {
	driver, ci := new(Login).GetConnectionInfo(db_type)
	conn, err = dbox.NewConnection(driver, ci)
	if err != nil {
		return
	}
	err = conn.Connect()
	return
}

func InitialSetDatabase() error {
	conn_acl, err := prepareconnection(CONF_DB_ACL)
	if err != nil {
		return err
	}

	if err = acl.SetDb(conn_acl); err != nil {
		return err
	}

	conn_godrej, err := prepareconnection(CONF_DB_GDRJ)
	if err != nil {
		return err
	}

	if err := gdrj.SetDb(conn_godrej); err != nil {
		toolkit.Printf("Error set database to efs: %s \n", err.Error())
	}
	return nil
}
