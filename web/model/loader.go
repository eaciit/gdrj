package gocore

import "eaciit/gdrj/model"
import "github.com/eaciit/orm/v1"
import "github.com/eaciit/dbox"
import "github.com/eaciit/toolkit"
import "fmt"

// import "encoding/json"
import "time"

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}

func LoadMasterToMemory() (
	map[string]*gdrj.ProfitCenter,
	map[string]*gdrj.CostCenter,
	map[string]*gdrj.LedgerAccount,
	map[string]*gdrj.Product,
	map[string]*gdrj.Customer,
	[]*gdrj.ProfitCenter,
	[]*gdrj.CostCenter,
	[]*gdrj.LedgerAccount,
	[]*gdrj.Product,
	[]*gdrj.Customer,
) {
	var e error
	pcs := map[string]*gdrj.ProfitCenter{}
	ccs := map[string]*gdrj.CostCenter{}
	ledgers := map[string]*gdrj.LedgerAccount{}
	prods := map[string]*gdrj.Product{}
	custs := map[string]*gdrj.Customer{}

	arr_pcs := []*gdrj.ProfitCenter{}
	arr_ccs := []*gdrj.CostCenter{}
	arr_ledgers := []*gdrj.LedgerAccount{}
	arr_prods := []*gdrj.Product{}
	arr_custs := []*gdrj.Customer{}

	pc := new(gdrj.ProfitCenter)
	cc := new(gdrj.CostCenter)
	prod := new(gdrj.Product)
	ledger := new(gdrj.LedgerAccount)
	cust := new(gdrj.Customer)

	cpc := getCursor(pc)
	defer cpc.Close()
	for e = cpc.Fetch(pc, 1, false); e == nil; {
		pcs[pc.ID] = pc
		arr_pcs = append(arr_pcs, pc)
		pc = new(gdrj.ProfitCenter)
		e = cpc.Fetch(pc, 1, false)
	}
	fmt.Println("done fetching profit center", len(arr_pcs))

	ccc := getCursor(cc)
	defer ccc.Close()
	for e = ccc.Fetch(cc, 1, false); e == nil; {
		ccs[cc.ID] = cc
		arr_ccs = append(arr_ccs, cc)
		cc = new(gdrj.CostCenter)
		e = ccc.Fetch(cc, 1, false)
	}
	fmt.Println("done fetching cost center", len(arr_ccs))

	cprod := getCursor(prod)
	defer cprod.Close()
	for e = cprod.Fetch(prod, 1, false); e == nil; {
		prods[prod.ID] = prod
		arr_prods = append(arr_prods, prod)
		prod = new(gdrj.Product)
		e = cprod.Fetch(prod, 1, false)
	}
	fmt.Println("done fetching product", len(arr_prods))

	cledger := getCursor(ledger)
	defer cledger.Close()
	for e = cledger.Fetch(ledger, 1, false); e == nil; {
		ledgers[ledger.ID] = ledger
		arr_ledgers = append(arr_ledgers, ledger)
		ledger = new(gdrj.LedgerAccount)
		e = cledger.Fetch(ledger, 1, false)
	}
	fmt.Println("done fetching ledger account", len(arr_ledgers))

	ccust := getCursor(cust)
	defer ccust.Close()
	for e = ccust.Fetch(cust, 1, false); e == nil; {
		custs[cust.ID] = cust
		arr_custs = append(arr_custs, cust)
		cust = new(gdrj.Customer)
		e = ccust.Fetch(cust, 1, false)
	}
	fmt.Println("done fetching customer", len(arr_custs))

	return pcs, ccs, ledgers, prods, custs, arr_pcs, arr_ccs, arr_ledgers, arr_prods, arr_custs
}

func GenerateDummyLedgerSummary() {
	doGenerate := func(year int) {
		max := 1000
		data := map[int][]toolkit.M{2015: plmodel_2015, 2016: plmodel_2016}

		pcs, ccs, ledgers, prods, custs, arr_pcs, arr_ccs, arr_ledgers, arr_prods, arr_custs := LoadMasterToMemory()
		_, _, _, _, _, _, _, _, _ = ccs, ledgers, prods, custs, ccs, ledgers, prods, custs, arr_ledgers

		for _, eachPNL := range data[year] {
			plmod := new(gdrj.PLModel)
			plmod.ID = eachPNL.GetString("_id")
			plmod.OrderIndex = eachPNL.GetString("OrderIndex")
			plmod.PLHeader1 = eachPNL.GetString("PLHeader1")
			plmod.PLHeader2 = eachPNL.GetString("PLHeader2")
			plmod.PLHeader3 = eachPNL.GetString("PLHeader2")
			plmod.Amount = eachPNL.GetFloat64("Amount")

			totalPercentage := 0.0
			actualPercentage := 0.0
			allPercentage := []float64{}
			totalValue := 0.0

			for i := 0; i < max; i++ {
				percentage := (toolkit.RandFloat(1, 3) + 0.1) * 0.01
				allPercentage = append(allPercentage, percentage)
				totalPercentage = totalPercentage + percentage
			}

			leftPercentage := (1.0 - totalPercentage) / float64(max)

			fmt.Println("PNL ---> ", plmod.ID)

			for i := 0; i < max; i++ {
				percentage := allPercentage[i] + leftPercentage
				actualPercentage = actualPercentage + percentage

				date := new(gdrj.Date)
				date.Date = time.Now()
				date.Month = time.Month(toolkit.RandInt(12))
				date.Quarter = toolkit.RandInt(4)
				date.QuarterTxt = toolkit.RandomString(10)
				date.YearTxt = toolkit.RandomString(10)
				date.Year = toolkit.RandInt(4)

				l := new(gdrj.LedgerSummary)
				l.Customer = arr_custs[toolkit.RandInt(len(arr_custs))]
				l.Product = arr_prods[toolkit.RandInt(len(arr_prods))]
				l.CC = arr_ccs[toolkit.RandInt(len(arr_ccs))]
				l.PC = pcs[l.Product.PCID]
				l.LedgerAccount = arr_ledgers[toolkit.RandInt(len(arr_ledgers))].ID
				l.PLModel = plmod
				l.Date = date

				if l.PC == nil {
					l.PC = arr_pcs[toolkit.RandInt(len(arr_pcs))]
				}

				l.PCID = l.PC.ID
				l.CCID = l.CC.ID
				l.OutletID = l.Customer.ID
				l.SKUID = l.Product.ID
				l.PLCode = l.PLModel.ID
				l.PLOrder = l.PLModel.OrderIndex
				l.Value1 = plmod.Amount * percentage
				l.PLGroup1 = l.PLModel.PLHeader1
				l.PLGroup2 = l.PLModel.PLHeader2
				l.PLGroup3 = l.PLModel.PLHeader3
				l.Month = 4
				l.Year = year

				l.Save()

				totalValue = totalValue + l.Value1

				fmt.Println("saved", plmod.ID, i, percentage, l.Value1)
			}

			fmt.Printf("total value: %.10f\n", totalValue)
		}
	}

	doGenerate(2015)
	doGenerate(2016)
}

func GenerateDummySalesLinePL() {
	doGenerate := func(year int) {
		max := 1000
		data := map[int][]toolkit.M{2015: plmodel_2015, 2016: plmodel_2016}

		pcs, ccs, ledgers, prods, custs, arr_pcs, arr_ccs, arr_ledgers, arr_prods, arr_custs := LoadMasterToMemory()

		_, _, _, _, _, _, _, _, _ = ccs, ledgers, prods, custs, ccs, ledgers, prods, custs, arr_ledgers

		for i := 0; i < max; i++ {
			date := new(gdrj.Date)
			date.Date = time.Now()
			date.Month = time.Month(toolkit.RandInt(12))
			date.Quarter = toolkit.RandInt(4)
			date.QuarterTxt = fmt.Sprintf("%v", date.Quarter)
			date.Year = year
			date.YearTxt = fmt.Sprintf("%v", year)

			l := new(gdrj.SalesPL)
			l.Customer = arr_custs[toolkit.RandInt(len(arr_custs))]
			l.Product = arr_prods[toolkit.RandInt(len(arr_prods))]
			l.CC = arr_ccs[toolkit.RandInt(len(arr_ccs))]
			l.PC = pcs[l.Product.PCID]
			l.Date = date

			if l.PC == nil {
				l.PC = arr_pcs[toolkit.RandInt(len(arr_pcs))]
			}

			l.SalesQty = toolkit.RandFloat(1000, 2)
			l.GrossAmount = toolkit.RandFloat(10000, 2)
			l.DiscountAmount = toolkit.RandFloat(10000, 2)
			l.TaxAmount = toolkit.RandFloat(10000, 2)
			l.NetAmount = toolkit.RandFloat(10000, 2)

			l.SKUID = l.Product.ID
			l.SKUID_VDIST = l.Product.ID
			l.OutletID = l.Customer.ID

			l.Ratio.Global = toolkit.RandFloat(10, 2)
			l.Ratio.Branch = toolkit.RandFloat(10, 2)
			l.Ratio.Brand = toolkit.RandFloat(10, 2)
			l.Ratio.SKUID = toolkit.RandFloat(10, 2)

			l.PLDatas = map[string]*gdrj.PLData{}

			for _, eachPNL := range data[year] {
				pl := new(gdrj.PLData)
				pl.PLCode = eachPNL.GetString("_id")
				pl.Group1 = eachPNL.GetString("PLHeader1")
				pl.Group2 = eachPNL.GetString("PLHeader2")
				pl.Group3 = eachPNL.GetString("PLHeader2")
				pl.Amount = eachPNL.GetFloat64("Amount")

				l.PLDatas[pl.PLCode] = pl
			}

			l.Save()

			fmt.Println("saved", l.Customer.ID, l.Product.ID, l.PC.ID, l.CC.ID)
		}
	}

	doGenerate(2015)
	doGenerate(2016)

	for _, each := range plmodel_2015 {
		plm := new(gdrj.PLModel)
		plm.ID = each.GetString("_id")
		plm.OrderIndex = each.GetString("OrderIndex")
		plm.PLHeader1 = each.GetString("PLHeader1")
		plm.PLHeader2 = each.GetString("PLHeader2")
		plm.PLHeader3 = each.GetString("PLHeader2")
		plm.Save()
	}
}

var plmodel_2015 = []toolkit.M{
	{"_id": "PL1", "OrderIndex": "PL001", "PLHeader1": "Net Sales", "PLHeader2": "Gross Sales", "Amount": 2636910.753892},
	{"_id": "PL2", "OrderIndex": "PL002", "PLHeader1": "Net Sales", "PLHeader2": "Sales Discount", "Amount": -132368.487195},
	{"_id": "PL3", "OrderIndex": "PL003", "PLHeader1": "Net Sales", "PLHeader2": "Net Sales", "Amount": 2504542.266697},
	{"_id": "PL4", "OrderIndex": "PL004", "PLHeader1": "Direct Expense", "PLHeader2": "Raw Material / Packaging Material", "Amount": 1369802.880622},
	{"_id": "PL5", "OrderIndex": "PL005", "PLHeader1": "Direct Expense", "PLHeader2": "Direct Labor", "Amount": 75207.737135},
	{"_id": "PL6", "OrderIndex": "PL006", "PLHeader1": "Direct Expense", "PLHeader2": "Freight & Others", "Amount": 385.975561},
	{"_id": "PL7", "OrderIndex": "PL007", "PLHeader1": "Direct Expense", "PLHeader2": "Direct Expense", "Amount": 1445010.617757},
	{"_id": "PL8", "OrderIndex": "PL008", "PLHeader1": "Indirect Expense", "PLHeader2": "Personel Expense - Factory", "Amount": 28125.842133},
	{"_id": "PL9", "OrderIndex": "PL009", "PLHeader1": "Indirect Expense", "PLHeader2": "General Expense - Factory", "Amount": 45788.191085},
	{"_id": "PL10", "OrderIndex": "PL010", "PLHeader1": "Indirect Expense", "PLHeader2": "Depr & Amort. Exp. -  Factory", "Amount": 15066.668191},
	{"_id": "PL11", "OrderIndex": "PL011", "PLHeader1": "Indirect Expense", "PLHeader2": "Indirect Expense", "Amount": 88980.701409},
	{"_id": "PL12", "OrderIndex": "PL012", "PLHeader1": "Cost of Goods Sold", "PLHeader2": "Cost of Goods Sold", "Amount": 1533991.319166},
	{"_id": "PL13", "OrderIndex": "PL013", "PLHeader1": "Gross Margin", "PLHeader2": "Gross Margin", "Amount": 970550.947531},
	{"_id": "PL14", "OrderIndex": "PL014", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Indovest Trademark", "Amount": 105131.742179},
	{"_id": "PL15", "OrderIndex": "PL015", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Godrej Trademark", "Amount": 52628.450103},
	{"_id": "PL16", "OrderIndex": "PL016", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Godrej Techsupport", "Amount": 26314.22505},
	{"_id": "PL17", "OrderIndex": "PL017", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Royalties & Trademark Exp", "Amount": 184074.417332},
	{"_id": "PL18", "OrderIndex": "PL018", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Advertising Expenses", "Amount": 114055.471513},
	{"_id": "PL19", "OrderIndex": "PL019", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Promotions Expenses", "Amount": 195893.954065},
	{"_id": "PL20", "OrderIndex": "PL020", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "SPG Exp / Export Cost", "Amount": 41534.222521},
	{"_id": "PL21", "OrderIndex": "PL021", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Advt & Promo Expenses", "Amount": 351483.648099},
	{"_id": "PL22", "OrderIndex": "PL022", "PLHeader1": "Selling Expenses", "PLHeader2": "Selling Expenses", "Amount": 535944.040992},
	{"_id": "PL23", "OrderIndex": "PL023", "PLHeader1": "G&A Expenses", "PLHeader2": "Personnel  Exp - Office", "Amount": 83887.424167},
	{"_id": "PL24", "OrderIndex": "PL024", "PLHeader1": "G&A Expenses", "PLHeader2": "General Exp - Office", "Amount": 43596.914443},
	{"_id": "PL25", "OrderIndex": "PL025", "PLHeader1": "G&A Expenses", "PLHeader2": "Depr & A Exp - Office", "Amount": 6851.774925},
	{"_id": "PL26", "OrderIndex": "PL026", "PLHeader1": "G&A Expenses", "PLHeader2": "G&A Expenses", "Amount": 134336.113535},
	{"_id": "PL27", "OrderIndex": "PL027", "PLHeader1": "Operating Expense", "PLHeader2": "Operating Expense", "Amount": 670280.154527},
	{"_id": "PL28", "OrderIndex": "PL028", "PLHeader1": "Operating Income", "PLHeader2": "Operating Income", "Amount": 300270.793004},
	{"_id": "PL29", "OrderIndex": "PL029", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Foreign Exch. Loss/(Gain)", "Amount": 10257.475625},
	{"_id": "PL30", "OrderIndex": "PL030", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Interest Expense", "Amount": 6462.864544},
	{"_id": "PL31", "OrderIndex": "PL031", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Interest Income", "Amount": -7664.330607},
	{"_id": "PL32", "OrderIndex": "PL032", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Other Expense ( Income)", "Amount": -39918.732029},
	{"_id": "PL33", "OrderIndex": "PL033", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Non Operating (Income) / Exp", "Amount": -30862.722467},
	{"_id": "PL34", "OrderIndex": "PL034", "PLHeader1": "Earning Before Tax", "PLHeader2": "Earning Before Tax", "Amount": 331133.515471},
	{"_id": "PL35", "OrderIndex": "PL035", "PLHeader1": "Tax Expense", "PLHeader2": "Current Income Tax", "Amount": 94408.56275},
	{"_id": "PL36", "OrderIndex": "PL036", "PLHeader1": "Tax Expense", "PLHeader2": "Deferred Tax", "Amount": -16368.139314},
	{"_id": "PL37", "OrderIndex": "PL037", "PLHeader1": "Tax Expense", "PLHeader2": "Tax Expense", "Amount": 78040.423436},
	{"_id": "PL38", "OrderIndex": "PL038", "PLHeader1": "%% PBT", "PLHeader2": "%% PBT", "Amount": 23.567660714},
	{"_id": "PL39", "OrderIndex": "PL039", "PLHeader1": "Earning After Tax", "PLHeader2": "Earning After Tax", "Amount": 253093.092035},
	{"_id": "PL40", "OrderIndex": "PL040", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Depreciation - Direct", "Amount": 15066.668191},
	{"_id": "PL41", "OrderIndex": "PL041", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Depreciation - Indirect", "Amount": 6851.774925},
	{"_id": "PL42", "OrderIndex": "PL042", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Damaged Goods", "Amount": 9794.932721},
	{"_id": "PL43", "OrderIndex": "PL043", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Total Depreciation Exp", "Amount": 21918.443116},
	{"_id": "PL44", "OrderIndex": "PL044", "PLHeader1": "EBIT", "PLHeader2": "EBIT", "Amount": 300270.793004},
	{"_id": "PL45", "OrderIndex": "PL045", "PLHeader1": "EBITDA", "PLHeader2": "EBITDA", "Amount": 331984.168841},
	{"_id": "PL46", "OrderIndex": "PL046", "PLHeader1": "EBITDA & Royalties", "PLHeader2": "EBITDA & Royalties", "Amount": 505525.381635},
}

var plmodel_2016 = []toolkit.M{
	{"_id": "PL1", "OrderIndex": "PL001", "PLHeader1": "Net Sales", "PLHeader2": "Gross Sales", "Amount": 2858354.691098},
	{"_id": "PL2", "OrderIndex": "PL002", "PLHeader1": "Net Sales", "PLHeader2": "Sales Discount", "Amount": -182802.716539},
	{"_id": "PL3", "OrderIndex": "PL003", "PLHeader1": "Net Sales", "PLHeader2": "Net Sales", "Amount": 2675551.974559},
	{"_id": "PL4", "OrderIndex": "PL004", "PLHeader1": "Direct Expense", "PLHeader2": "Raw Material / Packaging Material", "Amount": 1373787.912396},
	{"_id": "PL5", "OrderIndex": "PL005", "PLHeader1": "Direct Expense", "PLHeader2": "Direct Labor", "Amount": 75147.546693},
	{"_id": "PL6", "OrderIndex": "PL006", "PLHeader1": "Direct Expense", "PLHeader2": "Freight & Others", "Amount": 413.334754},
	{"_id": "PL7", "OrderIndex": "PL007", "PLHeader1": "Direct Expense", "PLHeader2": "Direct Expense", "Amount": 1448935.459089},
	{"_id": "PL8", "OrderIndex": "PL008", "PLHeader1": "Indirect Expense", "PLHeader2": "Personel Expense - Factory", "Amount": 39328.432783},
	{"_id": "PL9", "OrderIndex": "PL009", "PLHeader1": "Indirect Expense", "PLHeader2": "General Expense - Factory", "Amount": 43665.554553},
	{"_id": "PL10", "OrderIndex": "PL010", "PLHeader1": "Indirect Expense", "PLHeader2": "Depr & Amort. Exp. -  Factory", "Amount": 19482.751931},
	{"_id": "PL11", "OrderIndex": "PL011", "PLHeader1": "Indirect Expense", "PLHeader2": "Indirect Expense", "Amount": 102476.739267},
	{"_id": "PL12", "OrderIndex": "PL012", "PLHeader1": "Cost of Goods Sold", "PLHeader2": "Cost of Goods Sold", "Amount": 1551412.198356},
	{"_id": "PL13", "OrderIndex": "PL013", "PLHeader1": "Gross Margin", "PLHeader2": "Gross Margin", "Amount": 1124139.776203},
	{"_id": "PL14", "OrderIndex": "PL014", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Indovest Trademark", "Amount": 114005.814665},
	{"_id": "PL15", "OrderIndex": "PL015", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Godrej Trademark", "Amount": 57047.361739},
	{"_id": "PL16", "OrderIndex": "PL016", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Godrej Techsupport", "Amount": 28523.680872},
	{"_id": "PL17", "OrderIndex": "PL017", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Royalties & Trademark Exp", "Amount": 199576.857276},
	{"_id": "PL18", "OrderIndex": "PL018", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Advertising Expenses", "Amount": 137568.150599},
	{"_id": "PL19", "OrderIndex": "PL019", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Promotions Expenses", "Amount": 185295.566318},
	{"_id": "PL20", "OrderIndex": "PL020", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "SPG Exp / Export Cost", "Amount": 45506.655393},
	{"_id": "PL21", "OrderIndex": "PL021", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Advt & Promo Expenses", "Amount": 368370.37231},
	{"_id": "PL22", "OrderIndex": "PL022", "PLHeader1": "Selling Expenses", "PLHeader2": "Selling Expenses", "Amount": 568360.56434},
	{"_id": "PL23", "OrderIndex": "PL023", "PLHeader1": "G&A Expenses", "PLHeader2": "Personnel  Exp - Office", "Amount": 118945.591541},
	{"_id": "PL24", "OrderIndex": "PL024", "PLHeader1": "G&A Expenses", "PLHeader2": "General Exp - Office", "Amount": 47869.793977},
	{"_id": "PL25", "OrderIndex": "PL025", "PLHeader1": "G&A Expenses", "PLHeader2": "Depr & A Exp - Office", "Amount": 8090.110609},
	{"_id": "PL26", "OrderIndex": "PL026", "PLHeader1": "G&A Expenses", "PLHeader2": "G&A Expenses", "Amount": 174905.496127},
	{"_id": "PL27", "OrderIndex": "PL027", "PLHeader1": "Operating Expense", "PLHeader2": "Operating Expense", "Amount": 743266.060467},
	{"_id": "PL28", "OrderIndex": "PL028", "PLHeader1": "Operating Income", "PLHeader2": "Operating Income", "Amount": 380873.715736},
	{"_id": "PL29", "OrderIndex": "PL029", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Foreign Exch. Loss/(Gain)", "Amount": 5158.752732},
	{"_id": "PL30", "OrderIndex": "PL030", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Interest Expense", "Amount": 1563.183513},
	{"_id": "PL31", "OrderIndex": "PL031", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Interest Income", "Amount": -15276.895958},
	{"_id": "PL32", "OrderIndex": "PL032", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Other Expense ( Income)", "Amount": -7617.61744},
	{"_id": "PL33", "OrderIndex": "PL033", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Non Operating (Income) / Exp", "Amount": -16172.577153},
	{"_id": "PL34", "OrderIndex": "PL034", "PLHeader1": "Earning Before Tax", "PLHeader2": "Earning Before Tax", "Amount": 397046.292889},
	{"_id": "PL35", "OrderIndex": "PL035", "PLHeader1": "Tax Expense", "PLHeader2": "Tax Expense", "Amount": 96013.285581},
	{"_id": "PL36", "OrderIndex": "PL036", "PLHeader1": "Tax Expense", "PLHeader2": "Current Income Tax", "Amount": 100919.76975},
	{"_id": "PL37", "OrderIndex": "PL037", "PLHeader1": "Tax Expense", "PLHeader2": "Deferred Tax", "Amount": -4906.484169},
	{"_id": "PL38", "OrderIndex": "PL038", "PLHeader1": "%% PBT", "PLHeader2": "%% PBT", "Amount": 24.1818869236595000},
	{"_id": "PL39", "OrderIndex": "PL039", "PLHeader1": "Earning After Tax", "PLHeader2": "Earning After Tax", "Amount": 301033.007308},
	{"_id": "PL40", "OrderIndex": "PL040", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Depreciation - Direct", "Amount": 19482.751931},
	{"_id": "PL41", "OrderIndex": "PL041", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Depreciation - Indirect", "Amount": 8090.110609},
	{"_id": "PL42", "OrderIndex": "PL042", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Damaged Goods", "Amount": 11523.849683},
	{"_id": "PL43", "OrderIndex": "PL043", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Total Depreciation Exp", "Amount": 27572.86254},
	{"_id": "PL44", "OrderIndex": "PL044", "PLHeader1": "EBIT", "PLHeader2": "EBIT", "Amount": 380873.7157360},
	{"_id": "PL45", "OrderIndex": "PL045", "PLHeader1": "EBITDA", "PLHeader2": "EBITDA", "Amount": 419970.427959},
	{"_id": "PL46", "OrderIndex": "PL046", "PLHeader1": "EBITDA & Royalties", "PLHeader2": "EBITDA & Royalties", "Amount": 607262.056944},
}
