package gocore

import (
	"encoding/json"
	"github.com/eaciit/acl"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"strings"
)

func GetGroup() ([]toolkit.M, error) {
	tGroup := new(acl.Group)

	arrm := make([]toolkit.M, 0, 0)
	c, err := acl.Find(tGroup, nil, nil)
	if err != nil {
		return nil, err
	}

	if err := c.Fetch(&arrm, 0, false); err != nil {
		return nil, err
	}

	return arrm, nil

}
func FindGroup(payload toolkit.M) (toolkit.M, error) {
	tGroup := new(acl.Group)
	result := toolkit.M{}

	if err := acl.FindByID(tGroup, payload.GetString("_id")); err != nil {
		return nil, err
	}
	result.Set("tGroup", tGroup)

	return result, nil

}

func SearchGroup(payload toolkit.M) (toolkit.M, error) {
	var filter *dbox.Filter

	if strings.Contains(toolkit.TypeName(payload["search"]), "float") {
		payload["search"] = toolkit.ToInt(payload["search"], toolkit.RoundingAuto)
	}

	tGroup := new(acl.Group)
	if search := toolkit.ToString(payload["search"]); search != "" {
		filter = new(dbox.Filter)
		filter = dbox.Or(dbox.Contains("_id", search), dbox.Contains("title", search), dbox.Contains("owner", search))

	}
	take := toolkit.ToInt(payload["take"], toolkit.RoundingAuto)
	skip := toolkit.ToInt(payload["skip"], toolkit.RoundingAuto)

	c, err := acl.Find(tGroup, filter, toolkit.M{}.Set("take", take).Set("skip", skip))
	if err != nil {
		return nil, err
	}

	data := toolkit.M{}
	arrm := make([]toolkit.M, 0, 0)
	if err := c.Fetch(&arrm, 0, false); err != nil {
		return nil, err
	}

	data.Set("Datas", arrm)
	data.Set("total", c.Count())

	return data, nil

}

func GetAccessGroup(payload toolkit.M) ([]interface{}, error) {
	tGroup := new(acl.Group)

	if err := acl.FindByID(tGroup, payload.GetString("idGroup")); err != nil {
		return nil, err
	}
	var AccessGrants = []interface{}{}
	for _, v := range tGroup.Grants {
		var access = toolkit.M{}
		access.Set("AccessID", v.AccessID)
		access.Set("AccessValue", acl.Splitinttogrant(int(v.AccessValue)))
		AccessGrants = append(AccessGrants, access)
	}

	return AccessGrants, nil
}

func DeleteGroup(payload toolkit.M) error {
	tGroup := new(acl.Group)

	if err := acl.FindByID(tGroup, payload["_id"].(string)); err != nil {
		return err
	}

	if err := acl.Delete(tGroup); err != nil {
		return err
	}

	return nil
}

func SaveGroup(payload toolkit.M) error {
	g := payload["group"].(map[string]interface{})
	config := payload["groupConfig"].(map[string]interface{})
	memberConf, _ := toolkit.ToM(config)

	if g["GroupType"].(string) == "1" {
		memberConf.Set("filter", "("+g["Filter"].(string)+")").
			Set("attributes", []string{g["LoginID"].(string), g["Fullname"].(string), g["Email"].(string)}).
			Set("mapattributes", toolkit.M{}.Set("LoginID", g["LoginID"].(string)).
			Set("FullName", g["Fullname"].(string)).
			Set("Email", g["Email"].(string)))

		if err := acl.AddUserLdapByGroup(g["_id"].(string), memberConf); err != nil {
			return err
		}
		delete(config, "password")
		delete(memberConf, "password")
	}

	initGroup := new(acl.Group)
	initGroup.ID = g["_id"].(string)
	initGroup.Title = g["Title"].(string)
	initGroup.Owner = g["Owner"].(string)
	initGroup.Enable = g["Enable"].(bool)
	initGroup.GroupConf = config
	initGroup.MemberConf = memberConf

	if g["GroupType"].(string) == "1" {
		initGroup.GroupType = acl.GroupTypeLdap
	} else if g["GroupType"].(string) == "0" {
		initGroup.GroupType = acl.GroupTypeBasic
	}

	if err := acl.Save(initGroup); err != nil {
		return err
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
				initGroup.Grant(AccessID, acl.AccessCreate)
			case "AccessRead":
				initGroup.Grant(AccessID, acl.AccessRead)
			case "AccessUpdate":
				initGroup.Grant(AccessID, acl.AccessUpdate)
			case "AccessDelete":
				initGroup.Grant(AccessID, acl.AccessDelete)
			case "AccessSpecial1":
				initGroup.Grant(AccessID, acl.AccessSpecial1)
			case "AccessSpecial2":
				initGroup.Grant(AccessID, acl.AccessSpecial2)
			case "AccessSpecial3":
				initGroup.Grant(AccessID, acl.AccessSpecial3)
			case "AccessSpecial4":
				initGroup.Grant(AccessID, acl.AccessSpecial4)
			}
		}
	}

	if err := acl.Save(initGroup); err != nil {
		return err
	}

	return nil
}
