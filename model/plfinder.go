package gdrj

import (
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
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
	Breakdowns []string  `json:"breakdown"`
	Filters    []*Filter `json:"filters"`
}

func (s *PLFinderParam) ParseFilter() *dbox.Filter {
	filters := []*dbox.Filter{}

	for _, each := range s.Filters {
		switch each.Op {
		case dbox.FilterOpIn:
			values := []string{}
			for _, v := range each.Value.([]interface{}) {
				values = append(values, v.(string))
			}

			if len(values) > 0 {
				filters = append(filters, dbox.In(each.Field, values))
			}
		case dbox.FilterOpGte:
			var value interface{} = each.Value

			if value.(string) != "" {
				if each.Field == "year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Gte(each.Field, value))
			}
		case dbox.FilterOpLte:
			var value interface{} = each.Value

			if value.(string) != "" {
				if each.Field == "year" {
					t, err := time.Parse(time.RFC3339Nano, value.(string))
					if err != nil {
						fmt.Println(err.Error())
					} else {
						value = t.Year()
					}
				}

				filters = append(filters, dbox.Lte(each.Field, value))
			}
		case dbox.FilterOpEqual:
			value := each.Value
			filters = append(filters, dbox.Eq(each.Field, value))
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
	sort.Strings(filterKeys)
	key := strings.Replace(strings.Join(filterKeys, "_"), ".", "_", -1)
	tableName := fmt.Sprintf("pl_%s", key)
	return tableName
}

func (s *PLFinderParam) C(tableName string) (*mgo.Collection, *mgo.Session, error) {
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

	return db.C(tableName), session, nil
}

func (s *PLFinderParam) CountPLData() (bool, error) {
	tableName := s.GetTableName()

	csr, err := DB().Connection.NewQuery().From(tableName).Take(2).Cursor(nil)
	if err != nil {
		return false, err
	}
	defer csr.Close()

	fmt.Println("++++++", tableName, csr.Count())

	return (csr.Count() > 0), nil
}

func (s *PLFinderParam) GetPLData() ([]*toolkit.M, error) {
	tableName := s.GetTableName()

	csr, err := DB().Connection.NewQuery().From(tableName).Cursor(nil)
	if err != nil {
		return nil, err
	}
	defer csr.Close()

	res := []*toolkit.M{}
	err = csr.Fetch(&res, 0, false)
	if err != nil {
		return nil, err
	}

	return res, nil
}

func (s *PLFinderParam) GeneratePLData() error {
	tableName := s.GetTableName()

	plmodels, err := PLModelGetAll()
	if err != nil {
		return err
	}

	col, sess, err := s.C(tableName)
	if err != nil {
		return err
	}
	defer sess.Close()

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

	group := bson.M{"_id": _id}
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
