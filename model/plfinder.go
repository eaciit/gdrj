package gdrj

import (
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"math"
	"sort"
	"strings"
	"time"
)

var (
	masters                   = toolkit.M{}
	forceSalesPLSSummary bool = false
)

func buildmap(holder interface{},
	fnModel func() orm.IModel,
	filter *dbox.Filter,
	fnIter func(holder interface{}, obj interface{})) interface{} {
	crx, ecrx := Find(fnModel(), filter, nil)
	if ecrx != nil {
		toolkit.Printfn("Cursor Error: %s", ecrx.Error())
		// os.Exit(100)
	}
	defer crx.Close()
	for {
		s := fnModel()
		e := crx.Fetch(s, 1, false)
		if e != nil {
			break
		}
		fnIter(holder, s)
	}
	return holder
}

func prepmastercalc() {
	toolkit.Println("--> PL MODEL")
	masters.Set("plmodel", buildmap(map[string]*PLModel{},
		func() orm.IModel {
			return new(PLModel)
		},
		nil,
		func(holder, obj interface{}) {
			h := holder.(map[string]*PLModel)
			o := obj.(*PLModel)
			h[o.ID] = o
		}).(map[string]*PLModel))
}

type Filter struct {
	Field string      `json:"field"`
	Op    string      `json:"op"`
	Value interface{} `json:"value"`
}

type PLFinderParam struct {
	PLs                         []string  `json:"pls"`
	Breakdowns                  []string  `json:"groups"`
	Filters                     []*Filter `json:"filters"`
	Aggr                        string    `json:"aggr"`
	Flag                        string    `json:"flag"`
	TableKey                    string    `json:"tablekey"`
	WhenEmptyUseSalesPLSSummary bool
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

func (s *PLFinderParam) GetPayload(r *knot.WebContext) error {
	err := r.GetPayload(s)
	if err != nil {
		return err
	}

	hasFiscalYear := false

	for i, breakdown := range s.Breakdowns {
		if breakdown == "customer.channelname" {
			s.Breakdowns[i] = "customer.channelid"
		}

		if breakdown == "date.fiscal" {
			hasFiscalYear = true
		}
	}

	if !hasFiscalYear {
		s.Breakdowns = append(s.Breakdowns, "date.fiscal")
	}

	for _, filter := range s.Filters {
		if filter.Field == "customer.channelname" {
			filter.Field = "customer.channelid"
		}
	}

	return nil
}

func (s *PLFinderParam) ParseFilter() *dbox.Filter {
	filters := []*dbox.Filter{}

	oldFilters := s.Filters
	for _, each := range oldFilters {
		if each.Field == "customer.channelid" {

			for _, sub := range each.Value.([]interface{}) {

				// if the user select I3-MT, then the value should be MT + DISCOUNT
				if sub.(string) == "I3" {
					each.Value = append(each.Value.([]interface{}), "DISCOUNT")
					fmt.Println("HAS I3-MT", each.Value)
					break
				}

				// if the user select I2-GT, then the value should be GT + ""
				if sub.(string) == "I2" {
					each.Value = append(each.Value.([]interface{}), "")
					fmt.Println("HAS I2-GT", each.Value)
					break
				}
			}

			break
		}
	}

	for _, each := range s.Filters {
		switch each.Op {
		case dbox.FilterOpIn:
			values := []interface{}{}
			field := fmt.Sprintf("%s.%s", s.TableKey, strings.Replace(each.Field, ".", "_", -1))
			hasOther := false

			if each.Value != nil {
				for _, v := range each.Value.([]interface{}) {
					if toolkit.TypeName(v) == "string" {
						if strings.ToLower(v.(string)) == "other" {
							if !hasOther {
								hasOther = true
							}

							continue
						}
					}

					values = append(values, v)
				}
			}

			if len(values) > 0 || hasOther {
				valuesInt := []interface{}{}
				valuesIntSpace := []interface{}{}
				for _, each := range values {
					valuesInt = append(valuesInt, each)
					valuesIntSpace = append(valuesIntSpace, fmt.Sprintf("%s ", each))
				}

				subFilter := []*dbox.Filter{
					dbox.In(field, valuesInt...),
				}

				if field == "_id.customer_branchname" {
					subFilter = append(subFilter, dbox.In(field, valuesIntSpace...))
				}

				if hasOther {
					subFilter = append(subFilter, dbox.Or(
						dbox.Eq(field, nil),
						dbox.Eq(field, ""),
						dbox.Contains(field, "other"),
					))

					fmt.Printf("---- filter: %#v in %#v\n", field, valuesIntSpace)
				}

				filters = append(filters, dbox.Or(subFilter...))
				fmt.Printf("---- filter: %#v in %#v\n", field, valuesInt)
			}
		case dbox.FilterOpGte:
			var value interface{} = each.Value
			field := fmt.Sprintf("%s.%s", s.TableKey, strings.Replace(each.Field, ".", "_", -1))

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
			field := fmt.Sprintf("%s.%s", s.TableKey, strings.Replace(each.Field, ".", "_", -1))

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
			field := fmt.Sprintf("%s.%s", s.TableKey, strings.Replace(each.Field, ".", "_", -1))

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

	if toolkit.HasMember(filterKeys, "customer.channelid") && !toolkit.HasMember(filterKeys, "customer.channelname") {
		filterKeys = append(filterKeys, "customer.channelname")
	}

	sort.Strings(filterKeys)
	key := strings.Replace(strings.Join(filterKeys, "_"), ".", "_", -1)
	tableName := fmt.Sprintf("pl_%s", key)

	s.TableKey = "_id"

	// ========== get wheter use `key` or `_id`

	csr, err := DB().Connection.NewQuery().From(tableName).Take(2).Cursor(nil)
	if err != nil {
		return tableName
	}
	defer csr.Close()

	sample := []toolkit.M{}
	if err := csr.Fetch(&sample, 0, false); err != nil {
		return tableName
	}

	if forceSalesPLSSummary {
		s.TableKey = "key"
		return `salespls-summary`
	}

	if len(sample) == 0 {
		if s.WhenEmptyUseSalesPLSSummary {
			s.TableKey = "key"
			return `salespls-summary`
		}
	} else {
		if sample[0].Has("key") {
			s.TableKey = "key"
		}
	}

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

func (s *PLFinderParam) CalculatePL(data *[]*toolkit.M) *[]*toolkit.M {
	channelid := "_id_customer_channelid"
	channelname := "_id_customer_channelname"
	res := []*toolkit.M{}

	branchMTpercent := float64(0)

	prepmastercalc()

	otherData := map[int]*toolkit.M{}

	for i, each := range *data {
		_id := each.Get("_id").(toolkit.M)

		for _, brkdwn := range s.Breakdowns {
			key := fmt.Sprintf("_id_%s", strings.Replace(brkdwn, ".", "_", -1))
			if !_id.Has(key) {
				_id.Set(key, "Other")
			}
		}

		for key, val := range _id {
			if val == nil {
				_id.Set(key, "Other")
			} else if fmt.Sprintf("%v", val) == "" {
				_id.Set(key, "Other")
			}

			if _, ok := otherData[i]; strings.ToLower(fmt.Sprintf("%v", _id[key])) == "other" && !ok {
				otherData[i] = each
			}
		}

		if _id.Has(channelid) {
			channelid := strings.ToUpper(fmt.Sprintf("%v", _id[channelid]))

			switch channelid {
			case "I6":
				_id.Set(channelname, "Motorist")
			case "I4":
				_id.Set(channelname, "Industrial")
			case "I1":
				_id.Set(channelname, "Regional Distributor")
			case "I3":
				_id.Set(channelname, "Modern Trade")
				// get branch mt percentage
				branchMTpercent = toolkit.Div(
					each.GetFloat64("PL7A"), // DISCOUNT ACT
					each.GetFloat64("PL0"),  // GROSS SALES
				)
			case "I2":
				_id.Set(channelname, "General Trade")
			case "EXP":
				_id.Set(channelname, "Export")
			}
		}

		// inject net margin if not exists
		// the value is gross sales - a&p
		if !each.Has(NetMarginPLCode) {
			grossMargin := each.GetFloat64("PL74C")
			anp := each.GetFloat64("PL32A")

			each.Set(NetMarginPLCode, grossMargin+anp)
		}

		for key := range *each {
			if strings.Contains(key, "PL") {
				val := each.GetFloat64(key)
				if math.IsNaN(val) {
					each.Set(key, 0)
				}
			}
		}
	}

	if s.Flag == "branch-vs-rd" {
		for _, each := range *data {
			_id := (*each).Get("_id").(toolkit.M)
			channelID := _id.GetString("_id_customer_channelid")

			if toolkit.HasMember([]string{"I6", "I4", "I3", "I2"}, channelID) {
				newEach := toolkit.M{}

				for key, value := range *each {
					newEach[key] = value
				}

				eachID := toolkit.M{"_id_branchrd": "Branch"}

				for k, v := range newEach.Get("_id").(toolkit.M) {
					eachID.Set(k, v)
				}

				newEach.Set("_id", eachID)
				res = append(res, &newEach)
			}

			rdMT := float64(0)

			if toolkit.HasMember([]string{"I1"}, channelID) {
				breakdowns := map[string]float64{"Modern Trade": 0.62, "General Trade": 0.38}

				for channelname, percentage := range breakdowns {
					newEach := toolkit.M{}

					for key, value := range *each {
						newEach[key] = value

						if strings.HasPrefix(key, "PL") {
							newEach[key] = ((*each).GetFloat64(key) * percentage)

							// === RD | MT 100% vs GT 0% ===

							f := []string{"PL31", "PL30", "PL29"}
							for _, forbidden := range f {
								if strings.HasPrefix(key, forbidden) {
									if channelname == "General Trade" {
										newEach[key] = 0
									} else if channelname == "Modern Trade" {
										newEach[key] = (*each).GetFloat64(key)
									}
								}
							}
						}
					}

					// === DISCOUNT ACT === RD GT & RD MT ===
					if channelname == "Modern Trade" {
						rdMT = branchMTpercent * newEach.GetFloat64("PL0")
						newEach["PL7A"] = rdMT
					} else {
						totalRD := each.GetFloat64("PL7A")
						rdGT := totalRD - rdMT
						newEach["PL7A"] = rdGT
					}

					eachID := toolkit.M{"_id_branchrd": "Regional Distributor"}

					for k, v := range newEach.Get("_id").(toolkit.M) {
						eachID.Set(k, v)
					}

					eachID.Set("_id_customer_channelname", channelname)
					newEach.Set("_id", eachID)

					//neweach final
					CalcSum(newEach, masters)
					res = append(res, &newEach)
				}
			}
		}

		return &res
	} else if s.Flag == "branch-vs-rd-only-mt-gt" {
		for _, each := range *data {
			_id := (*each).Get("_id").(toolkit.M)
			channelID := _id.GetString("_id_customer_channelid")

			if toolkit.HasMember([]string{"I3", "I2"}, channelID) {
				newEach := toolkit.M{}

				for key, value := range *each {
					newEach[key] = value
				}

				eachID := toolkit.M{"_id_branchrd": "Branch"}

				for k, v := range newEach.Get("_id").(toolkit.M) {
					eachID.Set(k, v)
				}

				newEach.Set("_id", eachID)
				res = append(res, &newEach)
			}

			rdMT := float64(0)

			if toolkit.HasMember([]string{"I1"}, channelID) {
				breakdowns := map[string]float64{"Modern Trade": 0.62, "General Trade": 0.38}

				for channelname, percentage := range breakdowns {
					newEach := toolkit.M{}

					for key, value := range *each {
						newEach[key] = value

						if strings.HasPrefix(key, "PL") {
							newEach[key] = ((*each).GetFloat64(key) * percentage)

							f := []string{"PL31", "PL30", "PL29"}
							for _, forbidden := range f {
								if strings.HasPrefix(key, forbidden) {
									if channelname == "General Trade" {
										newEach[key] = 0
									} else if channelname == "Modern Trade" {
										newEach[key] = (*each).GetFloat64(key)
									}
								}
							}
						}
					}

					// === DISCOUNT ACT === RD GT & RD MT ===
					if channelname == "Modern Trade" {
						rdMT = branchMTpercent * newEach.GetFloat64("PL0")
						newEach["PL7A"] = rdMT
					} else {
						totalRD := each.GetFloat64("PL7A")
						rdGT := totalRD - rdMT
						newEach["PL7A"] = rdGT
					}

					eachID := toolkit.M{"_id_branchrd": "Regional Distributor"}

					for k, v := range newEach.Get("_id").(toolkit.M) {
						eachID.Set(k, v)
					}

					eachID.Set("_id_customer_channelname", channelname)
					newEach.Set("_id", eachID)

					//neweach final
					CalcSum(newEach, masters)
					res = append(res, &newEach)
				}
			}
		}

		return &res
	}

	return data
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

	db, session, err := s.ConnectToDB()
	if err != nil {
		return nil, err
	}
	defer session.Close()

	groups := bson.M{}
	groupIds := bson.M{}

	fb := DB().Connection.Fb()
	fb.AddFilter(s.ParseFilter())
	matches, err := fb.Build()
	if err != nil {
		return nil, err
	}

	for _, breakdown := range s.Breakdowns {
		field := fmt.Sprintf("$%s.%s", s.TableKey, strings.Replace(breakdown, ".", "_", -1))
		alias := strings.Replace(fmt.Sprintf("_id.%s", breakdown), ".", "_", -1)
		groupIds[alias] = field
	}
	groups["_id"] = groupIds

	for _, plmod := range plmodels {
		op := fmt.Sprintf("$%s", s.Aggr)
		field := fmt.Sprintf("$%s", plmod.ID)
		groups[plmod.ID] = bson.M{op: field}
	}

	fields := []string{
		"grossamount",
		"ratiotoglobalsales",
		"ratiotobrandsales",
		"discountamount",
		"salesqty",
		"count",
		"ratiotobranchsales",
		"ratiotoskusales",
		"taxamount",
		"netamount",
		"salesreturn",
		// "totaloutlet",
	}

	for _, other := range fields {
		field := fmt.Sprintf("$%s", other)
		groups[other] = bson.M{"$sum": field}
	}

	sgagroups := []string{"R&D", "Sales", "General Service", "General Management", "Manufacturing",
		"Finance", "Marketing", "Logistic Overhead", "Human Resource", "Other"}
	sgapl := []string{"PL33", "PL34", "PL35"}
	for _, sga := range sgagroups {
		for _, pl := range sgapl {
			dbfield := fmt.Sprintf("%s_%s", pl, sga)
			pdbfield := fmt.Sprintf("$%s", dbfield)
			groups[dbfield] = bson.M{"$sum": pdbfield}
		}
	}

	fmt.Printf("-MATHCES %#v\n", matches)

	// groups["totalOutlet"] = bson.M{"$size": "$outlets"}
	pipe := []bson.M{{"$match": matches}, {"$group": groups}} //, {"$project": projects}} //

	res := []*toolkit.M{}
	err = db.C(tableName).Pipe(pipe).AllowDiskUse().All(&res)
	if err != nil {
		return nil, err
	}

	resFinal := *(s.CalculatePL(&res))
	return resFinal, nil
}

func (s *PLFinderParam) GeneratePLData() error {
	tableName := s.GetTableName()

	plmodels, err := PLModelGetAll(s)
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

	group["outlets"] = bson.M{"$addToSet": "$customer._id"}
	// project := bson.M{"totaloutlet": bson.M{"$size": "$outlets"}}
	// for key := range group {
	// 	if key == "_id" {
	// 		continue
	// 	}

	// 	project[key] = 1
	// }

	pipes := []bson.M{{"$group": group} /**{"$project": project}, */, {"$out": tableName}}
	pipe := col.Pipe(pipes)

	res := []*toolkit.M{}
	err = pipe.AllowDiskUse().All(&res)
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
