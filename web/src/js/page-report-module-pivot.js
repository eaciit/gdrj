viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.fields = ko.observableArray([
	{ _id: 'ProductID', Name: 'Product ID' },
	{ _id: 'ProductName', Name: 'Product Name' },
	{ _id: 'SupplierID', Name: 'Supplier ID' },
	{ _id: 'CategoryID', Name: 'Category ID' },
	{ _id: 'QuantityPerUnit', Name: 'Quantity Per Unit' },
	{ _id: 'UnitPrice', Name: 'Unit Price' },
	{ _id: 'UnitsInStock', Name: 'Units In Stock' },
	{ _id: 'UnitsOnOrder', Name: 'Units On Order' },
	{ _id: 'ReorderLevel', Name: 'Reorder Level' },
	{ _id: 'Discontinued', Name: 'Discontinued' },
	{ _id: 'Category.CategoryID', Name: 'Category ID' },
	{ _id: 'Category.CategoryName', Name: 'Category Name' },
	{ _id: 'Category.Description', Name: 'Category Description' }
])
pvt.mode = ko.observable('')
pvt.columns = ko.observableArray([
	ko.mapping.fromJS({ _id: 'CategoryName', expand: false }),
	ko.mapping.fromJS({ _id: 'ProductName', expand: false })
])
pvt.rows = ko.observableArray([
	ko.mapping.fromJS({ _id: 'Discontinued', expand: false })
])
pvt.values = ko.observableArray([
	{ _id: 'sum' }
])
pvt.optionValues = ko.observableArray([
	{ _id: 'avg', Name: 'Avg' },
	{ _id: 'count', Name: 'Count' },
	{ _id: 'sum', Name: 'Sum' },
	{ _id: 'max', Name: 'Max' },
	{ _id: 'min', Name: 'Min' }
])
pvt.data = ko.observableArray(tempData)
pvt.currentTarget = null

pvt.prepareTooltipster = () => {
	$('.tooltipster-late').each((i, e) => {
		$(e).tooltipster({
			contentAsHTML: true,
			interactive: true,
			theme: 'tooltipster-whi',
			animation: 'grow',
			delay: 0,
			offsetY: -5,
			touchDevices: false,
			trigger: 'click',
			position: 'top',
			content: $(`
				<h3 class="no-margin no-padding">Add to</h3>
				<div>
					<button class='btn btn-sm btn-success' data-target-module='column' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, "column")'>
						Column
					</button>
					<button class='btn btn-sm btn-success' data-target-module='row' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, "row")'>
						Row
					</button>
				</div>
			`)
		})
	})
}
pvt.showFieldControl = (o) => {
	pvt.currentTarget = $(o).prev()
}
pvt.hoverInModule = (o) => {
	let target = $(o).attr('data-target-module')
	$(`[data-module="${target}"]`).addClass('highlight')
}
pvt.hoverOutModule = (o) => {
	let target = $(o).attr('data-target-module')
	$(`[data-module="${target}"]`).removeClass('highlight')
}
pvt.addAs = (o, what) => {
	let holder = pvt[`${what}s`]
	let id = $(pvt.currentTarget).attr('data-id')

	let isAddedOnColumn = (typeof pvt.columns().find((d) => d._id === id) !== 'undefined')
	let isAddedOnRow    = (typeof pvt.rows   ().find((d) => d._id === id) !== 'undefined')
	let isAddedOnValue  = (typeof pvt.values ().find((d) => d._id === id) !== 'undefined')

	if (!(isAddedOnColumn || isAddedOnRow || isAddedOnValue)) {
		let row = pvt.fields().find((d) => d._id === id)
		holder.push(ko.mapping.fromJS($.extend(true, row, { expand: false })))
	}
}
pvt.isAggregate = (which) => {
	return ko.computed(() => {
		let val = pvt.values().find((e) => e._id == which)
		return !app.isUndefined(val)
	}, pvt)
}
pvt.changeAggregate = (which) => {
	return () => {
		pvt.values([]) // hack, temprary reset the values

		let val = values.find((e) => e._id == which)
		if (app.isUndefined(val)) {
			let item = pvt.optionValues().find((d) => d._id == which)
			pvt.values.push(item)
		} else {
			app.arrRemoveByItem(pvt.values, val)
		}

		return true
	}
}
pvt.removeFrom = (id, which) => {
	let holder = ko.mapping.toJS(pvt[`${which}s`])
	let row = holder.find((d) => d._id == id)
	app.arrRemoveByItem(holder, row)
	ko.mapping.fromJS(holder, pvt[`${which}s`])
}
pvt.removeFromColumn = (o) => {
	pvt.removeFrom($(o).attr('data-id'), 'column')
}
pvt.removeFromRow = (o) => {
	pvt.removeFrom($(o).attr('data-id'), 'row')
}
pvt.refreshData = () => {
	pvt.mode('render')

	let columns = ko.mapping.toJS(pvt.columns()).map((d) => {
		return $.extend(true, { name: d._id, expand: false }, d)
	})
    let rows = ko.mapping.toJS(pvt.rows()).map((d) => {
		return $.extend(true, { name: d._id, expand: false }, d)
	})
    let measures = pvt.values().map((d) => d._id);
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

