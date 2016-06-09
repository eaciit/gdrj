package gdrj

import (
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type PLData struct {
	PLCode                 string
    PLOrder int
	Group1, Group2, Group3 string
	Amount                 float64
}

type SalesPL struct {
	orm.ModelBase `bson:"-" json:"-"`
	ID            string `bson:"_id" json:"_id"`

	SKUID       string
	SKUID_VDIST string
	OutletID    string

	SalesQty       float64
	GrossAmount    float64
	DiscountAmount float64
	TaxAmount      float64
	NetAmount      float64

	Date     *Date
	Customer *Customer
	Product  *Product
	PC       *ProfitCenter
	CC       *CostCenter

	RatioToGlobalSales float64
	RatioToBranchSales float64
	RatioToBrandSales  float64
	RatioToSKUSales    float64

	PLDatas map[string]*PLData
}

func (s *SalesPL) TableName() string {
	return "salespls"
}

func (s *SalesPL) RecordID() interface{} {
	s.ID = s.PrepareID().(string)
	return s.ID
}

func (s *SalesPL) Build(conn dbox.IConnection,
	trx *SalesTrx,
	masters toolkit.M) *SalesPL {

	pl := new(SalesPL)
	pl.ID = trx.ID
	pl.SKUID = trx.SKUID
	pl.SKUID_VDIST = trx.SKUID_VDIST
	pl.OutletID = trx.OutletID

	pl.Date = SetDate(trx.Date)

	pl.SalesQty = trx.SalesQty
	pl.GrossAmount = trx.GrossAmount
	pl.DiscountAmount = trx.DiscountAmount
	pl.TaxAmount = trx.TaxAmount
	pl.NetAmount = pl.GrossAmount - pl.DiscountAmount

	pl.Customer = trx.Customer
	pl.Product = trx.Product

	//-- classing
	if pl.Customer == nil {
		c := new(Customer)
		c.BranchID = "CD02"
		c.CustType = "General"
		c.IsRD = false
		pl.Customer = c
	}

	if pl.Customer.ChannelID == "I1" {
		pl.Customer.IsRD = true
		pl.Customer.ReportChannel = "RD"
		pl.Customer.ChannelName = "MT"
	} else if pl.Customer.ChannelID == "I3" {
		pl.Customer.IsRD = false
		pl.Customer.ReportChannel = "MT"
		pl.Customer.ChannelName = "MT"
	} else if pl.Customer.ChannelID == "I4" {
		pl.Customer.IsRD = false
		pl.Customer.ReportChannel = "IT"
		pl.Customer.ChannelName = "IT"
	} else {
		pl.Customer.IsRD = false
		pl.Customer.ReportChannel = "GT"
		pl.Customer.ChannelName = "GT"
	}

	if pl.Product == nil {
		p := new(Product)
		p.Brand = "Other"
		p.Name = "Other"
	}
	//-- end of classing

	pl.CalcSales(masters)
	pl.CalcCOGS(masters)
	pl.CalcFreight(masters)
	pl.CalcPromo(masters)
	pl.CalcSGA(masters)

	return pl
}

func (pl *SalesPL) CalcSales(masters toolkit.M) {
	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	if pl.Customer.IsRD {
		pl.AddData("PL2", pl.GrossAmount, plmodels)
		pl.AddData("PL8", pl.DiscountAmount, plmodels)
		pl.AddData("PL8A", pl.GrossAmount, plmodels)
	} else {
		pl.AddData("PL1", pl.GrossAmount, plmodels)
		pl.AddData("PL7", pl.GrossAmount, plmodels)
		pl.AddData("PL8A", pl.GrossAmount, plmodels)
	}
}

func (pl *SalesPL) CalcCOGS(masters toolkit.M) {
	//-- cogs
	cogsid := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, pl.SKUID)
	if pl.Date.Year == 2014 && pl.Date.Month <= 9 {
		cogsid = toolkit.Sprintf("%d_%d_%s", 2014, 9, pl.SKUID)
	}
	if !masters.Has("cogs") {
		return
	}
	cogsTable := masters.Get("cogs").(map[string]*COGSConsolidate)
	cogsSchema, exist := cogsTable[cogsid]
	if !exist {
		return
	}
	if cogsSchema.COGS_Amount == 0 {
		return
	}

	cogsAmount := cogsSchema.COGS_Amount * pl.NetAmount / cogsSchema.NPS_Amount
	rmAmount := cogsSchema.RM_Amount * cogsAmount / cogsSchema.COGS_Amount
	lcAmount := cogsSchema.LC_Amount * cogsAmount / cogsSchema.COGS_Amount
	energyAmount := cogsSchema.PF_Amount * cogsAmount / cogsSchema.COGS_Amount
	depreciation := cogsSchema.Depre_Amount * cogsAmount / cogsSchema.COGS_Amount
	otherAmount := cogsAmount - rmAmount - lcAmount - energyAmount - depreciation

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL9", rmAmount, plmodels)
	pl.AddData("PL14", lcAmount, plmodels)
	pl.AddData("PL74", energyAmount, plmodels)
	pl.AddData("Pl20", otherAmount, plmodels)
	pl.AddData("PL21", energyAmount, plmodels)
	pl.AddData("PL74B", cogsAmount, plmodels)
}

func (pl *SalesPL) CalcFreight(masters toolkit.M) {
    if masters.Has("freight")==false{
        return
    }
    freights := masters.Get("freight").(map[string]RawDataPL)

    freightid := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, pl.Customer.BranchID)
    f, exist := freights[freightid]
    if !exist{
        return
    }
    
    plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL23",f.AmountinIDR*pl.RatioToBranchSales,plmodels)
}

func (pl *SalesPL) CalcPromo(masters toolkit.M) {
    if masters.Has("promo")==false{
        return
    }
    freights := masters.Get("promo").(map[string]RawDataPL)

    find := func(x string)RawDataPL{
        freightid := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, x)
        f, exist := freights[freightid]
        if !exist{
            return RawDataPL{}
        }
        return f
    }

    fAtl := find("atl")
    fBtlBonus := find("bonus")
    fBtlGondola := find("gondola")
    fBtlSPG := find("spg")
    fBtlOtherpromo := find("otherpromo")
    
    plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL28",fAtl.AmountinIDR*pl.RatioToBranchSales,plmodels)
    pl.AddData("PL29",fBtlBonus.AmountinIDR*pl.RatioToBranchSales,plmodels)
    pl.AddData("PL30",fBtlGondola.AmountinIDR*pl.RatioToBranchSales,plmodels)
    pl.AddData("PL31",fBtlOtherpromo.AmountinIDR*pl.RatioToBranchSales,plmodels)
    pl.AddData("PL32",fBtlSPG.AmountinIDR*pl.RatioToBranchSales,plmodels)
}

func (pl *SalesPL) CalcSGA(masters toolkit.M) {
    if masters.Has("sga")==false || masters.Has("ledger")==false{
        return
    }
    sgas := masters.Get("sga").(map[string][]RawDataPL)

    plmodels := masters.Get("plmodel").(map[string]*PLModel)
	sgaid := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
    raws, exist := sgas[sgaid]
    if !exist{
        return        
    }

    ccs := map[string]CostCenter{}
    if masters.Has("cc"){
        ccs = masters.Get("cc").(map[string]CostCenter)
    }
    ledgers := masters.Get("ledger").(map[string]LedgerMaster)
    for _, raw := range raws{
        plcode := "PL94A"
        ledger, exist := ledgers[raw.Account]
        if exist{
           plcode = ledger.PLCode 
        }
        cc, exist := ccs[raw.CCID]
        ccgroup := "Other"
        if exist {
            ccgroup = cc.CostGroup01
        }
        pl.AddDataCC(plcode,pl.RatioToBrandSales*raw.AmountinIDR,ccgroup,plmodels)
    }
}

func (pl *SalesPL) AddData(plcode string, amount float64,models map[string]*PLModel){
	pl.AddDataCC(plcode,amount,"",models)
}

func (pl *SalesPL) AddDataCC(plcode string, amount float64, ccgroup string, models map[string]*PLModel){
	if amount == 0 {
		return
	}
	m, exist := models[plcode]
	if !exist {
		return
	}
	pl_m, exist := pl.PLDatas[plcode]
	if !exist {
		pl_m = new(PLData)
        pl_m.PLOrder = m.OrderIndex
		pl_m.Group1 = m.PLHeader1
		pl_m.Group2 = m.PLHeader2
		pl_m.Group3 = m.PLHeader3
	}
    if ccgroup!=""{
        pl_m.Group3=ccgroup
    }
	pl_m.Amount += amount
	pl.PLDatas[plcode] = pl_m
}
