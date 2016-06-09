package gdrj

import (
	"errors"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"sort"
	"strings"
	"time"
)

type PLDataModel struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string `bson:"_id" json:"_id"`
	PC            *ProfitCenter
	CC            *CostCenter
	CompanyCode   string
	//LedgerAccount                          string
	Customer               *Customer
	Product                *Product
	Date                   *Date
	Value1, Value2, Value3 float64
	//EasyForSelect
	PLGroup1, PLGroup2, PLGroup3, PLGroup4       string
	PCID, CCID, OutletID, SKUID, PLCode, PLOrder string
	Month                                        int
	Year                                         int
	Source                                       string
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
	addtoexisting bool, save bool) *PLDataModel {
	pldatamodel := new(PLDataModel)
	pldatamodel.CompanyCode = companyid
	pldatamodel.Year = yr
	pldatamodel.Month = month
	pldatamodel.Date = NewDate(yr, month, 1)
	pldatamodel.OutletID = outletid
	pldatamodel.SKUID = skuid
	pldatamodel.PLCode = plcode
	pldatamodel.Source = source
	if addtoexisting {
		existing, e := func() (*PLDataModel, error) {
			existing := new(PLDataModel)
			cur, _ := plconn.NewQuery().From(existing.TableName()).
				Where(dbox.Eq("_id", pldatamodel.RecordID())).
				Cursor(nil)
			defer cur.Close()
			e := cur.Fetch(existing, 1, true)
			return existing, e
		}()
		if e == nil {
			*pldatamodel = *existing
		}
	}
	if custs.Has(pldatamodel.OutletID) {
		pldatamodel.Customer = custs.Get(pldatamodel.OutletID).(*Customer)
	}
	if products.Has(pldatamodel.SKUID) {
		pldatamodel.Product = products.Get(pldatamodel.SKUID).(*Product)
	}
	if pcid == "" && pldatamodel.Customer != nil && pldatamodel.Product != nil {
		pcid = pldatamodel.Customer.BranchID + pldatamodel.Product.BrandCategoryID
	}
	if profitcenters.Has(pcid) {
		pldatamodel.PC = profitcenters.Get(pcid).(*ProfitCenter)
	}
	if ccid != "" && costcenters != nil && costcenters.Has(ccid) {
		pldatamodel.CC = costcenters.Get(ccid).(*CostCenter)
	}
	pldatamodel.PCID = pcid
	pldatamodel.CCID = ccid
	if plmodels.Has(plcode) {
		plm := plmodels.Get(plcode).(PLModel)
		pldatamodel.PLOrder = plm.OrderIndex
		pldatamodel.PLGroup1 = plm.PLHeader1
		pldatamodel.PLGroup2 = plm.PLHeader2
		pldatamodel.PLGroup3 = plm.PLHeader3
	}
	pldatamodel.Value1 += value1
	pldatamodel.Value2 += value2
	pldatamodel.Value3 += value3
	pldatamodel.ID = pldatamodel.PrepareID().(string)
	if save {
		plconn.NewQuery().From(pldatamodel.TableName()).
			Save().Exec(toolkit.M{}.Set("data", pldatamodel))
	}
	return pldatamodel
}

func getDataMapping(value string) (toolkit.M, []string, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(new(PLDataModel).TableName()).Where(dbox.Eq("plcode", "PL08A"))
	q = q.Group("skuid", "date.quartertxt").Aggr(dbox.AggrSum, value, "value")
	c, e := q.Cursor(nil)
	if e != nil {
		return nil, nil, errors.New("Preparing cursor error " + e.Error())
	}
	defer c.Close()
	count := c.Count()

	data := toolkit.Ms{}
	toolkit.Println("preparing to fetch")
	t0 := time.Now()
	e = c.Fetch(&data, 0, false)
	if e != nil {
		return nil, nil, errors.New("Fetch cursor error " + e.Error())
	}
	toolkit.Printfn("Fetching %d data in %s", count, time.Since(t0).String())

	product := toolkit.M{}
	var keys []string
	for _, k := range data {
		_data, _ := toolkit.ToM(k["_id"])
		id := _data.GetString("skuid") + "_" + _data.GetString("date_quartertxt")
		product.Set(id, k["value"])
		keys = append(keys, id)
	}
	toolkit.Printfn("Remapping data in %s", time.Since(t0).String())

	sort.Strings(keys)

	return product, keys, nil

}

func GetIncreasedPrice() (toolkit.Ms, error) {
	product, keys, err := getDataMapping("$value2")
	if err != nil {
		return nil, errors.New("GetIncreasedPrice: Fetch cursor error " + err.Error())
	}

	results := toolkit.Ms{}
	prevSKUID := ""
	var prevVal float64
	var isGreater bool
	var listVal = []float64{}
	var count int
	for _, key := range keys {
		result := toolkit.M{}
		split := strings.Split(key, "_")
		listVal = append(listVal, product.GetFloat64(key))
		if prevSKUID == split[0] {
			if isGreater == true {
				if prevVal < product.GetFloat64(key) && product.GetFloat64(key) != 0 {
					if count == 8 {
						result.Set(split[0], listVal)
						results = append(results, result)
					} else {
						prevVal = product.GetFloat64(key)
					}
				} else {
					isGreater = false
				}
			}
		} else {
			count = 1
			listVal = []float64{}
			listVal = append(listVal, product.GetFloat64(key))
			prevVal = product.GetFloat64(key)
			prevSKUID = split[0]
			isGreater = true
		}
		count++
	}

	return results, nil
}

func GetDecreasedQty() (toolkit.Ms, error) {
	product, keys, err := getDataMapping("$value3")
	if err != nil {
		return nil, errors.New("GetDecreasedSales: Fetch cursor error " + err.Error())
	}

	results := toolkit.Ms{}
	skuidList := []string{}
	prevSKUID := ""
	var prevVal float64
	var isLess bool
	var listVal = []float64{}
	var count int
	for _, key := range keys {
		result := toolkit.M{}
		split := strings.Split(key, "_")
		listVal = append(listVal, product.GetFloat64(key))
		if prevSKUID == split[0] {
			if isLess == true {
				if prevVal > product.GetFloat64(key) && product.GetFloat64(key) != 0 {
					if count == 8 {
						result.Set(split[0], listVal)
						skuidList = append(skuidList, split[0])
						results = append(results, result)
					} else {
						prevVal = product.GetFloat64(key)
					}
				} else {
					isLess = false
				}
			}
		} else {
			if count < 8 && count > 2 {
				for i := toolkit.SliceLen(listVal); i < 8; i++ {
					listVal = append(listVal, 0)
				}
				result.Set(split[0], listVal)
				skuidList = append(skuidList, split[0])
				results = append(results, result)
			}
			count = 1
			listVal = []float64{}
			listVal = append(listVal, product.GetFloat64(key))
			prevVal = product.GetFloat64(key)
			prevSKUID = split[0]
			isLess = true
		}
		count++
	}
	return results, nil
}

func GetOutletID(payload toolkit.M) (toolkit.M, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(new(PLDataModel).TableName()).
		Where(dbox.And(dbox.Eq("plcode", "PL08A"), dbox.Eq("skuid", payload.GetString("skuid"))))
	q = q.Group("date.quartertxt", "outletid")
	c, e := q.Cursor(nil)
	if e != nil {
		return nil, errors.New("GetOutletID: Preparing cursor error " + e.Error())
	}
	defer c.Close()

	data := toolkit.Ms{}
	toolkit.Println("preparing to fetch")
	t0 := time.Now()
	e = c.Fetch(&data, 0, false)
	if e != nil {
		return nil, errors.New("GetOutletID: Fetch cursor error " + e.Error())
	}
	toolkit.Printfn("Fetching %d data in %s", c.Count(), time.Since(t0).String())

	result := toolkit.M{}
	for _, val := range data {
		_data, _ := toolkit.ToM(val["_id"])
		key := _data.GetString("date_quartertxt")
		if result.Has(key) {
			outletList := result[key].([]string)
			outletList = append(outletList, _data.GetString("outletid"))
			result.Set(key, outletList)
		} else {
			result.Set(key, []string{_data.GetString("outletid")})
		}
	}

	return result, nil
}
