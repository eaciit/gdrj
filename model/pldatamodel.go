package gdrj

import (
	//"errors"
	//"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"time"
	"github.com/eaciit/orm/v1"
)

type PLDataModel struct {
	orm.ModelBase                          `bson:"-" json:"-"`
	ID                                     string `bson:"_id"`
	PC                                     *ProfitCenter
	CC                                     *CostCenter
	CompanyCode                            string
	//LedgerAccount                          string
	Customer                               *Customer
	Product                                *Product
	Date                                   *Date
	Value1, Value2, Value3                 float64
	//EasyForSelect
	PLGroup1, PLGroup2, PLGroup3, PLGroup4 string
	PCID, CCID, OutletID, SKUID, PLCode, PLOrder string
	Month                                        time.Month
	Year                                         int
	Source string
}

// month,year
func (s *PLDataModel) RecordID() interface{} {
	return s.ID
	//return toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
}

func (s *PLDataModel) PrepareID() interface{} {
	return toolkit.Sprintf("%d_%d_%s_%s_%s_%s_%s_%s",
		s.Date.Year, s.Date.Month,
		s.CompanyCode, 
		s.PLCode, s.OutletID, s.SKUID, s.PCID, s.CCID)
}


func (pldm *PLDataModel) TableName() string {
	return "pldatamodels"
}

/*
type AllocationGroup struct {
	ByOutlet, BySKU,
	ByPC, ByCC,
	ByBrand, ByCostType,
	ByFunction bool
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
*/