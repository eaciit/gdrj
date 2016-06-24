package gdrj

import (
	"strings"

	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
)

type PLData struct {
	PLCode                 string
	PLOrder                string
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

	RatioToGlobalSales            float64
	RatioToGlobalSalesVdist       float64
	RatioToBranchSales            float64
	RatioToBrandSales             float64
	RatioToSKUSales               float64
	RatioToChannelSales           float64
	RatioToMonthSales             float64 //APROMO
	RatioToMonthSKUSales          float64
	RatioToMonthChannelSales      float64 //DISCOUNT_ALL
	RatioToMonthChannelBrandSales float64 //DISCOUNT
	RatioToMonthSalesVdist        float64 //FREIGHT

	PLDatas map[string]*PLData

	TrxSrc, Source, Ref string
}

func (s *SalesPL) TableName() string {
	return "salespls"
}

func (s *SalesPL) RecordID() interface{} {
	s.ID = s.PrepareID().(string)
	return s.ID
}

func TrxToSalesPL(conn dbox.IConnection,
	trx *SalesTrx,
	masters toolkit.M,
	config toolkit.M) *SalesPL {

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

	pl.Customer = trx.Customer
	pl.Product = trx.Product

	pl.Calc(conn, masters, config)

	return pl
}

func SaveDiv(a float64, b float64) float64 {
	if b == 0 {
		return 0
	}

	return a / b
}

func (pl *SalesPL) RatioCalc(masters toolkit.M) {

	pl.RatioToGlobalSales = SaveDiv(pl.GrossAmount, masters.GetFloat64("globalgross"))
	pl.RatioToGlobalSalesVdist = SaveDiv(pl.GrossAmount, masters.GetFloat64("globalgrossvdist"))

	tgrossbybrand := masters.Get("grossbybrand", toolkit.M{}).(toolkit.M)
	if pl.Product.Brand != "" && pl.Product.Brand != "Other" && masters.Has("grossbybrand") {
		pl.RatioToBrandSales = SaveDiv(pl.GrossAmount, tgrossbybrand.GetFloat64(pl.Product.Brand))
	}

	if pl.SKUID != "" && masters.Has("grossbysku") {
		tmp := masters["grossbysku"].(toolkit.M)
		pl.RatioToSKUSales = SaveDiv(pl.GrossAmount, tmp.GetFloat64(pl.SKUID))
	}

	if pl.Customer.BranchID != "" && masters.Has("grossbybranch") {
		tmp := masters["grossbybranch"].(toolkit.M)
		pl.RatioToBranchSales = SaveDiv(pl.GrossAmount, tmp.GetFloat64(pl.Customer.BranchID))
	}

	if masters.Has("grossbychannel") {
		gbychannel := masters["grossbychannel"].(toolkit.M)
		pl.RatioToChannelSales = SaveDiv(pl.GrossAmount, gbychannel.GetFloat64(pl.Customer.ChannelID))
	}

	if masters.Has("grossbymonth") {
		gdt := masters["grossbymonth"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
		pl.RatioToMonthSales = SaveDiv(pl.GrossAmount, gdt.GetFloat64(key))
	}

	if masters.Has("grossbymonthvdist") && strings.ToUpper(pl.TrxSrc) == "VDIST" {
		gdt := masters["grossbymonthvdist"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
		pl.RatioToMonthSalesVdist = SaveDiv(pl.GrossAmount, gdt.GetFloat64(key))
	}

	if masters.Has("grossbymonthsku") {
		gdt := masters["grossbymonthsku"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, pl.SKUID)
		pl.RatioToMonthSKUSales = SaveDiv(pl.GrossAmount, gdt.GetFloat64(key))
	}

	if masters.Has("grossbymonthchannel") {
		gdt := masters["grossbymonthchannel"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, pl.Customer.ChannelID)
		pl.RatioToMonthChannelSales = SaveDiv(pl.GrossAmount, gdt.GetFloat64(key))
	}

	if masters.Has("grossbymonthbrandchannel") {
		gdt := masters["grossbymonthbrandchannel"].(toolkit.M)
		key := toolkit.Sprintf("%d_%d_%s_%s", pl.Date.Year, pl.Date.Month, pl.Product.Brand, pl.Customer.ChannelID)
		pl.RatioToMonthChannelBrandSales = SaveDiv(pl.GrossAmount, gdt.GetFloat64(key))
	}

	return
}

func (spl *SalesPL) CleanAndClasify(masters toolkit.M) {

	if spl.Customer == nil {
		c := new(Customer)
		c.BranchID = "CD02"
		c.CustType = "General"
		c.IsRD = false
		spl.Customer = c
	}

	inexclude := func(f string, list []string) bool {
		for _, v := range list {
			if v == f {
				return true
			}
		}

		return false
	}

	subchannels := masters.Get("subchannels").(toolkit.M)
	subchannel := subchannels.GetString(spl.Customer.CustType)
	switch spl.Customer.ChannelID {
	case "I1":
		spl.Customer.IsRD = true
		spl.Customer.ChannelName = "RD"
		spl.Customer.ReportChannel = "RD"
		spl.Customer.ReportSubChannel = spl.Customer.Name
	case "I3": //MT
		I3list := []string{"M1", "M2", "M3"}
		spl.Customer.ChannelName = "MT"
		spl.Customer.ReportChannel = "MT"
		if inexclude(spl.Customer.CustType, I3list) {
			subchannel = ""
		}

		if subchannel == "" {
			spl.Customer.ReportSubChannel = subchannels.GetString("M3")
		} else {
			spl.Customer.ReportSubChannel = subchannel
		}
	case "I4":
		spl.Customer.ChannelName = "INDUSTRIAL"
		spl.Customer.ReportChannel = "IT"
		// spl.Customer.ReportSubChannel = spl.Customer.Name
		spl.Customer.ReportSubChannel = subchannels.GetString("S8")
		if len(spl.Customer.CustType) == 2 && spl.Customer.CustType[:1] == "S" {
			spl.Customer.ReportSubChannel = subchannels.GetString(spl.Customer.CustType)
		}
	case "I6":
		spl.Customer.ChannelName = "MOTORIST"
		spl.Customer.ReportChannel = "Motoris"
		spl.Customer.ReportSubChannel = "Motoris"
	case "EXP":
		spl.Customer.ChannelName = "EXPORT"
		spl.Customer.ReportChannel = "EXPORT"
		spl.Customer.ReportSubChannel = "EXPORT"
	default:
		spl.Customer.ChannelID = "I2"
		spl.Customer.ChannelName = "GT"
		spl.Customer.ReportChannel = "GT"
		subchannel := subchannels.GetString(spl.Customer.CustType)

		if spl.Customer.CustType == "" || (len(spl.Customer.CustType) > 1 && spl.Customer.CustType[:1] != "R") {
			subchannel = ""
		}

		if subchannel == "" {
			spl.Customer.ReportSubChannel = "R18 - Lain-lain"
		} else {
			spl.Customer.ReportSubChannel = subchannel
		}
	}

	if spl.Product == nil {
		p := new(Product)
		p.Brand = "OTHER"
		p.Name = "OTHER"
		spl.Product = p
	}

	mcustomers := masters["customers"].(toolkit.M)
	mbranchs := masters["branchs"].(toolkit.M)

	cust, iscust := mcustomers[spl.Customer.ID].(*Customer)
	branch, isbranch := mbranchs[spl.Customer.BranchID].(toolkit.M)

	if iscust {
		spl.Customer.National = cust.National
		spl.Customer.Zone = cust.Zone
		spl.Customer.Region = cust.Region
		spl.Customer.AreaName = cust.AreaName
	} else if isbranch {
		spl.Customer.National = branch.Get("national", "").(string)
		spl.Customer.Zone = branch.Get("zone", "").(string)
		spl.Customer.Region = branch.Get("region", "").(string)
		spl.Customer.AreaName = branch.Get("area", "").(string)
	} else {
		spl.Customer.National = "INDONESIA"
		spl.Customer.Zone = "OTHER"
		spl.Customer.Region = "OTHER"
		spl.Customer.AreaName = "OTHER"
	}

	if spl.Customer.IsRD && masters.Has("rdlocations") {
		mrdloc := masters["rdlocations"].(toolkit.M)
		if mrdloc.Has(spl.Customer.ID) {
			tkm := mrdloc[spl.Customer.ID].(toolkit.M)
			spl.Customer.Zone = tkm.GetString("zone")
			spl.Customer.Region = tkm.GetString("region")
			spl.Customer.AreaName = tkm.GetString("area")
		}
	}
}

func (pl *SalesPL) Calc(conn dbox.IConnection,
	masters toolkit.M,
	config toolkit.M) *SalesPL {

	pl.NetAmount = pl.GrossAmount - pl.DiscountAmount
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
		p.Brand = "OTHER"
		p.Name = "OTHER"
	}
	//-- end of classing

	compute := strings.ToLower(config.Get("compute", "all").(string))
	if compute != "none" {
		globalSales := masters.Get("globalsales").(float64)
		branchSales := masters.Get("branchsales").(map[string]float64)
		brandSales := masters.Get("brandsales").(map[string]float64)

		var brandSale, branchSale float64
		if pl.Product != nil {
			brandSale, _ = brandSales[pl.Product.Brand]
		}

		if pl.Customer != nil {
			branchSale, _ = branchSales[pl.Customer.BranchID]
		}

		if globalSales != 0 {
			pl.RatioToGlobalSales = pl.NetAmount / globalSales
		}

		if brandSale != 0 {
			pl.RatioToBrandSales = pl.NetAmount / brandSale
		}

		if branchSale != 0 {
			pl.RatioToBranchSales = pl.NetAmount / branchSale
		}

		if compute == "all" {
			pl.CalcSales(masters)
			pl.CalcCOGS(masters)
			pl.CalcRoyalties(masters)
			pl.CalcDepre(masters)
			pl.CalcFreight(masters)
			pl.CalcPromo(masters)
			pl.CalcSGA(masters)
		} else if compute == "sales" {
			pl.CalcSales(masters)
		} else if compute == "cogs" {
			pl.CalcCOGS(masters)
		} else if compute == "freight" {
			pl.CalcFreight(masters)
		} else if compute == "promo" {
			pl.CalcRoyalties(masters)
			pl.CalcPromo(masters)
		} else if compute == "sga" {
			pl.CalcSGA(masters)
		} else if compute == "rawdatapl" {
			pl.CalcFreight(masters)
			pl.CalcRoyalties(masters)
			pl.CalcPromo(masters)
			pl.CalcSGA(masters)
			pl.CalcDepre(masters)
		} else if compute == "salescogs" {
			pl.CalcSales(masters)
			pl.CalcCOGS(masters)
		}
	}

	pl.CalcSum(masters)
	return pl
}

func (pl *SalesPL) CalcSum(masters toolkit.M) {
	var netsales, cogs, grossmargin, sellingexpense,
		sga, opincome, directexpense, indirectexpense,
		royaltiestrademark, advtpromoexpense, operatingexpense,
		freightexpense, nonoprincome, ebt, taxexpense,
		percentpbt, eat, totdepreexp, damagegoods, ebitda, ebitdaroyalties, ebitsga,
		grosssales, discount, advexp float64

	plmodels := masters.Get("plmodel").(map[string]*PLModel)

	exclude := []string{"PL8A", "PL14A", "PL74A", "PL26A", "PL32A", "PL94A", "PL39A", "PL41A", "PL44A",
		"PL74B", "PL74C", "PL32B", "PL94B", "PL94C", "PL39B", "PL41B", "PL41C", "PL44B", "PL44C", "PL44D", "PL44E",
		"PL44F", "PL6A", "PL0", "PL28"}
	inexclude := func(f string) bool {
		for _, v := range exclude {
			if v == f {
				return true
			}
		}

		return false
	}

	for k, v := range pl.PLDatas {
		if inexclude(k) {
			//pl.AddData(k,0,plmodels)
			delete(pl.PLDatas, k)
			continue
		}
		// toolkit.Println(k, " PL DATA : ", v)
		switch v.Group1 {
		case "Net Sales":
			netsales += v.Amount
		case "Direct Expense":
			directexpense += v.Amount
		case "Indirect Expense":
			indirectexpense += v.Amount
		case "Freight Expense":
			freightexpense += v.Amount
		case "Royalties & Trademark Exp":
			royaltiestrademark += v.Amount
		case "Advt & Promo Expenses":
			advtpromoexpense += v.Amount
		case "G&A Expenses":
			sga += v.Amount
		case "Non Operating (Income) / Exp":
			nonoprincome += v.Amount
		case "Tax Expense":
			taxexpense += v.Amount
		case "Total Depreciation Exp":
			if v.Group2 == "Damaged Goods" {
				damagegoods += v.Amount
			} else {
				totdepreexp += v.Amount
			}
		}

		switch v.Group2 {
		case "Gross Sales":
			grosssales += v.Amount
		case "Discount":
			discount += v.Amount
		case "Advertising Expenses":
			advexp += v.Amount
		}
	}

	cogs = directexpense + indirectexpense
	grossmargin = netsales + cogs
	sellingexpense = freightexpense + royaltiestrademark + advtpromoexpense
	operatingexpense = sellingexpense + sga
	opincome = grossmargin + operatingexpense
	ebt = opincome + nonoprincome //asume nonopriceincome already minus
	percentpbt = 0
	if ebt != 0 {
		percentpbt = taxexpense / ebt * 100
	}
	eat = ebt + taxexpense
	ebitda = totdepreexp + damagegoods + opincome
	ebitdaroyalties = ebitda - royaltiestrademark
	ebitsga = opincome - sga
	ebitsgaroyalty := ebitsga - royaltiestrademark

	pl.AddData("PL0", grosssales, plmodels)
	pl.AddData("PL6A", discount, plmodels)
	pl.AddData("PL8A", netsales, plmodels)
	pl.AddData("PL14A", directexpense, plmodels)
	pl.AddData("PL74A", indirectexpense, plmodels)
	pl.AddData("PL26A", royaltiestrademark, plmodels)
	pl.AddData("PL32A", advtpromoexpense, plmodels)
	pl.AddData("PL94A", sga, plmodels)
	pl.AddData("PL39A", nonoprincome, plmodels)
	pl.AddData("PL41A", taxexpense, plmodels)
	pl.AddData("PL44A", totdepreexp, plmodels)

	pl.AddData("PL28", advexp, plmodels)
	pl.AddData("PL74B", cogs, plmodels)
	pl.AddData("PL74C", grossmargin, plmodels)
	pl.AddData("PL32B", sellingexpense, plmodels)
	pl.AddData("PL94B", operatingexpense, plmodels)
	pl.AddData("PL94C", opincome, plmodels)
	pl.AddData("PL39B", ebt, plmodels)
	pl.AddData("PL41B", percentpbt, plmodels)
	pl.AddData("PL41C", eat, plmodels)
	pl.AddData("PL44B", opincome, plmodels)
	pl.AddData("PL44C", ebitda, plmodels)
	pl.AddData("PL44D", ebitdaroyalties, plmodels)
	pl.AddData("PL44E", ebitsga, plmodels)
	pl.AddData("PL44F", ebitsgaroyalty, plmodels)
}

func (pl *SalesPL) CalcSales(masters toolkit.M) {
	plmodels := masters.Get("plmodel").(map[string]*PLModel)

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL2" || k == "PL8" || k == "PL6" || k == "PL7A" || k == "PL1" || k == "PL7" {
			delete(aplmodel, k)
		}
	}

	pl.PLDatas = aplmodel

	switch {
	case pl.Customer.IsRD:
		pl.AddData("PL2", pl.GrossAmount, plmodels)
		pl.AddData("PL8", pl.DiscountAmount, plmodels)
	case strings.Contains(pl.ID, "EXPORT"):
		pl.AddData("PL6", pl.GrossAmount, plmodels)
	// case strings.Contains(pl.ID, "DISCOUNT"):
	// 	pl.AddData("PL7A", pl.GrossAmount, plmodels)
	default:
		pl.AddData("PL1", pl.GrossAmount, plmodels)
		pl.AddData("PL7", pl.DiscountAmount, plmodels)
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
		// toolkit.Printfn("COGS error: no keys for ID %s", cogsid)
		return
	}

	cogsAmount := float64(0)
	cogsShemaAmount := float64(0)
	if cogsSchema.COGS_Amount == 0 {
		cogsShemaAmount = cogsSchema.RM_Amount +
			cogsSchema.LC_Amount +
			cogsSchema.PF_Amount +
			cogsSchema.Depre_Amount +
			cogsSchema.Other_Amount
	} else {
		cogsShemaAmount = cogsSchema.COGS_Amount
	}
	//rm_amount	lc_amount	pf_amount	other_amount	fixed_amount	depre_amount

	if cogsShemaAmount == 0 {
		// toolkit.Printfn("COGS error: no keys for ID %s", cogsid)
		return
	}

	if cogsSchema.NPS_Amount != 0 {
		cogsAmount = -cogsShemaAmount * pl.NetAmount / cogsSchema.NPS_Amount
	}

	rmAmount := cogsSchema.RM_Amount * cogsAmount / cogsShemaAmount
	lcAmount := cogsSchema.LC_Amount * cogsAmount / cogsShemaAmount
	energyAmount := cogsSchema.PF_Amount * cogsAmount / cogsShemaAmount
	depreciation := cogsSchema.Depre_Amount * cogsAmount / cogsShemaAmount
	otherAmount := cogsAmount - rmAmount - lcAmount - energyAmount - depreciation

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL9", rmAmount, plmodels)
	pl.AddData("PL14", lcAmount, plmodels)
	pl.AddData("PL74", energyAmount, plmodels)
	pl.AddData("Pl20", otherAmount, plmodels)
	pl.AddData("PL21", energyAmount, plmodels)
	//pl.AddData("PL74B", cogsAmount, plmodels)
}

func (pl *SalesPL) CalcCOGSRev(masters toolkit.M) {
	// PL9 PL14 Pl20 PL21 PL74
	if !masters.Has("cogs") {
		return
	}

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL9" || k == "PL14" || k == "PL20" || k == "PL21" || k == "PL74" {
			delete(aplmodel, k)
		}
	}

	pl.PLDatas = aplmodel

	cogsid := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, strings.ToUpper(pl.SKUID))
	if pl.Date.Year == 2014 && pl.Date.Month <= 9 {
		cogsid = toolkit.Sprintf("%d_%d_%s", 2014, 9, strings.ToUpper(pl.SKUID))
	}

	cogsdatas := masters.Get("cogs").(map[string]*COGSConsolidate)
	cogsdata, exist := cogsdatas[cogsid]
	if !exist {
		return
	}

	//rm_amount	lc_amount	pf_amount	other_amount	fixed_amount	depre_amount
	totamount := cogsdata.COGS_Amount * pl.RatioToMonthSKUSales
	if totamount == 0 {
		return
	}

	rmamount := cogsdata.RM_Amount * pl.RatioToMonthSKUSales
	lcamount := cogsdata.LC_Amount * pl.RatioToMonthSKUSales
	energyamount := cogsdata.PF_Amount * pl.RatioToMonthSKUSales
	depreamount := cogsdata.Depre_Amount * pl.RatioToMonthSKUSales
	otheramount := totamount - rmamount - lcamount - energyamount - depreamount

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL9", -rmamount, plmodels)
	pl.AddData("PL14", -lcamount, plmodels)
	pl.AddData("Pl20", -otheramount, plmodels)
	pl.AddData("PL21", -depreamount, plmodels)
	pl.AddData("PL74", -energyamount, plmodels)

}

func (pl *SalesPL) CalcFreight(masters toolkit.M) {
	if masters.Has("freight") == false {
		return
	}

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL23" {
			delete(aplmodel, k)
		}
	}
	pl.PLDatas = aplmodel

	freights := masters.Get("freight").(map[string]*RawDataPL)

	freightid := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
	f, exist := freights[freightid]
	if !exist {
		return
	}

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL23", -f.AmountinIDR*pl.RatioToMonthSalesVdist, plmodels)
}

func (pl *SalesPL) CalcDepre(masters toolkit.M) {
	if masters.Has("depreciation") == false {
		return
	}

	depreciation := masters.Get("depreciation").(map[string]float64)

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL43" || k == "PL42" {
			delete(aplmodel, k)
		}
	}
	pl.PLDatas = aplmodel

	find := func(x string) float64 {
		id := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, x)
		return depreciation[id]
	}

	findirect := find("indirect")
	fdirect := find("direct")

	plmodels := masters.Get("plmodel").(map[string]*PLModel)

	pl.AddData("PL43", findirect*pl.RatioToMonthSales, plmodels)
	pl.AddData("PL42", fdirect*pl.RatioToMonthSales, plmodels)
}

func (pl *SalesPL) CalcDamage(masters toolkit.M) {
	if masters.Has("damages") == false {
		return
	}

	damages := masters.Get("damages").(map[string]float64)

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL44" {
			delete(aplmodel, k)
		}
	}
	pl.PLDatas = aplmodel

	damagesid := toolkit.Sprintf("%s", pl.Date.Fiscal)
	d, exist := damages[damagesid]
	if !exist {
		return
	}

	d = d / 12

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL44", -d*pl.RatioToMonthSales, plmodels)
}

func (pl *SalesPL) CalcRoyalties(masters toolkit.M) {
	if !masters.Has("royalties") {
		return
	}

	royals := masters.Get("royalties").(map[string]float64)

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL25" {
			delete(aplmodel, k)
		}
	}
	pl.PLDatas = aplmodel

	royalid := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
	r, exist := royals[royalid]
	if !exist {
		return
	}
	// toolkit.Println(royalid, ":", r)
	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL25", -r*pl.RatioToMonthSales, plmodels)
}

func (pl *SalesPL) CalcDiscountActivity(masters toolkit.M) {

	if !masters.Has("discounts") {
		return
	}

	discounts := masters.Get("discounts").(toolkit.M)

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL7A" {
			delete(aplmodel, k)
		}
	}
	pl.PLDatas = aplmodel

	key01 := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, strings.ToUpper(pl.Customer.ChannelID))
	key02 := toolkit.Sprintf("%s_%s", key01, strings.ToUpper(pl.Product.Brand))

	amount := (pl.RatioToMonthChannelBrandSales * discounts.GetFloat64(key02)) + (pl.RatioToMonthChannelSales * discounts.GetFloat64(key01))

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL7A", -amount, plmodels)
}

func (pl *SalesPL) CalcPromo(masters toolkit.M) {

	if !masters.Has("promos") && !masters.Has("advertisements") {
		return
	}

	aplmodel := pl.PLDatas
	for k, _ := range aplmodel {
		if k == "PL28" || k == "PL29A" || k == "PL29" || k == "PL30" || k == "PL31" || k == "PL32" || k == "PL32A" ||
			k == "PL28A" || k == "PL28B" || k == "PL28C" || k == "PL28D" || k == "PL28E" || k == "PL28F" || k == "PL28G" || k == "PL28H" || k == "PL28I" {
			delete(aplmodel, k)
		}
	}
	pl.PLDatas = aplmodel

	promos := masters.Get("promos").(map[string]*RawDataPL)
	advertisements := masters.Get("advertisements").(map[string]toolkit.M)

	find := func(x string) *RawDataPL {
		freightid := toolkit.Sprintf("%d_%d_%s", pl.Date.Year, pl.Date.Month, x)
		f, exist := promos[freightid]
		if !exist {
			return &RawDataPL{}
		}
		return f
	}

	advertisement, exist := advertisements[toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)]
	if exist {
		for key, v := range advertisement {
			tplmodels := masters.Get("plmodel").(map[string]*PLModel)
			fv := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto)
			pl.AddData(key, -pl.RatioToMonthSales*fv, tplmodels)
		}
	}

	fpromo := find("promo")
	// fadv := find("adv")
	fspg := find("spg")

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	pl.AddData("PL29A", -fpromo.AmountinIDR*pl.RatioToMonthSales, plmodels)
	// pl.AddData("PL28", -fadv.AmountinIDR*pl.RatioToMonthSales, plmodels)
	pl.AddData("PL32", -fspg.AmountinIDR*pl.RatioToMonthSales, plmodels)

	// pl.AddData("28A", -pl.RatioToMonthSales*advertisement.GetFloat64("28A"), plmodels)
	// pl.AddData("28B", -pl.RatioToMonthSales*advertisement.GetFloat64("28B"), plmodels)
	// pl.AddData("28C", -pl.RatioToMonthSales*advertisement.GetFloat64("28C"), plmodels)
	// pl.AddData("28D", -pl.RatioToMonthSales*advertisement.GetFloat64("28D"), plmodels)
	// pl.AddData("28E", -pl.RatioToMonthSales*advertisement.GetFloat64("28E"), plmodels)
	// pl.AddData("28F", -pl.RatioToMonthSales*advertisement.GetFloat64("28F"), plmodels)
	// pl.AddData("28G", -pl.RatioToMonthSales*advertisement.GetFloat64("28G"), plmodels)
	// pl.AddData("28H", -pl.RatioToMonthSales*advertisement.GetFloat64("28H"), plmodels)
	// pl.AddData("28I", -pl.RatioToMonthSales*advertisement.GetFloat64("28I"), plmodels)
}

//Handle by other
func (pl *SalesPL) CalcSGA(masters toolkit.M) {
	if masters.Has("sga") == false || masters.Has("ledger") == false {
		return
	}
	sgas := masters.Get("sga").(map[string]map[string]*RawDataPL)

	plmodels := masters.Get("plmodel").(map[string]*PLModel)
	sgaid := toolkit.Sprintf("%d_%d", pl.Date.Year, pl.Date.Month)
	raws, exist := sgas[sgaid]
	if !exist {
		return
	}

	ccs := map[string]*CostCenter{}
	if masters.Has("cc") {
		ccs = masters.Get("cc").(map[string]*CostCenter)
	}
	ledgers := masters.Get("ledger").(map[string]*LedgerMaster)
	for _, raw := range raws {

		plcode := "PL34"
		switch {
		case strings.Contains(raw.Grouping, "General"):
			plcode = "PL34"
		case strings.Contains(raw.Grouping, "Personnel"):
			plcode = "PL33"
		case strings.Contains(raw.Grouping, "Depr & Amort. Exp. -  Office"):
			plcode = "PL35"
		default:
			return
		}

		ledger, exist := ledgers[raw.Account]
		if exist {
			plcode = ledger.PLCode
		}
		cc, exist := ccs[raw.CCID]
		ccgroup := "Other"
		if exist {
			ccgroup = cc.CostGroup01
		}
		pl.AddDataCC(plcode, -pl.RatioToGlobalSales*raw.AmountinIDR, ccgroup, plmodels)
	}
}

func (pl *SalesPL) AddData(plcode string, amount float64, models map[string]*PLModel) {
	pl.AddDataCC(plcode, amount, "", models)
}

func (pl *SalesPL) AddDataCC(plcode string, amount float64, ccgroup string, models map[string]*PLModel) {
	astr := []string{"28A", "28B", "28C", "28D", "28E", "28F", "28G", "28H", "28I"}
	if toolkit.HasMember(astr, plcode) {
		toolkit.Println(models[plcode])
	}

	m, exist := models[plcode]
	if !exist {
		return
	}
	if ccgroup != "" {
		plcode = plcode + "_" + ccgroup
	}
	pl_m, exist := pl.PLDatas[plcode]
	if !exist || pl_m == nil {
		pl_m = new(PLData)
		pl_m.PLOrder = m.OrderIndex
		pl_m.Group1 = m.PLHeader1
		pl_m.Group2 = m.PLHeader2
		pl_m.Group3 = m.PLHeader3
	}

	if ccgroup != "" {
		pl_m.Group3 = ccgroup
	}

	pl_m.Amount += amount
	if pl.PLDatas == nil {
		pl.PLDatas = map[string]*PLData{}
	}

	pl.PLDatas[plcode] = pl_m
}
