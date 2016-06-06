viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.templateDataPoint = {
	aggr: 'sum',
	field: '',
	name: ''
}
pvt.templateDimension = {
	field: '',
	name: ''
}

pvt.data = ko.observableArray([])
pvt.columns = ko.observableArray([])
pvt.rows = ko.observableArray([])
pvt.dataPoints = ko.observableArray([])

pvt.enableColumns = ko.observable(true)
pvt.enableRows = ko.observable(true)
pvt.enableDataPoints = ko.observable(true)
pvt.mode = ko.observable('render')
pvt.currentTargetDimension = null

pvt.setMode = (what) => () => {
	pvt.mode(what)

	if (what == 'render') {
		pvt.refresh()
	}
}
pvt.addColumn = () => {
	let row = ko.mapping.fromJS(app.clone(pvt.templateDimension))
	pvt.columns.push(row)
	app.prepareTooltipster($(".pivot-section-columns .input-group:last .tooltipster"))
}
pvt.addRow = () => {
	let row = ko.mapping.fromJS(app.clone(pvt.templateDimension))
	pvt.rows.push(row)
	app.prepareTooltipster($(".pivot-section-row .input-group:last .tooltipster"))
}
pvt.addDataPoint = () => {
	let row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint))
	pvt.dataPoints.push(row)
	app.prepareTooltipster($(".pivot-section-data-point .input-group:last .tooltipster"))
}
pvt.removeFrom = (o, which) => {
	swal({
		title: "Are you sure?",
		text: 'Item will be deleted',
		type: "warning",
		showCancelButton: true,
		confirmButtonColor: "#DD6B55",
		confirmButtonText: "Delete",
		closeOnConfirm: true
	}, () => {
		let holder = pvt[which]

		if (holder().length == 1) {
			return
		}

		if (which == 'dataPoints') {
			let index = $(o).attr('data-index')
			app.arrRemoveByIndex(holder, index)
		}

		let id = $(o).attr('data-id')
		let row = holder().find((d) => ko.mapping.toJS(d).field == id)
		app.arrRemoveByItem(holder, row)
	})
}
pvt.getParam = () => {
	let dimensions = ko.mapping.toJS(pvt.rows().concat(pvt.columns()))
		.filter((d) => (d.field != ''))
	let dataPoints = ko.mapping.toJS(pvt.dataPoints)
		.filter((d) => (d.field != '') && (d.aggr != ''))
		.map((d) => { return { 
			field: d.field, 
			name: d.name, 
			aggr: 'sum'
		} })

	return ra.wrapParam('pivot', dimensions, dataPoints)
}
pvt.refresh = () => {
	// pvt.data(DATATEMP_PIVOT)
	app.ajaxPost("/report/summarycalculatedatapivot", pvt.getParam(), (res) => {
		let orderKey = app.idAble(ko.mapping.toJS(pvt.rows()[0]).field)
		let data = _.sortBy(res.Data, (o, v) => o[orderKey])
		pvt.data(data)
		pvt.render()
	})
}
pvt.render = () => {
	let data = pvt.data()
	let schemaModelFields = {}
	let schemaCubeDimensions = {}
	let schemaCubeMeasures = {}
	let columns = []
	let rows = []
	let measures = []

	let constructSchema = (from, to) => {
		app.koUnmap(pvt[from]())
			.filter((d) => (d.field != ''))
			.forEach((d, i) => {
				let option = app.koUnmap(ra.optionDimensions).find((e) => e.field == d.field)
				let key = app.idAble(option.name)
				let field = app.idAble(d.field)

				schemaModelFields[field] = { type: 'string' }
				schemaCubeDimensions[field] = { caption: key }

				let row = { name: field }
				if (i == 0) {
					row.expand = true
				}

				to.push(row)
			})
	}

	constructSchema('rows', rows)
	constructSchema('columns', columns)
	
	app.koUnmap(pvt.dataPoints)
		.filter((d) => (d.field != '') && (d.aggr != ''))
		.forEach((d) => {
			let key = app.idAble(d.name)
			let field = app.idAble(d.field)

			let prop = { field: field, aggregate: d.aggr, format: '{0:n2}' }
			if (prop.aggregate == 'avg') {
				prop.aggregate = 'average'
			}

			schemaModelFields[field] = { type: 'number' }
			schemaCubeMeasures[key] = prop
			measures.push(key)
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
	pvt.columns([
		app.koMap({ field: 'customer.channelname', name: 'Product' }),
		// app.koMap({ field: 'product.name', name: 'Product' })
	])
	pvt.rows([
		app.koMap({ field: 'customer.branchname', name: 'Branch/RD' })
	])
	pvt.dataPoints([
		app.koMap({ aggr: 'sum', field: 'value1', name: o[`value1`] }),
		app.koMap({ aggr: 'sum', field: 'value2', name: o[`value2`] }),
		app.koMap({ aggr: 'sum', field: 'value3', name: o[`value3`] })
	])

	pvt.refresh()
})
