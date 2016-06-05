package gdrj

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type LedgerSummary struct {
	orm.ModelBase                          `bson:"-" json:"-"`
	ID                                     string `bson:"_id"`
	PC                                     *ProfitCenter
	CC                                     *CostCenter
	PLModel                                *PLModel
	CompanyCode                            string
	LedgerAccount                          string
	Customer                               *Customer
	Product                                *Product
	Date                                   *Date
	PLGroup1, PLGroup2, PLGroup3, PLGroup4 string
	Value1, Value2, Value3                 float64
	//EasyForSelect
	PCID, CCID, OutletID, SKUID, PLCode, PLOrder string
	Month                                        time.Month
	Year                                         int
}

// month,year
func (s *LedgerSummary) RecordID() interface{} {
	return s.ID
	//return toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
}

func (s *LedgerSummary) PrepareID() interface{} {
	return toolkit.Sprintf("%d_%d_%s_%s_%s_%s_%s_%s_%s",
		s.Date.Year, s.Date.Month,
		s.CompanyCode, s.LedgerAccount,
		s.PLCode, s.OutletID, s.SKUID, s.PCID, s.CCID)
}

func (s *LedgerSummary) TableName() string {
	return "ledgersummaries"
}

func (s *LedgerSummary) PreSave() error {
	s.ID = s.PrepareID().(string)
	return nil
}

func GetLedgerSummaryByDetail(LedgerAccount, PCID, CCID, OutletID, SKUID string, Year int, Month time.Month) (ls *LedgerSummary) {
	ls = new(LedgerSummary)

	filter := dbox.And(dbox.Eq("month", Month),
		dbox.Eq("year", Year),
		dbox.Eq("ledgeraccount", LedgerAccount),
		dbox.Eq("pcid", PCID),
		dbox.Eq("ccid", CCID),
		dbox.Eq("outletid", OutletID),
		dbox.Eq("skuid", SKUID))

	cr, err := Find(new(LedgerSummary), filter, nil)
	if err != nil {
		return
	}

	_ = cr.Fetch(&ls, 1, false)
	cr.Close()

	return
}

func CalculateLedgerSummary(payload *PivotParam) ([]*toolkit.M, error) {
	var filter *dbox.Filter = payload.ParseFilter()
	var columns []string = payload.ParseDimensions()
	var datapoints []string = payload.ParseDataPoints()
	var fnTransform (func(m *toolkit.M) error) = nil

	fmt.Printf("--- %#v\n", filter)
	fmt.Printf("--- %#v\n", columns)
	fmt.Printf("--- %#v\n", datapoints)

	res := []*toolkit.M{}

	if payload.Which == "gross_sales_discount_and_net_sales" {
		gross, err := SummarizeLedgerSum(
			dbox.And(dbox.Eq("plcode", "PL1")),
			columns, datapoints, fnTransform)
		if err != nil {
			return nil, err
		}
		// res = gross
		// return res, nil

		discount, err := SummarizeLedgerSum(
			dbox.And(dbox.Eq("plcode", "PL2")),
			columns, datapoints, fnTransform)
		if err != nil {
			return nil, err
		}

		net, err := SummarizeLedgerSum(
			dbox.And(dbox.Eq("plcode", "PL3")),
			columns, datapoints, fnTransform)
		if err != nil {
			return nil, err
		}
		all_keys := map[string][]*toolkit.M{}

		for _, cat := range [][]*toolkit.M{gross, discount, net} {
			for _, each := range cat {
				keyword := ""
				for _, s := range columns {
					keyword = fmt.Sprintf("%s%s", keyword, each.Get("_id").(toolkit.M).GetString(s))
				}

				if _, ok := all_keys[keyword]; !ok {
					all_keys[keyword] = []*toolkit.M{each}
				} else {
					all_keys[keyword] = append(all_keys[keyword], each)
				}
			}
		}

		for _, rows := range all_keys {
			row := rows[0]

			for key, val := range row.Get("_id").(toolkit.M) {
				row.Set(strings.Replace(key, ".", "_", -1), val)
			}

			row.Unset("_id")

			if len(rows) == 2 {
				row.Set("value2", rows[1].GetFloat64("value1"))
			}
			// if len(rows) == 3 {
			// 	row.Set("value3", rows[2].GetFloat64("value1"))
			// }
			row.Set("value3", row.GetFloat64("value1")-row.GetFloat64("value2"))

			res = append(res, row)
		}
	}

	return res, nil
}

func SummarizeLedgerSum(
	filter *dbox.Filter,
	columns []string,
	datapoints []string,
	fnTransform func(m *toolkit.M) error) ([]*toolkit.M, error) {
	sum := new(LedgerSummary)
	conn := DB().Connection
	q := conn.NewQuery().From(sum.TableName())
	if filter != nil {
		q = q.Where(filter)
		fmt.Println("fiiff", *(filter.Value.([]*dbox.Filter)[0]))
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

	ms := []*toolkit.M{}
	e = c.Fetch(&ms, 0, false)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Fetch cursor error " + e.Error())
	}

	// if c.Count() > 0 {
	// 	e = c.Fetch(&ms, 0, false)
	// 	if e != nil {
	// 		return nil, errors.New("SummarizedLedgerSum: Fetch cursor error " + e.Error())
	// 	}
	// }

	fmt.Println("asdfsafda", len(ms))

	if fnTransform != nil {
		for idx, m := range ms {
			e = fnTransform(m)
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
	Which      string                  `json:"which"`
	Filters    []toolkit.M             `json:"filters"`
}

type PivotParamDimensions struct {
	Field string `json:"field"`
}

type PivotParamDataPoint struct {
	Aggr  string `json:"aggr"`
	Field string `json:"field"`
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
		parts := []string{each.Aggr, each.Field, each.Field}

		if !strings.HasPrefix(parts[1], "$") {
			parts[1] = fmt.Sprintf("$%s", parts[1])
		}

		res = append(res, strings.Join(parts, ":"))
	}
	return
}

func (p *PivotParam) ParseFilter() *dbox.Filter {
	filters := []*dbox.Filter{}

	return dbox.And(filters...)

	for _, each := range p.Filters {
		field := each.GetString("Field")

		switch each.GetString("Op") {
		case dbox.FilterOpIn:
			values := []string{}
			for _, v := range each.Get("Value").([]interface{}) {
				values = append(values, v.(string))
			}

			if len(values) > 0 {
				filters = append(filters, dbox.In(field, values))
			}
		case dbox.FilterOpGte:
			value := each.GetString("Value")

			if strings.TrimSpace(value) != "" {
				filters = append(filters, dbox.Gte(field, value))
			}
		case dbox.FilterOpLte:
			value := each.GetString("Value")

			if strings.TrimSpace(value) != "" {
				filters = append(filters, dbox.Lte(field, value))
			}
		case dbox.FilterOpEqual:
			value := each.GetString("Value")

			if strings.TrimSpace(value) != "" {
				filters = append(filters, dbox.Eq(field, value))
			}
		}
	}

	for _, each := range filters {
		fmt.Printf(">>>> %#v\n", *each)
	}

	return dbox.And(filters...)
}
