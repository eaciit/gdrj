package gdrj

import (
	"errors"
	"strings"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm"
	"github.com/eaciit/toolkit"
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

func (s *LedgerSummary) PrepareID() interface{}{
    s.ID = toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
    return s
}

func (s *LedgerSummary) TableName() string {
	return "LedgerSummary"
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
	if len(datapoints) == 0 {
		return nil, errors.New("SummarizedLedgerSum: Datapoints should be defined at least 1")
	}
	for _, dp := range datapoints {
		dps := strings.Split(dp, ":")
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
		
        if strings.HasPrefix(alias,"$") {
            alias = alias[1:]
        }
		
        if fnumber,enumber:=toolkit.IsStringNumber(fieldid,".");enumber==nil{
            q = q.Aggr(op, fnumber, alias)
        } else {
            q = q.Aggr(op, fieldid, alias)
        }
	}
    if len(columns) > 0 {
		q = q.Group(columns...)
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
