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

var (
	totalQuarter int = 4
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

func getDataComp(payload *CompFinderParam) (toolkit.Ms, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(payload.Tablename).Where(payload.parseFilter())
	/*q := conn.NewQuery().From(new(SalesPL).TableName()).Group("skuid", "date.quartertxt")
	q = q.Aggr(dbox.AggrSum, "$salesqty", "qty").Aggr(dbox.AggrSum, "$pldatas.PL8A.amount", "amount").
		Aggr(dbox.AggrSum, 1, "outlet")*/
	c, e := q.Cursor(nil)
	if e != nil {
		return nil, errors.New("Preparing cursor error " + e.Error())
	}
	defer c.Close()

	data := toolkit.Ms{}
	toolkit.Println("preparing to fetch")
	t0 := time.Now()
	e = c.Fetch(&data, 0, false)
	if e != nil {
		return nil, errors.New("Fetch cursor error " + e.Error())
	}
	toolkit.Printfn("Fetching %d data in %s", len(data), time.Since(t0).String())

	return data, nil

}

func sortKey(data toolkit.Ms, tipe string) (toolkit.M, []string) {
	value := toolkit.M{}
	var keys []string
	for _, k := range data {
		_data, _ := toolkit.ToM(k["_id"])
		id := _data.GetString("skuid") + "_" + _data.GetString("date_quartertxt")
		if tipe == "price" {
			var price float64
			if k.GetFloat64("qty") == 0 {
				price = 0
			} else {
				price = k.GetFloat64("amount") / k.GetFloat64("qty")
			}
			if value.Has(id) {
				value.Set(id, value.GetFloat64(id)+price)
			} else {
				value.Set(id, price)
			}
		} else if tipe == "qty" {
			if value.Has(id) {
				value.Set(id, value.GetFloat64(id)+toolkit.ToFloat64(k["qty"], 6, toolkit.RoundingAuto))
			} else {
				value.Set(id, k["qty"])
			}
		} else if tipe == "outlet" {
			if value.Has(id) {
				value.Set(id, value.GetFloat64(id)+toolkit.ToFloat64(k["outlet"], 6, toolkit.RoundingAuto))
			} else {
				value.Set(id, k["outlet"])
			}
		}
		keys = append(keys, id)
	}
	sort.Strings(keys)

	return value, keys
}

func dataRemap(value toolkit.M, keys []string) (toolkit.M, toolkit.M) {
	valueList := toolkit.M{}
	valueCount := toolkit.M{}
	prevSKUID := ""
	var listVal = []float64{}
	var count int
	for i, key := range keys {
		split := strings.Split(key, "_")
		if i == 0 {
			prevSKUID = split[0]
		}
		listVal = append(listVal, value.GetFloat64(key))
		if prevSKUID == split[0] {
			if count == totalQuarter {
				valueList.Set(prevSKUID, listVal)
				valueCount.Set(prevSKUID, count)
			}
		} else {
			if prevSKUID != split[0] {
				if count < totalQuarter && count > 1 {
					listVal[toolkit.SliceLen(listVal)-1] = 0
					for i := toolkit.SliceLen(listVal); i < totalQuarter; i++ {
						listVal = append(listVal, 0)
					}
					valueList.Set(prevSKUID, listVal)
					valueCount.Set(prevSKUID, count-1)
				}
			}
			count = 1
			listVal = []float64{}
			listVal = append(listVal, value.GetFloat64(key))
			prevSKUID = split[0]
		}
		count++
	}

	return valueList, valueCount
}

func GetDecreasedQty(payload *CompFinderParam) (toolkit.Ms, error) {
	data, err := getDataComp(payload)
	if err != nil {
		return nil, errors.New("GetDecreasedQty: Fetch cursor error " + err.Error())
	}

	priceVal, priceKeys := sortKey(data, "price")
	outletVal, outletKeys := sortKey(data, "outlet")
	product, keys := sortKey(data, "qty")

	priceList, priceCount := dataRemap(priceVal, priceKeys)
	outletList, outletCount := dataRemap(outletVal, outletKeys)

	productList := toolkit.M{}
	prevSKUID := ""
	var prevVal float64
	var isLess bool
	var listVal = []float64{}
	var count int
	qtyCount := toolkit.M{}
	for i, key := range keys {
		split := strings.Split(key, "_")
		if i == 0 {
			prevSKUID = split[0]
		}
		listVal = append(listVal, product.GetFloat64(key))
		if prevSKUID == split[0] {
			if isLess == true {
				if prevVal > product.GetFloat64(key) && product.GetFloat64(key) != 0 && prevVal != 0 {
					if count == totalQuarter {
						productList.Set(prevSKUID, listVal)
						qtyCount.Set(prevSKUID, count)
					} else {
						prevVal = product.GetFloat64(key)
					}
				} else {
					isLess = false
				}
			}
		} else {
			if (count < totalQuarter && count > 1) && isLess {
				listVal[toolkit.SliceLen(listVal)-1] = 0
				for i := toolkit.SliceLen(listVal); i < totalQuarter; i++ {
					listVal = append(listVal, 0)
					qtyCount.Set(prevSKUID, count-1)
				}
				productList.Set(prevSKUID, listVal)
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

	prods := toolkit.M{}
	prod := new(Product)
	cprod, err := Find(prod, nil, nil)
	if err != nil {
		return nil, errors.New("GetOutletList: Fetch cursor error " + err.Error())
	}
	defer cprod.Close()
	for err = cprod.Fetch(prod, 1, false); err == nil; {
		prods.Set(prod.ID, prod.Name)
		prod = new(Product)
		err = cprod.Fetch(prod, 1, false)
	}

	results := toolkit.Ms{}
	for key := range productList {
		result := toolkit.M{}
		result.Set("skuid", key)
		result.Set("productName", prods.GetString(key))
		result.Set("qty", productList[key])
		result.Set("qtyCount", qtyCount[key])
		result.Set("price", priceList[key])
		result.Set("priceCount", priceCount[key])
		result.Set("outletList", outletList[key])
		result.Set("outletCount", outletCount[key])
		results = append(results, result)
	}

	_results := results
	results = toolkit.Ms{}

	for index := totalQuarter; index >= 0; index-- {
		for _, val := range _results {
			if val.GetInt("qtyCount") == index {
				results = append(results, val)
			}
		}
	}

	return results, nil
}
