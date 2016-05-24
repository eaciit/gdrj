package gocore

import (
	"github.com/eaciit/acl"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"strconv"
	"strings"
)

func GetAccess(payload toolkit.M) (toolkit.M, error) {
	var filter *dbox.Filter

	if strings.Contains(toolkit.TypeName(payload["find"]), "float") {
		payload["find"] = toolkit.ToInt(payload["find"], toolkit.RoundingAuto)
	}

	tAccess := new(acl.Access)
	if find := toolkit.ToString(payload["find"]); find != "" {
		filter = new(dbox.Filter)
		filter = dbox.Or(dbox.Contains("id", find),
			dbox.Contains("title", find),
			dbox.Contains("group1", find),
			dbox.Contains("group2", find),
			dbox.Contains("group3", find),
			dbox.Contains("specialaccess1", find),
			dbox.Contains("specialaccess2", find),
			dbox.Contains("specialaccess3", find),
			dbox.Contains("specialaccess4", find))
	}

	data := toolkit.M{}
	arrm := make([]toolkit.M, 0, 0)

	take := toolkit.ToInt(payload["take"], toolkit.RoundingAuto)
	skip := toolkit.ToInt(payload["skip"], toolkit.RoundingAuto)

	c, err := acl.Find(tAccess, filter, toolkit.M{}.Set("take", take).Set("skip", skip))
	if err != nil {
		return nil, err
	}

	if err := c.Fetch(&arrm, 0, false); err != nil {
		return nil, err
	}

	c.Close()

	c, err = acl.Find(tAccess, filter, nil)
	if err != nil {
		return nil, err
	}

	data.Set("Datas", arrm)
	data.Set("total", c.Count())

	return data, nil

}

func Getaccessdropdown() ([]toolkit.M, error) {
	tAccess := new(acl.Access)

	arrm := make([]toolkit.M, 0, 0)
	c, err := acl.Find(tAccess, nil, nil)
	if err != nil {
		return nil, err
	}
	if err := c.Fetch(&arrm, 0, false); err != nil {
		return nil, err
	}

	return arrm, nil
}

func FindAccess(payload toolkit.M) (toolkit.M, error) {
	tAccess := new(acl.Access)
	result := toolkit.M{}

	if err := acl.FindByID(tAccess, payload.GetString("_id")); err != nil {
		return nil, err
	}
	result.Set("tAccess", tAccess)

	return result, nil
}

func SearchAccess(payload toolkit.M) ([]toolkit.M, error) {
	find := payload.GetString("search")
	bfind, err := strconv.ParseBool(find)
	if err != nil {
		return nil, err
	}
	tAccess := new(acl.Access)
	arrm := make([]toolkit.M, 0, 0)
	filter := dbox.Or(dbox.Contains("_id", find), dbox.Contains("id", find), dbox.Contains("title", find), dbox.Contains("group1", find),
		dbox.Contains("group2", find), dbox.Contains("group3", find), dbox.Contains("specialaccess1", find), dbox.Contains("specialaccess2", find),
		dbox.Contains("specialaccess3", find), dbox.Contains("specialaccess4", find), dbox.Eq("enable", bfind))
	c, e := acl.Find(tAccess, filter, nil)
	if e != nil {
		return nil, e
	}
	if e := c.Fetch(&arrm, 0, false); e != nil {
		return nil, e
	}

	return arrm, nil
}

func DeleteAccess(payload toolkit.M) error {
	tAccess := new(acl.Access)

	if err := acl.FindByID(tAccess, payload.GetString("_id")); err != nil {
		return err
	}

	if err := acl.Delete(tAccess); err != nil {
		return err
	}

	return nil
}

func SaveAccess(payload toolkit.M) error {

	initAccess := new(acl.Access)
	initAccess.ID = payload.GetString("_id")
	initAccess.Title = payload.GetString("Title")
	initAccess.Group1 = payload.GetString("Group1")
	initAccess.Group2 = payload.GetString("Group2")
	initAccess.Group3 = payload.GetString("Group3")
	initAccess.Enable = payload["Enable"].(bool)
	initAccess.SpecialAccess1 = payload.GetString("SpecialAccess1")
	initAccess.SpecialAccess2 = payload.GetString("SpecialAccess2")
	initAccess.SpecialAccess3 = payload.GetString("SpecialAccess3")
	initAccess.SpecialAccess4 = payload.GetString("SpecialAccess4")

	if err := acl.Save(initAccess); err != nil {
		return err
	}

	return nil
}
