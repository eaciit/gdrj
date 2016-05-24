package gocore

import (
	"encoding/json"
	"github.com/eaciit/acl"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"strconv"
	"strings"
)

func GetUser(payload toolkit.M) (toolkit.M, error) {
	var filter *dbox.Filter

	if strings.Contains(toolkit.TypeName(payload["find"]), "float") {
		payload["find"] = toolkit.ToInt(payload["find"], toolkit.RoundingAuto)
	}

	tUser := new(acl.User)
	if find := toolkit.ToString(payload["find"]); find != "" {
		filter = new(dbox.Filter)
		filter = dbox.Or(dbox.Contains("id", find),
			dbox.Contains("fullname", find),
			dbox.Contains("email", find))
	}
	take := toolkit.ToInt(payload["take"], toolkit.RoundingAuto)
	skip := toolkit.ToInt(payload["skip"], toolkit.RoundingAuto)

	c, err := acl.Find(tUser, filter, toolkit.M{}.Set("take", take).Set("skip", skip))
	if err != nil {
		return nil, err
	}

	data := toolkit.M{}
	arrm := make([]toolkit.M, 0, 0)
	if err := c.Fetch(&arrm, 0, false); err != nil {
		return nil, err
	}
	c.Close()

	c, err = acl.Find(tUser, filter, nil)
	if err != nil {
		return nil, err
	}

	data.Set("Datas", arrm)
	data.Set("total", c.Count())

	return data, nil
}
func FindUser(payload toolkit.M) (toolkit.M, error) {
	tUser := new(acl.User)
	result := toolkit.M{}

	if err := acl.FindByID(tUser, payload.GetString("_id")); err != nil {
		return nil, err
	}
	result.Set("tUser", tUser)

	return result, nil
}

func SearchUser(payload toolkit.M) ([]toolkit.M, error) {
	find := payload.GetString("search")
	bfind, err := strconv.ParseBool(find)
	if err != nil {
		return nil, err
	}
	tUser := new(acl.User)
	arrm := make([]toolkit.M, 0, 0)
	filter := dbox.Or(dbox.Contains("_id", find), dbox.Contains("id", find), dbox.Contains("loginid", find),
		dbox.Contains("fullname", find), dbox.Contains("email", find), dbox.Eq("enable", bfind))

	c, e := acl.Find(tUser, filter, toolkit.M{}.Set("take", 0))
	if e != nil {
		return nil, e
	}
	if e := c.Fetch(&arrm, 0, false); e != nil {
		return nil, e
	}

	return arrm, nil
}

func DeleteUser(payload toolkit.M) error {
	tUser := new(acl.User)

	if err := acl.FindByID(tUser, payload.GetString("_id")); err != nil {
		return err
	}

	if err := acl.Delete(tUser); err != nil {
		return err
	}

	return nil
}
func GetAccessUser(payload toolkit.M) ([]interface{}, error) {
	tUser := new(acl.User)

	if err := acl.FindByID(tUser, payload["id"].(string)); err != nil {
		return nil, err
	}
	var AccessGrants = []interface{}{}
	for _, v := range tUser.Grants {
		var access = toolkit.M{}
		access.Set("AccessID", v.AccessID)
		access.Set("AccessValue", acl.Splitinttogrant(int(v.AccessValue)))
		AccessGrants = append(AccessGrants, access)
	}
	return AccessGrants, nil
}
func SaveUser(payload toolkit.M) error {
	user := payload["user"].(map[string]interface{})
	config := payload["userConfig"].(map[string]interface{})

	delete(config, "Username")
	delete(config, "Password")

	groups := user["Groups"]
	var group []string
	for _, v := range groups.([]interface{}) {
		group = append(group, v.(string))
	}
	initUser := new(acl.User)
	id := toolkit.RandomString(32)
	if user["_id"].(string) == "" {
		initUser.ID = id
	} else {
		initUser.ID = user["_id"].(string)
	}
	initUser.LoginID = user["LoginID"].(string)
	initUser.FullName = user["FullName"].(string)
	initUser.Email = user["Email"].(string)
	initUser.Password = user["Password"].(string)
	initUser.Enable = user["Enable"].(bool)
	initUser.Groups = group
	initUser.LoginConf = config

	if user["LoginType"].(string) == "1" {
		initUser.LoginType = acl.LogTypeLdap
	} else if user["LoginType"].(string) == "0" {
		initUser.LoginType = acl.LogTypeBasic
	}

	if err := acl.Save(initUser); err != nil {
		return err
	}
	if user["_id"].(string) == "" {
		if err := acl.ChangePassword(initUser.ID, user["Password"].(string)); err != nil {
			return err
		}
	}

	var grant map[string]interface{}
	for _, p := range payload["grants"].([]interface{}) {
		dat := []byte(p.(string))
		if err := json.Unmarshal(dat, &grant); err != nil {
			return err
		}
		AccessID := grant["AccessID"].(string)
		Accessvalue := grant["AccessValue"]
		for _, v := range Accessvalue.([]interface{}) {
			switch v {
			case "AccessCreate":
				initUser.Grant(AccessID, acl.AccessCreate)
			case "AccessRead":
				initUser.Grant(AccessID, acl.AccessRead)
			case "AccessUpdate":
				initUser.Grant(AccessID, acl.AccessUpdate)
			case "AccessDelete":
				initUser.Grant(AccessID, acl.AccessDelete)
			case "AccessSpecial1":
				initUser.Grant(AccessID, acl.AccessSpecial1)
			case "AccessSpecial2":
				initUser.Grant(AccessID, acl.AccessSpecial2)
			case "AccessSpecial3":
				initUser.Grant(AccessID, acl.AccessSpecial3)
			case "AccessSpecial4":
				initUser.Grant(AccessID, acl.AccessSpecial4)
			}
		}
	}
	if err := acl.Save(initUser); err != nil {
		return err
	}

	return nil
}

func ChangePass(payload toolkit.M) error {
	user := payload["user"].(map[string]interface{})

	if err := acl.ChangePassword(user["_id"].(string), payload["pass"].(string)); err != nil {
		return err
	}
	return nil
}
