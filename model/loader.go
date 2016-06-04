package gdrj

// import "fmt"
// import "github.com/eaciit/dbox"
// import "github.com/eaciit/toolkit"
// import _ "github.com/eaciit/dbox/dbc/json"
// import _ "github.com/eaciit/dbox/dbc/mongo"
// import "path/filepath"
// import "eaciit/gdrj/model"
// import "os"
// import "time"

// var ci = dbox.ConnectionInfo{"localhost:27017", "ecgodrej", "", "", nil}
// var month time.Month = 4
// var day = 12
// var max = 10000
// var pldatamodel = new(gdrj.PLDataModel).TableName()

// var (
// 	pcs     = toolkit.M{}
// 	ccs     = toolkit.M{}
// 	ledgers = toolkit.M{}
// 	prods   = toolkit.M{}
// 	custs   = toolkit.M{}
// 	plm     = toolkit.M{}
// 	pnl     = []PNL{}

// 	arrpcs     = []interface{}{}
// 	arrccs     = []interface{}{}
// 	arrledgers = []interface{}{}
// 	arrprods   = []interface{}{}
// 	arrcusts   = []interface{}{}
// )

// type PNL struct {
// 	PLCODE string
// 	Value  float64
// }

// func Start() {
// 	prepMaster()
// 	GetPNL(2015)

// 	for _, eachPNL := range pnl {
// 		totalPercentage := 0.0
// 		allPercentage := []float64{}

// 		for i := 0; i < max; i++ {
// 			percentage := (toolkit.RandFloat(1, 3) + 0.1) * 0.0001
// 			allPercentage = append(allPercentage, percentage)
// 			totalPercentage = totalPercentage + percentage
// 		}

// 		leftPercentage := (1.0 - totalPercentage) / float64(max)

// 		for i := 0; i < max; i++ {
// 			customer := custs[toolkit.RandInt(len(custs))].(*Customer)
// 			product := prods[toolkit.RandInt(len(prods))].(*Product)
// 			costCenter := arrccs[toolkit.RandInt(len(arrccs))].(*CostCenter)
// 			percentage := allPercentage[i] + leftPercentage
// 			allPercentage[i] = percentage

// 			date := new(gdrj.Date)
// 			date.Date = time.Date(year, time.Month(month), day, 0, 0, 0, 0, time.UTC)
// 			date.Month = month
// 			date.Year = year

// 			profitCenter := pcs[customer.ID+product.ID].(*ProfitCenter)

// 			ls := new(gdrj.LedgerSummary)
// 			ls.ID = fmt.Sprintf("%v_%v_%v_%v_%v_%v_%v_%v_%v", year, month, date.Date.Day(), customer.ID, eachPNL.PLCODE, product.ID, toolkit.RandInt(100000), toolkit.RandInt(100000), toolkit.RandInt(100000))
// 			ls.Year = year
// 			ls.Month = month
// 			ls.Date = date
// 			ls.Customer = customer
// 			ls.Product = Product
// 			ls.PC = profitCenter
// 			ls.CC = costCenter

// 			ls.OutletID = customer.ID
// 			ls.SKUID = product.ID
// 			ls.PCID = profitCenter.ID
// 			ls.CCID = costCenter.ID

// 			ls.PLCode = eachPNL.PLCODE
// 			ls.Value1 = percentage * eachPNL.Value

// 			err = conn.NewQuery().Insert().From(pldatamodel).Exec(toolkit.M{"data": ls})
// 			if err != nil {
// 				fmt.Println(err.Error())
// 			}
// 			fmt.Printf("-- %d inserted\n", i)
// 		}
// 	}
// }

// func getCursor(obj orm.IModel) dbox.ICursor {
// 	c, e := gdrj.Find(obj, nil, nil)
// 	if e != nil {
// 		return nil
// 	}
// 	return c
// }

// func prepMaster() {
// 	pc := new(gdrj.ProfitCenter)
// 	cc := new(gdrj.CostCenter)
// 	prod := new(gdrj.Product)
// 	ledger := new(gdrj.LedgerAccount)
// 	cust := new(gdrj.Customer)
// 	pl := new(gdrj.PLModel)

// 	cpc := getCursor(pc)
// 	defer cpc.Close()
// 	var e error
// 	for e = cpc.Fetch(pc, 1, false); e == nil; {
// 		pcs.Set(pc.ID, pc)
// 		arrpcs = append(arrpcs, pcs)
// 		pc = new(gdrj.ProfitCenter)
// 		e = cpc.Fetch(pc, 1, false)
// 	}

// 	plm := getCursor(pl)
// 	defer plm.Close()
// 	for e = plm.Fetch(pl, 1, false); e == nil; {
// 		pcs.Set(pl.ID, pl)
// 		arrpcs = append(arrpc, pcs)
// 		pl = new(gdrj.PLModel)
// 		e = plm.Fetch(pl, 1, false)
// 	}

// 	ccc := getCursor(cc)
// 	defer ccc.Close()
// 	for e = ccc.Fetch(cc, 1, false); e == nil; {
// 		ccs.Set(cc.ID, cc)
// 		arrccs = append(arrccs, ccs)
// 		cc = new(gdrj.CostCenter)
// 		e = ccc.Fetch(cc, 1, false)
// 	}

// 	cprod := getCursor(prod)
// 	defer cprod.Close()
// 	for e = cprod.Fetch(prod, 1, false); e == nil; {
// 		prods.Set(prod.ID, prod)
// 		arrprods = append(arrprods, prod)
// 		prod = new(gdrj.Product)
// 		e = cprod.Fetch(prod, 1, false)
// 	}

// 	cledger := getCursor(ledger)
// 	defer cledger.Close()
// 	for e = cledger.Fetch(ledger, 1, false); e == nil; {
// 		ledgers.Set(ledger.ID, ledger)
// 		arrledgers = append(arrledgers, ledger)
// 		ledger = new(gdrj.LedgerAccount)
// 		e = cledger.Fetch(ledger, 1, false)
// 	}

// 	ccust := getCursor(cust)
// 	defer ccust.Close()
// 	for e = ccust.Fetch(cust, 1, false); e == nil; {
// 		if len(custs) > 1000 {
// 			break
// 		}

// 		custs.Set(cust.ID, cust)
// 		arrcusts = append(arrcusts, cust)
// 		cust = new(gdrj.Customer)
// 		e = ccust.Fetch(cust, 1, false)
// 	}
// }

// func GetPNL(which string) {
// 	basePath, _ := os.Getwd()
// 	loc := filepath.Join(basePath, fmt.Sprintf("../_create/%s.json", which))
// 	conn, err := dbox.NewConnection("json", &dbox.ConnectionInfo{loc, "", "", "", nil})
// 	if err != nil {
// 		fmt.Println(err.Error())
// 	}

// 	err = conn.Connect()
// 	if err != nil {
// 		fmt.Println(err.Error())
// 	}

// 	csr, err := conn.NewQuery().Select().Cursor(nil)
// 	if err != nil {
// 		fmt.Println(err.Error())
// 	}

// 	pnl = []PNL{}

// 	err = csr.Fetch(&pnl, 0, false)
// 	if err != nil {
// 		fmt.Println(err.Error())
// 	}

// 	csr.Close()
// }
