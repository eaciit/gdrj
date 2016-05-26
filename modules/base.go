package modules

import (
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/toolkit"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func GetBasePath() string {
	var wd, _ = os.Getwd()
	dir, _ := filepath.Abs(filepath.Join(wd, "..", ".."))
	return dir
}

func GetConfig(config, id string) toolkit.M {
	conn, err := dbox.NewConnection("jsons",
		&dbox.ConnectionInfo{filepath.Join(GetBasePath(), "config"), "", "", "", nil})

	if err != nil {
		return nil
	}

	err = conn.Connect()
	if err != nil {
		return nil
	}

	c, err := conn.NewQuery().Select().From(config).Where(dbox.Eq("_id", id)).Cursor(nil)
	if err != nil {
		return nil
	}

	sdata := toolkit.M{}
	err = c.Fetch(&sdata, 1, false)
	if err != nil {
		return nil
	}
	xdata, _ := toolkit.ToM(sdata.Get("data", toolkit.M{}))
	return xdata
}

func GetConnectionInfo(db_type string) (string, *dbox.ConnectionInfo) {

	conf := GetConfig("databases", db_type)
	if conf == nil {
		return "", nil
	}

	setting := toolkit.M{}
	if conf.Has("setting") {
		for _, val := range conf.Get("setting").(map[string]interface{}) {
			setting, _ = toolkit.ToM(val)
		}
	}

	ci := dbox.ConnectionInfo{
		conf.GetString("host"),
		conf.GetString("db"),
		conf.GetString("user"),
		conf.GetString("pass"),
		setting,
	}

	return conf.GetString("driver"), &ci
}

func GetDboxIConnection(db string) (conn dbox.IConnection, err error) {
	driver, ci := GetConnectionInfo(db)

	conn, err = dbox.NewConnection(driver, ci)

	if err != nil {
		return
	}

	err = conn.Connect()

	return
}

func ToDate(str string) (rt time.Time) {

	F1 := "(^(0[0-9]|[0-9]|(1|2)[0-9]|3[0-1])(\\.|\\/|-)(0[0-9]|[0-9]|1[0-2])(\\.|\\/|-)[\\d]{4}$)"
	F2 := "(^[\\d]{4}(\\.|\\/|-)(0[0-9]|[0-9]|1[0-2])(\\.|\\/|-)(0[0-9]|[0-9]|(1|2)[0-9]|3[0-1])$)"
	if matchF1, _ := regexp.MatchString(F1, str); matchF1 {
		tstr := strings.Replace(str, ".", "/", -1)
		tstr = strings.Replace(str, "-", "/", -1)
		rt = toolkit.String2Date(tstr, "dd/MM/YYYY")
		return
	}

	if matchF2, _ := regexp.MatchString(F2, str); matchF2 {
		tstr := strings.Replace(str, ".", "/", -1)
		tstr = strings.Replace(str, "-", "/", -1)
		rt = toolkit.String2Date(tstr, "YYYY/MM/dd")
		return
	}

	return
}
