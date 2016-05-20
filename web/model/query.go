package gocore

import (
	"encoding/json"
	"errors"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/csv"
	_ "github.com/eaciit/dbox/dbc/csvs"
	_ "github.com/eaciit/dbox/dbc/json"
	_ "github.com/eaciit/dbox/dbc/jsons"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	"strconv"
	"strings"
)

type queryWrapper struct {
	ci         *dbox.ConnectionInfo
	connection dbox.IConnection
	err        error
}

type MetaSave struct {
	keyword string
	data    string
}

func Query(driver string, host string, other ...interface{}) *queryWrapper {

	wrapper := queryWrapper{}
	wrapper.ci = &dbox.ConnectionInfo{host, "", "", "", nil}

	if len(other) > 0 {
		wrapper.ci.Database = other[0].(string)
	}
	if len(other) > 1 {
		wrapper.ci.UserName = other[1].(string)
	}
	if len(other) > 2 {
		wrapper.ci.Password = other[2].(string)
	}
	if len(other) > 3 {
		wrapper.ci.Settings = other[3].(toolkit.M)
	}

	wrapper.connection, wrapper.err = dbox.NewConnection(driver, wrapper.ci)
	if wrapper.err != nil {
		return &wrapper
	}

	wrapper.err = wrapper.connection.Connect()
	if wrapper.err != nil {
		return &wrapper
	}

	return &wrapper
}

func ConnectToDatabase(payload toolkit.M) (int, []toolkit.M, *DataBrowser, error) {
	var querypattern = []string{"*", "!", ".."}
	var hasLookup bool
	if payload.Has("haslookup") {
		hasLookup = payload.Get("haslookup").(bool)
	}
	_id := toolkit.ToString(payload.Get("tablename", ""))
	sort := payload.Get("sort")
	search := payload.Get("search")
	_ = search

	TblName := toolkit.M{}
	payload.Unset("browserid")
	var sorter string
	_ = sorter
	if sort != nil {
		tmsort, _ := toolkit.ToM(sort.([]interface{})[0])
		toolkit.Printf("====== sort %#v\n", tmsort["dir"])
		if tmsort["dir"] == "asc" {
			sorter = tmsort["field"].(string)
		} else if tmsort["dir"] == "desc" {
			sorter = "-" + tmsort["field"].(string)
		} else if tmsort["dir"] == nil {
			sorter = " "
		}
	} else {
		sorter = " "
	}

	dataDS := new(DataBrowser)
	if err := Get(dataDS, _id); err != nil {
		return 0, nil, nil, err
	}

	/*filterDB := dbox.Contains("TableNames", tablename)
	cursorDB, err := Find(new(DataBrowser), filterDB)
	if err != nil {
		return 0, nil, nil, err
	}

	dataDS := new(DataBrowser)
	if err = cursorDB.Fetch(dataDS, 1, false); err != nil {
		return 0, nil, nil, err
	}*/

	driver, ci := new(Login).GetConnectionInfo(CONF_DB_GDRJ)
	connection, err := dbox.NewConnection(driver, ci)
	if err != nil {
		return 0, nil, nil, err
	}
	if err = connection.Connect(); err != nil {
		return 0, nil, nil, err
	}

	TblName.Set("from", dataDS.TableNames)
	payload.Set("from", dataDS.TableNames) /*skip, take and sort already push into payload*/

	qcount, _ := parseQuery(connection.NewQuery(), TblName)
	query, _ := parseQuery(connection.NewQuery(), payload)

	var selectfield string
	for _, metadata := range dataDS.MetaData {
		tField := metadata.Field
		if payload.Has(tField) {
			selectfield = toolkit.ToString(tField)
			if toolkit.IsSlice(payload[tField]) {
				query = query.Where(dbox.In(tField, payload[tField].([]interface{})...))
				qcount = qcount.Where(dbox.In(tField, payload[tField].([]interface{})...))
			} else if !toolkit.IsNilOrEmpty(payload[tField]) {
				var hasPattern bool
				for _, val := range querypattern {
					if strings.Contains(toolkit.ToString(payload[tField]), val) {
						hasPattern = true
					}
				}
				if hasPattern {
					query = query.Where(dbox.ParseFilter(toolkit.ToString(tField), toolkit.ToString(payload[tField]),
						toolkit.ToString(metadata.DataType), ""))
					qcount = qcount.Where(dbox.ParseFilter(toolkit.ToString(tField), toolkit.ToString(payload[tField]),
						toolkit.ToString(metadata.DataType), ""))
				} else {
					switch toolkit.ToString(metadata.DataType) {
					case "int":
						query = query.Where(dbox.Eq(tField, toolkit.ToInt(payload[tField], toolkit.RoundingAuto)))
						qcount = qcount.Where(dbox.Eq(tField, toolkit.ToInt(payload[tField], toolkit.RoundingAuto)))
					case "float32":
						query = query.Where(dbox.Eq(tField, toolkit.ToFloat32(payload[tField], 2, toolkit.RoundingAuto)))
						qcount = qcount.Where(dbox.Eq(tField, toolkit.ToFloat32(payload[tField], 2, toolkit.RoundingAuto)))
					case "float64":
						query = query.Where(dbox.Eq(tField, toolkit.ToFloat64(payload[tField], 2, toolkit.RoundingAuto)))
						qcount = qcount.Where(dbox.Eq(tField, toolkit.ToFloat64(payload[tField], 2, toolkit.RoundingAuto)))
					default:
						query = query.Where(dbox.Contains(tField, toolkit.ToString(payload[tField])))
						qcount = qcount.Where(dbox.Contains(tField, toolkit.ToString(payload[tField])))
					}
				}
			}
		}
	}

	if hasLookup && selectfield != "" {
		query = query.Select(selectfield).Group(selectfield)
		qcount = qcount.Select(selectfield).Group(selectfield)

	}

	ccount, err := qcount.Cursor(nil)
	if err != nil {
		return 0, nil, nil, err
	}
	defer ccount.Close()

	dcount := ccount.Count()

	cursor, err := query.Cursor(nil)
	if err != nil {
		return 0, nil, nil, err
	}
	defer cursor.Close()

	data := []toolkit.M{}
	cursor.Fetch(&data, 0, false)

	if err != nil {
		return 0, nil, nil, err
	}

	if hasLookup && selectfield != "" {
		dataMongo := []toolkit.M{}
		for _, val := range data {
			mVal, _ := toolkit.ToM(val.Get("_id"))
			dataMongo = append(dataMongo, mVal)
		}
		data = dataMongo
	}

	return dcount, data, dataDS, nil
}

func parseQuery(query dbox.IQuery, queryInfo toolkit.M) (dbox.IQuery, MetaSave) {
	metaSave := MetaSave{}

	if qFrom := queryInfo.Get("from", "").(string); qFrom != "" {
		query = query.From(qFrom)
	}
	if qSelect := queryInfo.Get("select", "").(string); qSelect != "" {
		if qSelect != "*" {
			query = query.Select(strings.Split(qSelect, ",")...)
		}
	}
	if qTakeRaw, qTakeOK := queryInfo["take"]; qTakeOK {
		if qTake, ok := qTakeRaw.(float64); ok {
			query = query.Take(int(qTake))
		}
		if qTake, ok := qTakeRaw.(int); ok {
			query = query.Take(qTake)
		}
	}
	if qSkipRaw, qSkipOK := queryInfo["skip"]; qSkipOK {
		if qSkip, ok := qSkipRaw.(float64); ok {
			query = query.Skip(int(qSkip))
		}
		if qSkip, ok := qSkipRaw.(int); ok {
			query = query.Skip(qSkip)
		}
	}
	if qOrder := queryInfo.Get("order", "").(string); qOrder != "" {
		orderAll := map[string]string{}
		err := json.Unmarshal([]byte(qOrder), &orderAll)
		if err == nil {
			orderString := []string{}
			for key, val := range orderAll {
				orderString = append(orderString, key)
				orderString = append(orderString, val)
			}
			query = query.Order(orderString...)
		}
	}

	if qInsert := queryInfo.Get("insert", "").(string); qInsert != "" {
		if qInsert != "" {
			metaSave.keyword = "insert"
			metaSave.data = qInsert
			query = query.Insert()
		}
	}
	if qUpdate := queryInfo.Get("update", "").(string); qUpdate != "" {
		if qUpdate != "" {
			metaSave.keyword = "update"
			metaSave.data = qUpdate
			query = query.Update()
		}
	}
	if _, qDeleteOK := queryInfo["delete"]; qDeleteOK {
		metaSave.keyword = "delete"
		query = query.Delete()
	}
	if qCommand := queryInfo.Get("command", "").(string); qCommand != "" {
		command := map[string]interface{}{}
		err := json.Unmarshal([]byte(qCommand), &command)
		if err == nil {
			for key, value := range command {
				query = query.Command(key, value)
				break
			}
		}
	}

	if qWhere := queryInfo.Get("where", "").(string); qWhere != "" {
		whereAll := []map[string]interface{}{}
		err := json.Unmarshal([]byte(qWhere), &whereAll)
		if err == nil {
			allFilter := []*dbox.Filter{}

			for _, each := range whereAll {
				where, _ := toolkit.ToM(each)
				filter := FilterParse(where)
				if filter != nil {
					allFilter = append(allFilter, filter)
				}
			}

			query = query.Where(allFilter...)
		}
	}

	if freeText := queryInfo.Get("freetext", "").(string); freeText != "" {
		query = query.Command("freequery", toolkit.M{}.
			Set("syntax", freeText))
		toolkit.Println(freeText)
	}

	return query, metaSave
}

func (c *queryWrapper) CheckIfConnected() error {
	return c.err
}

func (c *queryWrapper) Connect() (dbox.IConnection, error) {
	if c.err != nil {
		return nil, c.err
	}

	return c.connection, nil
}

func (c *queryWrapper) SelectOne(tableName string, clause ...*dbox.Filter) (toolkit.M, error) {
	if c.err != nil {
		return nil, c.err
	}

	connection := c.connection
	defer connection.Close()

	query := connection.NewQuery().Select().Take(1)
	if tableName != "" {
		query = query.From(tableName)
	}
	if len(clause) > 0 {
		query = query.Where(clause[0])
	}

	cursor, err := query.Cursor(nil)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	data := make([]toolkit.M, 0)
	err = cursor.Fetch(&data, 0, false)
	if err != nil {
		return nil, err
	}

	if len(data) == 0 {
		return nil, errors.New("No data found")
	}

	return data[0], nil
}

func (c *queryWrapper) Delete(tableName string, clause *dbox.Filter) error {
	if c.err != nil {
		return c.err
	}

	connection := c.connection
	defer connection.Close()

	query := connection.NewQuery().Delete()
	if tableName != "" {
		query = query.From(tableName)
	}

	err := query.Where(clause).Exec(nil)
	if err != nil {
		return err
	}

	return nil
}

func (c *queryWrapper) SelectAll(tableName string, clause ...*dbox.Filter) ([]toolkit.M, error) {
	if c.err != nil {
		return nil, c.err
	}

	connection := c.connection
	defer connection.Close()

	query := connection.NewQuery().Select()
	if tableName != "" {
		query = query.From(tableName)
	}
	if len(clause) > 0 {
		query = query.Where(clause[0])
	}

	cursor, err := query.Cursor(nil)
	if err != nil {
		return nil, err
	}
	defer cursor.Close()

	data := make([]toolkit.M, 0)
	err = cursor.Fetch(&data, 0, false)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (c *queryWrapper) Save(tableName string, payload map[string]interface{}, clause ...*dbox.Filter) error {
	if c.err != nil {
		return c.err
	}

	connection := c.connection
	defer connection.Close()

	query := connection.NewQuery()
	if tableName != "" {
		query = query.From(tableName)
	}

	if len(clause) == 0 {
		err := query.Insert().Exec(toolkit.M{"data": payload})
		if err != nil {
			return err
		}

		return nil
	} else {
		err := query.Update().Where(clause[0]).Exec(toolkit.M{"data": payload})
		if err != nil {
			return err
		}

		return nil
	}

	return errors.New("nothing changes")
}

func FilterParse(where toolkit.M) *dbox.Filter {
	field := where.Get("field", "").(string)
	value := toolkit.Sprintf("%v", where["value"])

	if key := where.Get("key", "").(string); key == "Eq" {
		valueInt, errv := strconv.Atoi(toolkit.Sprintf("%v", where["value"]))
		if errv == nil {
			return dbox.Eq(field, valueInt)
		} else {
			return dbox.Eq(field, value)
		}
	} else if key == "Ne" {
		valueInt, errv := strconv.Atoi(toolkit.Sprintf("%v", where["value"]))
		if errv == nil {
			return dbox.Ne(field, valueInt)
		} else {
			return dbox.Ne(field, value)
		}
	} else if key == "Lt" {
		valueInt, errv := strconv.Atoi(toolkit.Sprintf("%v", where["value"]))
		if errv == nil {
			return dbox.Lt(field, valueInt)
		} else {
			return dbox.Lt(field, value)
		}
	} else if key == "Lte" {
		valueInt, errv := strconv.Atoi(toolkit.Sprintf("%v", where["value"]))
		if errv == nil {
			return dbox.Lte(field, valueInt)
		} else {
			return dbox.Lte(field, value)
		}
	} else if key == "Gt" {
		valueInt, errv := strconv.Atoi(toolkit.Sprintf("%v", where["value"]))
		if errv == nil {
			return dbox.Gt(field, valueInt)
		} else {
			return dbox.Gt(field, value)
		}
	} else if key == "Gte" {
		valueInt, errv := strconv.Atoi(toolkit.Sprintf("%v", where["value"]))
		if errv == nil {
			return dbox.Gte(field, valueInt)
		} else {
			return dbox.Gte(field, value)
		}
	} else if key == "In" {
		valueArray := []interface{}{}
		for _, e := range strings.Split(value, ",") {
			valueArray = append(valueArray, strings.Trim(e, ""))
		}
		return dbox.In(field, valueArray...)
	} else if key == "Nin" {
		valueArray := []interface{}{}
		for _, e := range strings.Split(value, ",") {
			valueArray = append(valueArray, strings.Trim(e, ""))
		}
		return dbox.Nin(field, valueArray...)
	} else if key == "Contains" {
		return dbox.Contains(field, value)
	} else if key == "Or" {
		subs := where.Get("value", []interface{}{}).([]interface{})
		filtersToMerge := []*dbox.Filter{}
		for _, eachSub := range subs {
			eachWhere, _ := toolkit.ToM(eachSub)
			filtersToMerge = append(filtersToMerge, FilterParse(eachWhere))
		}
		return dbox.Or(filtersToMerge...)
	} else if key == "And" {
		subs := where.Get("value", []interface{}{}).([]interface{})
		filtersToMerge := []*dbox.Filter{}
		for _, eachSub := range subs {
			eachWhere, _ := toolkit.ToM(eachSub)
			filtersToMerge = append(filtersToMerge, FilterParse(eachWhere))
		}
		return dbox.And(filtersToMerge...)
	}

	return nil
}
