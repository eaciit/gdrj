package controller

import (
	"eaciit/gdrj/model"
	"eaciit/gdrj/web/helper"
	"eaciit/gdrj/web/model"
	"fmt"
	"github.com/eaciit/dbox"
	"github.com/eaciit/knot/knot.v1"
	"github.com/eaciit/orm/v1"
	"github.com/eaciit/toolkit"
	"time"
)

type ReportController struct {
	App
}

func CreateReportController(s *knot.Server) *ReportController {
	var controller = new(ReportController)
	controller.Server = s
	return controller
}

func (m *ReportController) GetDataBranch(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.BranchGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Branch{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataBrand(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.BrandGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Brand{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataHCostCenterGroup(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HCostCenterGroupGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HCostCenterGroup{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataEntity(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.EntityGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HCostCenterGroup{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataChannel(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.ChannelGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Channel{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataHGeographi(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HGeographiGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HGeographi{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataCustomer(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	param := struct {
		Keyword string `json:"keyword"`
	}{}

	if err := r.GetForms(&param); err != nil {
		return helper.CreateResult(false, []*gdrj.Customer{}, err.Error())
	}

	res, err := gdrj.CustomerGetContains(param.Keyword)
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Customer{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataCustomerGroup(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.CustomerGroupGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.CustomerGroup{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataHBrandCategory(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.HBrandCategoryGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.HBrandCategory{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataProduct(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.ProductGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.Product{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataLedgerAccount(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.LedgerAccountGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.LedgerAccount{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataKeyAccount(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gdrj.KeyAccountGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gdrj.KeyAccount{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) GetDataAnalysisIdea(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res, err := gocore.AnalysisIdeaGetAll()
	if err != nil {
		return helper.CreateResult(false, []*gocore.AnalysisIdea{}, err.Error())
	}

	return helper.CreateResult(true, res, "")
}

func (m *ReportController) SummaryCalculateDataPivot(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	payload := new(gdrj.PivotParam)
	if err := r.GetPayload(payload); err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	var filter *dbox.Filter = nil
	var columns []string = payload.ParseDimensions()
	var datapoints []string = payload.ParseDataPoints()
	var fnTransform (func(m *toolkit.M) error) = nil

	fmt.Printf("--- %#v\n", filter)
	fmt.Printf("--- %#v\n", columns)
	fmt.Printf("--- %#v\n", datapoints)

	data, err := gdrj.SummarizeLedgerSum(filter, columns, datapoints, fnTransform)
	if err != nil {
		return helper.CreateResult(false, nil, err.Error())
	}

	res := new(toolkit.Result)
	res.SetData(data)

	return res
}
func getCursor(obj orm.IModel) dbox.ICursor {
	c, e := gdrj.Find(obj, nil, nil)
	if e != nil {
		return nil
	}
	return c
}

func (m *ReportController) GenerateRandomLedgetSummary(r *knot.WebContext) interface{} {
	var err error
	cursor_cc := getCursor(new(gdrj.CostCenter))
	defer cursor_cc.Close()
	fmt.Println(cursor_cc.Count())
	cc := []*gdrj.CostCenter{}
	if err = cursor_cc.Fetch(&cc, 5, false); err != nil {
		fmt.Println(err.Error())
	}

	cursor_pc := getCursor(new(gdrj.ProfitCenter))
	defer cursor_pc.Close()
	pc := []*gdrj.ProfitCenter{}
	if err = cursor_pc.Fetch(&pc, 5, false); err != nil {
		fmt.Println(err.Error())
	}

	cursor_cust := getCursor(new(gdrj.Customer))
	defer cursor_cust.Close()
	cust := []*gdrj.Customer{}
	if err = cursor_cust.Fetch(&cust, 5, false); err != nil {
		fmt.Println(err.Error())
	}

	cursor_prod := getCursor(new(gdrj.Product))
	defer cursor_prod.Close()
	prod := []*gdrj.Product{}
	if err = cursor_prod.Fetch(&prod, 5, false); err != nil {
		fmt.Println(err.Error())
	}

	cursor_plm := getCursor(new(gdrj.PLModel))
	defer cursor_plm.Close()
	plm := []*gdrj.PLModel{}
	if err = cursor_plm.Fetch(&plm, 20, false); err != nil {
		fmt.Println(err.Error())
	}

	cursor_ledg := getCursor(new(gdrj.LedgerAccount))
	defer cursor_ledg.Close()
	ledg := []*gdrj.LedgerAccount{}
	if err = cursor_ledg.Fetch(&ledg, 20, false); err != nil {
		fmt.Println(err.Error())
	}

	fmt.Println("len", len(cc))

	for i := 0; i < 1000; i++ {
		date := new(gdrj.Date)
		date.Date = time.Now()
		l := new(gdrj.LedgerSummary)
		l.CC = cc[toolkit.RandInt(len(cc))]
		l.PC = pc[toolkit.RandInt(len(pc))]
		l.Customer = cust[toolkit.RandInt(len(cust))]
		l.Product = prod[toolkit.RandInt(len(prod))]
		l.LedgerAccount = ledg[toolkit.RandInt(len(ledg))].ID
		l.PLModel = plm[toolkit.RandInt(20)]
		l.Date = date
		l.PCID = l.PC.ID
		l.CCID = l.CC.ID
		l.OutletID = l.Customer.ID
		l.SKUID = l.Product.ID
		l.PLCode = l.PLModel.ID
		l.PLGroup1 = l.PLModel.OrderIndex
		l.Value1 = toolkit.RandFloat(10, 4)
		l.Value2 = toolkit.RandFloat(10, 4)
		l.Value3 = toolkit.RandFloat(10, 4)

		l.Save()

		fmt.Println(i, "saved")
	}

	return "ok"
}

func (m *ReportController) SummaryCalculateDataPivotDummy(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res := new(toolkit.Result)

	// ============= PAYLOAD

	payload := new(gdrj.PivotParam)
	rawPayload := `{
		"dimensions": [
			{ "type": "column", "field": "Category", "name": "Data Category" },
			{ "type": "column", "field": "Date", "name": "Data Date" },
			{ "type": "row", "field": "Location", "name": "Data Location" }
		],
		"datapoints": [
			{ "op": "sum", "field": "Value", "name": "Value" }
		]
	}`
	if err := toolkit.Unjson([]byte(rawPayload), payload); err != nil {
		res.SetError(err)
		return res
	}

	// ============= DATA

	data := []struct {
		ID       string `json:"_id"`
		Location string
		Category string
		Date     string
		Value    float64
	}{}
	rawData := `[
		{ "_id": "A0001", "Location": "Jakarta", "Category": "Gross Sales", "Date": "2016-06-02", "Value": 100 },
		{ "_id": "A0004", "Location": "Jakarta", "Category": "Discount", "Date": "2016-06-02", "Value": 95 },
		{ "_id": "A0007", "Location": "Jakarta", "Category": "Net Sales", "Date": "2016-06-02", "Value": 80 },
		{ "_id": "A0001", "Location": "Jakarta", "Category": "Gross Sales", "Date": "2016-06-03", "Value": 100 },
		{ "_id": "A0004", "Location": "Jakarta", "Category": "Discount", "Date": "2016-06-03", "Value": 95 },
		{ "_id": "A0007", "Location": "Jakarta", "Category": "Net Sales", "Date": "2016-06-03", "Value": 80 },
		{ "_id": "A0001", "Location": "Jakarta", "Category": "Gross Sales", "Date": "2016-06-04", "Value": 100 },
		{ "_id": "A0004", "Location": "Jakarta", "Category": "Discount", "Date": "2016-06-04", "Value": 95 },
		{ "_id": "A0007", "Location": "Jakarta", "Category": "Net Sales", "Date": "2016-06-04", "Value": 80 },

		{ "_id": "A0001", "Location": "Malang", "Category": "Gross Sales", "Date": "2016-06-02", "Value": 100 },
		{ "_id": "A0004", "Location": "Malang", "Category": "Discount", "Date": "2016-06-02", "Value": 95 },
		{ "_id": "A0007", "Location": "Malang", "Category": "Net Sales", "Date": "2016-06-02", "Value": 80 },
		{ "_id": "A0001", "Location": "Malang", "Category": "Gross Sales", "Date": "2016-06-03", "Value": 100 },
		{ "_id": "A0004", "Location": "Malang", "Category": "Discount", "Date": "2016-06-03", "Value": 95 },
		{ "_id": "A0007", "Location": "Malang", "Category": "Net Sales", "Date": "2016-06-03", "Value": 80 },
		{ "_id": "A0001", "Location": "Malang", "Category": "Gross Sales", "Date": "2016-06-04", "Value": 100 },
		{ "_id": "A0004", "Location": "Malang", "Category": "Discount", "Date": "2016-06-04", "Value": 95 },
		{ "_id": "A0007", "Location": "Malang", "Category": "Net Sales", "Date": "2016-06-04", "Value": 80 },

		{ "_id": "A0001", "Location": "Yogyakarta", "Category": "Gross Sales", "Date": "2016-06-02", "Value": 100 },
		{ "_id": "A0004", "Location": "Yogyakarta", "Category": "Discount", "Date": "2016-06-02", "Value": 95 },
		{ "_id": "A0007", "Location": "Yogyakarta", "Category": "Net Sales", "Date": "2016-06-02", "Value": 80 },
		{ "_id": "A0001", "Location": "Yogyakarta", "Category": "Gross Sales", "Date": "2016-06-03", "Value": 100 },
		{ "_id": "A0004", "Location": "Yogyakarta", "Category": "Discount", "Date": "2016-06-03", "Value": 95 },
		{ "_id": "A0007", "Location": "Yogyakarta", "Category": "Net Sales", "Date": "2016-06-03", "Value": 80 },
		{ "_id": "A0001", "Location": "Yogyakarta", "Category": "Gross Sales", "Date": "2016-06-04", "Value": 100 },
		{ "_id": "A0004", "Location": "Yogyakarta", "Category": "Discount", "Date": "2016-06-04", "Value": 95 },
		{ "_id": "A0007", "Location": "Yogyakarta", "Category": "Net Sales", "Date": "2016-06-04", "Value": 80 }
	]`
	if err := toolkit.Unjson([]byte(rawData), &data); err != nil {
		res.SetError(err)
		return res
	}

	// ============= META DATA

	metaData := struct {
		SchemaModelFields    toolkit.M
		SchemaCubeDimensions toolkit.M
		SchemaCubeMeasures   toolkit.M
		Columns              []toolkit.M
		Rows                 []toolkit.M
		Measures             []string
	}{
		toolkit.M{},
		toolkit.M{},
		toolkit.M{},
		[]toolkit.M{},
		[]toolkit.M{},
		[]string{},
	}

	rawSchemaModelFields := `{
		"_id": { "type": "string" },
		"Location": { "type": "Location" },
		"Category": { "type": "Category" },
		"Date": { "type": "Date" },
		"Value": { "type": "Value" }
	}`
	if err := toolkit.Unjson([]byte(rawSchemaModelFields), &(metaData.SchemaModelFields)); err != nil {
		res.SetError(err)
		return res
	}

	rawSchemaCubeDimensions := `{
		"Location": { "caption": "Location" },
		"Category": { "caption": "Category" },
		"Date": { "caption": "Date" }
	}`
	if err := toolkit.Unjson([]byte(rawSchemaCubeDimensions), &(metaData.SchemaCubeDimensions)); err != nil {
		res.SetError(err)
		return res
	}

	rawSchemaCubeMeasures := `{
		"Sum_Value": { "field": "Value", "aggregate": "sum" }
	}`
	if err := toolkit.Unjson([]byte(rawSchemaCubeMeasures), &(metaData.SchemaCubeMeasures)); err != nil {
		res.SetError(err)
		return res
	}

	rawColumns := `[
		{ "name": "Category", "expand": true },
		{ "name": "Date", "expand": true }
	]`
	if err := toolkit.Unjson([]byte(rawColumns), &(metaData.Columns)); err != nil {
		res.SetError(err)
		return res
	}

	rawRows := `[
		{ "name": "Location", "expand": true }
	]`
	if err := toolkit.Unjson([]byte(rawRows), &(metaData.Rows)); err != nil {
		res.SetError(err)
		return res
	}

	rawMeasures := `["Sum_Value"]`
	if err := toolkit.Unjson([]byte(rawMeasures), &(metaData.Measures)); err != nil {
		res.SetError(err)
		return res
	}

	// ============= OUTPUT

	output := struct {
		Data     interface{}
		MetaData interface{}
	}{
		data,
		metaData,
	}

	res.SetData(output)

	return res
}

func (m *ReportController) SummaryCalculateDataChartDummy(r *knot.WebContext) interface{} {
	r.Config.OutputType = knot.OutputJson

	res := new(toolkit.Result)

	// ============= PAYLOAD

	payload := new(gdrj.PivotParam)
	rawPayload := `{
		"dimensions": [
			{ "type": "column", "field": "Category", "name": "Data Category" },
			{ "type": "column", "field": "Date", "name": "Data Date" },
			{ "type": "row", "field": "Location", "name": "Data Location" }
		],
		"datapoints": [
			{ "op": "sum", "field": "Value", "name": "Value" }
		]
	}`
	if err := toolkit.Unjson([]byte(rawPayload), payload); err != nil {
		res.SetError(err)
		return res
	}

	// ============= DATA

	data := []struct {
		ID       string `json:"_id"`
		Location string
		Actual   float64
		Plan     float64
	}{}
	rawData := `[
		{ "_id": "A0001", "Location": "Jakarta", "Actual": 200, "Plan": 400 },
		{ "_id": "A0001", "Location": "Malang", "Actual": 220, "Plan": 390 },
		{ "_id": "A0001", "Location": "Yogyakarta", "Actual": 210, "Plan": 380 }
	]`
	if err := toolkit.Unjson([]byte(rawData), &data); err != nil {
		res.SetError(err)
		return res
	}

	// ============= META DATA

	metaData := struct {
		CategoryAxis string
		Series       []toolkit.M
	}{
		"Location",
		[]toolkit.M{},
	}

	rawSeries := `[
		{ "field": "Actual" },
		{ "field": "Plan" }
	]`
	if err := toolkit.Unjson([]byte(rawSeries), &(metaData.Series)); err != nil {
		res.SetError(err)
		return res
	}

	output := struct {
		Data     interface{}
		MetaData interface{}
	}{
		data,
		metaData,
	}

	res.SetData(output)

	return res
}
