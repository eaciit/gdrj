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
	Source                                       string
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
	return "ledgersummariestemp" //"ledgersummaries"
}

func (s *LedgerSummary) PreSave() error {
	s.ID = s.PrepareID().(string)
	return nil
}

func LedgerSummaryGetDetailPivot(payload *DetailParam) ([]*LedgerSummary, error) {
	var filter *dbox.Filter = payload.ParseFilter()

	fmt.Println("------", filter)

	filter = dbox.And(
		filter,
		dbox.Eq(payload.BreakdownBy, payload.BreakdownValue),
		dbox.Eq("plmodel.plheader1", payload.PLHeader1),
	)

	fmt.Println("----", *payload)
	cursor, err := Find( /*new(LedgerSummary)*/ new(LedgerSummary), filter, nil)
	if err != nil {
		return nil, err
	}

	result := []*LedgerSummary{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
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

func CalculateLedgerSummaryAnalysisIdea(payload *PivotParam) ([]*toolkit.M, error) {
	var filter *dbox.Filter = payload.ParseFilter()

	conn := DB().Connection
	q := conn.NewQuery().From(new(LedgerSummary).TableName())
	q = q.Where(filter)
	q = q.Group("plmodel._id", "plmodel.orderindex", "plmodel.plheader1", "plmodel.plheader2", "plmodel.plheader3")
	q = q.Aggr(dbox.AggrSum, "$value1", "value1")

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

	res := []*toolkit.M{}
	for _, each := range ms {
		o := toolkit.M{}
		o.Set("_id", each.Get("_id").(toolkit.M).Get("plmodel._id"))
		o.Set("orderindex", each.Get("_id").(toolkit.M).Get("plmodel.orderindex"))
		o.Set("plheader1", each.Get("_id").(toolkit.M).Get("plmodel.plheader1"))
		o.Set("plheader2", each.Get("_id").(toolkit.M).Get("plmodel.plheader2"))
		o.Set("plheader3", each.Get("_id").(toolkit.M).Get("plmodel.plheader3"))
		o.Set("value", each.Get("value1"))
		res = append(res, &o)
	}

	return res, nil
}

func CalculateLedgerSummary(payload *PivotParam) ([]*toolkit.M, error) {
	var filter *dbox.Filter = payload.ParseFilter()
	var columns []string = payload.ParseDimensions()
	var datapoints []string = payload.ParseDataPoints()
	var fnTransform (func(m *toolkit.M) error) = nil

	fmt.Printf("--- %#v\n", filter)
	fmt.Printf("--- %#v\n", columns)
	fmt.Printf("--- %#v\n", datapoints)

	fmt.Printf("+++++ %#v\n", *(filter.Value.([]*dbox.Filter)[0]))
	fmt.Printf("+++++ %#v\n", *(filter.Value.([]*dbox.Filter)[1]))

	plKeys := []string{}
	bunchesOfData := [][]*toolkit.M{}

	switch payload.Which {
	case "all_plmod":
		fmt.Println("asdf")
		// plKeys = []string{"PL1", "PL2", "PL3"} //, "PL2", "PL3", "PL4", "PL5", "PL6", "PL7", "PL8", "PL9", "PL10", "PL11", "PL12", "PL13", "PL14", "PL15", "PL16", "PL17", "PL18", "PL19", "PL20", "PL21", "PL22", "PL23", "PL24", "PL25", "PL26", "PL27", "PL28", "PL29", "PL30", "PL31", "PL32", "PL33", "PL34", "PL35", "PL36", "PL37", "PL38", "PL39", "PL40", "PL41", "PL42", "PL43", "PL44", "PL45", "PL46"}
	case "gross_sales_discount_and_net_sales":
		plKeys = []string{"PL1", "PL2", "PL3"}
	}

	if payload.Which == "all_plmod" {
		bunchData, err := SummarizeLedgerSum(
			filter, columns, datapoints, fnTransform)
		if err != nil {
			return nil, err
		}

		bunchesOfData = append(bunchesOfData, bunchData)
	} else {
		for _, plKey := range plKeys {
			plFilter := dbox.Eq("plcode", plKey)
			bunchData, err := SummarizeLedgerSum(
				dbox.And(plFilter, filter), columns, datapoints, fnTransform)
			if err != nil {
				return nil, err
			}

			bunchesOfData = append(bunchesOfData, bunchData)
		}
	}

	allKeys := map[string]*toolkit.M{}
	rows := []*toolkit.M{}

	for i, bunch := range bunchesOfData {
		for _, each := range bunch {
			keyword := ""
			for _, s := range columns {
				keyword = fmt.Sprintf("%s%s", keyword, each.Get("_id").(toolkit.M).GetString(s))
			}

			if _, ok := allKeys[keyword]; !ok {
				allKeys[keyword] = each
				rows = append(rows, each)
				if i > 0 {
					each.Set(fmt.Sprintf("value%d", i+1), each.GetFloat64("value1"))
					each.Set("value1", 0)
				}

				for key, val := range *each {
					if key == "_id" {
						for skey, sval := range val.(toolkit.M) {
							each.Set(strings.Replace(skey, ".", "_", -1), sval)
						}
					}
				}
				each.Unset("_id")
			} else {
				current := allKeys[keyword]
				current.Set(fmt.Sprintf("value%d", i+1), current.GetFloat64(fmt.Sprintf("value%d", i+1))+each.GetFloat64("value1"))
			}
		}
	}

	return rows, nil
}

func SummarizeLedgerSum(
	filter *dbox.Filter,
	columns []string,
	datapoints []string,
	fnTransform func(m *toolkit.M) error) ([]*toolkit.M, error) {
	conn := DB().Connection
	q := conn.NewQuery().From(new(LedgerSummary).TableName())
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

	ms := []*toolkit.M{}
	e = c.Fetch(&ms, 0, false)
	if e != nil {
		return nil, errors.New("SummarizedLedgerSum: Fetch cursor error " + e.Error())
	}

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

type DetailParam struct {
	PivotParam
	BreakdownBy    string `json:"breakdownby"`
	BreakdownValue string `json:"breakdownvalue"`
	PLHeader1      string `json:"plheader1"`
}

type PivotParam struct {
	Dimensions []*PivotParamDimensions `json:"dimensions"`
	DataPoints []*PivotParamDataPoint  `json:"datapoints"`
	Which      string                  `json:"which"`
	Filters    []toolkit.M             `json:"filters"`
	Type       string                  `json:"type"`
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
			var value interface{} = each.GetString("Value")

			if value.(string) != "" {
				if field == "year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Gte(field, value))
			}
		case dbox.FilterOpLte:
			var value interface{} = each.GetString("Value")

			if value.(string) != "" {
				if field == "year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Lte(field, value))
			}
		case dbox.FilterOpEqual:
			value := each.GetString("Value")

			filters = append(filters, dbox.Gte(field, value))
		}
	}

	for _, each := range filters {
		fmt.Printf(">>>> %#v\n", *each)
	}

	return dbox.And(filters...)
}
