viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.title = ko.observable('Pivot')
pvt.contentIsLoading = ko.observable(false)

pvt.optionRows = ko.observableArray(rpt.optionDimensions())
pvt.optionColumns = ko.observableArray(rpt.optionDimensions())

pvt.row = ko.observable([])
pvt.column = ko.observable([])
pvt.dataPoints = ko.observableArray([])
pvt.data = ko.observableArray([])

pvt.refresh = () => {
	pvt.data([{
		customer_channelname: 'GT', customer_branchname: 'Surabaya',
		grosssales: 20000,
		salesdiscount: 2000,
		netsales: 18000
	}, {
		customer_channelname: 'MT', customer_branchname: 'Surabaya',
		grosssales: 22000,
		salesdiscount: 1000,
		netsales: 21000
	}, {
		customer_channelname: 'GT', customer_branchname: 'Malang',
		grosssales: 23000,
		salesdiscount: 3000,
		netsales: 20000
	}, {
		customer_channelname: 'GT', customer_branchname: 'Malang',
		grosssales: 22000,
		salesdiscount: 2000,
		netsales: 20000
	}])

	pvt.render()
	// // pvt.data(DATATEMP_PIVOT)
	// app.ajaxPost("/report/summarycalculatedatapivot", pvt.getParam(), (res) => {
	// 	let orderKey = app.idAble(ko.mapping.toJS(pvt.rows()[0]).field)
	// 	let data = _.sortBy(res.Data, (o, v) => o[orderKey])
	// 	pvt.data(data)
	// 	pvt.render()
	// })
}
pvt.render = () => {
	let data = pvt.data()
	let schemaModelFields = {}
	let schemaCubeDimensions = {}
	let schemaCubeMeasures = {}
	let columns = []
	let rows = []
	let measures = []

	;[pvt.row()].forEach((d, i) => {
		let row = pvt.optionRows().find((e) => e.field == d)
		let field = toolkit.replace(row.field, '.', '_')
		schemaModelFields[field] = { type: 'string', field: field }
		rows.push({ name: field, expand: (i == 0) })
	})

	;[pvt.column()].forEach((d, i) => {
		let row = pvt.optionColumns().find((e) => e.field == d)
		let field = toolkit.replace(row.field, '.', '_')
		schemaModelFields[field] = { type: 'string', field: field }
		columns.push({ name: field, expand: (i == 0) })
	})

	pvt.dataPoints().forEach((d) => {
		let field = toolkit.replace(d.field, '.', '_')
		schemaModelFields[field] = { type: 'number' }
		schemaCubeDimensions[field] = { caption: d.title }

		schemaCubeMeasures[d.title] = { field: field, format: '{0:c}', aggregate: 'sum' }
		measures.push(d.title)
	})

	let config = {
	    filterable: false,
	    reorderable: false,
	    dataCellTemplate: (d) => `<div class="align-right">${kendo.toString(d.dataItem.value, "n2")}</div>`,
	    dataSource: {
			data: data,
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

	app.log('pivot', app.clone(config))
	$('.pivot').replaceWith('<div class="pivot ez"></div>')
	$('.pivot').kendoPivotGrid(config)
}

$(() => {
	pvt.dataPoints = ko.observableArray([
		{ field: 'grosssales', title: 'Gross Sales' },
		{ field: 'salesdiscount', title: 'Sales Discount' },
		{ field: 'netsales', title: 'Net Sales' }
	])
	pvt.row = ko.observable('customer.channelname')
	pvt.column = ko.observable('customer.branchname')

	pvt.refresh()
})
