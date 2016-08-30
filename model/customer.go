package gdrj

import (
	"errors"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type ChannelTypeEnum int

const (
	ExportChannel              ChannelTypeEnum = 1
	GeneralTradeChannel                        = 2
	ModernTradeChannel                         = 3
	IndustrialTradeChannel                     = 4
	MotoristChannel                            = 5
	RegionalDistributorChannel                 = 6
)

type Customer struct {
	orm.ModelBase     `json:"-" bson:"-"`
	ID                string `json:"_id" bson:"_id"`
	Name              string
	BranchID          string
	BranchName        string
	CustAddr1         string
	CustAddr2         string
	IsRD              bool
	DepoID            string
	DepoName          string
	KeyAccount        string
	CustType          string
	ChannelID         string
	ChannelName       string
	ReportChannel     string
	ReportSubChannel  string
	ChannelOrRD       string
	CustomerGroup     string
	CustomerGroupName string
	National          string
	Zone              string
	Region            string
	AreaID            string
	AreaName          string
	VDIST_ID          string
}

func (c *Customer) RecordID() interface{} {
	return c.ID
}

func (c *Customer) TableName() string {
	return "customer"
}

func CustomerGetByID(id string) *Customer {
	c := new(Customer)
	DB().GetById(c, id)
	return c
}

func CustomerGetAll() ([]*Customer, error) {
	cursor, err := DB().Find(new(Customer), nil)
	if err != nil {
		return nil, err
	}

	result := []*Customer{}
	err = cursor.Fetch(&result, 0, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}

func CustomerGetContains(keyword string, otherparam toolkit.M) ([]*Customer, error) {
	filter := []*dbox.Filter{dbox.Or(dbox.Contains("_id", keyword), dbox.Contains("name", keyword))}
	if otherparam.Has("custgroup") {
		custgroup := []interface{}{}
		for _, val := range otherparam.Get("custgroup", []string{}).([]string) {
			custgroup = append(custgroup, val)
		}

		// filter = []*dbox.Filter{dbox.And(dbox.Or(dbox.Contains("_id", keyword), dbox.Contains("name", keyword)),
		// 	dbox.In("customergroup", custgroup...))}
		filter = append(filter, dbox.In("customergroup", custgroup...))
	}

	param := toolkit.M{}.Set("where", filter)

	if len(keyword) < 6 {
		param = param.Set("limit", 100)
	}

	cursor, err := DB().Find(new(Customer), param)
	if err != nil {
		return nil, err
	}

	result := []*Customer{}
	err = cursor.Fetch(&result, 100, false)
	if err != nil {
		return nil, err
	}
	cursor.Close()

	return result, nil
}

func GetFilteredCustomer(cgroup, keyaccount, cchannel string, take, skip int) (arla []*LedgerAccount) {
	conf := toolkit.M{}.Set("skip", skip)
	if take > 0 {
		conf.Set("take", take)
	}

	arla = make([]*LedgerAccount, 0, 0)
	dboxf := dbox.And(dbox.Contains("group", cgroup), dbox.Contains("keyaccount", keyaccount), dbox.Contains("channel", cchannel))
	c, e := Find(new(LedgerAccount), dboxf, conf)
	if e != nil {
		return
	}

	_ = c.Fetch(&arla, 0, false)
	return
}

func (c *Customer) Save() error {
	e := Save(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "save", e.Error()))
	}
	return e
}

func (c *Customer) Delete() error {
	e := Delete(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "delete", e.Error()))
	}
	return e
}

func (c ChannelTypeEnum) String() string {

	switch c {
	case ExportChannel:
		return "Export"
	case GeneralTradeChannel:
		return "General Trade"
	case ModernTradeChannel:
		return "Modern Trade"
	case IndustrialTradeChannel:
		return "Industrial Trade"
	case MotoristChannel:
		return "Motorist"
	case RegionalDistributorChannel:
		return "Regional Distributor"
	}

	return "unknown"
}

func ToChannelEnum(d int) ChannelTypeEnum {
	switch d {
	case 1:
		return ExportChannel
	case 2:
		return GeneralTradeChannel
	case 3:
		return ModernTradeChannel
	case 4:
		return IndustrialTradeChannel
	case 5:
		return MotoristChannel
	case 6:
		return RegionalDistributorChannel
	}
	return 0
}
