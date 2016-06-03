package gdrj

import (
	"errors"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
)

type PLDataModel struct {
	LedgerSummary
}

type AllocationGroup struct {
	ByOutlet, BySKU,
	ByPC, ByCC,
	ByBrand, ByCostType,
	ByFunction bool
}

func (pldm *PLDataModel) TableName() string {
	return "pldatamodels"
}

func BuildPLDataModel(conn dbox.IConnection, plcode string, filter *dbox.Filter, ag *AllocationGroup) error {
	pldm := new(PLDataModel)
	ls := new(LedgerSummary)
	_ = pldm
	//--- clear the existing data first
	filterDel := dbox.And(dbox.Eq("plcode", plcode), filter)
	conn.NewQuery().From(ls.TableName()).Where(filterDel).Delete().Exec(nil)

	//--- get all data to be allocated from ledgersummary
	filterSource := dbox.And(dbox.Eq("plcode", plcode), filter)
	csource, esource := conn.NewQuery().From(ls.TableName()).Where(filterSource).Cursor(nil)
	if esource != nil {
		return errors.New("BuildPLDataModel: Preparing Source: " + esource.Error())
	}
	defer csource.Close()

	sourceCount := csource.Count()
	sourceLoop := true
	isource := 0
	for sourceLoop {
		isource++
		msource := toolkit.M{}
		csource.Fetch(&msource, 1, false)
		if !msource.Has("_id") {
			sourceLoop = false
		}
		toolkit.Printfn("Processing %d of %d => %s", isource, sourceCount, toolkit.JsonString(msource))
		// go doBuild(msource, filter, ag)
	}
	return nil
}

/*
func doBuild(msource toolkit.M, filter *dbox.Filter, ag *AllocationGroup){
    //--- get the sales and grouped by required group
    filterSales := dbox.And(dbox.Eq("plcode","PL008A"), filter)
    qsales := conn.NewQuery().From(ls.TableName()).Where(filterSales)
    groupbys := []string{}
    if ag.ByOutlet {
        groupbys = append(groupbys,"outletid")
    }
    if ag.BySKU {
        groupbys = append(groupbys,"skuid")
    }
    if len(groupbys)>0{
        qsales = qsales.Group()
    }
    qsales = qsales.Group(dbox.AggrSum,"value1")
    csales, esales := qsales.Cursor(nil)
    if esales!=nil {
        return errors.New("BuildPLDataModel: " + esales.Error())
    }
    defer csales.Close()

    isneof := true
    for isneof{
        m := toolkit.M{}
        efetch := csales.Fetch(&m, 1, false)
        if !m.Has("_id") {
            isneof=true
            break
        }
    }
}
*/
