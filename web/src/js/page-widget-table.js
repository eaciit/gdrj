viewModel.table = new Object()
let tbl = viewModel.table

tbl.data = ko.observableArray([])
tbl.currentTargetDimension = null

tbl.dimensions = ko.observableArray([])
tbl.dataPoints = ko.observableArray([])
tbl.enableDimensions = ko.observable(true)
tbl.enableDataPoints = ko.observable(true)

tbl.setMode = (what) => () => {
	tbl.mode(what)

	if (what == 'render') {
		tbl.refresh()
	}
}
tbl.mode = ko.observable('render')
tbl.computeDimensionDataPoint = (which, field) => {
	return ko.pureComputed({
		read: () => {
	        return tbl[which]().filter((d) => d.field() == field).length > 0
	    },
	    write: (value) => {
	    	let row = tbl[which]().find((d) => d.field() == field)
	    	if (app.isDefined(row)) {
	    		tbl[which].remove(row)
	    	} else {
	    		row = app.koMap(app.koUnmap(ra.optionDimensions).find((d) => d.field == field))
	    		tbl[which].push(row)
	    	}
	    },
	    owner: this
	})
}
tbl.refresh = () => {
	// pvt.data(DATATEMP_TABLE)
	app.ajaxPost("/report/summarycalculatedatapivot", tbl.getParam(), (res) => {
		tbl.data(res.Data)
		tbl.render()
	})
}
tbl.render = () => {
	let tableWrapper = $('.table').empty()
	let table = app.newEl('table').addClass('table ez').appendTo(tableWrapper)
	let thead = app.newEl('thead').appendTo(table)
	let tbody = app.newEl('tbody').appendTo(table)

	if ((tbl.dimensions().length + tbl.dataPoints().length) > 6) {
		table.css('min-width', '600px')
		table.parent().css('overflow-x', 'scroll')
	} else {
		table.css('min-width', 'inherit')
		table.parent().css('overflow-x', 'inherit')
	}

	let dimensions = app.koUnmap(tbl.dimensions)
		.filter((d) => (d.field != ''))
	let dataPoints = app.koUnmap(tbl.dataPoints)
		.filter((d) => (d.field != '') && (d.aggr != ''))

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

	tbl.data().forEach((d, i) => {
		let tr = app.newEl('tr').appendTo(tbody)
		tds[i] = []

		dimensions.forEach((e, j) => {
			let value = d._id[e.field]
			let td = app.newEl('td').addClass('dimension').appendTo(tr).html(kendo.toString(value, "n2"))
			tds.push(td)
			tds[i][j] = td
		})

		dataPoints.forEach((e, i) => {
			let value = d[e.field]
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

	let rowLast = app.newEl('tr').appendTo(tbody).addClass('total')
	let tdSpace = app.newEl('td').html('&nbsp;')
		.addClass('Total')
		.attr('colspan', dimensions.length).appendTo(rowLast)

	dataPoints.forEach((e, i) => {
		let td = app.newEl('td').appendTo(rowLast).html(kendo.toString(sum[i], "n2"))
	})
}

tbl.getParam = () => {
	let dimensions = ko.mapping.toJS(tbl.dimensions)
		.filter((d) => (d.field != ''))
	let dataPoints = ko.mapping.toJS(tbl.dataPoints)
		.filter((d) => (d.field != '') && (d.field != ''))
		.map((d) => { return { field: d.field, name: d.name, aggr: 'sum' } })

	return {
		dimensions: dimensions,
		dataPoints: dataPoints
	}
}

let DATATEMP_TABLE = [
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
	tbl.dimensions([
		app.koMap({ field: 'customer.branchname', name: 'Branch/RD' }),
		app.koMap({ field: 'product.name', name: 'Product' }),
		app.koMap({ field: 'customer.channelname', name: 'Product' })
	])
	tbl.dataPoints([
		app.koMap({ field: 'value1', name: 'Gross Sales' }),
		app.koMap({ field: 'value2', name: 'Discount' }),
		app.koMap({ field: 'value3', name: 'Net Sales' })
	])
	tbl.refresh()
})
