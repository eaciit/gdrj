package gdrj

import (
	//"errors"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	//"time"
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
	Month                                        int
	Year                                         int
	Source string
}

// month,year
func (s *PLDataModel) RecordID() interface{} {
	return s.PrepareID()
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


func GetPLModel(plcode, companyid string, 
		yr, month int, outletid, skuid, pcid, ccid string, 
		value1, value2, value3 float64, 
		source string,
		plconn dbox.IConnection, 
		custs, products, profitcenters, costcenters, plmodels toolkit.M,
		addtoexisting bool, save bool) *PLDataModel{
			pldatamodel := new(PLDataModel)
			pldatamodel.CompanyCode = companyid
			pldatamodel.Year = yr
			pldatamodel.Month = month
			pldatamodel.Date = NewDate(yr,month,1)
			pldatamodel.OutletID = outletid
			pldatamodel.SKUID = skuid
			pldatamodel.PLCode = plcode
			pldatamodel.Source = source
			if addtoexisting{
				existing, e := func()(*PLDataModel, error){
					existing := new(PLDataModel)
					cur,_ := plconn.NewQuery().From(existing.TableName()).
						Where(dbox.Eq("_id", pldatamodel.RecordID())).
						Cursor(nil)
					defer cur.Close()
					e:=cur.Fetch(existing,1,true)
					return existing, e
				}()
				if e==nil {
					*pldatamodel=*existing
				}
			}
			if custs.Has(pldatamodel.OutletID){
				pldatamodel.Customer=custs.Get(pldatamodel.OutletID).(*Customer)
			}
			if products.Has(pldatamodel.SKUID){
				pldatamodel.Product=products.Get(pldatamodel.SKUID).(*Product)
			}
			if pcid=="" && pldatamodel.Customer!=nil && pldatamodel.Product!=nil {
				pcid = pldatamodel.Customer.BranchID + pldatamodel.Product.BrandCategoryID
			}
			if profitcenters.Has(pcid){
				pldatamodel.PC=profitcenters.Get(pcid).(*ProfitCenter)
			}
			if ccid!="" && costcenters!=nil && costcenters.Has(ccid){
				pldatamodel.CC=costcenters.Get(ccid).(*CostCenter)
			}
			pldatamodel.PCID=pcid
			pldatamodel.CCID=ccid
			if plmodels.Has(plcode){
				plm:=plmodels.Get(plcode).(PLModel)
				pldatamodel.PLOrder=plm.OrderIndex
				pldatamodel.PLGroup1=plm.PLHeader1
				pldatamodel.PLGroup2=plm.PLHeader2
				pldatamodel.PLGroup3=plm.PLHeader3
			}
			pldatamodel.Value1 +=pldatamodel.Value1
			pldatamodel.Value2 +=pldatamodel.Value2
			pldatamodel.Value3 +=pldatamodel.Value3
			if save {
				plconn.NewQuery().From(pldatamodel.TableName()).
					Save().Exec(toolkit.M{}.Set("data",pldatamodel))
			}
			return pldatamodel
}
