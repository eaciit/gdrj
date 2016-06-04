let DATATEMP_PIVOT = [
	{"_id": {"Customer.BranchName": "Jakarta", "Product.Brand": "Mitu"}, "Value1": 1000, "Value2": 800, "Value3": 200 },
	{"_id": {"Customer.BranchName": "Jakarta", "Product.Brand": "Hit"}, "Value1": 1100, "Value2": 900, "Value3": 150 },
	{"_id": {"Customer.BranchName": "Malang", "Product.Brand": "Mitu"}, "Value1": 900, "Value2": 600, "Value3": 300 },
	{"_id": {"Customer.BranchName": "Malang", "Product.Brand": "Hit"}, "Value1": 700, "Value2": 700, "Value3": 100 },
	{"_id": {"Customer.BranchName": "Yogyakarta", "Product.Brand": "Mitu"}, "Value1": 1000, "Value2": 800, "Value3": 200 },
	{"_id": {"Customer.BranchName": "Yogyakarta", "Product.Brand": "Hit"}, "Value1": 1100, "Value2": 900, "Value3": 150 }
]

viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.mode = ko.observable('render')
pvt.templateDataPoint = {
	aggr: 'sum',
	field: '',
	name: ''
}
pvt.templateRowColumn = {
	field: '',
	name: ''
}
pvt.data = ko.observableArray(DATATEMP_PIVOT)
pvt.columns = ko.observableArray([])
pvt.rows = ko.observableArray([])
pvt.dataPoints = ko.observableArray([])
pvt.currentTargetDimension = null

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
		.map((d) => { return { field: d.field } })

	let dataPoints = ko.mapping.toJS(pvt.dataPoints)
		.map((d) => { return { aggr: d.aggr, field: d.field } })

	let param = { dimensions: dimensions, datapoints: dataPoints }
	return param
}
pvt.computeDimensionDataPoint = (which, field) => {
	return ko.pureComputed({
		read: () => {
	        return pvt[which]().filter((d) => d.field() == field).length > 0
	    },
	    write: (value) => {
	        // var lastSpacePos = value.lastIndexOf(" ");
	        // if (lastSpacePos > 0) { // Ignore values with no space character
	        //     this.firstName(value.substring(0, lastSpacePos)); // Update "firstName"
	        //     this.lastName(value.substring(lastSpacePos + 1)); // Update "lastName"
	        // }
	    },
	    owner: this
	})
}
pvt.render = (data) => {
	pvt.data(data)

	let pivot = $('.pivot').empty()
	let table = app.newEl('table').addClass('table pivot ez').appendTo(pivot)
	let thead = app.newEl('thead').appendTo(table)
	let tbody = app.newEl('tbody').appendTo(table)

	let dimensions = app.koUnmap(pvt.dimensions)
	let dataPoints = app.koUnmap(pvt.dataPoints)

	// HEADER

	let tr = app.newEl('tr').appendTo(thead)

	dimensions.forEach((d) => {
		let th = app.newEl('th').html(d.name).appendTo(thead)
	})

	dataPoints.forEach((d) => {
		let th = app.newEl('th').html(d.name).appendTo(thead)
	})

	// DATA

	let manyDimensions = dimensions.length
	let tds = []
	let sum = dataPoints.map((d) => 0)

	pvt.data().forEach((d, i) => {
		let tr = app.newEl('tr').appendTo(tbody)
		tds[i] = []

		dimensions.forEach((e, j) => {
			let value = d._id[e.field.toLowerCase()]
			let td = app.newEl('td').addClass('dimension').appendTo(tr).html(kendo.toString(value, "n2"))
			tds.push(td)
			tds[i][j] = td
		})

		dataPoints.forEach((e, i) => {
			let value = d[e.field.toLowerCase()]
			let td = app.newEl('td').appendTo(tr).html(kendo.toString(value, "n2"))

			sum[i] += value
		})

		// dimensions.forEach((d, j) => {
		// 	let rowspan = dimensions.length - j

		// 	if (i % dimensions.length == 0) {
		// 		tds[i][j].attr('rowspan', rowspan)
		// 	} else {
		// 		if (rowspan > 1) {
		// 			// $(tds[i][j]).remove()
		// 		} 
		// 	}
		// })
	})

	let rowLast = app.newEl('tr').appendTo(tbody)
	let tdSpace = app.newEl('td').html('&nbsp;').attr('colspan', dataPoints.length - 2).appendTo(rowLast)

	dataPoints.forEach((e, i) => {
		let td = app.newEl('td').appendTo(rowLast).html(kendo.toString(sum[i], "n2"))
	})
}

pvt.init = () => {
	pvt.prepareTooltipster()
	pvt.refreshData()
}

