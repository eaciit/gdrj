package gdrj

import (
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"math"
	"sort"
	"strings"
	"time"
)

type Filter struct {
	Field string      `json:"field"`
	Op    string      `json:"op"`
	Value interface{} `json:"value"`
}

type PLFinderParam struct {
	PLs        []string  `json:"pls"`
	Breakdowns []string  `json:"groups"`
	Filters    []*Filter `json:"filters"`
	Aggr       string    `json:"aggr"`
	Flag       string    `json:"flag"`
}

func (s *PLFinderParam) GetPLCollections() ([]*toolkit.M, error) {
	db, session, err := s.ConnectToDB()
	if err != nil {
		return nil, err
	}
	defer session.Close()

	cols, err := db.CollectionNames()
	if err != nil {
		return nil, err
	}

	res := []*toolkit.M{}

	for _, col := range cols {
		if strings.HasPrefix(col, "pl_") {
			csr, err := DB().Connection.NewQuery().From(col).Take(1).Cursor(nil)
			if err != nil {
				return nil, err
			}
			defer csr.Close()

			colRes := []*toolkit.M{}
			err = csr.Fetch(&colRes, 0, false)
			if err != nil {
				return nil, err
			}

			if len(colRes) > 0 {
				dimensions := []string{}
				for key := range colRes[0].Get("_id").(toolkit.M) {
					dimensions = append(dimensions, key)
				}

				row := toolkit.M{}
				row.Set("table", col)
				row.Set("dimensions", dimensions)
				res = append(res, &row)
			}
		}
	}

	return res, nil
}

func (s *PLFinderParam) DeletePLCollection(table []string) error {
	db, session, err := s.ConnectToDB()
	if err != nil {
		return err
	}
	defer session.Close()

	for _, each := range table {
		err = db.C(each).DropCollection()
		if err != nil {
			return err
		}
	}

	return nil
}

func (s *PLFinderParam) ParseFilter() *dbox.Filter {
	filters := []*dbox.Filter{}

	for _, each := range s.Filters {
		switch each.Op {
		case dbox.FilterOpIn:
			values := []string{}
			field := fmt.Sprintf("_id.%s", strings.Replace(each.Field, ".", "_", -1))

			for _, v := range each.Value.([]interface{}) {
				values = append(values, v.(string))
			}

			if len(values) > 0 {
				subFilters := []*dbox.Filter{}
				for _, value := range values {
					subFilters = append(subFilters, dbox.Eq(field, value))
				}
				filters = append(filters, dbox.Or(subFilters...))
				fmt.Printf("---- filter: %#v in %#v\n", field, values)
			}
		case dbox.FilterOpGte:
			var value interface{} = each.Value
			field := fmt.Sprintf("_id.%s", strings.Replace(each.Field, ".", "_", -1))
			// interface is []interface {}, not string
			if value.(string) != "" {
				if field == "_id.date_year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Gte(field, value))
				fmt.Printf("---- filter: |%#v| |_id.date_year| gte %#v\n", field, value)
			}
		case dbox.FilterOpLte:
			var value interface{} = each.Value
			field := fmt.Sprintf("_id.%s", strings.Replace(each.Field, ".", "_", -1))

			if value.(string) != "" {
				if field == "_id.date_year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Lte(field, value))
				fmt.Printf("---- filter: %#v lte %#v\n", field, value)
			}
		case dbox.FilterOpEqual:
			value := each.Value
			field := fmt.Sprintf("_id.%s", strings.Replace(each.Field, ".", "_", -1))

			filters = append(filters, dbox.Eq(field, value))
			fmt.Println("---- filter: ", field, "eq", value)
		}
	}

	return dbox.And(filters...)
}

func (s *PLFinderParam) GetTableName() string {
	cache := map[string]bool{}
	filterKeys := []string{}
	for _, filter := range s.Filters {
		if _, ok := cache[filter.Field]; !ok {
			cache[filter.Field] = true
			filterKeys = append(filterKeys, filter.Field)
		}
	}
	for _, breakdown := range s.Breakdowns {
		if _, ok := cache[breakdown]; !ok {
			cache[breakdown] = true
			filterKeys = append(filterKeys, breakdown)
		}
	}

	cols, _ := s.GetPLCollections()
	for _, col := range cols {
		dimensions := col.Get("dimensions").([]string)
		ok := true

		fmt.Println("############### DIMENSIONS", dimensions)
		fmt.Print("############### FILTERKEYS ")

	loopFilter:
		for _, filterKey := range filterKeys {
			filter := strings.Replace(filterKey, ".", "_", -1)
			fmt.Print(filter, " ")
			if !toolkit.HasMember(dimensions, filter) {
				ok = false
				break loopFilter
			}
		}

		fmt.Println()

		if ok {
			return col.GetString("table")
		}
	}

	sort.Strings(filterKeys)
	key := strings.Replace(strings.Join(filterKeys, "_"), ".", "_", -1)
	tableName := fmt.Sprintf("pl_%s", key)

	return tableName
}

func (s *PLFinderParam) ConnectToDB() (*mgo.Database, *mgo.Session, error) {
	ci := DB().Connection.Info()
	mgoi := &mgo.DialInfo{
		Addrs:   []string{ci.Host},
		Timeout: 10 * time.Minute,
		// Database: ci.Database,
		Username: ci.UserName,
		Password: ci.Password,
	}

	session, err := mgo.DialWithInfo(mgoi)
	if err != nil {
		return nil, session, err
	}

	session.SetMode(mgo.Monotonic, true)
	db := session.DB(ci.Database)

	return db, session, nil
}

func (s *PLFinderParam) CountPLData() (bool, error) {
	tableName := s.GetTableName()

	csr, err := DB().Connection.NewQuery().From(tableName).Take(2).Cursor(nil)
	if err != nil {
		return false, err
	}
	defer csr.Close()

	return (csr.Count() > 0), nil
}

func (s *PLFinderParam) GetPLModelsFollowPLS() ([]*PLModel, error) {
	res := []*PLModel{}

	q := DB().Connection.NewQuery().From(new(PLModel).TableName())
	defer q.Close()

	if len(s.PLs) > 0 {
		filters := []*dbox.Filter{}
		for _, pl := range s.PLs {
			filters = append(filters, dbox.Eq("_id", pl))
		}
		q = q.Where(dbox.Or(filters...))
	}

	csr, err := q.Cursor(nil)
	if err != nil {
		return nil, err
	}
	defer csr.Close()

	err = csr.Fetch(&res, 0, false)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (s *PLFinderParam) noZero(num float64) float64 {
	if math.IsNaN(num) || math.IsInf(num, 1) || math.IsInf(num, -1) {
		return 0
	}

	return num
}

func (s *PLFinderParam) Sum(raw *toolkit.M, i ...string) float64 {
	total := 0.0
	for _, j := range i {
		total = total + s.noZero(raw.GetFloat64(j))
	}
	return total
}

func (s *PLFinderParam) CalculatePL(data *[]*toolkit.M) {
	res := []*toolkit.M{}
	fmt.Println("----------", s.Flag)
	for _, each := range *data {
		fmt.Printf("-------- %#v\n", *each)
	}

	if s.Flag != "" {
		for _, raw := range *data {
			grossSales := s.Sum(raw, "PL1", "PL2", "PL3", "PL4", "PL5", "PL6")
			salesDiscount := s.Sum(raw, "PL7", "PL8")
			qty := s.Sum(raw, "salesqty")
			netSales := grossSales + salesDiscount // s.Sum(raw, "PL8A")
			salesReturn := s.Sum(raw, "PL3")

			each := toolkit.M{}
			if s.Flag == "gross_sales_discount_and_net_sales" {
				each.Set("gross_sales", grossSales)
				each.Set("sales_discount", math.Abs(salesDiscount))
				each.Set("net_sales", netSales)
			} else if s.Flag == "gross_sales_qty" {
				each.Set("gross_sales", grossSales)
				each.Set("qty", qty)
				each.Set("gross_sales_qty", s.noZero(grossSales/qty))
			} else if s.Flag == "discount_qty" {
				each.Set("sales_discount", math.Abs(salesDiscount))
				each.Set("qty", qty)
				each.Set("discount_qty", math.Abs(s.noZero(salesDiscount/qty)))
			} else if s.Flag == "sales_return_rate" {
				each.Set("sales_return", math.Abs(salesReturn))
				each.Set("sales_revenue", netSales)
				each.Set("sales_return_rate", math.Abs(s.noZero(salesReturn/netSales)))
			}

			for k, v := range raw.Get("_id").(toolkit.M) {
				each.Set(strings.Replace(k, "_id_", "", -1), strings.TrimSpace(v.(string)))
			}

			res = append(res, &each)
		}

		*data = res
	} else {
		for _, each := range *data {
			for key := range *each {
				if strings.Contains(key, "PL") {
					val := each.GetFloat64(key)
					if math.IsNaN(val) {
						each.Set(key, 0)
					}
				}
			}
		}
	}
}

func (s *PLFinderParam) GetPLData() ([]*toolkit.M, error) {
	if s.Flag != "" {
		s.PLs = []string{}
	}

	tableName := s.GetTableName()
	plmodels, err := s.GetPLModelsFollowPLS()
	if err != nil {
		return nil, err

	}

	q := DB().Connection.NewQuery().From(tableName)
	if len(s.Filters) > 0 {
		q = q.Where(s.ParseFilter())
	}

	for _, breakdown := range s.Breakdowns {
		brkdwn := fmt.Sprintf("_id.%s", strings.Replace(breakdown, ".", "_", -1))
		q = q.Group(brkdwn)
	}

	for _, plmod := range plmodels {
		op := fmt.Sprintf("$%s", s.Aggr)
		field := fmt.Sprintf("$%s", plmod.ID)
		q = q.Aggr(op, field, plmod.ID)
	}

	for _, other := range []string{"grossamount", "ratiotoglobalsales", "ratiotobrandsales", "discountamount", "salesqty", "count", "ratiotobranchsales", "ratiotoskusales", "taxamount", "netamount"} {
		if !strings.HasPrefix(other, "PL") {
			field := fmt.Sprintf("$%s", other)
			q = q.Aggr("$sum", field, other)
		}
	}

	csr, err := q.Cursor(nil)
	if err != nil {
		return nil, err
	}
	defer csr.Close()

	res := []*toolkit.M{}
	err = csr.Fetch(&res, 0, false)
	if err != nil {
		return nil, err
	}

	s.CalculatePL(&res)

	return res, nil
}

func (s *PLFinderParam) GeneratePLData() error {
	tableName := s.GetTableName()

	plmodels, err := PLModelGetAll()
	if err != nil {
		return err
	}

	db, sess, err := s.ConnectToDB()
	if err != nil {
		return err
	}
	defer sess.Close()

	col := db.C(new(SalesPL).TableName())

	cache := map[string]bool{}
	filterKeys := []string{}
	for _, filter := range s.Filters {
		if _, ok := cache[filter.Field]; !ok {
			cache[filter.Field] = true
			filterKeys = append(filterKeys, filter.Field)
		}
	}

	_id := bson.M{}
	for _, each := range append(s.Breakdowns, filterKeys...) {
		key := strings.Replace(each, ".", "_", -1)
		val := fmt.Sprintf("$%s", each)
		_id[key] = val
	}

	group := bson.M{
		"_id":                _id,
		"salesqty":           bson.M{"$sum": "$salesqty"},
		"grossamount":        bson.M{"$sum": "$grossamount"},
		"discountamount":     bson.M{"$sum": "$discountamount"},
		"taxamount":          bson.M{"$sum": "$taxamount"},
		"netamount":          bson.M{"$sum": "$netamount"},
		"count":              bson.M{"$sum": 1},
		"ratiotoglobalsales": bson.M{"$sum": "$ratiotoglobalsales"},
		"ratiotobranchsales": bson.M{"$sum": "$ratiotobranchsales"},
		"ratiotobrandsales":  bson.M{"$sum": "$ratiotobrandsales"},
		"ratiotoskusales":    bson.M{"$sum": "$ratiotoskusales"},
	}

	for _, plmod := range plmodels {
		key := strings.Replace(plmod.ID, ".", "_", -1)
		field := fmt.Sprintf("$pldatas.%s.amount", plmod.ID)
		group[key] = bson.M{"$sum": field}
	}

	pipes := []bson.M{{"$group": group}, {"$out": tableName}}
	pipe := col.Pipe(pipes)

	res := []*toolkit.M{}
	err = pipe.All(&res)
	if err != nil {
		return err
	}

	_ = res
	return nil
}

type PLFinderDetail struct {
	PLFinderParam

	PageSize int `json:"pageSize"`
	Take     int `json:"take"`
	Skip     int `json:"skip"`
	Page     int `json:"page"`
}

func (p *PLFinderDetail) GetData() ([]*toolkit.M, error) {
	db, ses, err := p.ConnectToDB()
	if err != nil {
		return nil, err
	}
	defer ses.Close()

	filters := bson.M{}
	for _, filter := range p.Filters {
		filters[filter.Field] = filter.Value
	}

	col := db.C(new(SalesPL).TableName())

	fmt.Printf("----- %#v\n", filters)

	data := []*toolkit.M{}
	err = col.Find(filters).Limit(p.Take).Skip(p.Skip).All(&data)
	if err != nil {
		return nil, err
	}
	fmt.Printf("----- %#v\n", data)

	return data, nil
}
