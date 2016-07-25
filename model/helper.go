package gdrj

import (
	// "os"

	// "github.com/eaciit/dbox"
	// "github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"strings"
	// "time"
)

func CalcSum(tkm toolkit.M, masters toolkit.M) {
	var netsales, cogs, grossmargin, sellingexpense,
		sga, opincome, directexpense, indirectexpense,
		royaltiestrademark, advtpromoexpense, operatingexpense,
		freightexpense, nonoprincome, ebt, taxexpense,
		percentpbt, eat, totdepreexp, damagegoods, ebitda, ebitdaroyalties, ebitsga,
		grosssales, discount, advexp, promoexp, spgexp, netmargin float64

	exclude := []string{"PL8A", "PL14A", "PL74A", "PL26A", "PL32A", "PL39A", "PL41A", "PL44A",
		"PL74B", "PL74C", "PL74D", "PL32B", "PL94B", "PL94C", "PL39B", "PL41B", "PL41C", "PL44B", "PL44C", "PL44D", "PL44E",
		"PL44F", "PL6A", "PL0", "PL28", "PL29A", "PL31", "PL94A"}

	plmodels := masters.Get("plmodel").(map[string]*PLModel)

	inexclude := func(f string) bool {
		for _, v := range exclude {
			if v == f {
				return true
			}
		}

		return false
	}

	for k, v := range tkm {
		if k == "_id" || k == "key" {
			continue
		}

		ar01k := strings.Split(k, "_")

		if inexclude(ar01k[0]) {
			continue
		}

		plmodel, exist := plmodels[ar01k[0]]
		if !exist {
			// toolkit.Println(k)
			continue
		}
		Amount := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto)
		switch plmodel.PLHeader1 {
		case "Net Sales":
			netsales += Amount
		case "Direct Expense":
			directexpense += Amount
		case "Indirect Expense":
			indirectexpense += Amount
		case "Freight Expense":
			freightexpense += Amount
		case "Royalties & Trademark Exp":
			royaltiestrademark += Amount
		case "Advt & Promo Expenses":
			advtpromoexpense += Amount
		case "G&A Expenses":
			sga += Amount
		case "Non Operating (Income) / Exp":
			nonoprincome += Amount
		case "Tax Expense":
			taxexpense += Amount
		case "Total Depreciation Exp":
			if plmodel.PLHeader2 == "Damaged Goods" {
				damagegoods += Amount
			} else {
				totdepreexp += Amount
			}
		}

		// switch v.Group2 {
		switch plmodel.PLHeader2 {
		case "Gross Sales":
			grosssales += Amount
		case "Discount":
			discount += Amount
		case "Advertising Expenses":
			advexp += Amount
		case "Promotions Expenses":
			promoexp += Amount
		case "SPG Exp / Export Cost":
			spgexp += Amount
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
	netmargin = grossmargin + advtpromoexpense

	tkm.Set("PL0", grosssales)
	tkm.Set("PL6A", discount)
	tkm.Set("PL8A", netsales)
	tkm.Set("PL14A", directexpense)
	tkm.Set("PL74A", indirectexpense)
	tkm.Set("PL26A", royaltiestrademark)
	tkm.Set("PL32A", advtpromoexpense)
	tkm.Set("PL94A", sga)
	tkm.Set("PL39A", nonoprincome)
	tkm.Set("PL41A", taxexpense)
	tkm.Set("PL44A", totdepreexp)

	tkm.Set("PL28", advexp)
	tkm.Set("PL29A", promoexp)
	tkm.Set("PL31", spgexp)
	tkm.Set("PL74B", cogs)
	tkm.Set("PL74C", grossmargin)
	tkm.Set("PL74D", netmargin)
	tkm.Set("PL32B", sellingexpense)
	tkm.Set("PL94B", operatingexpense)
	tkm.Set("PL94C", opincome)
	tkm.Set("PL39B", ebt)
	tkm.Set("PL41B", percentpbt)
	tkm.Set("PL41C", eat)
	tkm.Set("PL44B", opincome)
	tkm.Set("PL44C", ebitda)
	tkm.Set("PL44D", ebitdaroyalties)
	tkm.Set("PL44E", ebitsga)
	tkm.Set("PL44F", ebitsgaroyalty)
}
