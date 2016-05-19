package gocore

import (
	"eaciit/gdrj/web/helper"
	"encoding/json"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/jsons"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
)

type DataBrowser struct {
	orm.ModelBase
	ID         string `json:"_id",bson:"_id"`
	TableNames string
	MetaData   []*StructInfo
}

type StructInfo struct {
	Field        string
	DataType     string
	Sortable     bool
	SimpleFilter bool
}

type MetaSave struct {
	keyword string
	data    string
}

func (b *DataBrowser) TableName() string {
	return "databrowser"
}

func (b *DataBrowser) RecordID() interface{} {
	return b.ID
}

func ConnectToDatabase(payload toolkit.M) (int, []toolkit.M, *DataBrowser, error) {
	var querypattern = []string{"*", "!", ".."}
	var hasLookup bool
	if payload.Has("haslookup") {
		hasLookup = payload.Get("haslookup").(bool)
	}
	_id := toolkit.ToString(payload.Get("browserid", ""))
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
	err := Get(dataDS, _id)
	if err != nil {
		return 0, nil, nil, err
	}

	driver, ci := new(Login).GetConnectionInfo(CONF_DB_GDRJ)
	connection, err := dbox.NewConnection(driver, ci)
	if err != nil {
		return 0, nil, nil, err
	}
	if err = connection.Connect(); err != nil {
		return 0, nil, nil, err
	}

	TblName.Set("from", dataDS.TableNames)
	payload.Set("from", dataDS.TableNames)

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
				filter := helper.FilterParse(where)
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
