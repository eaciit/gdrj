package gdrj

import (
	"errors"
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
	"time"
)

type LedgerSummary struct {
	orm.ModelBase          `bson:"-" json:"-"`
	ID                     string `bson:"_id"`
	PC                     *ProfitCenter
	CC                     *CostCenter
	CompanyCode            string
	LedgerAccount          string
	Customer               *Customer
	Product                *Product
	Date                   *Date
	Value1, Value2, Value3 float64
}

func (s *LedgerSummary) RecordID() interface{} {
	return s.ID
	//return toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
}

func (s *LedgerSummary) PrepareID() interface{} {
	s.ID = toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
	return s
}

func (s *LedgerSummary) TableName() string {
	return "ledgersummaries"
}

func SummaryGenerateDummyData() []*LedgerSummary {
	res := []*LedgerSummary{}
	pcs := []*ProfitCenter{}
	ccs := []*CostCenter{}
	cus := []*Customer{}
	prs := []*Product{}
	das := []*Date{}

	for i := 0; i < 5; i++ {
		pc := new(ProfitCenter)
		pc.ID = fmt.Sprintf("PC00%d", i)
		pc.EntityID = toolkit.RandomString(5)
		pc.Name = toolkit.RandomString(10)
		pc.BrandID = toolkit.RandomString(5)
		pc.BrandCategoryID = toolkit.RandomString(5)
		pc.BranchID = toolkit.RandomString(5)
		pc.BranchType = BranchTypeEnum(toolkit.RandInt(100))
		pcs = append(pcs, pc)

		cc := new(CostCenter)
		cc.ID = fmt.Sprintf("CC00%d", i)
		cc.EntityID = toolkit.RandomString(5)
		cc.Name = toolkit.RandomString(10)
		cc.CostGroup01 = toolkit.RandomString(5)
		cc.CostGroup02 = toolkit.RandomString(5)
		cc.CostGroup03 = toolkit.RandomString(5)
		cc.BranchID = toolkit.RandomString(5)
		cc.BranchType = BranchTypeEnum(toolkit.RandInt(100))
		cc.CCTypeID = toolkit.RandomString(5)
		cc.HCCGroupID = toolkit.RandomString(5)
		ccs = append(ccs, cc)

		cu := new(Customer)
		cu.ID = toolkit.RandomString(5)
		cu.CustomerID = toolkit.RandomString(5)
		cu.Plant = toolkit.RandomString(5)
		cu.Name = toolkit.RandomString(5)
		cu.KeyAccount = toolkit.RandomString(5)
		cu.Channel = toolkit.RandomString(5)
		cu.Group = toolkit.RandomString(5)
		cu.National = toolkit.RandomString(5)
		cu.Zone = toolkit.RandomString(5)
		cu.Region = toolkit.RandomString(5)
		cu.Area = toolkit.RandomString(5)
		cus = append(cus, cu)

		pr := new(Product)
		pr.ID = toolkit.RandomString(5)
		pr.Name = toolkit.RandomString(5)
		pr.Config = toolkit.RandomString(5)
		pr.Brand = toolkit.RandomString(5)
		pr.LongName = toolkit.RandomString(5)
		prs = append(prs, pr)

		da := new(Date)
		da.ID = toolkit.RandomString(5)
		da.Date = time.Now()
		da.Month = time.Month(5)
		da.Quarter = toolkit.RandInt(100)
		da.Year = toolkit.RandInt(100)
		das = append(das, da)
	}

	for i := 0; i < 100; i++ {
		o := new(LedgerSummary)
		o.ID = fmt.Sprintf("LS00%d", i)
		o.PC = pcs[i%len(pcs)]
		o.CC = ccs[i%len(ccs)]
		o.CompanyCode = toolkit.RandomString(3)
		o.LedgerAccount = toolkit.RandomString(3)
		o.Customer = cus[i%len(cus)]
		o.Product = prs[i%len(prs)]
		o.Date = das[i%len(das)]
		o.Value1 = toolkit.RandFloat(3000, 2)
		o.Value2 = toolkit.RandFloat(3000, 2)
		o.Value3 = toolkit.RandFloat(3000, 2)
		o.Save()

		res = append(res, o)
	}

	return res
}

/*
[
    {_id:{col1:"D1",col2:"D2",col3:"D3"},SalesAmount:10,Qty:5,Value:2},
    {_id:{col1:"D1",col2:"D2",col3:"D4"},SalesAmount:10,Qty:3.2,Value:3},
]
row: _id.col1, _id.col2
col: _id.col3
*/
func SummarizeLedgerSum(
	filter *dbox.Filter,
	columns []string,
	datapoints []string,
	// misal: ["sum:Value1:SalesAmount","sum:Value2:Qty","avg:Value3"]
	fnTransform func(m *toolkit.M) error) ([]toolkit.M, error) {
	sum := new(LedgerSummary)
	conn := DB().Connection
	q := conn.NewQuery().From(sum.TableName())
	if filter != nil {
		q = q.Where(filter)
	}
	if len(columns) > 0 {
		cs := []string{}
		for i := range columns {
			cs = append(cs, strings.ToLower(columns[i]))
		}

		q = q.Group(cs...)
	}
	if len(datapoints) == 0 {
		return nil, errors.New("SummarizedLedgerSum: Datapoints should be defined at least 1")
	}
	for _, dp := range datapoints {
		dps := strings.Split(strings.ToLower(dp), ":")
		if len(dps) < 2 {
			return nil, errors.New("SummarizeLedgerSum: Parameters should follow this pattern aggrOp:fieldName:[alias - optional]")
		}

		fieldid := dps[1]
		alias := fieldid
		op := ""
		if !strings.HasPrefix(dps[0], "$") {
			dps[0] = "$" + strings.ToLower(dps[0])
		}

		if toolkit.HasMember([]string{dbox.AggrSum, dbox.AggrAvr, dbox.AggrMax,
			dbox.AggrMin, dbox.AggrMean, dbox.AggrMed}, dps[0]) {
			op = dps[0]
		}
		if op == "" {
			return nil, errors.New("SummarizeLedgerSum: Invalid Operation")
		}
		if len(dps) > 2 {
			alias = dps[2]
		}

		if strings.HasPrefix(alias, "$") {
			alias = alias[1:]
		}

		if fnumber, enumber := toolkit.IsStringNumber(fieldid, "."); enumber == nil {
			q = q.Aggr(op, fnumber, alias)
		} else {
			q = q.Aggr(op, fieldid, alias)
		}
	}

	c, e := q.Cursor(nil)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Preparing cursor error " + e.Error())
	}
	defer c.Close()

	ms := []toolkit.M{}
	e = c.Fetch(&ms, 0, false)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Fetch cursor error " + e.Error())
	}

	if c.Count() > 0 {
		e = c.Fetch(&ms, 0, false)
		if e != nil {
			return nil, errors.New("SummarizedLedgerSum: Fetch cursor error " + e.Error())
		}
	}

	if fnTransform != nil {
		for idx, m := range ms {
			e = fnTransform(&m)
			if e != nil {
				return nil, errors.New(toolkit.Sprintf("SummarizedLedgerSum: Transform error on index %d, %s",
					idx, e.Error()))
			}
		}
	}

	return ms, nil
}

func (s *LedgerSummary) Save() error {
	e := Save(s)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", s.TableName(), "save", e.Error()))
	}
	return e
}

type PivotParam struct {
	Dimensions []*PivotParamDimensions `json:"dimensions"`
	DataPoints []*PivotParamDataPoint  `json:"datapoints"`
}

type PivotParamDimensions struct {
	Field string `json:"field"`
	Type  string `json:"type"`
}

type PivotParamDataPoint struct {
	OP    string `json:"op"`
	Field string `json:"field"`
	Alias string `json:"alias"`
}

func (p *PivotParam) ParseDimensions() (res []string) {
	res = []string{}
	for _, each := range p.Dimensions {
		res = append(res, each.Field)
	}
	return
}

func (p *PivotParam) ParseDataPoints() (res []string) {
	for _, each := range p.DataPoints {
		parts := []string{each.OP, each.Field, each.Alias}

		if !strings.HasPrefix(parts[1], "$") {
			parts[1] = fmt.Sprintf("$%s", parts[1])
		}

		res = append(res, strings.Join(parts, ":"))
	}
	return
}

func (p *PivotParam) MapSummarizedLedger(data []toolkit.M) []toolkit.M {
	res := []toolkit.M{}
	metadata := map[string]string{}

	for i, each := range data {
		row := toolkit.M{}

		if i == 0 {
			// cache the metadata, only on first loop
			for key, val := range each {
				if key == "_id" {
					for key2 := range val.(toolkit.M) {
						keyv := key2

						for _, dimension := range p.Dimensions {
							if strings.ToLower(dimension.Field) == strings.ToLower(keyv) {
								keyv = strings.Replace(strings.Replace(dimension.Field, ".", "", -1), "_id", "_ID", -1)
							}
						}

						if key2 == "_id" {
							keyv = toolkit.TrimByString(keyv, "_")
						}

						metadata[fmt.Sprintf("%s.%s", key, key2)] = keyv
					}
				} else {
					keyv := key
					for _, each := range p.DataPoints {
						if strings.ToLower(each.Alias) == strings.ToLower(key) {
							keyv = strings.Replace(each.Alias, " ", "_", -1)
						}
					}
					metadata[key] = keyv
				}
			}
		}

		// flatten the data
		for key, val := range each {
			if key == "_id" {
				for key2, val2 := range val.(toolkit.M) {
					keyv := metadata[fmt.Sprintf("%s.%s", key, key2)]
					row.Set(keyv, val2)
				}
			} else {
				keyv := metadata[key]
				row.Set(keyv, val)
			}
		}

		res = append(res, row)
	}

	return res
}

func (p *PivotParam) GetPivotConfig(data []toolkit.M) toolkit.M {
	res := struct {
		SchemaModelFields   toolkit.M
		SchemaCubeDimension toolkit.M
		SchemaCubeMeasures  toolkit.M
		Columns             []toolkit.M
		Rows                []toolkit.M
		Measures            []string
	}{
		toolkit.M{},
		toolkit.M{},
		toolkit.M{},
		[]toolkit.M{},
		[]toolkit.M{},
		[]string{},
	}

	if len(data) > 0 {
		for key := range data[0] {
			for _, c := range p.Dimensions {
				a := strings.ToLower(strings.Replace(c.Field, ".", "", -1)) == strings.ToLower(key)
				b := strings.ToLower(toolkit.TrimByString(c.Field, "_")) == strings.ToLower(key)

				if a || b {
					if c.Type == "column" {
						res.Columns = append(res.Columns, toolkit.M{"name": key, "expand": false})
					} else {
						res.Rows = append(res.Rows, toolkit.M{"name": key, "expand": false})
					}

					res.SchemaModelFields.Set(key, toolkit.M{"type": "string"})
					res.SchemaCubeDimension.Set(key, toolkit.M{"caption": key})
				}
			}

			for _, c := range p.DataPoints {
				if strings.ToLower(strings.Replace(c.Alias, " ", "_", -1)) == strings.ToLower(key) {
					op := c.OP
					if op == "avg" {
						op = "average"
					}

					res.SchemaModelFields.Set(key, toolkit.M{"type": "number"})
					res.SchemaCubeMeasures.Set(key, toolkit.M{"field": key, "aggregate": op})
					res.Measures = append(res.Measures, key)
				}
			}
		}
	}

	resM, err := toolkit.ToM(res)
	if err != nil {
		fmt.Println(err.Error())
	}

	return resM
}
