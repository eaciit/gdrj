package controller

import (
	"eaciit/gdrj/model"
	"sort"
	"strings"

	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/toolkit"
)

type GrowthController struct {
	App
}

type GrowthParm struct {
	BreakDown string
}

func (c *GrowthController) GetGrowthData(r *knot.WebContext) interface{} {
	result := toolkit.NewResult()
	r.Config.OutputType = knot.OutputJson

	gparm := new(GrowthParm)
	if eparm := r.GetPayload(gparm); eparm != nil {
		return result.SetErrorTxt(toolkit.Sprintf("Payload: " + eparm.Error()))
	}

	filters := []string{"date_fiscal"}
	filters = append(filters, gparm.BreakDown)
	sort.Strings(filters)
	tablename := "pl_" + strings.Join(filters, "_")

	groupDatas := map[string]toolkit.M{}

	cursor, _ := gdrj.DB().Connection.NewQuery().From(tablename).Select().Cursor(nil)
	for {
		mr := new(toolkit.M)
		if ef := cursor.Fetch(mr, 1, false); ef != nil {
			break
		}
		key := mr.Get("key", toolkit.M{}).(toolkit.M)
		fiscal := key.GetString("date_fiscal")
		breakdown := key.GetString(gparm.BreakDown)
		fiscal_breakdown := fiscal + "_" + breakdown
		groupData := groupDatas[fiscal_breakdown]
		if groupData == nil {
			groupData = toolkit.M{}
		}
		groupData.Set("fiscal", fiscal)
		groupData.Set("breakdown", breakdown)
		groupDatas[fiscal_breakdown] = groupData
	}
	return result
}
