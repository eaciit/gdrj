package gdrj

import (
	"errors"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"gopkg.in/mgo.v2/bson"
	"time"
)

type SalesRDManeh struct {
	orm.ModelBase                                                      `json:"-" bson:"-"`
	ID                                                                 string `json:"_id" bson:"_id"`
	Month                                                              int
	Year                                                               int
	ChannelID, ChannelName, SKUID, ProductName, OutletID, CustomerName string
	CustType, CustTypeName, City, Src, CustGroup, CustGroupName        string
	Amount                                                             float64
}

type MasterCustomerRD struct {
	orm.ModelBase                                  `json:"-" bson:"-"`
	ID                                             string `json:"_id" bson:"_id"`
	ChannelID, ChannelName, CustType, CustTypeName string
	OutletID                                       string
	CustGroup, CustGroupName, CustomerName         string
}

type CsvReport struct {
	orm.ModelBase                                             `bson:"-" json:"-"`
	ID                                                        string `bson:"_id" json:"_id"`
	BranchID, Branch, ChannelID, Channel, Date                string
	GrossAmount, DiscountAmount, ReturnAmount, ReturnDiscount float64
	InvoiceAmount, ReturnInvoiceAmount                        float64
}

type SalesRD struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            bson.ObjectId `json:"_id" bson:"_id"`
	Period        int
	Year          int
	EntityID      string
	BranchID      string
	Account       int
	CCID          string
	PCID          string
	SKUID         int
	ProductName   string
	OutletID      int
	OutletName    string
	AmountinIDR   float64
	City          string
	Region        string
	Area          string
	Zone          string
	National      string
}

type SalesRDClean struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            bson.ObjectId `json:"_id" bson:"_id"`
	Period        int
	Year          int
	EntityID      string
	BranchID      string
	Account       string
	CCID          string
	PCID          string
	SKUID         string
	ProductName   string
	OutletID      string
	OutletName    string
	AmountinIDR   float64
	City          string
	Region        string
	Area          string
	Zone          string
	National      string
}

type OutletGeo struct {
	orm.ModelBase `json:"-" bson:"-"`
	ID            int `json:"_id" bson:"_id"`
	OutletName    string
	City          string
	Region        string
	Area          string
	Zone          string
	National      string
}

type Ads struct {
	orm.ModelBase                                        `json:"-" bson:"-"`
	ID                                                   string `json:"_id" bson:"_id"`
	Year, Period                                         int
	EntityID, Account, AccountDescription, BrandCategory string
	Brand, Grouping, ApProposalNo, PCID, Src             string
	Amountinidr                                          float64
}

type Promo struct {
	orm.ModelBase                                                        `json:"-" bson:"-"`
	ID                                                                   bson.ObjectId `json:"_id" bson:"_id"`
	Year, Period                                                         int
	AmountinIDR                                                          float64
	EntityID, Account, AccountDescription, Grouping                      string
	APProposalNo, CCID, PCID, CustomerName, City                         string
	ChannelID, BranchID, KeyAccountGroup, KeyAccountCode, SKUID_BrandCat string
	BrandName, Brand                                                     string
}

type DiscountActivity struct {
	orm.ModelBase                                        `json:"-" bson:"-"`
	ID                                                   bson.ObjectId `json:"_id" bson:"_id"`
	Year, Period                                         int
	AmountinIDR                                          float64
	EntityID, Account, AccountDescription                string
	PCID, CustomerName, City, ChannelName                string
	ChannelID, BranchID, KeyAccountGroup, KeyAccountCode string
	Brand, Order, Material, LongTextOrder, BusinessArea  string
}

type OutletNumber struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string     `bson:"_id" json:"_id"`
	Month         time.Month `bson:"date_month" json:"date_month"`
	Quarter       string     `bson:"date_quarter" json:"date_quarter"`
	Fiscal        string     `bson:"date_fiscal" json:"date_fiscal"`
	CustomerID    string     `bson:"customer_id" json:"customer_id"`
	CustomerName  string     `bson:"customer_name" json:"customer_name"`
	ChannelID     string     `bson:"customer_channelid" json:"customer_channelid"`
	ChannelName   string     `bson:"customer_channelname" json:"customer_channelname"`
	BranchName    string     `bson:"customer_branchname" json:"customer_branchname"`
	Brand         string     `bson:"product_brand" json:"product_brand"`
	Tablename     string
}

type SalesPL_2015 struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string `bson:"_id" json:"_id"`

	Date     *Date
	Customer *Customer
	Product  *Product
}

func (s *SalesPL_2015) TableName() string {
	return "salespls-2015"
}

func (t *SalesPL_2015) RecordID() interface{} {
	return t.ID
}

type SalesPL_2016 struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string `bson:"_id" json:"_id"`

	Date     *Date
	Customer *Customer
	Product  *Product
}

func (s *SalesPL_2016) TableName() string {
	return "salespls-2016"
}

func (t *SalesPL_2016) RecordID() interface{} {
	return t.ID
}

func (t *OutletNumber) RecordID() interface{} {
	return t.ID
}

func (t *OutletNumber) TableName() string {
	return t.Tablename
}

func (t *OutletNumber) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *DiscountActivity) RecordID() interface{} {
	return t.ID
}

func (t *DiscountActivity) TableName() string {
	return "rawdiscountact_11072016"
}

func (t *DiscountActivity) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *Promo) RecordID() interface{} {
	return t.ID
}

func (t *Promo) TableName() string {
	return "rawdatapl_promospg11072016"
}

func (t *Promo) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *Ads) RecordID() interface{} {
	return t.ID
}

func (t *Ads) TableName() string {
	return "rawdatapl_ads30062016"
}

func (t *Ads) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (t *OutletGeo) RecordID() interface{} {
	return t.ID
}

func (t *OutletGeo) TableName() string {
	return "outletgeo"
}

func (t *SalesRD) RecordID() interface{} {
	return t.ID
}

func (t *SalesRD) TableName() string {
	return "rawsalesrd"
}

func SalesRDGetByID(id string) *SalesRD {
	t := new(SalesRD)
	DB().GetById(t, id)
	return t
}

func (t *SalesRDClean) RecordID() interface{} {
	return t.ID
}

func (t *SalesRDClean) TableName() string {
	return "salesrdclean"
}

func (t *SalesRDClean) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}

func (c *CsvReport) TableName() string {
	return "csvreports"
}

func (c *CsvReport) RecordID() interface{} {
	return c.ID
}

func (c *CsvReport) Save() error {
	e := Save(c)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", c.TableName(), "save", e.Error()))
	}
	return e
}

func (t *MasterCustomerRD) RecordID() interface{} {
	return t.ID
}

func (t *MasterCustomerRD) TableName() string {
	return "mastercustomerrd"
}

func (t *SalesRDManeh) RecordID() interface{} {
	return t.ID
}

func (t *SalesRDManeh) TableName() string {
	return "salesrd29062016"
}

func (t *SalesRDManeh) Save() error {
	e := Save(t)
	if e != nil {
		return errors.New(toolkit.Sprintf("[%v-%v] Error found : ", t.TableName(), "save", e.Error()))
	}
	return e
}
