viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.pivotModel = [
    { field: 'ID', type: 'string', label: 'ID', as: 'dimension' },

    { field: 'PC._id', type: 'string', label: 'Profit Center - ID', as: 'dimension' },
    { field: 'PC.EntityID', type: 'string', label: 'Profit Center - Entity ID' },
    { field: 'PC.Name', type: 'string', label: 'Profit Center - Name' },
    { field: 'PC.BrandID', type: 'string', label: 'Profit Center - Brand ID' },
    { field: 'PC.BrandCategoryID', type: 'string', label: 'Profit Center - Brand Category ID' },
    { field: 'PC.BranchID', type: 'string', label: 'Profit Center - Branch ID' },
    { field: 'PC.BranchType', type: 'int', label: 'Profit Center - Branch Type' },

    { field: 'CC._id', type: 'string', label: 'Cost Center - ID', as: 'dimension' },
    { field: 'CC.EntityID', type: 'string', label: 'Cost Center - Entity ID' },
    { field: 'CC.Name', type: 'string', label: 'Cost Center - Name' },
    { field: 'CC.CostGroup01', type: 'string', label: 'Cost Center - Cost Group 01' },
    { field: 'CC.CostGroup02', type: 'string', label: 'Cost Center - Cost Group 02' },
    { field: 'CC.CostGroup03', type: 'string', label: 'Cost Center - Cost Group 03' },
    { field: 'CC.BranchID', type: 'string', label: 'Cost Center - Branch ID' },
    { field: 'CC.BranchType', type: 'string', label: 'Cost Center - Branch Type' },
    { field: 'CC.CCTypeID', type: 'string', label: 'Cost Center - Type' },
    { field: 'CC.HCCGroupID', type: 'string', label: 'Cost Center - HCC Group ID' },

    { field: 'CompanyCode', type: 'string', label: 'Company Code', as: 'dimension' },
    { field: 'LedgerAccount', type: 'string', label: 'Ledger Account', as: 'dimension' },

    { field: 'Customer._id', type: 'string', label: 'Customer - ID', as: 'dimension' },
    { field: 'Customer.CustomerID', type: 'string', label: 'Customer - Customer ID' },
    { field: 'Customer.Plant', type: 'string', label: 'Customer - Plant' },
    { field: 'Customer.Name', type: 'string', label: 'Customer - Name' },
    { field: 'Customer.KeyAccount', type: 'string', label: 'Customer - Key Account' },
    { field: 'Customer.Channel', type: 'string', label: 'Customer - Channel' },
    { field: 'Customer.Group', type: 'string', label: 'Customer - Group' },
    { field: 'Customer.National', type: 'string', label: 'Customer - National' },
    { field: 'Customer.Zone', type: 'string', label: 'Customer - Zone' },
    { field: 'Customer.Region', type: 'string', label: 'Customer - Region' },
    { field: 'Customer.Area', type: 'string', label: 'Customer - Area' },

    { field: 'Product._id', type: 'string', label: 'Product - ID', as: 'dimension' },
    { field: 'Product.Name', type: 'string', label: 'Product - Name' },
    { field: 'Product.Config', type: 'string', label: 'Product - Config' },
    { field: 'Product.Brand', type: 'string', label: 'Product - Brand' },
    { field: 'Product.LongName', type: 'string', label: 'Product - Long Name' },

    { field: 'Data.ID', type: 'string', label: 'Data - ID', as: 'dimension' },
    { field: 'Data.Month', type: 'string', label: 'Data - Month' },
    { field: 'Data.Quarter', type: 'int', label: 'Data - Quarter' },
    { field: 'Data.Year', type: 'int', label: 'Data - Year' },

    { field: 'Value1', type: 'string', label: 'Value 1', as: 'data point' },
    { field: 'Value2', type: 'string', label: 'Value 2', as: 'data point' },
    { field: 'Value3', type: 'string', label: 'Value 3', as: 'data point' }
]

pvt.templateDataPoint = {
	aggr: 'sum',
	expand: false,
	field: '',
	label: ''
}
pvt.optionDimensions = ko.computed(() => {
	return pvt.pivotModel
		.filter((d) => d.as === 'dimension')
		.map((d) => {
			return { field: d.field, Name: d.label }
		})
})
pvt.optionDataPoints = ko.computed(() => {
	return pvt.pivotModel
		.filter((d) => d.as === 'data point')
		.map((d) => {
			return { field: d.field, Name: d.label }
		})
})
pvt.optionAggregates = ko.observableArray([
	{ aggr: 'average', Name: 'Avg' },
	{ aggr: 'count', Name: 'Count' },
	{ aggr: 'sum', Name: 'Sum' },
	{ aggr: 'max', Name: 'Max' },
	{ aggr: 'min', Name: 'Min' }
])
pvt.mode = ko.observable('')
pvt.columns = ko.observableArray([
	app.koMap({
		field: pvt.optionDimensions()[1].field,
		label: pvt.optionDimensions()[1].Name,
		expand: false
	}),
	app.koMap({
		field: pvt.optionDimensions()[2].field,
		label: pvt.optionDimensions()[2].Name,
		expand: false
	}),
])
pvt.rows = ko.observableArray([
	app.koMap({
		field: pvt.optionDimensions()[3].field,
		label: pvt.optionDimensions()[3].Name,
		expand: false
	}),
])
pvt.dataPoints = ko.observableArray([
	app.koMap({
		field: pvt.optionDataPoints()[0].field,
		label: pvt.optionDataPoints()[0].Name,
		expand: false,
		aggr: pvt.optionAggregates()[2].aggr
	}),
	// app.koMap({
	// 	field: pvt.optionDataPoints()[0].field,
	// 	label: pvt.optionDataPoints()[0].Name,
	// 	expand: false,
	// 	aggr: pvt.optionAggregates()[2].aggr
	// }),
])
pvt.data = ko.observableArray([/*tempData*/])
pvt.currentTargetDimension = null
pvt.columnRowID = null
pvt.columnRowWhich = ''

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
pvt.configure = (o, what) => {

}
pvt.addDataPoint = () => {
	let row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint))
	pvt.dataPoints.push(row)
}
pvt.addAs = (o, what) => {
	let holder = pvt[`${what}s`]
	let id = $(pvt.currentTargetDimension).attr('data-id')

	let isAddedOnColumn = (typeof pvt.columns().find((d) => d._id === id) !== 'undefined')
	let isAddedOnRow    = (typeof pvt.rows   ().find((d) => d._id === id) !== 'undefined')

	if (!(isAddedOnColumn || isAddedOnRow)) {
		let row = pvt.optionDimensions().find((d) => d._id === id)
		holder.push(ko.mapping.fromJS($.extend(true, row, { expand: false })))
	}
}
pvt.removeFrom = () => {
	let holder = pvt[`${pvt.columnRowWhich}s`]
	let row = holder().find((d) => ko.mapping.toJS(d)._id == pvt.columnRowID)
	app.arrRemoveByItem(holder, row)
}
pvt.showColumnSetting = (o) => {
	pvt.columnRowID = $(o).attr('data-id')
	pvt.columnRowWhich = 'column'
}
pvt.showRowSetting = (o) => {
	pvt.columnRowID = $(o).attr('data-id')
	pvt.columnRowWhich = 'row'
}
pvt.refreshData = () => {
	pvt.mode('render')

	let dimensions = ko.mapping.toJS(pvt.columns).map((d) => { return { type: 'column', field: d.field } })
		     .concat(ko.mapping.toJS(pvt.rows)   .map((d) => { return { type: 'row'   , field: d.field } }))

	let dataPoints = ko.mapping.toJS(pvt.dataPoints)
		.map((d) => { return { op: d.aggr, field: d.field, alias: d.label } })

	let param = { dimensions: dimensions, datapoints: dataPoints }
	app.ajaxPost("/report/summarycalculatedatapivot", param, (res) => {
		if (!app.isFine(res)) {
			return
		}

		if (res.data.length == 0) {
			return
		}

	    let config = {
	        filterable: true,
	        dataSource: {
				data: res.data.data,
				schema: {
					model: {
						fields: res.data.metadata.SchemaModelFields
					},
					cube: {
						dimensions: res.data.metadata.SchemaCubeDimension,
						measures: res.data.metadata.SchemaCubeMeasures
					}
				},
				columns: res.data.metadata.Columns,
				rows: res.data.metadata.Rows,
				measures: res.data.metadata.Measures
			}
	    }

		console.log("=====", JSON.stringify(config))

		$('.pivot').replaceWith('<div class="pivot"></div>')
		$('.pivot').kendoPivotGrid(config)
	})
}

pvt.init = () => {
	pvt.prepareTooltipster()
}

