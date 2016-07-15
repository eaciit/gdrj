
// 	// === FIX TOTAL ===

// 	let FORBIDDEN_NUMBAH = ['PL31', 'PL30', 'PL29', 'PL28']
// 	rows.forEach((r) => {
// 		FORBIDDEN_NUMBAH.forEach((plf) => {
// 			if (r.PLCode.indexOf(plf) > -1) {
// r['Regional Distributor_Modern Trade'] = r['Regional Distributor_Total']
// r['Regional Distributor_Modern Trade %'] = r['Regional Distributor_Total %']

// r['Regional Distributor_General Trade'] = 0
// r['Regional Distributor_General Trade %'] = 0
// 			}
// 		})
// 	})

















	// cols, _ := s.GetPLCollections()
	// for _, col := range cols {
	// 	dimensions := col.Get("dimensions").([]string)
	// 	ok := true

	// loopFilter:
	// 	for _, filterKey := range filterKeys {
	// 		filter := strings.Replace(filterKey, ".", "_", -1)
	// 		if !toolkit.HasMember(dimensions, filter) {
	// 			ok = false
	// 			break loopFilter
	// 		}
	// 	}

	// 	if ok {
	// 		return col.GetString("table")
	// 	}
	// }

























	// fmt.Println("========= OTHER DATA BLEND INTO ONE OTHER")
	// fmt.Printf("%#v\n", otherData)
	// if len(otherData) > 1 {
	// 	sumOther := toolkit.M{}
	// 	for _, each := range otherData {
	// 		sumOther.Set("_id", each.Get("_id"))

	// 		for key := range *each {
	// 			if key == "_id" {
	// 				continue
	// 			}

	// 			if _, ok := sumOther[key]; !ok {
	// 				sumOther.Set(key, each.GetFloat64(key))
	// 			} else {
	// 				sumOther.Set(key, each.GetFloat64(key)+sumOther.GetFloat64(key))
	// 			}
	// 		}
	// 	}

	// 	newData := []*toolkit.M{&sumOther}
	// 	for i, each := range *data {
	// 		if _, ok := otherData[i]; ok {
	// 			continue
	// 		}

	// 		newData = append(newData, each)
	// 	}
	// 	data = &newData
	// }

	/** NOT USED NOW, THE DAtA IS VALLID
	// if breakdown channel
	if hasChannel {
		channelDiscountIndex := -1
		channelDiscount := new(toolkit.M)

		channelMTIndex := -1
		channelMT := new(toolkit.M)

		channelEmptyIndex := -1
		channelEmpty := new(toolkit.M)

		channelGTIndex := -1
		channelGT := new(toolkit.M)

		for i, each := range *data {
			_id := each.Get("_id").(toolkit.M)
			channelid := strings.ToUpper(_id.GetString(channelid))

			switch channelid {
			case "DISCOUNT":
				channelDiscountIndex = i
				channelDiscount = each
			case "I3":
				channelMTIndex = i
				channelMT = each
			case "I2":
				channelGTIndex = i
				channelGT = each
			case "":
				channelEmptyIndex = i
				channelEmpty = each
			}
		}

		// if there is I3-MT and Discount, then summarize it
		if (channelMTIndex > -1) && (channelDiscountIndex > -1) {
			fmt.Println("calculate the MT + DISCOUNT")
			for key := range *channelDiscount {
				if key == "_id" {
					continue
				}

				total := channelMT.GetFloat64(key) + channelDiscount.GetFloat64(key)
				channelMT.Set(key, total)
			}

			newData := []*toolkit.M{}
			for i, each := range *data {
				if i == channelDiscountIndex {
					continue
				}
				newData = append(newData, each)
			}

			realData := *data
			realData = append(realData[:channelDiscountIndex], realData[channelDiscountIndex+1:]...)
			data = &realData
		}

		// if there is I2-GT and "", then summarize it
		if (channelGTIndex > -1) && (channelEmptyIndex > -1) {
			fmt.Println("calculate the GT + ")
			for key := range *channelEmpty {
				if key == "_id" {
					continue
				}

				total := channelGT.GetFloat64(key) + channelEmpty.GetFloat64(key)
				channelGT.Set(key, total)
			}

			newData := []*toolkit.M{}
			for i, each := range *data {
				if i == channelEmptyIndex {
					continue
				}
				newData = append(newData, each)
			}

			realData := *data
			realData = append(realData[:channelEmptyIndex], realData[channelEmptyIndex+1:]...)
			data = &realData
		}
	}*/
















	if s.Flag != "" {
		// for _, raw := range *data {
		// 	grossSales := s.Sum(raw, "grossamount")
		// 	salesDiscount := s.Sum(raw, "discountamount")
		// 	btl := s.Sum(raw, "PL29", "PL30", "PL31", "PL32")
		// 	qty := s.Sum(raw, "salesqty")
		// 	netSales := s.Sum(raw, "PL8A")
		// 	netAmount := s.Sum(raw, "netamount")
		// 	salesReturn := s.Sum(raw, "PL3")
		// 	freightExpense := s.Sum(raw, "PL23")
		// 	directLabour := s.Sum(raw, "PL14")
		// 	directExpenses := s.Sum(raw, "PL14A")
		// 	indirectExpense := s.Sum(raw, "PL74A")
		// 	cogs := s.Sum(raw, "PL74B")
		// 	materialLocal := s.Sum(raw, "PL9")
		// 	materialImport := s.Sum(raw, "PL10")
		// 	materialOther := s.Sum(raw, "PL13")
		// 	sga := s.Sum(raw, "PL94A")
		// 	netprice := math.Abs(s.noZero(netAmount / qty))
		// 	netpricebtl := math.Abs(netprice + btl)
		// 	countOutlet := s.Sum(raw, "totaloutlet")
		// 	indirectPersonnel := s.Sum(raw, "PL15")
		// 	indirectServices := s.Sum(raw, "PL16")
		// 	indirectRent := s.Sum(raw, "PL17")
		// 	indirectTransportation := s.Sum(raw, "PL18")
		// 	indirectMaintenance := s.Sum(raw, "PL19")
		// 	indirectOther := s.Sum(raw, "PL20")
		// 	indirectAmort := s.Sum(raw, "PL21")
		// 	indirectEnergy := s.Sum(raw, "PL74")
		// 	advertising := s.Sum(raw, "PL28")
		// 	bonus := s.Sum(raw, "PL29")
		// 	gondola := s.Sum(raw, "PL30")
		// 	otheradvertising := s.Sum(raw, "PL31")
		// 	personnelga := s.Sum(raw, "PL33")
		// 	generalga := s.Sum(raw, "PL34")
		// 	deprga := s.Sum(raw, "PL35")
		// 	foreignga := s.Sum(raw, "PL94")

		// 	each := toolkit.M{}
		// 	if s.Flag == "gross_sales_discount_and_net_sales" {
		// 		each.Set("gross_sales", grossSales)
		// 		each.Set("sales_discount", math.Abs(salesDiscount))
		// 		each.Set("net_sales", netSales)
		// 	} else if s.Flag == "gross_sales_qty" {
		// 		each.Set("gross_sales", grossSales)
		// 		each.Set("qty", qty)
		// 		each.Set("gross_sales_qty", s.noZero(grossSales/qty))
		// 	} else if s.Flag == "discount_qty" {
		// 		each.Set("sales_discount", math.Abs(salesDiscount))
		// 		each.Set("qty", qty)
		// 		each.Set("discount_qty", math.Abs(s.noZero(salesDiscount/qty)))
		// 	} else if s.Flag == "sales_return_rate" {
		// 		each.Set("sales_return", math.Abs(salesReturn))
		// 		each.Set("sales_revenue", netSales)
		// 		each.Set("sales_return_rate", math.Abs(s.noZero(salesReturn/netSales)))
		// 	} else if s.Flag == "sales_discount_by_gross_sales" {
		// 		each.Set("sales_discount", math.Abs(salesDiscount))
		// 		each.Set("gross_sales", grossSales)
		// 		each.Set("sales_discount_by_gross_sales", math.Abs(s.noZero(salesDiscount/grossSales)))
		// 	} else if s.Flag == "freight_cost_by_sales" {
		// 		each.Set("freight_cost", math.Abs(freightExpense))
		// 		each.Set("net_sales", netSales)
		// 		each.Set("freight_cost_by_sales", math.Abs(s.noZero(freightExpense/netSales)))
		// 	} else if s.Flag == "direct_labour_index" {
		// 		each.Set("direct_abour", math.Abs(directLabour))
		// 		each.Set("cogs", math.Abs(cogs))
		// 		each.Set("direct_labour_index", math.Abs(s.noZero(directLabour/cogs)))
		// 	} else if s.Flag == "material_type_index" {
		// 		each.Set("material_local", math.Abs(materialLocal))
		// 		each.Set("material_import", math.Abs(materialImport))
		// 		each.Set("material_other", math.Abs(materialOther))
		// 		each.Set("cogs", math.Abs(cogs))
		// 		each.Set("indirect_expense_index", s.noZero(math.Abs(s.noZero((materialLocal+materialImport+materialOther))/cogs)))
		// 	} else if s.Flag == "sga_by_sales" {
		// 		each.Set("sga", math.Abs(sga))
		// 		each.Set("sales", netSales)
		// 		each.Set("sga_qty", math.Abs(s.noZero(sga/netSales)))
		// 	} else if s.Flag == "net_price_qty" {
		// 		each.Set("qty", math.Abs(qty))
		// 		each.Set("netprice", netprice)
		// 		each.Set("netprice_qty", math.Abs(s.noZero(netprice/qty)))
		// 	} else if s.Flag == "btl_qty" {
		// 		each.Set("btl", math.Abs(btl))
		// 		each.Set("qty", math.Abs(qty))
		// 		each.Set("btl_qty", math.Abs(s.noZero(btl/qty)))
		// 	} else if s.Flag == "net_price_after_btl_qty" {
		// 		each.Set("netpricebtl", netpricebtl)
		// 		each.Set("qty", math.Abs(qty))
		// 		each.Set("netpricebtl_qty", math.Abs(s.noZero(netpricebtl/qty)))
		// 	} else if s.Flag == "cost_by_sales" {
		// 		each.Set("cost", math.Abs(cogs))
		// 		each.Set("sales", netSales)
		// 		each.Set("cost_qty", math.Abs(s.noZero(cogs/netSales)))
		// 	} else if s.Flag == "sales_by_outlet" {
		// 		each.Set("sales", netSales)
		// 		each.Set("outlet", countOutlet)
		// 		each.Set("sales_outlet", math.Abs(s.noZero(netSales/countOutlet)))
		// 	} else if s.Flag == "number_of_outlets" {
		// 		each.Set("outlet", countOutlet)
		// 	} else if s.Flag == "indirect_expense_index" {
		// 		each.Set("personnel", math.Abs(indirectPersonnel))
		// 		each.Set("services", math.Abs(indirectServices))
		// 		each.Set("rent", math.Abs(indirectRent))
		// 		each.Set("transportation", math.Abs(indirectTransportation))
		// 		each.Set("maintenance", math.Abs(indirectMaintenance))
		// 		each.Set("amort", math.Abs(indirectAmort))
		// 		each.Set("energy", math.Abs(indirectEnergy))
		// 		each.Set("other", math.Abs(indirectOther))
		// 		each.Set("cogs", math.Abs(cogs))
		// 		each.Set("indirect_cogs", s.noZero(math.Abs((s.noZero(indirectPersonnel)+s.noZero(indirectServices)+s.noZero(indirectRent)+s.noZero(indirectTransportation)+s.noZero(indirectAmort)+s.noZero(indirectEnergy)+s.noZero(indirectOther))/cogs)))
		// 	} else if s.Flag == "marketing_expense_index" {
		// 		each.Set("advertising", math.Abs(advertising))
		// 		each.Set("bonus", math.Abs(bonus))
		// 		each.Set("gondola", math.Abs(gondola))
		// 		each.Set("otheradvertising", math.Abs(otheradvertising))
		// 		each.Set("sales", netSales)
		// 		each.Set("sales_outlet", s.noZero(math.Abs(s.noZero((advertising+bonus+gondola+otheradvertising)/netSales))))
		// 	} else if s.Flag == "sga_cost_ratio" {
		// 		each.Set("personnel", s.noZero(math.Abs(personnelga/sga)))
		// 		each.Set("general", s.noZero(math.Abs(generalga/sga)))
		// 		each.Set("depr", s.noZero(math.Abs(deprga/sga)))
		// 		each.Set("foreign", s.noZero(math.Abs(foreignga/sga)))
		// 	} else if s.Flag == "non_sales_pnl_items" {
		// 		each.Set("directexpenses", math.Abs(directExpenses))
		// 		each.Set("indirectExpense", math.Abs(indirectExpense))
		// 		each.Set("depr", math.Abs(cogs))
		// 		each.Set("sales", math.Abs(netSales))
		// 		each.Set("nonsales", s.noZero(math.Abs((directExpenses+indirectExpense+cogs)/netSales)))
		// 	}
		// 	// else if s.Flag == "marketing_efficiency_btl" {
		// 	// 	each.Set("advertising", math.Abs(advertising))
		// 	// 	each.Set("bonus", math.Abs(bonus))
		// 	// 	each.Set("gondola", math.Abs(gondola))
		// 	// 	each.Set("otheradvertising", math.Abs(otheradvertising))
		// 	// 	each.Set("btl", math.Abs(btl))
		// 	// 	each.Set("marketing_btl", s.noZero(math.Abs(s.noZero((advertising+bonus+gondola+otheradvertising)/btl))))
		// 	// }

		// 	for k, v := range raw.Get("_id").(toolkit.M) {
		// 		each.Set(strings.Replace(k, "_id_", "", -1), strings.TrimSpace(fmt.Sprintf("%v", v)))
		// 	}

		// 	res = append(res, &each)
		// }

		// *data = res
