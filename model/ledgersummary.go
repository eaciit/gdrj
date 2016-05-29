package gdrj

import (
	"errors"
	"github.com/eaciit/orm"
	"fmt"
	"github.com/eaciit/dbox"
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

func (s *LedgerSummary) PrepareID() interface{}{
    s.ID = toolkit.Sprintf("%d_%d_%s_%s", s.Date.Year, s.Date.Month, s.CompanyCode, s.LedgerAccount)
    return s
}

func (s *LedgerSummary) TableName() string {
	return "LedgerSummary"
}

func LedgerSummaryGenerateDummyData() []*LedgerSummary {
	res := []*LedgerSummary{}

	for i := 0; i < 30; i++ {
		pc := new(ProfitCenter)
		pc.ID = fmt.Sprintf("PC00%d", i)
		pc.EntityID = toolkit.RandomString(5)
		pc.Name = toolkit.RandomString(10)
		pc.BrandID = toolkit.RandomString(5)
		pc.BrandCategoryID = toolkit.RandomString(5)
		pc.BranchID = toolkit.RandomString(5)
		pc.BranchType = BranchTypeEnum(toolkit.RandInt(100))

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

		pr := new(Product)
		pr.ID = toolkit.RandomString(5)
		pr.Name = toolkit.RandomString(5)
		pr.Config = toolkit.RandomString(5)
		pr.Brand = toolkit.RandomString(5)
		pr.LongName = toolkit.RandomString(5)

		da := new(Date)
		da.ID = toolkit.RandomString(5)
		da.Date = time.Now()
		da.Month = time.Month(5)
		da.Quarter = toolkit.RandInt(5)
		da.Year = toolkit.RandInt(5)

		o := new(LedgerSummary)
		o.ID = fmt.Sprintf("LS00%d", i)
		o.PC = pc
		o.CC = cc
		o.CompanyCode = toolkit.RandomString(3)
		o.LedgerAccount = toolkit.RandomString(3)
		o.Customer = cu
		o.Product = pr
		o.Date = da
		o.Value1 = toolkit.RandFloat(4, 2)
		o.Value2 = toolkit.RandFloat(4, 2)
		o.Value3 = toolkit.RandFloat(4, 2)

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
		q = q.Group(columns...)
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
