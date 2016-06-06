viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

bkd.data = ko.observableArray([])
bkd.getParam = () => {
	let orderIndex = { field: 'plmodel.orderindex', name: 'Order' }

	let breakdown = ra.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))
	let dimensions = bkd.dimensions().concat([breakdown, orderIndex])
	let dataPoints = bkd.dataPoints()
	return ra.wrapParam('analysis_ideas', dimensions, dataPoints, { 
		which: 'all_plmod'
	})
}
bkd.refresh = () => {
	// bkd.data(DATATEMP_BREAKDOWN)
	app.ajaxPost("/report/summarycalculatedatapivot", bkd.getParam(), (res) => {
		let data = _.sortBy(res.Data, (o, v) => 
			parseInt(o.plmodel_orderindex.replace(/PL/g, "")))
		bkd.data(data)
		bkd.render()
	})
}
bkd.refreshOnChange = () => {
	// setTimeout(bkd.refresh, 100)
}
bkd.breakdownBy = ko.observable('customer.channelname')
bkd.dimensions = ko.observableArray([
	{ field: 'plmodel.plheader1', name: ' ' },
	{ field: 'plmodel.plheader2', name: ' ' },
	{ field: 'plmodel.plheader3', name: ' ' }
])
bkd.dataPoints = ko.observableArray([
	{ field: "value1", name: "value1", aggr: "sum" }
])
bkd.render = () => {
	let data = bkd.data().slice(0, 100)
	let schemaModelFields = {}
	let schemaCubeDimensions = {}
	let schemaCubeMeasures = {}
	let rows = []
	let columns = []
	let measures = []
	let breakdown = ra.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))

	app.koUnmap(bkd.dimensions).concat([breakdown]).forEach((d, i) => {
		let field = app.idAble(d.field)
		schemaModelFields[field] = { type: 'string' }
		schemaCubeDimensions[field] = { caption: d.name }

		if (field.indexOf('plheader') > -1) {
			rows.push({ name: field, expand: (rows.length == 0) })
		} else {
			columns.push({ name: field, expand: true })
		}

		rows = rows.slice(0, 2)
	})

	app.koUnmap(bkd.dataPoints).forEach((d) => {
		let measurement = 'Amount'
		let field = app.idAble(d.field)
		schemaModelFields[field] = { type: 'number' }
		schemaCubeMeasures[measurement] = { field: field, aggregate: 'sum', format: '{0:n2}' }
		measures.push(measurement)
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
	                measures: schemaCubeMeasures,
	            }
	        },
	        rows: rows,
	        columns: columns,
	        measures: measures
	    },
        dataCellTemplate: (d) => `<div class="align-right">${kendo.toString(d.dataItem.value, "n2")}</div>`,
    	dataBound: () => {
    		$('.breakdown-view .k-grid.k-widget:first [data-path]:first')
    			.addClass('invisible')
    		$('.breakdown-view .k-grid.k-widget:first span:contains(" ")')
				.each((i, e) => {
    				if ($(e).parent().hasClass('k-grid-footer') && $.trim($(e).html()) == '') {
	    				$(e).css({ 
	    					color: 'white', 
	    					display: 'block', 
	    					height: '18px'
	    				})
    				}
    			})
        }
	}

	app.log('breakdown', app.clone(config))
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
	$('.breakdown-view').kendoPivotGrid(config)
}

$(() => {
	bkd.refresh()
})
