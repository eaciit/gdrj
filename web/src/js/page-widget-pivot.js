viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.templateDataPoint = {
	aggr: 'sum',
	field: '',
	name: ''
}
pvt.templateRowColumn = {
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
pvt.prepareTooltipster = () => {
	let config = {
		contentAsHTML: true,
		interactive: true,
		theme: 'tooltipster-whi',
		animation: 'grow',
		delay: 0,
		offsetY: -5,
		touchDevices: false,
		trigger: 'click',
		position: 'top'
	}
	
	$('.tooltipster-dimension').each((i, e) => {
		$(e).tooltipster($.extend(true, config, {
			content: $(`
				<h3 class="no-margin no-padding">Add to</h3>
				<div>
					<button class='btn btn-sm btn-success' data-target-module='column' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, "column")'>
						<i class='fa fa-columns'></i> Column
					</button>
					<button class='btn btn-sm btn-success' data-target-module='row' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, "row")'>
						<i class='fa fa-reorder'></i> Row
					</button>
				</div>
			`)
		}))
	})
	
	$('.tooltipster-column-row').each((i, e) => {
		let title = $(e).closest('.pivot-section').parent().prev().text()
		$(e).tooltipster($.extend(true, config, {
			content: $(`
				<h3 class="no-margin no-padding">${title} setting</h3>
				<div>
					<button class='btn btn-sm btn-success' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.configure(this, "column")'>
						<i class='fa fa-gear'></i> Configure
					</button>
					<button class='btn btn-sm btn-success' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.removeFrom()'>
						<i class='fa fa-trash'></i> Remove
					</button>
				</div>
			`)
		}))
	})
}
pvt.showConfig = () => {
	// vm.hideFilter()
	rpt.mode('')
}
pvt.showAndRefreshPivot = () => {
	// vm.showFilter()
	rpt.mode('render')
}
pvt.showFieldControl = (o) => {
	pvt.currentTargetDimension = $(o).prev()
}
pvt.hoverInModule = (o) => {
	let target = $(o).attr('data-target-module')
	$(`[data-module="${target}"]`).addClass('highlight')
}
pvt.hoverOutModule = (o) => {
	let target = $(o).attr('data-target-module')
	$(`[data-module="${target}"]`).removeClass('highlight')
}
pvt.getData = (callback) => {
	app.ajaxPost("/report/getdatapivot", {}, (res) => {
		if (!app.isUndefined(callback)) {
			callback(res)
		}
	})
}
pvt.addColumn = () => {
	let row = ko.mapping.fromJS(app.clone(pvt.templateRowColumn))
	pvt.dimensions.push(row)
	app.prepareTooltipster($(".pivot-section-columns .input-group:last .tooltipster"))
}
pvt.addRow = () => {
	let row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint))
	pvt.rows.push(row)
	app.prepareTooltipster($(".pivot-section-row .input-group:last .tooltipster"))
}
pvt.addDataPoint = () => {
	let row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint))
	pvt.dataPoints.push(row)
	app.prepareTooltipster($(".pivot-section-data-point .input-group:last .tooltipster"))
}
pvt.addAs = (o, what) => {
	let holder = pvt[`${what}s`]
	let id = $(pvt.currentTargetDimension).attr('data-id')

	let isAddedOnColumn = (typeof ko.mapping.toJS(pvt.dimensions()).find((d) => d.field === id) !== 'undefined')
	let isAddedOnRow    = (typeof ko.mapping.toJS(pvt.rows   ()).find((d) => d.field === id) !== 'undefined')

	if (!(isAddedOnColumn || isAddedOnRow)) {
		let row = pvt.optionDimensions().find((d) => d.field === id)
		holder.push(ko.mapping.fromJS({ field: row.field, name: row.name }))
	}
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

		if (which == 'dataPoints') {
			let index = $(o).attr('data-index')
			app.arrRemoveByIndex(holder, index)
		}

		let id = $(o).attr('data-id')
		let row = holder().find((d) => ko.mapping.toJS(d).field == id)
		app.arrRemoveByItem(holder, row)
	})
}
pvt.getPivotConfig = () => {
	let dimensions = ko.mapping.toJS(pvt.dimensions)
		.map((d) => { return { type: 'column', field: d.field, name: d.name } })
		.concat(ko.mapping.toJS(pvt.rows)
		.map((d) => { return { type: 'row' , field: d.field, name: d.name } }))

	let dataPoints = ko.mapping.toJS(pvt.dataPoints)
		.filter((d) => d.field != '' && d.aggr != '')
		.map((d) => { 
			let row = ko.mapping.toJS(pvt.pivotModel).find((e) => e.field == d.field)
			let name = (row == undefined) ? d.field : row.name
			return { op: d.aggr, field: d.field, name: name }
		})

	let param = { dimensions: dimensions, datapoints: dataPoints }
	return param
}

pvt.refresh = () => {
	pvt.data(DATATEMP_PIVOT)
	pvt.render()
}

pvt.render = () => {
	let data = []
	let schemaModelFields = {}
	let schemaCubeDimensions = {}
	let schemaCubeMeasures = {}
	let columns = []
	let rows = []
	let measures = []

	data = pvt.data().map((d) => {
		let res = {}

		app.forEach(d, (k, v) => {
			if (k == '_id') {
				app.forEach(v, (l, m) => {
					res[l.replace(/\./g, '_')] = m
				})
			} else {
				res[k.replace(/\./g, '_')] = v
			}
		})

		return res
	})

	let constructSchema = (from, to) => {
		app.koUnmap(from()).forEach((d) => {
			let option = app.koUnmap(ra.optionDimensions).find((e) => e.field == d.field)
			let key = option.name.replace(/ /g, '_').replace(/\//g, '_')
			let field = d.field.replace(/\./g, '_')

			schemaModelFields[key] = { type: 'string', field: field }
			schemaCubeDimensions[key] = { caption: option.name }

			to.push({ name: key, expand: true })
		})
	}

	constructSchema(pvt.rows, rows)
	constructSchema(pvt.columns, columns)
	
	app.koUnmap(pvt.dataPoints).forEach((d) => {
		let key = d.name.replace(/ /g, '_').replace(/\//g, '_')
		// let field = d.field.replace(/\./g, '_')
		// schemaModelFields[key] = { type: 'number', field: field }

		let prop = { field: d.field, aggregate: d.aggr }
		schemaCubeMeasures[key] = prop
		measures.push(key)
	})

	let config = {
	    filterable: false,
	    reorderable: false,
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

	app.log(app.clone(config))

	$('.pivot').replaceWith('<div class="pivot"></div>')
	$('.pivot').kendoPivotGrid(config)
}

let DATATEMP_PIVOT = [
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 900, "value2": 600, "value3": 300 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 900, "value2": 600, "value3": 300 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 700, "value2": 700, "value3": 100 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 700, "value2": 700, "value3": 100 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 1100, "value2": 900, "value3": 150 }
]

$(() => {
	pvt.columns([
		app.koMap({ field: 'customer.channelname', name: 'Product' }),
		app.koMap({ field: 'product.name', name: 'Product' })
	])
	pvt.rows([
		app.koMap({ field: 'customer.branchname', name: 'Branch/RD' })
	])
	pvt.dataPoints([
		app.koMap({ aggr: 'sum', field: 'value1', name: 'Gross Sales' }),
		app.koMap({ aggr: 'sum', field: 'value2', name: 'Discount' }),
		app.koMap({ aggr: 'sum', field: 'value3', name: 'Net Sales' })
	])

	pvt.refresh()
})
