package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/web/model"
	"errors"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"gopkg.in/mgo.v2"
	"gopkg.in/mgo.v2/bson"
	"os"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

const (
	OUTLET_GROUPING string = "outletgrouping"
	OUTLET_NUMBER   string = "outletnumber"
	OUTLET_FINAL    string = "outletfinal"
)

var (
	conn           dbox.IConnection
	totalData      int
	wd, _          = os.Getwd()
	allCollections = []string{}
)

var pnlMutex sync.Mutex

type OutletFinder struct {
	Tablename   string
	TableType   string
	Breakdowns  []string
	TableSource string
}

var breakdownList = map[int][]string{}

func setinitialconnection() {
	var err error
	ci := &dbox.ConnectionInfo{
		"localhost:27017",
		"ecgodrej",
		"",
		"",
		toolkit.M{}.Set("timeout", 300),
	}

	conn, err = dbox.NewConnection("mongo", ci)

	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}

	if err = conn.Connect(); err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}

	err = gdrj.SetDb(conn)
	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}
}

func (s *OutletFinder) ConnectToDB() (*mgo.Database, *mgo.Session, error) {
	ci := gdrj.DB().Connection.Info()
	mgoi := &mgo.DialInfo{
		Addrs:    []string{ci.Host},
		Timeout:  10 * time.Minute,
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

func main() {
	grouplist := []string{"date_month", "date_quartertxt",
		"customer_branchname", "product_brand", "customer_channelid"}
	tabletype := []string{"outletgrouping", "outletnumber", "outletfinal"}

	gocore.ConfigPath = filepath.Join(wd, "config")

	setinitialconnection()
	defer gdrj.CloseDb()

	res := new(toolkit.Result)
	res.Status = toolkit.Status_NOK
	t0 := time.Now()

	for _, aggr := range tabletype {
		for _, group := range grouplist {
			payload := new(OutletFinder)
			breakdown := []string{"date_fiscal"}
			breakdown = append(breakdown, group)
			if group == "customer_channelid" {
				breakdown = append(breakdown, "customer_channelname")
			}
			sort.Strings(breakdown)
			payload.Breakdowns = append(payload.Breakdowns, breakdown...)
			payload.TableType = aggr
			if payload.TableType == OUTLET_FINAL {
				payload.generateoutletdata()
			} else {
			loopCreateCol:
				for {
					res = payload.createCollection().(*toolkit.Result)
					if res.Status == "OK" {
						break loopCreateCol
					}
					time.Sleep(1000 * time.Millisecond)
				}
				if payload.TableType == OUTLET_NUMBER {
					db, sess, err := payload.ConnectToDB()
					if err != nil {
						os.Exit(1)
					}
					defer sess.Close()
					col := db.C(payload.TableSource)
					col.DropCollection()
					toolkit.Println("collection", payload.TableSource, " has been dropped")
				}
			}
		}
	}
	toolkit.Printfn("Total time %s", time.Since(t0).String())
}

func (payload *OutletFinder) createCollection() interface{} {
	res := new(toolkit.Result)

	toolkit.Println("counting")

	ok, err := payload.CountOutletData()
	if err != nil {
		res.SetError(err)
		return res
	}

	toolkit.Println("counted", ok)

	tableName := payload.GetOutletTable()
	toolkit.Println("______ TABLENAME TABLENAME TABLENAME", tableName)

	if ok {
		res.Status = toolkit.Status_OK
		return res
	}

	if gocore.GetConfig(tableName) == "otw" {
		res.SetError(errors.New("still processing, might take a while"))
		toolkit.Println("on progress")
		return res
	}

	go func() {
		toolkit.Println("______", tableName, ok, gocore.GetConfig(tableName, ""))
		err = payload.GenerateOutletData()
		if err != nil {
			toolkit.Println("done with error:", err.Error())
		} else {
			toolkit.Println("done")
		}

		pnlMutex.Lock()
		gocore.RemoveConfig(tableName)
		pnlMutex.Unlock()
	}()

	pnlMutex.Lock()
	gocore.SetConfig(tableName, "otw")
	pnlMutex.Unlock()

	res.SetError(errors.New("still processing, might take a while"))
	toolkit.Println("just start")

	return res
}

func (s *OutletFinder) generateoutletdata() {

	tablename := "outlet_number"

	for _, val := range s.Breakdowns {
		tablename += "_" + val
	}
	coutletnumb, _ := conn.NewQuery().Select().From("_" + tablename).Cursor(nil)

	defer coutletnumb.Close()
	count := coutletnumb.Count()
	totalData += count
	t0 := time.Now()

	iscount := 0

	collection := tablename
	toolkit.Println("Creating", collection)

	var err error
	for {
		iscount++

		outletdata := toolkit.M{}
		err = coutletnumb.Fetch(&outletdata, 1, false)
		if err != nil {
			break
		}
		newdata := toolkit.M{}
		key, _ := toolkit.ToM(outletdata.Get("_id"))
		newdata.Set("key", key)
		newdata.Set("qty", outletdata.GetInt("qty"))

		_idVal := ""
		for i, val := range s.Breakdowns {
			if i == 0 {
				_idVal = toolkit.ToString(key[val])
			} else {
				_idVal += "_" + toolkit.ToString(key[val])
			}
		}
		newdata.Set("_id", _idVal)

		conn.NewQuery().
			From(collection).
			SetConfig("multiexec", true).
			Save().
			Exec(toolkit.M{}.Set("data", newdata))

		toolkit.Printfn("Processing %d of %d (%d %%) in %s", iscount, count, iscount*100/count,
			time.Since(t0).String())
	}

	toolkit.Println("collection", collection, " has been created")

	db, sess, err := s.ConnectToDB()
	if err != nil {
		os.Exit(1)
	}
	defer sess.Close()
	col := db.C("_" + tablename)
	col.DropCollection()
	toolkit.Println("collection _" + tablename + " has been dropped")

	return
}

func (s *OutletFinder) GetOutletTable() string {
	tablename := ""
	if s.TableType == OUTLET_GROUPING {
		tablename = "date_fiscal"
		for _, val := range s.Breakdowns {
			if val == "date_fiscal" {
				continue
			}
			tablename += "_" + val
		}
	} else if s.TableType == OUTLET_NUMBER {
		tablename = "_outlet_number"
		for _, val := range s.Breakdowns {
			tablename += "_" + val
		}
	}

	return tablename
}

func (s *OutletFinder) CountOutletData() (bool, error) {
	_, _, err := s.ConnectToDB()

	tableName := s.GetOutletTable()

	csr, err := gdrj.DB().Connection.NewQuery().From(tableName).Take(2).Cursor(nil)
	if err != nil {
		return false, err
	}
	defer csr.Close()

	return (csr.Count() > 0), nil
}

func (s *OutletFinder) GenerateOutletData() error {
	tableName := s.GetOutletTable()
	tablesource := ""

	db, sess, err := s.ConnectToDB()
	if err != nil {
		return err
	}
	defer sess.Close()

	if s.TableType == OUTLET_GROUPING {
		tablesource = "salespls_minifycust"
	} else if s.TableType == OUTLET_NUMBER {
		tablesource = "date_fiscal"
		for _, val := range s.Breakdowns {
			if val == "date_fiscal" {
				continue
			}
			tablesource += "_" + val
		}
	}
	col := db.C(tablesource)
	s.TableSource = tablesource

	_id := bson.M{}
	for _, each := range s.Breakdowns {
		if s.TableType == OUTLET_GROUPING {
			val := each
			if each == "date_quartertxt" {
				val = "date_quarter"
			}
			_id[each] = "$" + val
		} else if s.TableType == OUTLET_NUMBER {
			_id[each] = "$_id." + each
		}
	}
	group := bson.M{}
	if s.TableType == OUTLET_GROUPING {
		_id["customer_name"] = "$" + "customer_name"
		group = bson.M{
			"_id": _id,
		}
	} else if s.TableType == OUTLET_NUMBER {
		group = bson.M{
			"_id": _id,
			"qty": bson.M{"$sum": 1},
		}
	}

	pipes := []bson.M{{"$group": group}, {"$out": tableName}}
	pipe := col.Pipe(pipes)

	res := []*toolkit.M{}
	err = pipe.AllowDiskUse().All(&res)
	if err != nil {
		return err
	}

	_ = res
	return nil
}
