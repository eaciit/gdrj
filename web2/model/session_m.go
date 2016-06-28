package gocore

import (
	"github.com/eaciit/acl"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"time"
)

func GetSession(payload toolkit.M) (toolkit.M, error) {
	var filter *dbox.Filter

	tSession := new(acl.Session)
	if find := toolkit.ToString(payload["search"]); find != "" {
		filter = new(dbox.Filter)
		filter = dbox.Contains("loginid", find)
	}
	take := toolkit.ToInt(payload["take"], toolkit.RoundingAuto)
	skip := toolkit.ToInt(payload["skip"], toolkit.RoundingAuto)

	c, err := acl.Find(tSession, filter, toolkit.M{}.Set("take", take).Set("skip", skip))
	if err != nil {
		return nil, err
	}

	data := toolkit.M{}
	arrm := make([]toolkit.M, 0, 0)
	if err := c.Fetch(&arrm, 0, false); err != nil {
		return nil, err
	}
	for i, val := range arrm {
		arrm[i].Set("duration", time.Since(val["created"].(time.Time)).Hours())
		arrm[i].Set("status", "ACTIVE")
		if val["expired"].(time.Time).Before(time.Now().UTC()) {
			arrm[i].Set("duration", val["expired"].(time.Time).Sub(val["created"].(time.Time)).Hours())
			arrm[i].Set("status", "EXPIRED")
		}
	}
	c.Close()

	c, err = acl.Find(tSession, filter, nil)
	if err != nil {
		return nil, err
	}

	data.Set("Datas", arrm)
	data.Set("total", c.Count())

	return data, nil

}

func SetExpired(payload toolkit.M) error {
	tSession := new(acl.Session)
	if err := acl.FindByID(tSession, payload.GetString("_id")); err != nil {
		return err
	}

	tSession.Expired = time.Now().UTC()

	if err := acl.Save(tSession); err != nil {
		return err
	}

	return nil
}
