package gdrj

import (
	"errors"
	"github.com/ariefdarmawan/flat"
	// "github.com/eaciit/dbox"
	// _ "github.com/eaciit/dbox/dbc/csv"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"io"
	"reflect"
	"regexp"
	"strings"
	"sync"
	"time"
)

var (
	mutex = &sync.Mutex{}
)

type UploadData struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string `json:"_id" bson:"_id"`
	Filename      string
	PhysicalName  string
	Desc          string
	DataType      string
	FieldId       string
	DocName       string
	Date          time.Time
	Datacount     float64
	Process       float64 // 0
	Status        string  // ready, done, failed, onprocess, rollback
	Note          string
	Pid           string
	Other         string
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

func (u *UploadData) PreSave() error {
	return nil
}

func (u *UploadData) PostSave() error {
	return nil
}

func (u *UploadData) Save() error {
	e := Save(u)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v", u.TableName(), "save", e.Error()))
	}
	return e
}

func (u *UploadData) Delete() error {
	e := Delete(u)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : %v", u.TableName(), "delete", e.Error()))
	}
	return e
}

//Location will be fullpath
func (u *UploadData) ProcessData(loc string) (err error) {
	var wg sync.WaitGroup

	if u.Status != "ready" {
		err = errors.New("Process status is not ready")
		return
	}

	//Pre check before run
	mutex.Lock()
	u.Status = "onprocess"
	_ = u.Save()
	mutex.Unlock()

	wg.Add(1)
	go func(loc string, u *UploadData) {
		ci := 0
		f := flat.New(loc, true, false)
		f.Delimeter = ','
		f.Config = toolkit.M{}.Set("useheader", true)
		err := f.Open()
		if err != nil {
			u.Status = "failed"
			u.Note = toolkit.Sprintf("[process-upload] Found : %v", err.Error())
			u.Save()
			return
		}

		isEOF := false
		for !isEOF {
			m, err := f.ReadM()
			if err == io.EOF {
				isEOF = true
			} else if err != nil {
				u.Process = float64(ci)
				u.Status = "failed"
				u.Note = toolkit.Sprintf("[process-upload-%d] Found : %v", ci, err.Error())
				u.Save()
				return
			} else {
				ci++
				omod := GetModelData(u.DocName)
				// toolkit.Printf("orm model%+v\n", omod)

				var id interface{}
				if u.FieldId == "" {
					id = toolkit.RandomString(32)
					m.Set("_id", id)
				} else {
					id = m.Get(u.FieldId, "")
					m.Set("_id", id)
				}

				Mapautotype(m)
				Mapstructtype(m, omod)

				err = toolkit.Serde(m, omod, "json")
				if err != nil {
					u.Status = "failed"
					u.Process = float64(ci)
					u.Note = toolkit.Sprintf("[process-upload-%d] Found : %v", ci, err.Error())
					u.Save()
					return
				}

				err = Save(omod)
				if err != nil {
					u.Status = "failed"
					u.Process = float64(ci)
					u.Note = toolkit.Sprintf("[process-upload-%d] Found : %v", ci, err.Error())
					u.Save()
					return
				}

				if ci%5 == 0 {
					mutex.Lock()
					u.Process = float64(ci)
					_ = u.Save()
					mutex.Unlock()
				}
			}
		}

		mutex.Lock()
		u.Process = u.Datacount
		u.Status = "done"
		_ = u.Save()

		mutex.Unlock()
		wg.Done()
	}(loc, u)
	// }
	wg.Wait()
	return
}

func GetModelData(docname string) orm.IModel {

	switch docname {
	case "branch":
		oim := new(Branch)
		return oim
	case "brand":
		oim := new(Brand)
		return oim
	case "costcenter":
		oim := new(CostCenter)
		return oim
	case "costcentertype":
		oim := new(CostCenterType)
		return oim
	case "customer":
		oim := new(Customer)
		return oim
	case "customergroup":
		oim := new(CustomerGroup)
		return oim
	case "directsalespl":
		oim := new(DirectSalesPL)
		return oim
	case "entity":
		oim := new(Entity)
		return oim
	case "hbrandcategory":
		oim := new(HBrandCategory)
		return oim
	case "hcostcentergroup":
		oim := new(HCostCenterGroup)
		return oim
	case "headcount":
		oim := new(HeadCount)
		return oim
	case "hgeographi":
		oim := new(HGeographi)
		return oim
	case "indirectsalespl":
		oim := new(IndirectSalesPL)
		return oim
	case "inventorylevel":
		oim := new(InventoryLevel)
		return oim
	case "keyaccount":
		oim := new(KeyAccount)
		return oim
	case "ledgeraccount":
		oim := new(LedgerAccount)
		return oim
	case "ledgersummaries":
		oim := new(LedgerSummary)
		return oim
	case "ledgertrans":
		oim := new(LedgerTrx)
		return oim
	case "plstructure":
		oim := new(PLStructure)
		return oim
	case "product":
		oim := new(Product)
		return oim
	case "profitcenter":
		oim := new(ProfitCenter)
		return oim
	case "promotionpl":
		oim := new(PromotionPL)
		return oim
	case "sales":
		oim := new(Sales)
		return oim
	case "rawsalesdetail":
		oim := new(SalesDetail)
		return oim
	case "rawsalesheader":
		oim := new(SalesHeader)
		return oim
	case "salesmonthly":
		oim := new(SalesMonthly)
		return oim
	case "salesresource":
		oim := new(SalesResource)
		return oim
	case "sgapl":
		oim := new(SGAPL)
		return oim
	case "truck":
		oim := new(Truck)
		return oim
	case "truckassignment":
		oim := new(TruckAssignment)
		return oim
	case "truckcost":
		oim := new(TruckCost)
		return oim
	}

	return nil
}

func Mapstructtype(m toolkit.M, omod orm.IModel) {
	tv := reflect.TypeOf(omod).Elem()
	if tv.Kind() != reflect.Struct {
		tv = tv.Elem()
	}

	for i := 0; i < tv.NumField(); i++ {
		ttype := tv.Field(i).Type.String()
		str := ""

		if m.Has(tv.Field(i).Name) {
			str = tv.Field(i).Name
		} else if m.Has(strings.ToLower(tv.Field(i).Name)) {
			str = strings.ToLower(tv.Field(i).Name)
		}
		// toolkit.Println(tv.Field(i).Name, ":", str, ":", ttype)

		if str != "" {
			switch {
			case strings.Contains(ttype, "int"):
				m.Set(str, toolkit.ToInt(m[str], toolkit.RoundingAuto))
			case strings.Contains(ttype, "string"):
				m.Set(str, toolkit.ToString(m[str]))
			case strings.Contains(ttype, "float"):
				tstr := toolkit.ToString(m[str])
				decimalPoint := len(tstr) - (strings.Index(tstr, ".") + 1)
				m.Set(str, toolkit.ToFloat64(tstr, decimalPoint, toolkit.RoundingAuto))
			}
		}
	}

	return
}

func Mapautotype(m toolkit.M) {
	for k, v := range m {
		str := toolkit.ToString(v)

		F1 := "(^(0[0-9]|[0-9]|(1|2)[0-9]|3[0-1])(\\.|\\/|-)(0[0-9]|[0-9]|1[0-2])(\\.|\\/|-)[\\d]{4}$)"
		F2 := "(^[\\d]{4}(\\.|\\/|-)(0[0-9]|[0-9]|1[0-2])(\\.|\\/|-)(0[0-9]|[0-9]|(1|2)[0-9]|3[0-1])$)"
		if matchF1, _ := regexp.MatchString(F1, str); matchF1 {
			tstr := strings.Replace(str, ".", "/", -1)
			tstr = strings.Replace(str, "-", "/", -1)
			tdate := toolkit.String2Date(tstr, "dd/MM/YYYY")
			if !tdate.IsZero() {
				m.Set(k, tdate)
			}
			continue
		}

		if matchF2, _ := regexp.MatchString(F2, str); matchF2 {
			tstr := strings.Replace(str, ".", "/", -1)
			tstr = strings.Replace(str, "-", "/", -1)
			tdate := toolkit.String2Date(tstr, "YYYY/MM/dd")
			if !tdate.IsZero() {
				m.Set(k, tdate)
			}
			continue
		}

		x := strings.Index(str, ".")
		tstr := str
		if x > 0 {
			tstr = strings.Replace(tstr, ".", "", 1)
		}

		if matchNumber, _ := regexp.MatchString("^\\d+$", tstr); matchNumber && string(tstr[0]) != "0" {
			if x > 0 {
				m.Set(k, toolkit.ToFloat64(str, x, toolkit.RoundingAuto))
			} else {
				m.Set(k, toolkit.ToInt(str, toolkit.RoundingAuto))
			}
		}
	}
	return
}
