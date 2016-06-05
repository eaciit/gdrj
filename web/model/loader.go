package gocore

import "eaciit/gdrj/model"
import "github.com/eaciit/orm/v1"
import "github.com/eaciit/dbox"
import "github.com/eaciit/toolkit"
import "fmt"
import "encoding/json"
import "time"

func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}

func GenerateDummyLedgerSummary() {
	var err, e error
	pcs := map[string]*gdrj.ProfitCenter{}
	ccs := map[string]*gdrj.CostCenter{}
	ledgers := map[string]*gdrj.LedgerAccount{}
	prods := map[string]*gdrj.Product{}
	custs := map[string]*gdrj.Customer{}
	max := 1000

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

	plm := []*gdrj.PLModel{}
	if err = json.Unmarshal([]byte(plmodel_2014_2015), &plm); err != nil {
		fmt.Println(err.Error())
	}
	fmt.Println("done fetching plmodel", len(plm))

	for _, eachPNL := range plm {
		totalPercentage := 0.0
		allPercentage := []float64{}

		for i := 0; i < max; i++ {
			percentage := (toolkit.RandFloat(1, 3) + 0.1) * 0.0001
			allPercentage = append(allPercentage, percentage)
			totalPercentage = totalPercentage + percentage
		}

		leftPercentage := (1.0 - totalPercentage) / float64(max)

		for i := 0; i < max; i++ {
			percentage := allPercentage[i] + leftPercentage
			allPercentage[i] = percentage

			date := new(gdrj.Date)
			date.Date = time.Now()
			l := new(gdrj.LedgerSummary)
			l.Customer = arr_custs[toolkit.RandInt(len(arr_custs))]
			l.Product = arr_prods[toolkit.RandInt(len(arr_prods))]
			l.CC = arr_ccs[toolkit.RandInt(len(arr_ccs))]
			l.PC = pcs[l.Product.PCID]
			l.LedgerAccount = arr_ledgers[toolkit.RandInt(len(arr_ledgers))].ID
			l.PLModel = plm[toolkit.RandInt(len(plm))]
			l.Date = date

			if l.PC == nil {
				l.PC = arr_pcs[toolkit.RandInt(len(arr_pcs))]
			}

			l.PCID = l.PC.ID
			l.CCID = l.CC.ID
			l.OutletID = l.Customer.ID
			l.SKUID = l.Product.ID
			l.PLCode = l.PLModel.ID
			l.PLGroup1 = l.PLModel.OrderIndex
			l.Value1 = percentage * eachPNL.Amount
			l.PLGroup1 = l.PLModel.PLHeader1
			l.PLGroup2 = l.PLModel.PLHeader2
			l.PLGroup3 = l.PLModel.PLHeader3
			l.Month = 4
			l.Year = 2015

			l.Save()

			fmt.Println("saved", eachPNL.ID, i, percentage, l.Value1)
		}
	}
}

const plmodel_2014_2015 = `[
	{ "_id": "PL1", "OrderIndex": "PL001", "PLHeader1": "Net Sales", "PLHeader2": "Gross Sales", "Amount":   2636910.753892000  },
	{ "_id": "PL2", "OrderIndex": "PL002", "PLHeader1": "Net Sales", "PLHeader2": "Sales Discount", "Amount":   -132368.487195000  },
	{ "_id": "PL3", "OrderIndex": "PL003", "PLHeader1": "Net Sales", "PLHeader2": "Net Sales", "Amount":   2504542.266697000  },
	{ "_id": "PL4", "OrderIndex": "PL004", "PLHeader1": "Direct Expense", "PLHeader2": "Raw Material / Packaging Material", "Amount":   1369802.880622000  },
	{ "_id": "PL5", "OrderIndex": "PL005", "PLHeader1": "Direct Expense", "PLHeader2": "Direct Labor", "Amount":   75207.737135000  },
	{ "_id": "PL6", "OrderIndex": "PL006", "PLHeader1": "Direct Expense", "PLHeader2": "Freight & Others", "Amount":   385.975561000  },
	{ "_id": "PL7", "OrderIndex": "PL007", "PLHeader1": "Direct Expense", "PLHeader2": "Direct Expense", "Amount":   1445010.617757000  },
	{ "_id": "PL8", "OrderIndex": "PL008", "PLHeader1": "Indirect Expense", "PLHeader2": "Personel Expense - Factory", "Amount":   28125.842133000  },
	{ "_id": "PL9", "OrderIndex": "PL009", "PLHeader1": "Indirect Expense", "PLHeader2": "General Expense - Factory", "Amount":   45788.191085000  },
	{ "_id": "PL10", "OrderIndex": "PL010", "PLHeader1": "Indirect Expense", "PLHeader2": "Depr & Amort. Exp. -  Factory", "Amount":   15066.668191000  },
	{ "_id": "PL11", "OrderIndex": "PL011", "PLHeader1": "Indirect Expense", "PLHeader2": "Indirect Expense", "Amount":   88980.701409000  },
	{ "_id": "PL12", "OrderIndex": "PL012", "PLHeader1": "Cost of Goods Sold", "PLHeader2": "Cost of Goods Sold", "Amount":   1533991.319166000  },
	{ "_id": "PL13", "OrderIndex": "PL013", "PLHeader1": "Gross Margin", "PLHeader2": "Gross Margin", "Amount":   970550.947531000  },
	{ "_id": "PL14", "OrderIndex": "PL014", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Indovest Trademark", "Amount":   105131.742179000  },
	{ "_id": "PL15", "OrderIndex": "PL015", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Godrej Trademark", "Amount":   52628.450103000  },
	{ "_id": "PL16", "OrderIndex": "PL016", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Godrej Techsupport", "Amount":   26314.225050000  },
	{ "_id": "PL17", "OrderIndex": "PL017", "PLHeader1": "Royalties & Trademark Exp", "PLHeader2": "Royalties & Trademark Exp", "Amount":   184074.417332000  },
	{ "_id": "PL18", "OrderIndex": "PL018", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Advertising Expenses", "Amount":   114055.471513000  },
	{ "_id": "PL19", "OrderIndex": "PL019", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Promotions Expenses", "Amount":   195893.954065000  },
	{ "_id": "PL20", "OrderIndex": "PL020", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "SPG Exp / Export Cost", "Amount":   41534.222521000  },
	{ "_id": "PL21", "OrderIndex": "PL021", "PLHeader1": "Advt & Promo Expenses", "PLHeader2": "Advt & Promo Expenses", "Amount":   351483.648099000  },
	{ "_id": "PL22", "OrderIndex": "PL022", "PLHeader1": "Selling Expenses", "PLHeader2": "Selling Expenses", "Amount":   535944.040992000  },
	{ "_id": "PL23", "OrderIndex": "PL023", "PLHeader1": "G&A Expenses", "PLHeader2": "Personnel  Exp - Office", "Amount":   83887.424167000  },
	{ "_id": "PL24", "OrderIndex": "PL024", "PLHeader1": "G&A Expenses", "PLHeader2": "General Exp - Office", "Amount":   43596.914443000  },
	{ "_id": "PL25", "OrderIndex": "PL025", "PLHeader1": "G&A Expenses", "PLHeader2": "Depr & A Exp - Office", "Amount":   6851.774925000  },
	{ "_id": "PL26", "OrderIndex": "PL026", "PLHeader1": "G&A Expenses", "PLHeader2": "G&A Expenses", "Amount":   134336.113535000  },
	{ "_id": "PL27", "OrderIndex": "PL027", "PLHeader1": "Operating Expense", "PLHeader2": "Operating Expense", "Amount":   670280.154527000  },
	{ "_id": "PL28", "OrderIndex": "PL028", "PLHeader1": "Operating Income", "PLHeader2": "Operating Income", "Amount":   300270.793004000  },
	{ "_id": "PL29", "OrderIndex": "PL029", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Foreign Exch. Loss/(Gain)", "Amount":   10257.475625000  },
	{ "_id": "PL30", "OrderIndex": "PL030", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Interest Expense", "Amount":   6462.864544000  },
	{ "_id": "PL31", "OrderIndex": "PL031", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Interest Income", "Amount":   -7664.330607000  },
	{ "_id": "PL32", "OrderIndex": "PL032", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Other Expense ( Income)", "Amount":   -39918.732029000  },
	{ "_id": "PL33", "OrderIndex": "PL033", "PLHeader1": "Non Operating (Income) / Exp", "PLHeader2": "Non Operating (Income) / Exp", "Amount":   -30862.722467000  },
	{ "_id": "PL34", "OrderIndex": "PL034", "PLHeader1": "Earning Before Tax", "PLHeader2": "Earning Before Tax", "Amount":   331133.515471000  },
	{ "_id": "PL35", "OrderIndex": "PL035", "PLHeader1": "Tax Expense", "PLHeader2": "Current Income Tax", "Amount":   94408.562750000  },
	{ "_id": "PL36", "OrderIndex": "PL036", "PLHeader1": "Tax Expense", "PLHeader2": "Deferred Tax", "Amount":   -16368.139314000  },
	{ "_id": "PL37", "OrderIndex": "PL037", "PLHeader1": "Tax Expense", "PLHeader2": "Tax Expense", "Amount":   78040.423436000  },
	{ "_id": "PL38", "OrderIndex": "PL038", "PLHeader1": "%% PBT", "PLHeader2": "%% PBT", "Amount":   23.567660714  },
	{ "_id": "PL39", "OrderIndex": "PL039", "PLHeader1": "Earning After Tax", "PLHeader2": "Earning After Tax", "Amount":   253093.092035000  },
	{ "_id": "PL40", "OrderIndex": "PL040", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Depreciation - Direct", "Amount":   15066.668191000  },
	{ "_id": "PL41", "OrderIndex": "PL041", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Depreciation - Indirect", "Amount":   6851.774925000  },
	{ "_id": "PL42", "OrderIndex": "PL042", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Damaged Goods", "Amount":   9794.932721000  },
	{ "_id": "PL43", "OrderIndex": "PL043", "PLHeader1": "Total Depreciation Exp", "PLHeader2": "Total Depreciation Exp", "Amount":   21918.443116000  },
	{ "_id": "PL44", "OrderIndex": "PL044", "PLHeader1": "EBIT", "PLHeader2": "EBIT", "Amount":   300270.793004000  },
	{ "_id": "PL45", "OrderIndex": "PL045", "PLHeader1": "EBITDA", "PLHeader2": "EBITDA", "Amount":   331984.168841000  },
	{ "_id": "PL46", "OrderIndex": "PL046", "PLHeader1": "EBITDA & Royalties", "PLHeader2": "EBITDA & Royalties", "Amount":   505525.381635000  }
]`
