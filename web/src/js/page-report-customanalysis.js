viewModel.customtable = new Object()
let cst = viewModel.customtable

cst.contentIsLoading = ko.observable(false)
cst.title = ko.observable('Custom Analysis')
cst.row = ko.observableArray(['pnl'])
cst.column = ko.observableArray(['product.brand'])
cst.breakdownvalue = ko.observable([])
cst.fiscalYear = ko.observable(rpt.value.FiscalYear())
cst.data = ko.observableArray([])
cst.dataPoints = ko.observableArray([])
cst.dataMeasures = ko.observableArray([])
cst.optionDimensionSelect = ko.observableArray([])
cst.datapnl = ko.observableArray([])

cst.columnrow = [
	{name: "P&L Item", field: "pnl"},
	// {name: "Calculated ratios", field: ""},
	{name: "Channel", field: "customer.channelname", title: "customer_channelname"},
	{name: "RD by distributor name", field: ""},
	{name: "GT by GT category", field: ""},
	{name: "Branch", field: "customer.branchname", title: "customer_branchname"},
	{name: "Customer Group", field: "customer.keyaccount", title: "customer_keyaccount"},
	{name: "Key Account", field: "customer.customergroup", title: "customer.customergroup"}, // filter keyaccount = KIY
	{name: "Brand", field: "product.brand", title: "product_brand"},
	{name: "Zone", field: "customer.zone", title: "customer_zone"},
	{name: "Region", field: "customer.region", title: "customer_region"},
	{name: "City", field: "customer.areaname", title: "customer_areaname"},
	{name: "Time", field: "date", title: "date"},
]

cst.breakdownby = ko.observableArray([])
cst.optionRows = ko.observableArray(cst.columnrow)
cst.optionColumns = ko.observableArray(cst.columnrow)

cst.selectfield = () => {
	setTimeout(() => {
		let columndata = $.extend(true, [], cst.columnrow)
		let rowdata = $.extend(true, [], cst.columnrow)
		if (cst.column().length > 0){
			if (cst.column()[0] == "pnl") {
				columndata = _.find(columndata, (e) => { return e.field == 'pnl' })
				cst.optionColumns([columndata])
			} else {
				columndata = _.remove(columndata, (d) => { return d.field != 'pnl' })
				cst.optionColumns(columndata)
			}
		} else {
			cst.optionColumns(columndata)
		}
		if (cst.row().length > 0) {
			if (cst.row()[0] == 'pnl') {
				rowdata = _.find(rowdata, (e) => { return e.field == 'pnl' })
				cst.optionRows([rowdata])
			} else {
				rowdata = _.remove(rowdata, (d) => { return d.field != 'pnl' })
				cst.optionRows(rowdata)
			}
		} else {
			cst.optionRows(rowdata)
		}
		// let columndata = $.extend(true, [], cst.columnrow)
		// let rowdata = $.extend(true, [], cst.columnrow)
		// for (var i in cst.row()) {
		// 	columndata = _.remove(columndata, (d) => { return d.field != cst.row()[i] })
		// }
		// for (var i in cst.column()) {
		// 	rowdata = _.remove(rowdata, (d) => { return d.field != cst.column()[i] })
		// }
		// cst.optionRows(rowdata)
		// cst.optionColumns(columndata)
	}, 100)
}

cst.refresh = () => {
	let param = {}, groups = []
	let pnl = _.find(cst.row(), (e) => { return e == 'pnl' })
	if (pnl == undefined)
		groups = groups.concat(cst.row())
	pnl = _.find(cst.column(), (e) => { return e == 'pnl' })
	if (pnl == undefined)
		groups = groups.concat(cst.column())
	groups.push("date.fiscal")
	param.pls = []
	param.flag = ""
	param.groups = groups
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, cst.fiscalYear)

	// cst.contentIsLoading(true)

	console.log(param)

	let fetch = () => {
		app.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			cst.data(res.Data.Data)
			cst.contentIsLoading(false)
			cst.getpnl(res.Data.PLModels)
		}, () => {
			pvt.contentIsLoading(false)
		})
	}
	fetch()
}

cst.getpnl = (datapl) => {
	datapl = _.filter(datapl,(d) => { 
		return d.PLHeader1 == d.PLHeader2 && d.PLHeader1 == d.PLHeader3
	})
	let data = datapl.map((d) => app.o({ field: d._id, name: d.PLHeader3 }))
	data = _.sortBy(data, function(item) {
				return [item.name]
			})
	cst.optionDimensionSelect(data)
	cst.generatedatapl()
}

cst.generatedatapl = () => {
	cst.datapnl([])
	let fielddimension
	for (var i in cst.breakdownvalue()) {
		fielddimension = _.find(cst.optionDimensionSelect(), (e) => { return e.field == cst.breakdownvalue()[i] })
		if (fielddimension != undefined)
			cst.datapnl.push(fielddimension)
	}
	if (cst.datapnl().length == 0)
		cst.datapnl(cst.optionDimensionSelect())

	let data = _.map(cst.data(),(d) => {
		let datanew = {}, field, title = "", datapoint
		$.each( d, function( key, value ) {
			if (key != "_id") {
				field = _.find(cst.datapnl(), (e) => { return e.field == key })
				if (field != undefined) {
					datanew[key] = value
					datapoint = _.find(cst.dataPoints(), (e) => { return e.field == key })
					if (datapoint == undefined)
						cst.dataPoints.push({ field: key, title: field.name })
				}
			}
		})
		$.each( d._id, function( key, value ) {
			title = key.substring(4, key.length);
			datanew[title] = value
		})

		return datanew
	})
	cst.changecolumnrow(data)
}

cst.changecolumnrow = (data) => {
	let row = cst.row().find((e) => e == 'pnl'), newdata = [], fieldchange = {}, datapoint
	if (row != undefined) {
		data.forEach((e,a) => {
			cst.dataPoints().forEach((d) => {
				fieldchange = {}
				fieldchange['pnl'] = d.title
				fieldchange['date_fiscal'] = e['date_fiscal']
				cst.column().forEach((f, i) => {
					let field = toolkit.replace(f, '.', '_')
					fieldchange[e[field]] = e[d.field]
					datapoint = _.find(cst.dataMeasures(), (g) => { return g.field == e[field] })
					if (datapoint == undefined)
						cst.dataMeasures.push({ field: e[field], title: e[field] })
				})
				newdata.push(fieldchange)
			})
		})
		let grouppnl = _.groupBy(newdata, (d) => { return d.pnl })
		newdata = []
		$.each( grouppnl, function( key, value ) {
			fieldchange = {}
			for (var i in value) {
				$.each( value[i], function( key2, value2 ) {
					if (key2 != 'pnl' && key2 != 'date_fiscal'){
						if (fieldchange[key2] == undefined)
							fieldchange[key2] = value2
						else
							fieldchange[key2] += value2
					}
				})
				fieldchange['date_fiscal'] = value[i]['date_fiscal']
			}
			fieldchange['pnl'] = key
			newdata.push(fieldchange)
		})
	} else {
		cst.dataMeasures(cst.dataPoints())
		newdata = data
	}
	console.log(newdata, data)
	cst.render(newdata)
}

cst.render = (resdata) => {
	console.log('data', resdata)
	let schemaModelFields = {}, schemaCubeDimensions = {}, schemaCubeMeasures = {}, columns = [], rows = [], measures = [], choose = ''

	// let data = _.sortBy(cst.data(), (d) => toolkit.redefine(d[toolkit.replace(cst.column(), '.', '_')], ''))
	let data = cst.data()

	cst.row().forEach((d, i) => {
		let row = cst.optionRows().find((e) => e.field == d && e.field != 'pnl')
		if (row != undefined) {
			let field = toolkit.replace(row.field, '.', '_')
			schemaModelFields[field] = { type: 'string', field: field }
			rows.push({ name: field, expand: (i == 0) })
		} else {
			choose = 'row'
			rows.push({name: 'pnl', expand: true})
			schemaModelFields['pnl'] = { type: 'string', field: 'pnl' }
		}
	})

	cst.column().forEach((d, i) => {
		let column = cst.optionColumns().find((e) => e.field == d && e.field != 'pnl')
		if (choose == '') {
			if (column != undefined) {
				let field = toolkit.replace(column.field, '.', '_')
				schemaModelFields[field] = { type: 'string', field: field }
				columns.push({ name: field, expand: (i == 0) })
			} else {
				choose = 'column'
				columns.push({name: 'pnl', expand: true})
				schemaModelFields['pnl'] = { type: 'string', field: 'pnl' }
			}
		}
	})
	console.log(columns)

	cst.dataMeasures().forEach((d) => {
		let field = toolkit.replace(d.field, '.', '_')
		schemaModelFields[field] = { type: 'number' }
		schemaCubeDimensions[field] = { caption: d.title }

		schemaCubeMeasures[d.title] = { field: field, format: '{0:c}', aggregate: 'sum' }
		measures.push(d.title)
	})

	// console.log("schemaModelFields ", schemaModelFields)
	// console.log("schemaCubeDimensions ", schemaCubeDimensions)
	// console.log("schemaCubeMeasures ", schemaCubeMeasures)
	// console.log("measures ", measures)
	// console.log("columns ", columns)
	// console.log("rows ", rows)
	let config = {
	    filterable: false,
	    reorderable: false,
	    dataCellTemplate: (d) => `<div class="align-right">${kendo.toString(d.dataItem.value, "n2")}</div>`,
	    columnWidth: 130,
	    dataSource: {
			data: resdata,
			schema: {
				model: {
					fields: schemaModelFields
				},
				cube: {
					dimensions: schemaCubeDimensions,
					measures: schemaCubeMeasures
				}
			},
			columns: columns,
			rows: rows,
			measures: measures
		}
	}
	console.log(ko.toJSON(config))
	$('.pivot').replaceWith('<div class="pivot ez"></div>')
	$('.pivot').kendoPivotGrid(config)
}

$(() => {
	cst.refresh()
	cst.selectfield()
})