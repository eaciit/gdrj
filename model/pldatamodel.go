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

func getData(q dbox.IQuery) (toolkit.Ms, error) {
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
	toolkit.Printfn("Fetching %d data in %s", toolkit.SliceLen(data), time.Since(t0).String())

	return data, nil

}

func dataRemap(data toolkit.Ms, tipe string) (toolkit.M, toolkit.M) {
	value := toolkit.M{}
	var keys []string
	for _, k := range data {
		_data, _ := toolkit.ToM(k["_id"])
		id := _data.GetString("skuid") + "_" + _data.GetString("date_quartertxt")
		if tipe == "price" {
			price := k.GetFloat64("amount") / k.GetFloat64("qty")
			value.Set(id, price)
		} else {
			value.Set(id, k["value"])
		}
		keys = append(keys, id)
	}
	sort.Strings(keys)

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
			if count == 8 {
				valueList.Set(split[0], listVal)
				valueCount.Set(split[0], count)
			}
		} else {
			if prevSKUID != split[0] {
				if count < 8 && count > 1 {
					for i := toolkit.SliceLen(listVal); i < 8; i++ {
						listVal = append(listVal, 0)
					}
					valueList.Set(split[0], listVal)
					valueCount.Set(split[0], count)
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

func getPriceList(productList toolkit.M, qtyCount toolkit.M) (toolkit.Ms, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(new(SalesPL).TableName()).Group("skuid", "date.quartertxt")
	q = q.Aggr(dbox.AggrSum, "$salesqty", "qty").Aggr(dbox.AggrSum, "$pldatas.PL8A.amount", "amount")
	data, err := getData(q)

	if err != nil {
		return nil, errors.New("GetPriceList: Fetch cursor error " + err.Error())
	}

	priceList, priceCount := dataRemap(data, "price")

	results, err := getOutletList(productList, qtyCount, priceList, priceCount)
	if err != nil {
		return nil, errors.New("GetPriceList: " + err.Error())
	}

	return results, nil
}

func getOutletList(productList, qtyCount, priceList, priceCount toolkit.M) (toolkit.Ms, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(new(SalesPL).TableName()).Where(dbox.Ne("pldatas.PL8A", nil))
	q = q.Group("skuid", "date.quartertxt").Aggr(dbox.AggrSum, 1, "value")
	data, err := getData(q)
	if err != nil {
		return nil, errors.New("GetOutletList: Fetch cursor error " + err.Error())
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
	outletList, outletCount := dataRemap(data, "outlet")

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

	return results, nil
}

func GetDecreasedQty() (toolkit.Ms, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(new(SalesPL).TableName()).Where(dbox.Ne("pldatas.PL8A", nil))
	q = q.Group("skuid", "date.quartertxt").Aggr(dbox.AggrSum, "$salesqty", "value")
	data, err := getData(q)
	if err != nil {
		return nil, errors.New("GetDecreasedQty: Fetch cursor error " + err.Error())
	}

	product := toolkit.M{}
	var keys []string
	for _, k := range data {
		_data, _ := toolkit.ToM(k["_id"])
		id := _data.GetString("skuid") + "_" + _data.GetString("date_quartertxt")
		product.Set(id, k["value"])
		keys = append(keys, id)
	}

	sort.Strings(keys)

	result := toolkit.M{}
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
					if count == 8 {
						result.Set(split[0], listVal)
						qtyCount.Set(split[0], count)
					} else {
						prevVal = product.GetFloat64(key)
					}
				} else {
					isLess = false
				}
			}
		} else {
			if count < 8 && count > 1 {
				for i := toolkit.SliceLen(listVal); i < 8; i++ {
					listVal = append(listVal, 0)
					qtyCount.Set(split[0], count)
				}
				result.Set(split[0], listVal)
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

	results, err := getPriceList(result, qtyCount)
	if err != nil {
		return nil, errors.New("GetDecreasedQty: " + err.Error())
	}

	return results, nil
}
