viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.optionDimensions = ko.observableArray([
	{ _id: 'ProductID', Name: 'Product ID' },
	{ _id: 'ProductName', Name: 'Product Name' },
	{ _id: 'SupplierID', Name: 'Supplier ID' },
	{ _id: 'CategoryID', Name: 'Category ID' },
	{ _id: 'Category.CategoryID', Name: 'Category ID' },
	{ _id: 'Category.CategoryName', Name: 'Category Name' },
	{ _id: 'Category.Description', Name: 'Category Description' }
])
pvt.optionDataPoints = ko.observableArray([
	{ _id: 'QuantityPerUnit', Name: 'Quantity Per Unit' },
	{ _id: 'ReorderLevel', Name: 'Reorder Level' },
	{ _id: 'Discontinued', Name: 'Discontinued' },
	{ _id: 'UnitPrice', Name: 'Unit Price' },
	{ _id: 'UnitsInStock', Name: 'Units In Stock' },
	{ _id: 'UnitsOnOrder', Name: 'Units On Order' },
])
pvt.optionAggregates = ko.observableArray([
	{ _id: 'avg', Name: 'Avg' },
	{ _id: 'count', Name: 'Count' },
	{ _id: 'sum', Name: 'Sum' },
	{ _id: 'max', Name: 'Max' },
	{ _id: 'min', Name: 'Min' }
])
pvt.mode = ko.observable('')
pvt.columns = ko.observableArray([
	ko.mapping.fromJS({ _id: 'CategoryName', expand: false }),
	ko.mapping.fromJS({ _id: 'ProductName', expand: false })
])
pvt.rows = ko.observableArray([
	ko.mapping.fromJS({ _id: 'Discontinued', expand: false })
])
pvt.templateDataPoint = { _id: '', aggr: 'sum' }
pvt.dataPoints = ko.observableArray([
	ko.mapping.fromJS({ _id: 'QuantityPerUnit', aggr: 'sum' }),
	ko.mapping.fromJS({ _id: 'QuantityPerUnit', aggr: 'sum' }),
])
pvt.data = ko.observableArray(tempData)
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
pvt.configure = (o, what) => {

}
pvt.addDataPoint = () => {
	pvt.dataPoints.push(app.clone(pvt.templateDataPoint))
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

	let columns = ko.mapping.toJS(pvt.columns()).map((d) => {
		return $.extend(true, { name: d._id, expand: false }, d)
	})
    let rows = ko.mapping.toJS(pvt.rows()).map((d) => {
		return $.extend(true, { name: d._id, expand: false }, d)
	})
    let measures = app.distinct(ko.mapping.toJS(pvt.dataPoints).map((d) => d._id));
    let data = pvt.data();
    console.log(columns, rows, measures)

	$('.pivot').replaceWith('<div class="pivot"></div>')
	$('.pivot').kendoPivotGrid({
        filterable: true,
        // columnWidth: 120,
        // height: 570,
        dataSource: {
            data: data,
            schema: {
                model: {
                    fields: {
                        ProductName: { type: "string" },
                        UnitPrice: { type: "number" },
                        UnitsInStock: { type: "number" },
                        Discontinued: { type: "boolean" },
                        CategoryName: { field: "Category.CategoryName" }
                    }
                },
                cube: {
                    dimensions: {
                        ProductName: { caption: "All Products" },
                        CategoryName: { caption: "All Categories" },
                        Discontinued: { caption: "Discontinued" }
                    },
                    measures: {
                        "Sum": { field: "UnitPrice", format: "{0:c}", aggregate: "sum" },
                        "Average": { field: "UnitPrice", format: "{0:c}", aggregate: "average" }
                    }
                }
            },
            columns: columns,
            rows: rows,
            measures: measures
        }
    })
}

pvt.init = () => {
	pvt.prepareTooltipster()
}

