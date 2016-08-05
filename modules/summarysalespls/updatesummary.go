package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"os"

	"flag"
	"github.com/eaciit/dbox"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"math"
	"strings"
	"time"
)

var conn dbox.IConnection
var count int

var (
	t0                          time.Time
	fiscalyear, iscount, scount int
	data                        map[string]float64
	masters                     = toolkit.M{}

	alloc = map[string]float64{
		"I1": 0.17,
		"I3": 0.51,
		"I2": 0.32,
	}
)

type sgaalloc struct {
	ChannelID                                    string
	TotalNow, TotalExpect, RatioNow, RatioExpect float64
	TotalSales                                   float64
}

func buildmap(holder interface{},
	fnModel func() orm.IModel,
	filter *dbox.Filter,
	fnIter func(holder interface{}, obj interface{})) interface{} {
	crx, _ := gdrj.Find(fnModel(), filter, nil)
	defer crx.Close()
	for {
		s := fnModel()
		e := crx.Fetch(s, 1, false)
		if e != nil {
			break
		}
		fnIter(holder, s)
	}
	return holder
}

func setinitialconnection() {
	var err error
	conn, err = modules.GetDboxIConnection("db_godrej")

	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}

	err = gdrj.SetDb(conn)
	if err != nil {
		toolkit.Println("Initial connection found : ", err)
		os.Exit(1)
	}
}

func prepmastercalc() {
	toolkit.Println("--> PL MODEL")
	masters.Set("plmodel", buildmap(map[string]*gdrj.PLModel{},
		func() orm.IModel {
			return new(gdrj.PLModel)
		},
		nil,
		func(holder, obj interface{}) {
			h := holder.(map[string]*gdrj.PLModel)
			o := obj.(*gdrj.PLModel)
			h[o.ID] = o
		}).(map[string]*gdrj.PLModel))
}

func prepmasterrevadv() {
	toolkit.Println("--> Advertisement Revision")
	advertisements := toolkit.M{}
	//rawdatapl_ads30062016
	csradv, _ := conn.NewQuery().From("rawdatapl_ads30062016").
		Where(dbox.Eq("year", fiscalyear-1)).
		Cursor(nil)

	defer csradv.Close()
	for {
		m := toolkit.M{}
		e := csradv.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		Date := time.Date(m.GetInt("year"), time.Month(m.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		key := toolkit.Sprintf("%d_%d", Date.Year(), Date.Month())

		if len(m.GetString("brand")) > 2 {
			key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("brand"))))
		}

		tadv := toolkit.M{}
		if advertisements.Has(key) {
			tadv = advertisements.Get(key).(toolkit.M)
		}

		skey := "PL28I"
		tstr := strings.TrimSpace(strings.ToUpper(m.GetString("accountdescription")))
		switch tstr {
		case "ADVERTISEMENT - INTERNET":
			skey = "PL28A"
		case "ADVERTISEMENT - PRODN - DESIGN - DVLOPMNT":
			skey = "PL28B"
		case "ADVERTISEMENT - TV":
			skey = "PL28C"
		case "MARKET RESEARCH":
			skey = "PL28D"
		case "FAIRS & EVENTS":
			skey = "PL28E"
		case "AGENCY FEES":
			skey = "PL28F"
		case "ADVERTISEMENT - POP MATERIALS":
			skey = "PL28G"
		case "SPONSORSHIP":
			skey = "PL28H"
		}

		v := tadv.GetFloat64(skey) + m.GetFloat64("amountinidr")
		tadv.Set(skey, v)
		advertisements[key] = tadv
	}

	masters.Set("advertisements", advertisements)
}

func prepmasterrevpromospg() {
	toolkit.Println("--> Promotion and SPG Revision")
	promotions := toolkit.M{}

	csradv, _ := conn.NewQuery().From("rawdatapl_promospg11072016").
		Where(dbox.Eq("year", fiscalyear-1)).
		Cursor(nil)

	defer csradv.Close()

	// "date_year" : 2014.0
	// "date_month" : 7.0,
	// "customer_branchid" : "CD12",
	// "customer_channelid" : "I2",
	// "customer_customergroup" : "TM",
	// "product_brand" : "MITU",

	// "year" : NumberInt(2014),
	// "period" : NumberInt(1),
	// "amountinidr" : -9000000.0,
	// "accountdescription" : "GONDOLA",
	// "grouping" : "Promotion Expenses",
	// "channelid" : "I3",
	// "branchid" : "CD04",
	// "keyaccountcode" : "",
	// "brand" : ""

	for {
		m := toolkit.M{}
		e := csradv.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		agroup := "promo"
		if strings.Contains(strings.ToUpper(m.GetString("grouping")), "SPG") {
			agroup = "spg"
		}

		Date := time.Date(m.GetInt("year"), time.Month(m.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		key := toolkit.Sprintf("%s_%d_%d", agroup, Date.Year(), Date.Month())

		if len(m.GetString("branchid")) > 2 {
			key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("branchid"))))
			if len(m.GetString("channelid")) == 2 {
				key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("channelid"))))
				if len(m.GetString("keyaccountcode")) > 1 {
					key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("keyaccountcode"))))
					if len(m.GetString("brand")) > 1 {
						key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("brand"))))
					}
				}
			}
		} else if len(m.GetString("channelid")) == 2 {
			key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("channelid"))))
		}

		tpromo := toolkit.M{}
		if promotions.Has(key) {
			tpromo = promotions.Get(key).(toolkit.M)
		}

		skey := ""
		if agroup == "spg" {
			skey = "PL31E"
			tstr := strings.ToUpper(strings.TrimSpace(m.GetString("accountdescription")))
			switch tstr {
			case "SPG EXPENSES - MANUAL":
				skey = "PL31D"
			case "SPG EXPENSES":
				skey = "PL31C"
			case "SPG ALLOCATION":
				skey = "PL31B"
			case "COORDINATION FEE":
				skey = "PL31A"
			}
		} else {
			tstr := strings.TrimSpace(m.GetString("accountdescription"))
			plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)
			skey = "PL29A32"
			for _, v := range plmodels {
				if v.PLHeader2 == "Promotions Expenses" && v.PLHeader3 == tstr {
					skey = v.ID
				}
			}
		}

		v := tpromo.GetFloat64(skey) + m.GetFloat64("amountinidr")
		tpromo.Set(skey, v)
		promotions[key] = tpromo
	}

	masters.Set("promotions", promotions)
}

func prepmasterrevfreight() {
	toolkit.Println("--> Freight Revision")
	freights := toolkit.M{}

	csr, _ := conn.NewQuery().From("rawdatapl_freight").
		Where(dbox.Eq("year", fiscalyear-1)).
		Cursor(nil)

	defer csr.Close()
	for {
		m := toolkit.M{}
		e := csr.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		Date := time.Date(m.GetInt("year"), time.Month(m.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		key := toolkit.Sprintf("%d_%d", Date.Year(), Date.Month())

		v := freights.GetFloat64(key) + m.GetFloat64("amountinidr")
		freights.Set(key, v)
	}

	masters.Set("freights", freights)
}

func prepmasterrevdiscountactivity() {
	toolkit.Println("--> Discount Activity")
	discountactivities := toolkit.M{}

	csr, _ := conn.NewQuery().From("rawdiscountact_11072016").
		Where(dbox.Eq("year", fiscalyear-1)).
		Cursor(nil)

	defer csr.Close()
	for {
		m := toolkit.M{}
		e := csr.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		Date := time.Date(m.GetInt("year"), time.Month(m.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)
		key := toolkit.Sprintf("%d_%d", Date.Year(), Date.Month())

		// "date_year" : 2014.0
		// "date_month" : 7.0,
		// "customer_branchid" : "CD12",
		// "customer_channelid" : "I2",
		// "customer_customergroup" : "TM",
		// "product_brand" : "MITU",

		// "year" : NumberInt(2014),
		// "period" : NumberInt(1),
		// "amountinidr" : 145035.0,
		// "channelid" : "I3",
		// "branchid" : "CD02",
		// "keyaccountgroup" : "(blank)",
		// "brand" : "HIT",

		if len(m.GetString("branchid")) > 2 && m.GetString("branchid") != "(blank)" {
			key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("branchid"))))
			if len(m.GetString("channelid")) > 1 && m.GetString("channelid") != "(blank)" {
				key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("channelid"))))
				if len(m.GetString("keyaccountgroup")) > 1 && m.GetString("keyaccountgroup") != "(blank)" {
					key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("keyaccountgroup"))))
					if len(m.GetString("brand")) > 2 && m.GetString("brand") != "(blank)" {
						key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("brand"))))
					}
				}
			}
		} else if len(m.GetString("channelid")) > 1 && m.GetString("channelid") != "(blank)" {
			key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("channelid"))))
		} else if len(m.GetString("brand")) > 2 && m.GetString("brand") != "(blank)" {
			key = toolkit.Sprintf("%s_%s", key, strings.TrimSpace(strings.ToUpper(m.GetString("brand"))))
		}

		v := discountactivities.GetFloat64(key) + m.GetFloat64("amountinidr")
		discountactivities.Set(key, v)
	}

	masters.Set("discountactivities", discountactivities)
}

func prepmasterratio() {
	toolkit.Println("--> Master Ratio")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary-4exp").Cursor(nil)
	defer csr.Close()
	ratio := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		key := toolkit.Sprintf("%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
		v := ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		if dtkm.GetString("customer_channelid") != "EXP" {
			key = toolkit.Sprintf("ExEXP_%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
			v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
			ratio.Set(key, v)
		}

		key = toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"), strings.ToUpper(dtkm.GetString("product_brand")))
		v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		key = toolkit.Sprintf("%d_%d_%s_%s_%s_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
			dtkm.GetString("customer_branchid"), dtkm.GetString("customer_channelid"),
			dtkm.GetString("customer_customergroup"), strings.ToUpper(dtkm.GetString("product_brand")))

		v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		key = toolkit.Sprintf("%d_%d_%s_%s_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
			dtkm.GetString("customer_branchid"), dtkm.GetString("customer_channelid"),
			dtkm.GetString("customer_customergroup"))

		v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		key = toolkit.Sprintf("%d_%d_%s_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
			dtkm.GetString("customer_branchid"), dtkm.GetString("customer_channelid"))

		v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		key = toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
			dtkm.GetString("customer_branchid"))

		v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		key = toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
			dtkm.GetString("customer_channelid"))

		v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

		key = toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
			strings.ToUpper(dtkm.GetString("product_brand")))

		v = ratio.GetFloat64(key) + tkm.GetFloat64("grossamount")
		ratio.Set(key, v)

	}

	masters.Set("ratio", ratio)
}

func prepmastersalesreturn() {
	toolkit.Println("--> Sales Return")
	salesreturns := toolkit.M{}

	csrsr, _ := conn.NewQuery().From("salestrxs-return").Select("fiscal", "month", "year", "grossamount", "customer", "product").
		Where(dbox.Eq("fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))).
		Cursor(nil)

	defer csrsr.Close()
	for {
		m := toolkit.M{}
		e := csrsr.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		ctkm, _ := toolkit.ToM(m.Get("customer"))
		ptkm, _ := toolkit.ToM(m.Get("product"))

		key := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
			m.GetString("fiscal"), m.GetInt("month"), m.GetInt("year"),
			ctkm.GetString("branchid"), ctkm.GetString("branchname"), ctkm.GetString("keyaccount"),
			ctkm.GetString("channelid"), ctkm.GetString("channelname"), ctkm.GetString("reportchannel"),
			ctkm.GetString("reportsubchannel"), ctkm.GetString("zone"), ctkm.GetString("region"),
			ctkm.GetString("areaname"), ctkm.GetString("customergroup"), ctkm.GetString("customergroupname"),
			ctkm.GetString("custtype"), ptkm.GetString("brand"), "VDIST", "", "")

		v := m.GetFloat64("grossamount") + salesreturns.GetFloat64(key)
		salesreturns.Set(key, v)

	}

	i := 0
	for k, v := range salesreturns {
		toolkit.Println(k, " : ", v)
		i++
		if i == 5 {
			break
		}
	}

	masters.Set("salesreturns", salesreturns)
}

func prepmasterratiomapsalesreturn2016() {
	toolkit.Println("--> Master Ratio and maps for sales return 2016")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary").Cursor(nil)
	defer csr.Close()
	ratiosalesreturn2016 := toolkit.M{}
	mapsalesreturn2016 := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		mapkey := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
			dtkm.GetString("date_fiscal"), dtkm.GetInt("date_month"), dtkm.GetInt("date_year"),
			dtkm.GetString("customer_branchid"), dtkm.GetString("customer_branchname"), dtkm.GetString("customer_keyaccount"),
			dtkm.GetString("customer_channelid"), dtkm.GetString("customer_channelname"), dtkm.GetString("customer_reportchannel"),
			dtkm.GetString("customer_reportsubchannel"), dtkm.GetString("customer_zone"), dtkm.GetString("customer_region"),
			dtkm.GetString("customer_areaname"), dtkm.GetString("customer_customergroup"), dtkm.GetString("customer_customergroupname"),
			dtkm.GetString("customer_custtype"), dtkm.GetString("product_brand"), dtkm.GetString("trxsrc"),
			dtkm.GetString("source"), dtkm.GetString("ref"))

		mapsalesreturn2016.Set(mapkey, float64(0))

		////Fiscal, Channels, Branches, Brands for 2016,
		key01 := toolkit.Sprintf("%s|%s|%s|%s",
			dtkm.GetString("date_fiscal"), dtkm.GetString("customer_branchid"),
			dtkm.GetString("customer_channelid"), dtkm.GetString("product_brand"))

		key02 := toolkit.Sprintf("%s|%s|%s",
			dtkm.GetString("date_fiscal"), dtkm.GetString("customer_branchid"),
			dtkm.GetString("customer_channelid"))

		v := ratiosalesreturn2016.GetFloat64(key01) + tkm.GetFloat64("grossamount")
		ratiosalesreturn2016.Set(key01, v)

		v = ratiosalesreturn2016.GetFloat64(key02) + tkm.GetFloat64("grossamount")
		ratiosalesreturn2016.Set(key02, v)

	}

	masters.Set("ratiosalesreturn2016", ratiosalesreturn2016)
	masters.Set("mapsalesreturn2016", mapsalesreturn2016)
}

func prepmasterdiffsalesreturn2016() {
	toolkit.Println("--> Sales Return")
	mapsalesreturn2016 := masters.Get("mapsalesreturn2016").(toolkit.M)
	ratiosalesreturn2016 := masters.Get("ratiosalesreturn2016").(toolkit.M)

	csrsr, _ := conn.NewQuery().From("salestrxs-return").Select("fiscal", "month", "year", "grossamount", "customer", "product").
		Where(dbox.Eq("fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))).
		Cursor(nil)

	amount := float64(0)

	defer csrsr.Close()
	for {
		m := toolkit.M{}
		e := csrsr.Fetch(&m, 1, false)

		if e != nil {
			break
		}

		ctkm, _ := toolkit.ToM(m.Get("customer"))
		ptkm, _ := toolkit.ToM(m.Get("product"))

		//except RD in 2015-2016
		if ctkm.GetString("channelid") == "I1" {
			continue
		}

		key := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
			m.GetString("fiscal"), m.GetInt("month"), m.GetInt("year"),
			ctkm.GetString("branchid"), ctkm.GetString("branchname"), ctkm.GetString("keyaccount"),
			ctkm.GetString("channelid"), ctkm.GetString("channelname"), ctkm.GetString("reportchannel"),
			ctkm.GetString("reportsubchannel"), ctkm.GetString("zone"), ctkm.GetString("region"),
			ctkm.GetString("areaname"), ctkm.GetString("customergroup"), ctkm.GetString("customergroupname"),
			ctkm.GetString("custtype"), ptkm.GetString("brand"), "VDIST", "", "")

		if !mapsalesreturn2016.Has(key) {
			key = toolkit.Sprintf("%s|%s|%s|%s",
				m.GetString("fiscal"), ctkm.GetString("branchid"),
				ctkm.GetString("channelid"), ptkm.GetString("brand"))

			if !ratiosalesreturn2016.Has(key) {
				key = toolkit.Sprintf("%s|%s|%s",
					m.GetString("fiscal"), ctkm.GetString("branchid"),
					ctkm.GetString("channelid"))

				if !ratiosalesreturn2016.Has(key) {
					amount += m.GetFloat64("grossamount")
				}
			}

		}

		v := m.GetFloat64("grossamount") + mapsalesreturn2016.GetFloat64(key)
		mapsalesreturn2016.Set(key, v)

	}

	i := 0
	for k, v := range mapsalesreturn2016 {
		toolkit.Println(k, " : ", v)
		i++
		if i == 5 {
			break
		}
	}

	toolkit.Println("Amount not dist : ", amount)

	masters.Set("mapsalesreturn2016", mapsalesreturn2016)
}

func getstep(count int) int {
	v := count / 100
	if v == 0 {
		return 1
	}
	return v
}

func prepmastersgacalcrev() {
	toolkit.Println("--> SGA Rev Calculation")
	diffConn, _ := modules.GetDboxIConnection("db_godrej")
	defer diffConn.Close()

	m := map[string]map[string]*sgaalloc{}
	totalsga := float64(0)
	totalsgach := map[string]float64{}
	totalsalesch := map[string]float64{}
	allsgakey := map[string]float64{}

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	sumnow, _ := diffConn.NewQuery().From("salespls-summary-4sga").
		Where(filter).
		Cursor(nil)

	i := 0

	for {
		mnow := toolkit.M{}
		efetch := sumnow.Fetch(&mnow, 1, false)
		if efetch != nil {
			break
		}

		i++
		key := mnow.Get("key", toolkit.M{}).(toolkit.M)
		channelid := key.GetString("customer_channelid")
		mchannel, mchannelExist := m[channelid]
		if !mchannelExist {
			mchannel = map[string]*sgaalloc{}
			m[channelid] = mchannel
		}

		for sgakey, val := range mnow {
			if strings.Contains(sgakey, "PL33_") || strings.Contains(sgakey, "PL34_") || strings.Contains(sgakey, "PL35_") {
				cvalsga := toolkit.ToFloat64(val, 0, toolkit.RoundingAuto)

				totalsga += cvalsga
				totalsgach[channelid] += cvalsga
				allsgakey[sgakey] += cvalsga

				dcsga, dcsgaexist := mchannel[sgakey]
				if !dcsgaexist {
					dcsga = new(sgaalloc)
					mchannel[sgakey] = dcsga
				}

				dcsga.TotalNow += cvalsga
				dcsga.TotalSales += mnow.GetFloat64("PL8A")
				totalsalesch[channelid] += mnow.GetFloat64("PL8A")
			}
		}
	}

	for chid, challocs := range m {
		totalchexpect := alloc[chid] * totalsga
		toolkit.Printfn("%s : %v ", chid, totalchexpect)
		for dcid, dcsga := range challocs {
			dcsga.RatioNow = toolkit.Div(dcsga.TotalNow, totalsgach[chid])
			// dcsga.TotalExpect = totalchexpect * toolkit.Div(dcsga.TotalSales, totalsalesch[chid])
			dcsga.TotalExpect = totalchexpect * dcsga.RatioNow
			if chid == "I1" {
				dcsga.TotalExpect = allsgakey[dcid] * alloc[chid]
			}

			toolkit.Printfn("%s_%s : %v ", chid, dcid, dcsga.TotalExpect)
		}
	}

	// toolkit.Println(m)
	masters.Set("sgacalcrev", m)
}

func prepmastercustomergroup() {
	toolkit.Println("--> Customer Group Replace")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary-s12072016.v2").Cursor(nil)
	defer csr.Close()
	customergroup := toolkit.M{}
	customergroupname := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))

		customergroup.Set(tkm.GetString("_id"), dtkm.GetString("customer_customergroup"))
		customergroupname.Set(tkm.GetString("_id"), dtkm.GetString("customer_customergroupname"))
	}

	masters.Set("customergroup", customergroup)
	masters.Set("customergroupname", customergroupname)
}

func prepmasterrollback_adv() {
	toolkit.Println("--> Roll back data to for advertisement")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary-s15072016.v2").Cursor(nil)
	defer csr.Close()

	// salesplssummary := toolkit.M{}
	salesplsadvbrand := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))

		brand := dtkm.GetString("product_brand")
		// v := salesplsbrand.GetFloat64(brand) + tkm.GetFloat64("PL8A")
		// salesplsbrand.Set(brand, v)
		arrpladv := []string{"PL28I", "PL28A", "PL28B", "PL28C", "PL28D", "PL28E", "PL28F", "PL28G", "PL28H"}
		for _, str := range arrpladv {
			skey := toolkit.Sprintf("%s_%s", brand, str)
			v := salesplsadvbrand.GetFloat64(skey) + tkm.GetFloat64(str)
			salesplsadvbrand.Set(skey, v)
		}

		// salesplssummary.Set(tkm.GetString("_id"), tkm)
	}

	masters.Set("salesplsadvbrand", salesplsadvbrand)
}

func prepmasterrollback_sumbrand() {
	toolkit.Println("--> Roll back data to for summary brand")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary").Cursor(nil)
	defer csr.Close()

	salesplsbrand := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))

		brand := dtkm.GetString("product_brand")
		v := salesplsbrand.GetFloat64(brand) + tkm.GetFloat64("PL8A")
		salesplsbrand.Set(brand, v)

		// salesplssummary.Set(tkm.GetString("_id"), tkm)
	}

	masters.Set("salesplsbrand", salesplsbrand)
}

func prepreclasspromospgtordmt() {
	toolkit.Println("--> Reclass Data Promo")

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary").
		SetConfig("multiexec", true).
		Save()

	//2016
	// totrd := float64(526983045001)
	// totmt := float64(2132889211517)
	//strings.Contains(k, "PL29") || strings.Contains(k, "PL31") {
	// 2015
	// totrd := float64(513402656820)
	// totmt := float64(2034678567203)

	filter := dbox.And(dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear)),
		dbox.Eq("key.customer_channelid", "I3")) //I3 MT

	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary").Cursor(nil)
	defer csr.Close()

	salesplsreclass := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		newtkm := toolkit.M{}

		// tkmmt, _ := toolkit.ToM(tkm)

		for k, _ := range tkm {
			if strings.Contains(k, "PL") {
				if strings.Contains(k, "PL29") || strings.Contains(k, "PL31") {
					ratio := float64(0.1808)
					if fiscalyear == 2015 {
						ratio = float64(0.1872)
					}
					// v := tkm.GetFloat64(k) * totrd / totmt
					v := tkm.GetFloat64(k) * ratio
					newtkm.Set(k, v)

					vori := tkm.GetFloat64(k) - v
					tkm.Set(k, vori)
				}
			}
		}

		CalcSum(tkm)
		err := qSave.Exec(toolkit.M{}.Set("data", tkm))
		if err != nil {
			toolkit.Println(err)
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))

		oldid := tkm.GetString("_id")
		newtkm.Set("_id", toolkit.Sprintf("%s|%s", oldid, "RECLASSPROMOSPGRDMT"))

		dtkm.Set("customer_custtype", "RD")
		dtkm.Set("customer_channelname", "RD")
		dtkm.Set("customer_reportchannel", "RD")
		dtkm.Set("customer_channelid", "I1")
		dtkm.Set("trxsrc", "RECLASSPROMOSPGRDMT")

		newtkm.Set("key", dtkm)

		CalcSum(newtkm)

		err = qSave.Exec(toolkit.M{}.Set("data", newtkm))
		if err != nil {
			toolkit.Println(err)
		}

	}

	masters.Set("salesplsreclass", salesplsreclass)
}

func prepmastertotaldiscactivity() {
	toolkit.Println("--> Get discount activity")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary").Cursor(nil)
	defer csr.Close()
	totdiscactivity := float64(0)

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		totdiscactivity += tkm.GetFloat64("PL7A")
	}

	masters.Set("totdiscactivity", totdiscactivity)
}

//totsalesrd2016vdist
func prepmastertotsalesrd2016vdist() {
	toolkit.Println("--> Get Total Sales RD 2016")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary-2016-vdistrd").Cursor(nil)
	defer csr.Close()
	totsalesrd2016vdistcd11 := float64(0)
	totsalesrd2016vdistcd04 := float64(0)

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))

		if dtkm.GetString("customer_branchid") == "CD04" {
			totsalesrd2016vdistcd04 += tkm.GetFloat64("grossamount")
		} else {
			totsalesrd2016vdistcd11 += tkm.GetFloat64("grossamount")
		}

	}

	masters.Set("totsalesrd2016vdistcd04", totsalesrd2016vdistcd04)
	masters.Set("totsalesrd2016vdistcd11", totsalesrd2016vdistcd11)
}

func prepmasterrollback() {
	toolkit.Println("--> Roll back data to for salespls-summary")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).From("salespls-summary-s12072016").Cursor(nil)
	defer csr.Close()

	salesplssummary := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		// dtkm, _ := toolkit.ToM(tkm.Get("key"))

		// brand := dtkm.GetString("product_brand")
		// // v := salesplsbrand.GetFloat64(brand) + tkm.GetFloat64("PL8A")
		// // salesplsbrand.Set(brand, v)
		// arrpladv := []string{"PL28I", "PL28A", "PL28B", "PL28C", "PL28D", "PL28E", "PL28F", "PL28G", "PL28H"}
		// for _, str := range arrpladv {
		// 	skey := toolkit.Sprintf("%s_%s", brand, str)
		// 	v := salesplsadvbrand.GetFloat64(skey) + tkm.GetFloat64(str)
		// 	salesplsadvbrand.Set(skey, v)
		// }

		salesplssummary.Set(tkm.GetString("_id"), tkm)
	}

	masters.Set("salesplssummary", salesplssummary)
}

func prepmasterbranchgroup() {
	toolkit.Println("--> Prepare data to for branchgroup")

	csr, _ := conn.NewQuery().Select().From("branchgroup").Cursor(nil)
	defer csr.Close()

	branchgroup := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		branchgroup.Set(tkm.GetString("_id"), tkm)
	}

	masters.Set("branchgroup", branchgroup)
}

func prepsalesplssummaryrdwrongsubch() {
	//salespls-summary-rdwrongsubch
	type rdlist struct {
		subch    string
		plusdisc float64
		subgross float64
	}

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	total := float64(0)
	arrsubch := make([]rdlist, 0, 0)

	filter := dbox.Eq("date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).
		From("salespls-summary-rdsum4wrongsubch").
		Order("-gross").
		Cursor(nil)

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println(e)
			break
		}

		val := rdlist{
			subch:    tkm.GetString("customer_reportsubchannel"),
			subgross: tkm.GetFloat64("gross"),
		}

		arrsubch = append(arrsubch, val)

		total += tkm.GetFloat64("gross")
	}

	ratio := math.Abs(toolkit.Div(57300800361.49201, total))
	if fiscalyear == 2016 {
		ratio = math.Abs(toolkit.Div(62236716264.63395, total))
	}

	ratio = ratio - 0.0005

	csr.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary").
		SetConfig("multiexec", true).
		Save()

	toolkit.Println("--> Update data to salespls-summary from salespls-summary-rdwrongsubch")
	filter = dbox.And(dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear)),
		dbox.Gt("PL7A", 0))

	csr, _ = conn.NewQuery().Select().Where(filter).
		From("salespls-summary-rdwrongsubch").
		Order("-PL7A").
		Cursor(nil)

	// salesplssummaryrdwrongsubch := []toolkit.M{} plus value
	scount = csr.Count()
	step := getstep(scount)
	toolkit.Println("PLUS COUNT : ", scount)

	i := int(0)
	for {

		i += 1
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println(e)
			break
		}

		if i <= 10 {
			toolkit.Println(tkm.GetFloat64("PL7A"))
		}

		ix := i % 10
		arrsubch[ix].plusdisc += tkm.GetFloat64("PL7A")

		if i%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				i, scount, i*100/scount, time.Since(t0).String())
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		dtkm.Set("customer_reportsubchannel", arrsubch[ix].subch)
		tkm.Set("key", dtkm)

		_ = qSave.Exec(toolkit.M{}.Set("data", tkm))

	}
	csr.Close()

	filter = dbox.And(dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear)),
		dbox.Lte("PL7A", 0))

	csr, _ = conn.NewQuery().Select().Where(filter).
		From("salespls-summary-rdwrongsubch").
		Order("PL7A").
		Cursor(nil)
	defer csr.Close()

	// salesplssummaryrdwrongsubch := []toolkit.M{} minus value
	scount = csr.Count()
	step = getstep(scount)
	toolkit.Println("COUNT : ", scount)

	i = int(0)
	pointer := int(0)
	subdisc := arrsubch[pointer].plusdisc
	for {

		for arrsubch[pointer].subgross < 0 {
			pointer += 1
			if pointer >= len(arrsubch) {
				pointer = 1
			}
			subdisc = arrsubch[pointer].plusdisc
		}

		i += 1
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println(e)
			break
		}

		if i <= 10 {
			toolkit.Println(tkm.GetFloat64("PL7A"))
		}

		subdisc += tkm.GetFloat64("PL7A")

		if i%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				i, scount, i*100/scount, time.Since(t0).String())
		}

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		dtkm.Set("customer_reportsubchannel", arrsubch[pointer].subch)
		tkm.Set("key", dtkm)

		xsubdisc := subdisc
		if subdisc > 0 {
			xsubdisc = 0
		}

		tpercentage := math.Abs(toolkit.Div(xsubdisc, arrsubch[pointer].subgross))
		if tpercentage > ratio {
			arrsubch[pointer].plusdisc = subdisc
			pointer += 1
			if pointer >= len(arrsubch) {
				pointer = 1
			}
			subdisc = arrsubch[pointer].plusdisc
		}

		_ = qSave.Exec(toolkit.M{}.Set("data", tkm))
	}
}

func prepsalesplssummarymtwrongsubch() {
	//salespls-summary-rdwrongsubch

	arrsubch := []string{"Mini", "Super", "Hyper"}

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary").
		SetConfig("multiexec", true).
		Save()

	toolkit.Println("--> Update data to salespls-summary from salespls-summary-rdwrongsubch")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).
		From("salespls-summary-mtwrongsubch").
		Order("-PL7A").
		Cursor(nil)
	defer csr.Close()

	// salesplssummaryrdwrongsubch := []toolkit.M{}
	scount = csr.Count()
	step := getstep(scount)
	lnsubch := len(arrsubch)
	toolkit.Println("COUNT : ", scount)

	i := int(0)
	for {
		i += 1
		// toolkit.Println("i : ", i)
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println(e)
			break
		}

		if i <= 10 {
			toolkit.Println(tkm.GetFloat64("PL7A"))
		}

		if i%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				i, scount, i*100/scount, time.Since(t0).String())
		}

		ilnsubch := i % lnsubch

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		dtkm.Set("customer_reportsubchannel", arrsubch[ilnsubch])
		tkm.Set("key", dtkm)

		val := tkm.GetFloat64("PL1") + tkm.GetFloat64("PL2")
		tkm.Set("PL1", val)
		tkm.Set("PL2", float64(0))

		val = tkm.GetFloat64("PL7") + tkm.GetFloat64("PL8")
		tkm.Set("PL7", val)
		tkm.Set("PL8", float64(0))

		CalcSum(tkm)

		_ = qSave.Exec(toolkit.M{}.Set("data", tkm))

		// salesplssummaryrdwrongsubch = append(salesplssummaryrdwrongsubch, tkm)
		// salesplssummaryrdwrongsubch.Set(tkm.GetString("_id"), tkm)
	}

	// masters.Set("salesplssummaryrdwrongsubch", salesplssummaryrdwrongsubch)
}

func prepsalesplssummarygtwrongsubch() {
	//salespls-summary-rdwrongsubch

	arrsubch := []string{"R3 - Retailer Umum",
		"R1 - Grosir Umum",
		"R14 -  Retail Minimarket",
		"R5 - Tk.Sembako/ Tk.Bumbu",
		"R4 - Toko Kosmetik",
		"R6 - Toko Plastik",
		"R12 - Bengkel/Accesories",
		"R15 - Grosir Kosmetik/Kelo",
		"R18 - Lain-lain",
		"R16 - Grosir Sembako",
		"R7 - Toko Obat / Apotek",
		"R10 - Tk.Perlengkapan Bayi",
		"R17 - Grosir Plastik",
		"R13- Tk. Bangunan",
		"R8 - Toko Alat Tulis",
		"R2 - Grosir Snack",
		"R9 - Toko Listrik",
		"R11- Koperasi"}

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary").
		SetConfig("multiexec", true).
		Save()

	toolkit.Println("--> Update data to salespls-summary from salespls-summary-gtwrongsubch")

	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select().Where(filter).
		From("salespls-summary-gtwrongsubch").
		Order("-PL0").
		Cursor(nil)
	defer csr.Close()

	// salesplssummaryrdwrongsubch := []toolkit.M{}
	scount = csr.Count()
	step := getstep(scount)
	lnsubch := len(arrsubch)
	toolkit.Println("COUNT : ", scount)

	i := int(0)
	for {
		i += 1
		// toolkit.Println("i : ", i)
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println(e)
			break
		}

		if i <= 10 {
			toolkit.Println(tkm.GetFloat64("PL7A"))
		}

		if i%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				i, scount, i*100/scount, time.Since(t0).String())
		}

		ilnsubch := i % lnsubch

		dtkm, _ := toolkit.ToM(tkm.Get("key"))
		dtkm.Set("customer_reportsubchannel", arrsubch[ilnsubch])
		tkm.Set("key", dtkm)

		val := tkm.GetFloat64("PL1") + tkm.GetFloat64("PL2")
		tkm.Set("PL1", val)
		tkm.Set("PL2", float64(0))

		val = tkm.GetFloat64("PL7") + tkm.GetFloat64("PL8")
		tkm.Set("PL7", val)
		tkm.Set("PL8", float64(0))

		CalcSum(tkm)

		_ = qSave.Exec(toolkit.M{}.Set("data", tkm))

		// salesplssummaryrdwrongsubch = append(salesplssummaryrdwrongsubch, tkm)
		// salesplssummaryrdwrongsubch.Set(tkm.GetString("_id"), tkm)
	}

	// masters.Set("salesplssummaryrdwrongsubch", salesplssummaryrdwrongsubch)
}

func prepmastercogsperunit() {
	cogsmaps := make(map[string]*gdrj.COGSConsolidate, 0)
	ccogs, _ := gdrj.Find(new(gdrj.COGSConsolidate), nil, nil)
	defer ccogs.Close()

	for {
		cog := new(gdrj.COGSConsolidate)
		e := ccogs.Fetch(cog, 1, false)
		if e != nil {
			break
		}

		key := toolkit.Sprintf("%d_%d_%s", cog.Year, int(cog.Month), cog.SAPCode)
		// _, exist := cogskeys[key]
		// if !exist {
		// 	key = toolkit.Sprintf("%d_%d", o.Year, int(o.Month))
		// }

		// cog, exist := cogsmaps[key]
		// if !exist {
		// 	cog = new(gdrj.COGSConsolidate)
		// }

		// cog.Year = o.Year
		// cog.Month = o.Month
		// cog.COGS_Amount += o.COGS_Amount
		// cog.RM_Amount += o.RM_Amount
		// cog.LC_Amount += o.LC_Amount
		// cog.PF_Amount += o.PF_Amount
		// cog.Depre_Amount += o.Depre_Amount

		cogsmaps[key] = cog
	}

	masters.Set("cogs", cogsmaps)
}

func prepmasterproduct() {
	toolkit.Println("--> Prepare data to for product")

	csr, _ := conn.NewQuery().Select().From("product").Cursor(nil)
	defer csr.Close()

	masterproduct := toolkit.M{}

	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		masterproduct.Set(tkm.GetString("_id"), tkm)
	}

	masters.Set("masterproduct", masterproduct)
}

func getlistbrandcategory(str string) (res []string) {
	res = []string{}

	listcategories := map[string]string{}

	listcategories["MD01"] = "047,301,308,309,315,316,318,319,320,321,322,323,333,353,343,317,339,353,372"
	listcategories["MD02"] = "336"
	listcategories["MD03"] = "301,302,303,304,305,373,047,307,309,310,311,312,313,314,333,334,315,337,337,343,339,341,342,344,345"
	listcategories["MD05"] = "047,301,308,309,315,316,317,318,319,320,321,322,323,333,353,343,047,317,339,353,372"
	listcategories["MD31"] = "323"
	listcategories["MD41"] = "047,303,308,309,315,316,317,318,319,320,321,322,323,372,333"
	rawstr, exist := listcategories[str]

	if !exist {
		return
	}

	inlist := func(str string) bool {

		for _, val := range res {
			if val == str {
				return true
			}
		}

		return false
	}

	arrlist := strings.Split(rawstr, ",")
	for _, val := range arrlist {
		if !inlist(val) {
			res = append(res, val)
		}
	}

	return
}

func prepmasternewsgaalloc() {
	toolkit.Println("--> Prepare data to for new sgaalloc")

	toolkit.Println("--> Read data keys")
	keys := toolkit.M{}
	f := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csrkey, _ := conn.NewQuery().Select("key", "PL8A").Where(f).From("salespls-summary-4cogssgacleanperunit").Cursor(nil)
	defer csrkey.Close()

	toolkit.Println("--> Read data keys : ", csrkey.Count())
	for {
		tkm := toolkit.M{}
		e := csrkey.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm := tkm.Get("key", toolkit.M{}).(toolkit.M)
		masterproduct := masters.Get("masterproduct", toolkit.M{}).(toolkit.M)

		year := dtkm.GetInt("date_year")
		month := dtkm.GetInt("date_month")
		branchgroup := dtkm.GetString("customer_branchgroup")
		skuid := dtkm.GetString("product_skuid")
		dproduct := masterproduct.Get(skuid, toolkit.M{}).(toolkit.M)
		brandcategory := dproduct.GetString("brandcategoryid")
		if len(brandcategory) < 3 {
			brandcategory = ""
		}

		dkey := toolkit.Sprintf("%d_%d_%s", year, month, branchgroup)
		akey01 := toolkit.Sprintf("%d_%d_%s", year, month, brandcategory)
		akey := toolkit.Sprintf("%d_%d", year, month)

		netsales := tkm.GetFloat64("PL8A")
		val := keys.GetFloat64(dkey) + netsales
		keys.Set(dkey, keys.GetFloat64(dkey)+netsales)

		val = keys.GetFloat64(akey01) + netsales
		keys.Set(akey01, val)

		val = keys.GetFloat64(akey) + netsales
		keys.Set(akey, val)
	}

	i := 0
	for k, v := range keys {
		i++
		if i > 15 {
			break
		}
		toolkit.Println(k, " : ", v)
	}

	masters.Set("ratio4sga", keys)

	toolkit.Println("--> Done read data keys ::. ")

	f = dbox.Eq("year", fiscalyear-1)
	csr, _ := conn.NewQuery().Select().Where(f).From("rawdatapl-sga-4analysis-res").Cursor(nil)
	defer csr.Close()

	toolkit.Println("--> Read data rawdatapl-sga : ", csr.Count())
	newsgadirect := map[string]toolkit.M{}
	newsgaalloc := map[string]toolkit.M{}

	subtot := float64(0)
	subdirect := float64(0)
	suballocated := float64(0)

	// tkm.GetFloat64("min_amountinidr")
	for {

		//For HD11 -> addinfo : Jakarta

		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}
		subtot += tkm.GetFloat64("min_amountinidr")
		date := time.Date(tkm.GetInt("year"), time.Month(tkm.GetInt("period")), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 3, 0)

		branchgroup := tkm.GetString("branchgroup")
		key := toolkit.Sprintf("%d_%d_%s", date.Year(), date.Month(), branchgroup)

		plcode := "PL33"
		grouping := tkm.GetString("grouping")
		if grouping == "General and administrative expenses" {
			plcode = "PL34"
		} else if grouping == "Depr & Amort. Exp. -  Office" {
			plcode = "PL35"
		}

		costgroup := tkm.GetString("costgroup")
		if keys.Has(key) && branchgroup != "Central Expense" {
			nsgatkm, exist := newsgadirect[key]
			if !exist {
				nsgatkm = toolkit.M{}
			}

			gnsgatkm := nsgatkm.Get(plcode, toolkit.M{}).(toolkit.M)

			subdirect += tkm.GetFloat64("min_amountinidr")

			val := gnsgatkm.GetFloat64(costgroup) + tkm.GetFloat64("min_amountinidr")
			gnsgatkm.Set(costgroup, val)
			nsgatkm.Set(plcode, gnsgatkm)

			newsgadirect[key] = nsgatkm
		} else {
			//list brand category
			listcategory := []string{}
			listcategory = getlistbrandcategory(tkm.GetString("branchid"))
			keylistcategory := []string{}

			for _, v := range listcategory {
				key = toolkit.Sprintf("%d_%d_%s", date.Year(), date.Month(), v)
				if keys.Has(key) {
					keylistcategory = append(keylistcategory, v)
				}
			}
			val := tkm.GetFloat64("min_amountinidr")
			nkey := toolkit.ToFloat64(len(keylistcategory), 2, toolkit.RoundingAuto)
			if nkey > 0 {
				val = toolkit.Div(tkm.GetFloat64("min_amountinidr"), nkey)
			} else {

			}

			for _, v := range keylistcategory {
				key = toolkit.Sprintf("%d_%d_%s", date.Year(), date.Month(), v)

				nsgatkm, exist := newsgaalloc[key]
				if !exist {
					nsgatkm = toolkit.M{}
				}

				gnsgatkm := nsgatkm.Get(plcode, toolkit.M{}).(toolkit.M)

				xval := gnsgatkm.GetFloat64(costgroup) + val
				gnsgatkm.Set(costgroup, xval)
				nsgatkm.Set(plcode, gnsgatkm)

				newsgaalloc[key] = nsgatkm
			}

			if nkey == 0 {
				key = toolkit.Sprintf("%d_%d", date.Year(), date.Month())

				nsgatkm, exist := newsgaalloc[key]
				if !exist {
					nsgatkm = toolkit.M{}
				}

				gnsgatkm := nsgatkm.Get(plcode, toolkit.M{}).(toolkit.M)

				xval := gnsgatkm.GetFloat64(costgroup) + val
				gnsgatkm.Set(costgroup, xval)
				nsgatkm.Set(plcode, gnsgatkm)

				newsgaalloc[key] = nsgatkm
			}

			if nkey > 0 {
				suballocated += (nkey * val)
			} else {
				suballocated += val
			}

		}
	}

	toolkit.Println("--> Done read data rawdatapl-sga ::. ", subtot, " = ", subdirect, " + ", suballocated)

	i = 0
	suballocated = float64(0)
	for _, val := range newsgaalloc {
		for xk, _ := range val {
			tkmval := val.Get(xk, toolkit.M{}).(toolkit.M)
			for xxk, _ := range tkmval {
				suballocated += tkmval.GetFloat64(xxk)
			}
		}
	}

	// arrstr := []string{"MD01", "MD02", "MD03", "MD05", "MD31", "MD41"}
	// for _, v := range arrstr {
	// 	toolkit.Println(v, " : ", getlistbrandcategory(v))
	// }

	toolkit.Println("--> Recheck Allocated ::. ", suballocated)

	masters.Set("newsgadirect", newsgadirect)
	masters.Set("newsgaalloc", newsgaalloc)
}

/*
func prepmasternewchannelsgaalloc() {
	//salespls-summary-4cogssgafinal
	toolkit.Println("--> Prepare data to for new channel sgaalloc")

	f := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := conn.NewQuery().Select("key", "PL8A").Where(f).From("salespls-summary-4cogssgafinal").Cursor(nil)
	defer csr.Close()

	toolkit.Println("--> Read data source allocated : ", csr.Count())
	sgaallocatedist := map[string]toolkit.M{}
	sgadirectdist := map[string]toolkit.M{}
	for {
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			break
		}

		dtkm := tkm.Get("key", toolkit.M{}).(toolkit.M)
		// key := toolkit.Sprintf("%s_%d_%s_%s", dtkm.GetString(k))

		for i := 0; i < count; i++ {

		}
	}
	toolkit.Println("--> Done read data source allocated : ")
	masters.Set("sgaallocatedist", sgaallocatedist)
	masters.Set("sgadirectdist", sgadirectdist)
}
*/

func main() {
	t0 = time.Now()
	data = make(map[string]float64)
	flag.IntVar(&fiscalyear, "year", 2015, "YYYY representation of godrej fiscal year. Default is 2015")
	flag.Parse()

	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	setinitialconnection()
	defer gdrj.CloseDb()
	prepmastercalc()

	// prepsalesplssummaryrdwrongsubch()
	// prepsalesplssummarymtwrongsubch()
	// prepsalesplssummarygtwrongsubch()

	// prepmasterbranchgroup()
	// prepmastertotsalesrd2016vdist()

	// prepmastertotaldiscactivity()
	// prepmasterrollback()

	// prepmastercustomergroup()

	// prepmastersgacalcrev()
	// prepmasterratiomapsalesreturn2016()
	// prepmasterdiffsalesreturn2016()
	// prepmastersalesreturn()
	// prepmasterratio()
	// prepmasterrevfreight()
	// prepmasterrevadv()
	// prepreclasspromospgtordmt()
	// prepmasterrollback_adv()
	// prepmasterrollback_sumbrand()

	// prepmastercogsperunit()

	// os.Exit(1)

	prepmasterproduct()
	prepmasternewsgaalloc()

	toolkit.Println("Start data query...")
	filter := dbox.Eq("key.date_fiscal", toolkit.Sprintf("%d-%d", fiscalyear-1, fiscalyear))
	csr, _ := workerconn.NewQuery().Select().Where(filter).From("salespls-summary-4cogssgacleanperunit").Cursor(nil)
	defer csr.Close()

	scount = csr.Count()

	jobs := make(chan toolkit.M, scount)
	result := make(chan int, scount)
	for wi := 0; wi < 10; wi++ {
		go workersave(wi, jobs, result)
	}

	iscount = 0
	step := getstep(scount) * 5

	for {
		iscount++
		tkm := toolkit.M{}
		e := csr.Fetch(&tkm, 1, false)
		if e != nil {
			toolkit.Println("EOF")
			break
		}

		jobs <- tkm

		if iscount%step == 0 {
			toolkit.Printfn("Sending %d of %d (%d) in %s", iscount, scount, iscount*100/scount,
				time.Since(t0).String())
		}

	}

	close(jobs)

	for ri := 0; ri < scount; ri++ {
		<-result

		if ri%step == 0 {
			toolkit.Printfn("Saving %d of %d (%d pct) in %s",
				ri, scount, ri*100/scount, time.Since(t0).String())
		}
	}

	toolkit.Printfn("Processing done in %s",
		time.Since(t0).String())
}

func CleanAddCustomerGroupName(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	dtkm.Set("customer_customergroupname", dtkm.GetString("customer_groupname"))
	dtkm.Set("customer_customergroup", dtkm.GetString("customer_group"))
	dtkm.Unset("customer_groupname")
	dtkm.Unset("customer_group")
	tkm.Set("key", dtkm)
}

func CalcRatio(tkm toolkit.M) {
	if !masters.Has("ratio") {
		return
	}

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	ratio := masters.Get("ratio").(toolkit.M)

	rtkm := toolkit.M{}
	if tkm.Has("ratio") {
		rtkm = tkm["ratio"].(toolkit.M)
	}

	key := toolkit.Sprintf("%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
	rtkm.Set("month", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))

	if dtkm.GetString("customer_channelid") != "EXP" {
		key = toolkit.Sprintf("ExEXP_%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
		rtkm.Set("exexpmonth", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))
	}

	key = toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"), dtkm.GetString("product_brand"))
	rtkm.Set("monthbrand", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))

	key = toolkit.Sprintf("%d_%d_%s_%s_%s_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
		dtkm.GetString("customer_branchid"), dtkm.GetString("customer_channelid"),
		dtkm.GetString("customer_customergroup"), dtkm.GetString("product_brand"))
	rtkm.Set("monthbranchchannelcustgroupbrand", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))

	key = toolkit.Sprintf("%d_%d_%s_%s_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
		dtkm.GetString("customer_branchid"), dtkm.GetString("customer_channelid"),
		dtkm.GetString("customer_customergroup"))
	rtkm.Set("monthbranchchannelcustgroup", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))

	key = toolkit.Sprintf("%d_%d_%s_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
		dtkm.GetString("customer_branchid"), dtkm.GetString("customer_channelid"))
	rtkm.Set("monthbranchchannel", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))

	key = toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
		dtkm.GetString("customer_branchid"))
	rtkm.Set("monthbranch", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))

	key = toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"),
		dtkm.GetString("customer_channelid"))
	rtkm.Set("monthchannel", (tkm.GetFloat64("grossamount") / ratio.GetFloat64(key)))

	tkm.Set("ratio", rtkm)
}

func CalcRoyalties(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	netsales := tkm.GetFloat64("PL8A")

	if dtkm.GetString("date_fiscal") == "2015-2016" {
		tkm.Set("PL25", -netsales*0.0285214610603953)
	} else {
		tkm.Set("PL25", -netsales*0.0282568801711491)
	}
}

func CalcAdvertisementsRev(tkm toolkit.M) {
	if !masters.Has("advertisements") {
		return
	}

	tkm.Set("PL28", float64(0)).Set("PL28A", float64(0)).Set("PL28B", float64(0)).Set("PL28C", float64(0)).Set("PL28D", float64(0)).
		Set("PL28E", float64(0)).Set("PL28F", float64(0)).Set("PL28G", float64(0)).Set("PL28H", float64(0)).Set("PL28I", float64(0))

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	dratio, _ := toolkit.ToM(tkm.Get("ratio"))

	advertisements := masters.Get("advertisements").(toolkit.M)

	tkm01 := toolkit.M{}
	tkm02 := toolkit.M{}

	key01 := toolkit.Sprintf("%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
	if advertisements.Has(key01) {
		tkm01 = advertisements.Get(key01).(toolkit.M)
	}

	if len(dtkm.GetString("product_brand")) > 2 {
		key02 := toolkit.Sprintf("%s_%s", key01, strings.ToUpper(dtkm.GetString("product_brand")))
		if advertisements.Has(key02) {
			tkm02 = advertisements.Get(key02).(toolkit.M)
		}
	}

	for k, v := range tkm01 {
		fv := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto) * -dratio.GetFloat64("month")
		fv += tkm.GetFloat64(k)
		tkm.Set(k, fv)
	}

	for k, v := range tkm02 {
		fv := toolkit.ToFloat64(v, 6, toolkit.RoundingAuto) * -dratio.GetFloat64("monthbrand")
		fv += tkm.GetFloat64(k)
		tkm.Set(k, fv)
	}

	return
}

func CalcFreightsRev(tkm toolkit.M) {
	if !masters.Has("freights") {
		return
	}

	tkm.Set("PL23", float64(0))

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	dratio, _ := toolkit.ToM(tkm.Get("ratio"))

	freights := masters.Get("freights").(toolkit.M)
	key := toolkit.Sprintf("%d_%d", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"))
	val := -dratio.GetFloat64("exexpmonth") * freights.GetFloat64(key)

	tkm.Set("PL23", val)
	return
}

func CleanUpdateCustomerGroupName(tkm toolkit.M) {
	customergroup := masters.Get("customergroup").(toolkit.M)
	customergroupname := masters.Get("customergroupname").(toolkit.M)

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	dtkm.Set("customer_customergroupname", customergroupname.GetString(tkm.GetString("_id")))
	dtkm.Set("customer_customergroup", customergroup.GetString(tkm.GetString("_id")))
	tkm.Set("key", dtkm)
}

func CleanUpdateOldExport(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("customer_channelid") == "EXP" {
		for k, _ := range tkm {
			if k == "PL23" || strings.Contains(k, "PL28") || strings.Contains(k, "PL29") || strings.Contains(k, "PL31") || k == "PL30" {
				tkm.Set(k, float64(0))
			}
		}
	}
}

//masters.Set("salesplssummary", salesplssummary)
func RollbackSalesplsSummary(tkm toolkit.M) {
	salesplssummaries := masters.Get("salesplssummary").(toolkit.M)
	salesplssummary := salesplssummaries.Get(tkm.GetString("_id")).(toolkit.M)

	// dtkm, _ := toolkit.ToM(tkm.Get("key"))
	// dtkm.Set("customer_customergroupname", customergroupname.GetString(tkm.GetString("_id")))
	// dtkm.Set("customer_customergroup", customergroup.GetString(tkm.GetString("_id")))
	// tkm.Set("key", dtkm)
	tkm.Set("PL7A", salesplssummary.GetFloat64("PL7A"))
}

func CalcSalesReturn(tkm toolkit.M) {
	if !masters.Has("salesreturns") {
		return
	}

	tkm.Set("salesreturn", float64(0))

	dtkm, _ := toolkit.ToM(tkm.Get("key"))

	salesreturns := masters.Get("salesreturns").(toolkit.M)
	key := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
		dtkm.GetString("date_fiscal"), dtkm.GetInt("date_month"), dtkm.GetInt("date_year"),
		dtkm.GetString("customer_branchid"), dtkm.GetString("customer_branchname"), dtkm.GetString("customer_keyaccount"),
		dtkm.GetString("customer_channelid"), dtkm.GetString("customer_channelname"), dtkm.GetString("customer_reportchannel"),
		dtkm.GetString("customer_reportsubchannel"), dtkm.GetString("customer_zone"), dtkm.GetString("customer_region"),
		dtkm.GetString("customer_areaname"), dtkm.GetString("customer_customergroup"), dtkm.GetString("customer_customergroupname"),
		dtkm.GetString("customer_custtype"), dtkm.GetString("product_brand"), dtkm.GetString("trxsrc"),
		dtkm.GetString("source"), dtkm.GetString("ref"))

	// toolkit.Println(key)

	tkm.Set("salesreturn", salesreturns.GetFloat64(key))

	return
}

func CalcSalesReturn2016(tkm toolkit.M) {
	if !masters.Has("mapsalesreturn2016") || !masters.Has("ratiosalesreturn2016") {
		return
	}

	tkm.Set("salesreturn", float64(0)).Set("salesreturn_ori", float64(0))

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	dratio, _ := toolkit.ToM(tkm.Get("ratio"))

	mapsalesreturn2016 := masters.Get("mapsalesreturn2016").(toolkit.M)
	ratiosalesreturn2016 := masters.Get("ratiosalesreturn2016").(toolkit.M)

	key := toolkit.Sprintf("%s|%d|%d|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s|%s",
		dtkm.GetString("date_fiscal"), dtkm.GetInt("date_month"), dtkm.GetInt("date_year"),
		dtkm.GetString("customer_branchid"), dtkm.GetString("customer_branchname"), dtkm.GetString("customer_keyaccount"),
		dtkm.GetString("customer_channelid"), dtkm.GetString("customer_channelname"), dtkm.GetString("customer_reportchannel"),
		dtkm.GetString("customer_reportsubchannel"), dtkm.GetString("customer_zone"), dtkm.GetString("customer_region"),
		dtkm.GetString("customer_areaname"), dtkm.GetString("customer_customergroup"), dtkm.GetString("customer_customergroupname"),
		dtkm.GetString("customer_custtype"), dtkm.GetString("product_brand"), dtkm.GetString("trxsrc"),
		dtkm.GetString("source"), dtkm.GetString("ref"))

	tkm.Set("salesreturn_ori", mapsalesreturn2016.GetFloat64(key))

	//Fiscal, Channels, Branches, Brands for 2016,
	key01 := toolkit.Sprintf("%s|%s|%s|%s",
		dtkm.GetString("date_fiscal"), dtkm.GetString("customer_branchid"),
		dtkm.GetString("customer_channelid"), dtkm.GetString("product_brand"))

	key02 := toolkit.Sprintf("%s|%s|%s",
		dtkm.GetString("date_fiscal"), dtkm.GetString("customer_branchid"),
		dtkm.GetString("customer_channelid"))

	dratio.Set("fiscalchannelbranchbrand", gdrj.SaveDiv(tkm.GetFloat64("grossamount"), ratiosalesreturn2016.GetFloat64(key01)))
	dratio.Set("fiscalchannelbranch", gdrj.SaveDiv(tkm.GetFloat64("grossamount"), ratiosalesreturn2016.GetFloat64(key02)))

	v := tkm.GetFloat64("salesreturn_ori")
	v += (mapsalesreturn2016.GetFloat64(key01) * dratio.GetFloat64("fiscalchannelbranchbrand"))
	v += (mapsalesreturn2016.GetFloat64(key02) * dratio.GetFloat64("fiscalchannelbranch"))

	tkm.Set("salesreturn", v)

	tkm.Set("ratio", dratio)

	return
}

func CalcSalesVDist20142015(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("trxsrc") != "VDIST" || dtkm.GetString("date_fiscal") != "2014-2015" {
		return
	}

	if dtkm.GetString("customer_channelid") == "I1" {
		v := tkm.GetFloat64("discountamount")
		tkm.Set("PL8", -v)
	} else {
		v := tkm.GetFloat64("discountamount")
		tkm.Set("PL7", -v)
	}
}

func CalcSgaRev(tkm toolkit.M) {
	if !masters.Has("sgacalcrev") {
		return
	}

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	// dratio, _ := toolkit.ToM(tkm.Get("ratio"))

	gsgaratios := masters["sgacalcrev"].(map[string]map[string]*sgaalloc)
	gsgaratio := gsgaratios[dtkm.GetString("customer_channelid")]

	for sgakey, val := range tkm {
		if strings.Contains(sgakey, "PL33_") || strings.Contains(sgakey, "PL34_") || strings.Contains(sgakey, "PL35_") {
			sgadetail := gsgaratio[sgakey]
			cvalsga := toolkit.ToFloat64(val, 0, toolkit.RoundingAuto)
			cvalsga += (sgadetail.TotalExpect - sgadetail.TotalNow) * toolkit.Div(tkm.GetFloat64("PL8A"), sgadetail.TotalSales)
			tkm.Set(sgakey, cvalsga)
		}
	}
	return
}

func CleanUpdateCOGSAdjustRdtoMt(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("customer_channelid") == "I1" && dtkm.GetString("ref") == "COGSMATERIALADJUST" {
		dtkm.Set("customer_channelid", "I3")
		dtkm.Set("customer_reportchannel", "MT")
		dtkm.Set("customer_reportsubchannel", "Hyper")
		tkm.Set("key", dtkm)
	}
}

func CalcSum(tkm toolkit.M) {
	gdrj.CalcSum(tkm, masters)
	/*
		var netsales, cogs, grossmargin, sellingexpense,
			sga, opincome, directexpense, indirectexpense,
			royaltiestrademark, advtpromoexpense, operatingexpense,
			freightexpense, nonoprincome, ebt, taxexpense,
			percentpbt, eat, totdepreexp, damagegoods, ebitda, ebitdaroyalties, ebitsga,
			grosssales, discount, advexp, promoexp, spgexp float64

		exclude := []string{"PL8A", "PL14A", "PL74A", "PL26A", "PL32A", "PL39A", "PL41A", "PL44A",
			"PL74B", "PL74C", "PL32B", "PL94B", "PL94C", "PL39B", "PL41B", "PL41C", "PL44B", "PL44C", "PL44D", "PL44E",
			"PL44F", "PL6A", "PL0", "PL28", "PL29A", "PL31", "PL94A"}

		plmodels := masters.Get("plmodel").(map[string]*gdrj.PLModel)

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
	*/
}

// masters.Set("totdiscactivity", totdiscactivity)
func AllocateDiscountActivity(tkm toolkit.M) {
	if !masters.Has("totdiscactivity") {
		return
	}

	allocateval := float64(3245794696)
	totdiscactivity := masters.GetFloat64("totdiscactivity")

	val := tkm.GetFloat64("PL7A") + (allocateval * tkm.GetFloat64("PL7A") / totdiscactivity)
	tkm.Set("PL7A", val)
}

func RollbackSalesplsAdvertisement(tkm toolkit.M) {
	if !masters.Has("salesplsbrand") || !masters.Has("salesplsadvbrand") {
		return
	}

	salesplsbrand := masters["salesplsbrand"].(toolkit.M)
	salesplsadvbrand := masters["salesplsadvbrand"].(toolkit.M)

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	brand := dtkm.GetString("product_brand")

	brandval := salesplsbrand.GetFloat64(brand)

	arrpladv := []string{"PL28I", "PL28A", "PL28B", "PL28C", "PL28D", "PL28E", "PL28F", "PL28G", "PL28H"}
	for _, str := range arrpladv {
		skey := toolkit.Sprintf("%s_%s", brand, str)
		v := salesplsadvbrand.GetFloat64(skey) * tkm.GetFloat64("PL8A") / brandval
		tkm.Set(str, v)
	}
}

func CleanAndUpdateRD2016Vdist(tkm toolkit.M) {
	if !masters.Has("totsalesrd2016vdistcd04") && !masters.Has("totsalesrd2016vdistcd11") {
		return
	}

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	expectvalue := float64(33378754839) //CD11
	totdiv := masters.GetFloat64("totsalesrd2016vdistcd11")
	if dtkm.GetString("customer_branchid") == "CD04" {
		expectvalue = float64(254724083443)
		totdiv = masters.GetFloat64("totsalesrd2016vdistcd04")
	}

	tkm.Set("PL8", -tkm.GetFloat64("discountamount"))

	val := tkm.GetFloat64("grossamount") + ((expectvalue - totdiv) * tkm.GetFloat64("grossamount") / totdiv) + tkm.GetFloat64("discountamount")
	tkm.Set("PL2", val)
}

//RollbackSalesplsSga 19-07-2016, to 12-07-2016
func RollbackSalesplsSga(tkm toolkit.M) {
	if !masters.Has("salesplssummary") {
		return
	}

	salesplssummary := masters["salesplssummary"].(toolkit.M)
	if !salesplssummary.Has(tkm.GetString("_id")) {
		return
	}

	salesplssummaryline := salesplssummary[tkm.GetString("_id")].(toolkit.M)
	sgagroups := []string{"R&D", "Sales", "General Service", "General Management", "Manufacturing",
		"Finance", "Marketing", "Logistic Overhead", "Human Resource", "Other"}
	sgapl := []string{"PL33", "PL34", "PL35"}
	for _, sga := range sgagroups {
		for _, pl := range sgapl {
			dbfield := toolkit.Sprintf("%s_%s", pl, sga)
			tkm.Set(dbfield, salesplssummaryline.GetFloat64(dbfield))
		}
	}
}

func CalcSalesReturnMinusDiscount(tkm toolkit.M) {
	tkm.Set("PL8", -tkm.GetFloat64("discountamount"))
}

func CleanAddBranchGroup(tkm toolkit.M) {
	if !masters.Has("branchgroup") {
		return
	}

	branchgroups := masters["branchgroup"].(toolkit.M)

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	branchgroup := branchgroups.Get(dtkm.GetString("customer_branchid"), toolkit.M{}).(toolkit.M)

	val := branchgroup.GetString("branchgroup")
	if val == "" {
		val = "Other"
	}

	dtkm.Set("customer_branchgroup", val)
	tkm.Set("key", dtkm)
}

func CleanUpperBranchnameJakarta(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("customer_branchname") == "JAKARTA" {
		dtkm.Set("customer_branchname", "Jakarta")
	}
	tkm.Set("key", dtkm)
}

//customer_areaname
func CleanAreanameNull(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("customer_areaname") == "" {
		dtkm.Set("customer_areaname", dtkm.GetString("customer_branchname"))
	}

	if dtkm.GetString("customer_areaname") == "Jakarta" {
		dtkm.Set("customer_areaname", "JAKARTA")
	}

	tkm.Set("key", dtkm)
}

func CleanReportSubChannelBreakdownRD(tkm toolkit.M) {
	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	if dtkm.GetString("customer_channelid") != "I1" {
		return
	}

	listsubchannel := []string{"Hyper", "Super", "Mini", "Other", "R1 - Grosir Umum", "R10 - Tk.Perlengkapan Bayi",
		"R11- Koperasi", "R12 - Bengkel/Accesories", "R13- Tk. Bangunan", "R14 -  Retail Minimarket",
		"R15 - Grosir Kosmetik/Kelo", "R16 - Grosir Sembako", "R17 - Grosir Plastik", "R18 - Lain-lain", "R2 - Grosir Snack", "R4 - Toko Kosmetik", "R5 - Tk.Sembako/ Tk.Bumbu",
		"R7 - Toko Obat / Apotek", "R9 - Toko Listrik", "S2 - Restoran/Cafe/Catering", "S3 - Salon / Spa", "S5 - Pest Control/Cleaning", "S6 - Industri",
		"S8 - Lain lain", "R3 - Retailer Umum", "R6 - Toko Plastik", "R8 - Toko Alat Tulis", "S1 - Hotel", "S4 - Rumah Sakit", "S7 - Night Outlet"}

	subch := dtkm.GetString("customer_reportsubchannel")
	inslist := func(str string) bool {
		x := false
		for _, dt := range listsubchannel {
			if str == dt {
				x = true
			}
		}

		return x
	}

	if inslist(subch) {
		dtkm.Set("customer_reportsubchannel", "PT. EVERBRIGHT")
	}

	tkm.Set("key", dtkm)
}

func CalcCogsPerUnit(tkm toolkit.M) (ntkm toolkit.M) {
	pllist := []string{"PL0", "PL1", "PL7", "PL2", "PL8", "PL3", "PL4", "PL5", "PL6", "PL6A", "PL7A", "PL8A"}

	inlist := func(str string) bool {
		for _, v := range pllist {
			if str == v {
				return true
			}
		}
		return false
	}

	ntkm = toolkit.M{}
	for k, v := range tkm {
		if k[0:2] != "PL" || inlist(k) {
			ntkm.Set(k, v)
		}
	}

	if !masters.Has("cogs") {
		return
	}
	cogsdatas := masters.Get("cogs").(map[string]*gdrj.COGSConsolidate)

	dtkm, _ := toolkit.ToM(tkm.Get("key"))
	key := toolkit.Sprintf("%d_%d_%s", dtkm.GetInt("date_year"), dtkm.GetInt("date_month"), dtkm.GetString("product_skuid"))

	cogsdata, exist := cogsdatas[key]
	if !exist {
		return
	}

	// RM_PerUnit,LC_PerUnit,PF_PerUnit,Other_PerUnit,Fixed_PerUnit,Depre_PerUnit,COGS_PerUnit

	qty := ntkm.GetFloat64("salesqty")
	cogssubtotal := cogsdata.COGS_PerUnit * qty

	rmamount := cogsdata.RM_PerUnit * qty
	lcamount := cogsdata.LC_PerUnit * qty
	energyamount := cogsdata.PF_PerUnit * qty
	depreamount := cogsdata.Depre_PerUnit * qty
	otheramount := cogssubtotal - rmamount - lcamount - energyamount - depreamount

	ntkm.Set("PL9", -rmamount)
	ntkm.Set("PL14", -lcamount)
	direct := rmamount + lcamount
	ntkm.Set("PL14A", -direct)

	ntkm.Set("PL20", -otheramount)
	ntkm.Set("PL21", -depreamount)
	ntkm.Set("PL74", -energyamount)
	indirect := otheramount + depreamount + energyamount
	ntkm.Set("PL74A", -indirect)

	ntkm.Set("PL74B", -cogssubtotal)

	return
}

func CalcNewSgaData(tkm toolkit.M) (ntkm toolkit.M) {
	dtkm := tkm.Get("key", toolkit.M{}).(toolkit.M)
	masterproduct := masters.Get("masterproduct", toolkit.M{}).(toolkit.M)

	year := dtkm.GetInt("date_year")
	month := dtkm.GetInt("date_month")
	branchgroup := dtkm.GetString("customer_branchgroup")
	skuid := dtkm.GetString("product_skuid")
	dproduct := masterproduct.Get(skuid, toolkit.M{}).(toolkit.M)

	brandcategory := dproduct.GetString("brandcategoryid")
	if len(brandcategory) < 3 {
		brandcategory = ""
	}

	dkey := toolkit.Sprintf("%d_%d_%s", year, month, branchgroup)
	akey01 := toolkit.Sprintf("%d_%d_%s", year, month, brandcategory)
	akey := toolkit.Sprintf("%d_%d", year, month)
	//Direct - Allocated

	netsales := tkm.GetFloat64("PL8A")
	ratio4sga := masters.Get("ratio4sga", toolkit.M{}).(toolkit.M)

	newsgadirect := masters.Get("newsgadirect", map[string]toolkit.M{}).(map[string]toolkit.M)
	newsgaalloc := masters.Get("newsgaalloc", map[string]toolkit.M{}).(map[string]toolkit.M)

	for key, val := range newsgadirect[dkey] {
		directtkm, _ := toolkit.ToM(val)
		for xkey, xval := range directtkm {
			plcode := toolkit.Sprintf("%s_Direct_%s", key, xkey)
			xxval := (toolkit.ToFloat64(xval, 6, toolkit.RoundingAuto) * toolkit.Div(netsales, ratio4sga.GetFloat64(dkey))) + tkm.GetFloat64(plcode)
			tkm.Set(plcode, xxval)
		}
	}

	for key, val := range newsgaalloc[akey01] {
		alloctkm, _ := toolkit.ToM(val)
		for xkey, xval := range alloctkm {
			plcode := toolkit.Sprintf("%s_Allocated_%s", key, xkey)
			xxval := (toolkit.ToFloat64(xval, 6, toolkit.RoundingAuto) * toolkit.Div(netsales, ratio4sga.GetFloat64(akey01))) + tkm.GetFloat64(plcode)
			tkm.Set(plcode, xxval)
		}
	}

	for key, val := range newsgaalloc[akey] {
		alloctkm, _ := toolkit.ToM(val)
		for xkey, xval := range alloctkm {
			plcode := toolkit.Sprintf("%s_Allocated_%s", key, xkey)
			xxval := (toolkit.ToFloat64(xval, 6, toolkit.RoundingAuto) * toolkit.Div(netsales, ratio4sga.GetFloat64(akey))) + tkm.GetFloat64(plcode)
			tkm.Set(plcode, xxval)
		}
	}

	CalcSum(tkm)

	pllist := []string{"PL0", "PL1", "PL7", "PL2", "PL8", "PL3", "PL4", "PL5", "PL6", "PL6A", "PL7A", "PL8A",
		"PL9", "PL10", "PL11", "PL12", "PL13", "PL14", "PL14A", "PL15", "PL16", "PL17",
		"PL18", "PL19", "PL20", "PL21", "PL74", "PL74A", "PL74B", "PL33", "PL34", "PL35", "PL94A"}

	inlist := func(str string) bool {
		ar01k := strings.Split(str, "_")
		for _, v := range pllist {
			if ar01k[0] == v {
				return true
			}
		}
		return false
	}

	ntkm = toolkit.M{}
	for k, v := range tkm {
		if k[0:2] != "PL" || inlist(k) {
			ntkm.Set(k, v)
		}
	}

	return
}

func workersave(wi int, jobs <-chan toolkit.M, result chan<- int) {
	workerconn, _ := modules.GetDboxIConnection("db_godrej")
	defer workerconn.Close()

	qSave := workerconn.NewQuery().
		From("salespls-summary-4cogssgafinal2").
		SetConfig("multiexec", true).
		Save()

	trx := toolkit.M{}
	for trx = range jobs {
		// CleanAddCustomerGroupName(trx)
		// CalcSalesReturn(trx)

		// CalcSalesReturn2016(trx)

		// CalcRatio(trx)
		// CalcFreightsRev(trx)

		// CalcAdvertisementsRev(trx)
		// CalcRoyalties(trx)
		// CalcSalesVDist20142015(trx)
		// CalcSgaRev(trx)

		// CleanUpdateCustomerGroupName(trx)

		// CleanUpdateOldExport(trx)
		// RollbackSalesplsAdvertisement(trx)

		// CleanUpdateCOGSAdjustRdtoMt(trx)

		// AllocateDiscountActivity(trx)
		// CleanAndUpdateRD2016Vdist(trx)

		// CleanAddBranchGroup(trx)
		// CleanUpperBranchnameJakarta(trx)
		// RollbackSalesplsSga(trx)
		// CalcSalesReturnMinusDiscount(trx)

		// CalcSum(trx)
		// trx = CalcCogsPerUnit(trx)

		// dtkm, _ := toolkit.ToM(trx.Get("key"))
		// if dtkm.GetString("customer_reportsubchannel") == "R3" {
		// 	dtkm.Set("customer_reportsubchannel", "R3 - Retailer Umum")
		// }

		// if dtkm.GetString("customer_branchgroup") == "" {
		// 	dtkm.Set("customer_branchgroup", "Other")
		// }

		// if dtkm.GetString("customer_region") == "" || dtkm.GetString("customer_region") == "Other" {
		// 	dtkm.Set("customer_region", "OTHER")
		// }

		// if dtkm.GetString("customer_zone") == "" || dtkm.GetString("customer_zone") == "Other" {
		// 	dtkm.Set("customer_zone", "OTHER")
		// }
		// trx.Set("key", dtkm)

		// CleanReportSubChannelBreakdownRD(trx)
		// CleanAreanameNull(trx)

		trx = CalcNewSgaData(trx)

		err := qSave.Exec(toolkit.M{}.Set("data", trx))
		if err != nil {
			toolkit.Println(err)
		}

		result <- 1
	}
}
