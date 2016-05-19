package gdrj

import (
	"errors"
	"github.com/eaciit/acl"
	"github.com/eaciit/dbox"
	"github.com/eaciit/efs"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"gopkg.in/gomail.v2"
)

type Login struct {
	orm.ModelBase
	ID       string `json:"_id",bson:"_id"`
	Password string
	Salt     string
}

func (l *Login) TableName() string {
	return "logins"
}

func (l *Login) RecordID() interface{} {
	return l.ID
}

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

	conn_efs, err := prepareconnection(CONF_DB_GDRJ)
	if err != nil {
		return err
	}

	if err := efs.SetDb(conn_efs); err != nil {
		toolkit.Printf("Error set database to efs: %s \n", err.Error())
	}
	return nil
}

func (l *Login) ResetPassword(payload toolkit.M) error {
	if !payload.Has("email") || !payload.Has("baseurl") {
		errors.New("Data is not complete")
	}

	uname, tokenid, err := acl.ResetPassword(toolkit.ToString(payload["email"]))

	if err != nil {
		err.Error()
	}

	linkstr := toolkit.Sprintf("<a href='%v/web/confirmreset?1=%v&2=%v'>Click</a>", toolkit.ToString(payload["baseurl"]), uname, tokenid)

	mailmsg := toolkit.Sprintf("Hi, <br/><br/> We received a request to reset your password, <br/><br/>")
	mailmsg = toolkit.Sprintf("%vFollow the link below to set a new password : <br/><br/> %v <br/><br/>", mailmsg, linkstr)
	mailmsg = toolkit.Sprintf("%vIf you don't want to change your password, you can ignore this email <br/><br/> Thanks,</body></html>", mailmsg)

	m := gomail.NewMessage()

	m.SetHeader("From", "admin.support@eaciit.com")
	m.SetHeader("To", toolkit.ToString(payload["email"]))

	m.SetHeader("Subject", "[no-reply] Self password reset")
	m.SetBody("text/html", mailmsg)

	d := gomail.NewPlainDialer("smtp.office365.com", 587, "admin.support@eaciit.com", "******")
	err = d.DialAndSend(m)

	if err != nil {
		return err
	}

	return nil
}

func (l *Login) SavePassword(payload toolkit.M) error {
	if !payload.Has("newpassword") || !payload.Has("userid") {
		return errors.New("Data is not complete")
	}

	switch {
	case payload.Has("tokenid"):
		acl.ChangePasswordToken(toolkit.ToString(payload["userid"]), toolkit.ToString(payload["newpassword"]), toolkit.ToString(payload["tokenid"]))
	default:
		// check sessionid first
		savedsessionid := "" //change with get session
		//=======================
		userid, err := acl.FindUserBySessionID(savedsessionid)
		if err == nil && userid == toolkit.ToString(payload["userid"]) {
			err = acl.ChangePassword(toolkit.ToString(payload["userid"]), toolkit.ToString(payload["newpassword"]))
		} else if err == nil {
			err = errors.New("Userid is not match")
		}
	}

	return nil
}

func (l *Login) Authenticate(payload toolkit.M) (toolkit.M, error) {
	var iaccenum acl.AccessTypeEnum
	result := toolkit.M{}
	result.Set("hasaccess", false)

	switch toolkit.TypeName(payload["accesscheck"]) {
	case "[]interface {}":
		for _, val := range payload["accesscheck"].([]interface{}) {
			tacc := acl.GetAccessEnum(toolkit.ToString(val))
			if !acl.Matchaccess(int(tacc), int(iaccenum)) {
				iaccenum += tacc
			}
		}
	default:
		iaccenum = acl.GetAccessEnum(toolkit.ToString(payload["accesscheck"]))
	}

	found := acl.HasAccess(toolkit.ToString(payload["sessionid"]),
		acl.IDTypeSession,
		toolkit.ToString(payload["accessid"]),
		iaccenum)

	if found {
		result.Set("hasaccess", found)
	}

	return result, nil
}

func PrepareDefaultUser() (err error) {
	username := GetConfig("default_username", "").(string)
	password := GetConfig("default_password", "").(string)

	user := new(acl.User)
	filter := dbox.Contains("loginid", username)
	c, err := acl.Find(user, filter, nil)

	if err != nil {
		return
	}

	if c.Count() == 0 {
		user.ID = toolkit.RandomString(32)
		user.LoginID = username
		user.FullName = username
		user.Password = password
		user.Enable = true

		err = acl.Save(user)
		if err != nil {
			return
		}
		err = acl.ChangePassword(user.ID, password)
		if err != nil {
			return
		}

		toolkit.Printf(`Default user "%s" with standard password has been created%s`, username, "\n")
	}

	return
}

func (l *Login) LoginProcess(payload toolkit.M) (string, error) {
	switch {
	case !payload.Has("username") || !payload.Has("password"):
		return "", errors.New("username or password not found")
	case payload.Has("username") && len(toolkit.ToString(payload["username"])) == 0:
		return "", errors.New("username cannot be empty")
	case payload.Has("password") && len(toolkit.ToString(payload["password"])) == 0:
		return "", errors.New("password cannot be empty")
	}

	sessid, err := acl.Login(toolkit.ToString(payload["username"]), toolkit.ToString(payload["password"]))
	if err != nil {
		return "", err
	}

	return sessid, nil
}
