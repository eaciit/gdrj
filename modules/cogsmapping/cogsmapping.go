package main

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/modules"
	"github.com/eaciit/dbox"
	"github.com/eaciit/toolkit"
	"os"
	"strings"
	"time"
)

var conn dbox.IConnection

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

func getFloat(data interface{}) float64 {
	var result float64
	if toolkit.TypeName(data) == "string" {
		result = toolkit.ToFloat64(strings.Replace(toolkit.ToString(data), ",", "", -1), 6, toolkit.RoundingAuto)
	} else {
		result = toolkit.ToFloat64(data, 6, toolkit.RoundingAuto)
	}
	return result
}

func prepMaster() {
	crx, err := conn.NewQuery().From("rawcogsconsolidate_import").Cursor(nil)
	if err != nil {
		toolkit.Println("Error Found : ", err.Error())
		os.Exit(1)
	}
	defer crx.Close()

	count := crx.Count()
	i := 0
	t0 := time.Now()
	for {
		i++
		rawcogs := toolkit.M{}
		cogs := new(gdrj.COGSConsolidate)
		e := crx.Fetch(&rawcogs, 1, false)
		if e != nil {
			break
		}
		cogs.ID = rawcogs.GetString("_id")
		cogs.Month = time.Month(rawcogs.GetInt("Month"))
		cogs.Year = rawcogs.GetInt("Year")
		if toolkit.TypeName(rawcogs["BrandCategory"]) == "string" {
			cogs.BrandCategory = rawcogs.GetString("BrandCategory")
		} else {
			cogs.BrandCategory = toolkit.ToString(rawcogs.GetInt("BrandCategory"))
		}
		cogs.SubCategory = rawcogs.GetString("SubCategory")
		cogs.DistributionChannel = rawcogs.GetString("DistributionChannel")
		cogs.SAPCode = toolkit.ToString(rawcogs.GetInt("SAPCode"))
		cogs.ProductDescription = rawcogs.GetString("ProductDescription")

		cogs.GPS_Quantity = getFloat(rawcogs["GPS_Quantity"])
		cogs.GPS_PriceUnit = getFloat(rawcogs["GPS_PriceUnit"])
		cogs.GPS_Amount = getFloat(rawcogs["GPS_Amount"])
		cogs.Discount_Amount = getFloat(rawcogs["Discount_Amount"])
		cogs.NPS_Quantity = getFloat(rawcogs["NPS_Quantity"])
		cogs.NPS_PriceUnit = getFloat(rawcogs["NPS_PriceUnit"])
		cogs.NPS_Amount = getFloat(rawcogs["NPS_Amount"])
		cogs.RM_PerUnit = getFloat(rawcogs["RM_PerUnit"])
		cogs.RM_Amount = getFloat(rawcogs["RM_Amount"])
		cogs.LC_PerUnit = toolkit.ToFloat64(strings.Replace(toolkit.ToString(rawcogs.GetInt("LC_PerUnit")), ",", "", -1), 6, toolkit.RoundingAuto)
		cogs.LC_Amount = getFloat(rawcogs["LC_Amount"])
		cogs.PF_PerUnit = toolkit.ToFloat64(strings.Replace(toolkit.ToString(rawcogs.GetInt("PF_PerUnit")), ",", "", -1), 6, toolkit.RoundingAuto)
		cogs.PF_Amount = getFloat(rawcogs["PF_Amount"])
		cogs.Other_PerUnit = toolkit.ToFloat64(strings.Replace(toolkit.ToString(rawcogs.GetInt("Other_PerUnit")), ",", "", -1), 6, toolkit.RoundingAuto)
		cogs.Other_Amount = getFloat(rawcogs["Other_Amount"])
		cogs.Fixed_PerUnit = toolkit.ToFloat64(strings.Replace(toolkit.ToString(rawcogs.GetInt("Fixed_PerUnit")), ",", "", -1), 6, toolkit.RoundingAuto)
		cogs.Fixed_Amount = getFloat(rawcogs["Fixed_Amount"])
		cogs.Depre_PerUnit = toolkit.ToFloat64(strings.Replace(toolkit.ToString(rawcogs.GetInt("Depre_PerUnit")), ",", "", -1), 6, toolkit.RoundingAuto)
		cogs.Depre_Amount = getFloat(rawcogs["Depre_Amount"])
		cogs.COGS_PerUnit = getFloat(rawcogs["COGS_PerUnit"])
		cogs.COGS_Amount = getFloat(rawcogs["COGS_Amount"])
		cogs.GP_PerUnit = toolkit.ToFloat64(strings.Replace(toolkit.ToString(rawcogs.GetInt("GP_PerUnit")), ",", "", -1), 6, toolkit.RoundingAuto)
		cogs.GPN_Amount = getFloat(rawcogs["GPN_Amount"])
		cogs.GPN_Percent = toolkit.ToFloat64(strings.Replace(rawcogs.GetString("GPN_Percent"), "%", "", -1), 6, toolkit.RoundingAuto)
		cogs.GPG_PerUnit = toolkit.ToFloat64(strings.Replace(toolkit.ToString(rawcogs.GetInt("GPG_PerUnit")), ",", "", -1), 6, toolkit.RoundingAuto)
		cogs.GPG_Amount = getFloat(rawcogs["GPG_Amount"])
		cogs.GPG_Percent = toolkit.ToFloat64(strings.Replace(rawcogs.GetString("GPG_Percent"), "%", "", -1), 6, toolkit.RoundingAuto)
		cogs.Advt_Amount = getFloat(rawcogs["Advt_Amount"])
		cogs.Promo_Amount = getFloat(rawcogs["Promo_Amount"])
		cogs.TotalAP_Amount = getFloat(rawcogs["TotalAP_Amount"])
		cogs.NetProfit_Amount = getFloat(rawcogs["NetProfit_Amount"])
		cogs.NetProfit_Percent = toolkit.ToFloat64(strings.Replace(rawcogs.GetString("NetProfit_Percent"), "%", "", -1), 6, toolkit.RoundingAuto)

		cogs.Save()
		toolkit.Printfn("Processing %d of %d %s in %s",
			i, count, cogs.ID,
			time.Since(t0).String())
	}
}

func main() {
	setinitialconnection()
	defer gdrj.CloseDb()

	toolkit.Println("START")
	prepMaster()
	toolkit.Println("END...")

}
