package gdrj

import (
	"errors"
	// "github.com/ariefdarmawan/flat"
	// "github.com/eaciit/dbox"
	// _ "github.com/eaciit/dbox/dbc/csv"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	// "strings"
	"sync"
	"time"
)

var (
	mutex = &sync.Mutex{}
)

type UploadData struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string    `json:"_id" bson:"_id"`
	Filename      string    `json:"filename" bson:"filename"`
	PhysicalName  string    `json:"physicalname" bson:"physicalname"`
	Desc          string    `json:"desc" bson:"desc"`
	DataType      string    `json:"datatype" bson:"datatype"`
	DocName       string    `json:"tablename" bson:"tablename"`
	Date          time.Time `json:"date" bson:"date"`
	Account       []string  `json:"account" bson:"account"`
	Datacount     float64   `json:"datacount" bson:"datacount"`
	Process       float64   `json:"process" bson:"process"` // 0
	Status        string    `json:"status" bson:"status"`   // ready, done, failed, onprocess, rollback
	Note          string    `json:"note" bson:"note"`
	Pid           string    `json:"pid" bson:"pid"`
	Other         string    `json:"other" bson:"other"`
}

func (u *UploadData) RecordID() interface{} {
	return u.ID
}

func (u *UploadData) TableName() string {
	return "uploaddata"
}

func UploadDataGetByID(id string) *UploadData {
	u := new(UploadData)
	DB().GetById(u, id)
	return u
}

func (u *UploadData) Save() error {
	e := Save(u)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", u.TableName(), "save", e.Error()))
	}
	return e
}

func (u *UploadData) Delete() error {
	e := Delete(u)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", u.TableName(), "delete", e.Error()))
	}
	return e
}

//Location will be fullpath
func (u *UploadData) ProcessData(loc string) (err error) {
	if u.Status != "ready" {
		return
	}

	// conn, err := dbox.NewConnection(u.DataType,
	// 	&dbox.ConnectionInfo{loc, "", "", "", toolkit.M{}.Set("useheader", true)})
	// if err != nil {
	// 	err = errors.New(toolkit.Sprintf("Process File error found : %v", err.Error()))
	// 	return
	// }

	// err = conn.Connect()
	// if err != nil {
	// 	err = errors.New(toolkit.Sprintf("Process File error found : %v", err.Error()))
	// 	return
	// }

	// //next
	// for _, v := range ltf.Account {
	// var c dbox.ICursor

	mutex.Lock()
	u.Status = "onprocess"
	_ = u.Save()
	mutex.Unlock()

	// c, err = conn.NewQuery().Select().Cursor(nil)
	// if err != nil {
	// 	return
	// }
	// defer c.Close()

	// arrlt := make([]*LedgerTrans, 0, 0)
	// err = c.Fetch(&arrlt, 0, false)
	// if err != nil {
	// 	if strings.Contains(err.Error(), "Not found") {
	// 		err = nil
	// 		return
	// 	}
	// 	err = errors.New(toolkit.Sprintf("Process File error found : %v", err.Error()))
	// 	return
	// }

	go func(loc string, u *UploadData) {
		ci := 0
		// for i, v := range arrlt {
		// 	ci += 1
		// 	// ltf.Process = float64(i) / float64(len(arrlt)) * 100
		// 	err := v.Save()
		// 	if err != nil {
		// 		mutex.Lock()
		// 		ltf.Status = "failed"
		// 		ltf.Process += float64(ci)
		// 		ltf.Note = toolkit.Sprintf("Account %v process-%d error found : %v", v.Account, i, err.Error())
		// 		_ = ltf.Save()
		// 		mutex.Unlock()
		// 		return
		// 	}

		// 	if ci%5 == 0 {
		// 		mutex.Lock()
		// 		ltf.Process += float64(ci)
		// 		_ = ltf.Save()
		// 		mutex.Unlock()
		// 		ci = 0
		// 	}

		// }

		mutex.Lock()
		u.Process += float64(ci)
		if u.Process == u.Datacount {
			u.Status = "done"
		}
		_ = u.Save()
		mutex.Unlock()

	}(loc, u)
	// }

	return
}

//Add convert data file base on data type in struct(*every struct)
//will be modify with every data model
// func import2db(fullpath, idFieldName, docname string, o orm.IModel) (err error) {
// 	// filename := path + name + ".txt"
// 	// toolkit.Println("Reading file", filename)
// 	f := flat.New(fullpath, true, false)
// 	f.Delimeter = ','
// 	checkX(f.Open(), "Import")
// 	defer f.Close()
// 	c := DB().(orm.DataContext).Connection
// 	// c, e := connection()
// 	// checkX(e, "Connection")
// 	// defer c.Close()

// 	c.NewQuery().From(docname).Delete().Exec(nil)

// 	q := c.NewQuery().SetConfig("multiexec", true).From(docname).Save()
// 	defer q.Close()

// 	isEOF := false
// 	i := 0
// 	for !isEOF {
// 		i++
// 		m, e := f.ReadM()
// 		if e == io.EOF {
// 			isEOF = true
// 		} else if e != nil {
// 			err = errors.New(toolkit.Sprintf("[process-upload] Found : %v", e.Error()))
// 			return
// 		} else {
// 			var id interface{}
// 			if idFieldName == "" {
// 				id = toolkit.RandomString(32)
// 				m.Set("_id", id)
// 			} else {
// 				id = m.Get(idFieldName, "")
// 				m.Set("_id", id)
// 			}

// 			if m.Has("search_keyword") {
// 				keywords := strings.Split(m.GetString("search_keyword"), ",")
// 				newkeywords := []string{}
// 				for _, keyword := range keywords {
// 					keyword = strings.ToLower(strings.Trim(keyword, " "))
// 					if keyword != "" {
// 						newkeywords = append(newkeywords, keyword)
// 					}
// 				}
// 				m.Set("popularity", 0)
// 				m.Set("search_keyword", newkeywords)
// 			}
// 			toolkit.Printf("Saving %s record no: %d ID: %v \n", name, i, id)
// 			// checkX(q.Exec(toolkit.M{}.Set("data", m)), toolkit.Sprintf("Saving %s data: %v", id, m))
// 			e = q.Exec(toolkit.M{}.Set("data", m)
// 			if e != nil {
// 				err = errors.New(toolkit.Sprintf("[process-upload] Found : %v", e.Error()))
// 				return
// 			}
// 		}
// 	}
// }

func (u *UploadData) GetModelData() (oim orm.IModel) {

	switch u.DocName {
	case "branch":
		oim = new(Branch)
	case "costcenter":
		oim = new(CostCenter)
	case "customer":
		oim = new(Customer)
	case "directsalespl":
		oim = new(DirectSalesPL)
	case "inventorylevel":
		oim = new(InventoryLevel)
	case "plstructure":
		oim = new(PLStructure)
	case "product":
		oim = new(Product)
	case "profitcenter":
		oim = new(ProfitCenter)
	case "promotionpl":
		oim = new(PromotionPL)
	case "sales":
		oim = new(Sales)
	case "salesresource":
		oim = new(SalesResource)
	case "sgapl":
		oim = new(SGAPL)
	case "truck":
		oim = new(Truck)
	case "truckassignment":
		oim = new(TruckAssignment)
	case "truckcost":
		oim = new(TruckCost)
	}

	return
}
