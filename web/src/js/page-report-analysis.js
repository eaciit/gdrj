vm.currentTitle(o.Name)
vm.breadcrumb(vm.breadcrumb().concat([
	{ title: o.Name, href: o.ID }
]))

vm.reportAnalysis = {}
let ra = vm.reportAnalysis

rpt.refresh = () => {
	let param = pvt.getPivotConfig()
	app.ajaxPost("/report/summarycalculatedatapivotdummy", param, (res) => {
		if (res.Data.Data.length == 0) {
			return
		}

		pvt.render(res.Data)
	})

	app.ajaxPost("/report/summarycalculatedatachartdummy", param, (res) => {
		if (res.Data.Data.length == 0) {
			return
		}

		crt.render('', res.Data.MetaData.Series, res.Data.Data, res.Data.MetaData.CategoryAxis)
	})
}

rpt.init = () => {
	pvt.dimensions([
		app.koMap({ "field": "Category", "name": "Data Category" }),
		app.koMap({ "field": "Date", "name": "Data Date" })
	])
	pvt.rows([
		app.koMap({ "field": "Location", "name": "Data Location" })
	])
	pvt.dataPoints([
		app.koMap({ "aggr": "sum", "field": "Value", "name": "Value" })
	])

	switch (o.ID) {
		case 'freight_cost_by_sales': {
			pvt.enableDimensions(false)
		break }
	}

	rpt.refresh()
}
