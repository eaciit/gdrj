viewModel.customtable = new Object()
let cst = viewModel.customtable

cst.contentIsLoading = ko.observable(false)
cst.title = ko.observable('Custom Analysis')
cst.row = ko.observableArray(['pnl'])
cst.column = ko.observableArray(['product.brand', 'customer.channelname'])
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
	let param = {}
	let groups = ['date.fiscal'].concat(cst.row()
		.concat(cst.column())
		.filter((d) => d != 'pnl'))

	param.pls = cst.breakdownvalue()
	param.flag = ''
	param.groups = groups
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, cst.fiscalYear)

	let fetch = () => {
		app.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			if (rpt.isDataEmpty(res)) {
				cst.contentIsLoading(false)
				return
			}

			cst.contentIsLoading(false)

			rpt.plmodels(res.Data.PLModels)
			cst.data(res.Data.Data)

			let opl1 = _.orderBy(rpt.plmodels(), (d) => d.OrderIndex)
			let opl2 = _.map(opl1, (d) => ({ field: d._id, name: d.PLHeader3 }))
			cst.optionDimensionSelect(opl2)
			if (cst.breakdownvalue().length == 0) {
				cst.breakdownvalue(['PL8A', "PL7", "PL74B", "PL74C", "PL94A", "PL44B", "PL44C"])
			}

			cst.build()
		}, () => {
			pvt.contentIsLoading(false)
		})
	}
	
	cst.contentIsLoading(true)
	fetch()
}

cst.build = () => {
	let keys = cst.breakdownvalue()
	let all = []
	let columns = cst.column().map((d) => toolkit.replace(d, '.', '_'))
	let rows = cst.row().map((d) => toolkit.replace(d, '.', '_'))

	// BUILD WELL STRUCTURED DATA

	let allRaw = []
	cst.data().forEach((d) => {
		let o = {}
		let isPnlOnRow = (rows.find((e) => e == 'pnl') != undefined)

		for (let key in d._id) if (d._id.hasOwnProperty(key)) {
			o[toolkit.replace(key, '_id_', '')] = d._id[key]
		}

		keys.map((e) => {
			let pl = rpt.plmodels().find((g) => g._id == e)
			let p = toolkit.clone(o)
			p.pnl = pl.PLHeader3
			p.value = d[e]

			allRaw.push(p)
		})
	})

	let op1 = _.groupBy(allRaw, (d) => columns.map((e) => d[e]).join('_'))
	let op2 = _.map(op1, (v, k) => {
		let col = {}
		col.rows = []
		columns.forEach((e) => {
			col[e] = v[0][e]
		})

		v.forEach((w) => {
			let row = {}
			row.value = w.value
			rows.forEach((e) => {
				row[e] = w[e]
			})
			col.rows.push(row)
		})

		col.rows = _.orderBy(col.rows, (d) => d.value, 'desc')
		all.push(col)
	})

	all = _.orderBy(all, (d) => toolkit.sum(d.rows, (e) => e.value), 'desc')

	console.log("all", all)

	// PREPARE TEMPLATE

	let container = $('.pivot-ez').empty()
	let columnWidth = 100
	let columnHeight = 30
	let tableHeaderWidth = (120 * rows.length)
	let totalWidth = 0

	let tableHeaderWrapper = toolkit.newEl('div')
		.addClass('table-header')
		.appendTo(container)
	let tableHeader = toolkit.newEl('table')
		.appendTo(tableHeaderWrapper)
		.width(tableHeaderWidth)
	let trHeaderTableHeader = toolkit.newEl('tr')
		.appendTo(tableHeader)
	let tdHeaderTableHeader = toolkit.newEl('td')
		.html('&nbsp;')
		.attr('colspan', rows.length)
		.attr('data-rowspan', columns.length)
		.height(columnHeight * columns.length)
		.appendTo(trHeaderTableHeader)

	let tableContentWrapper = toolkit.newEl('div')
		.addClass('table-content')
		.appendTo(container)
		.css('left', `${tableHeaderWidth}px`)
	let tableContent = toolkit.newEl('table')
		.appendTo(tableContentWrapper)

	let groupThenLoop = (data, groups, callbackStart = app.noop, callbackEach = app.noop, callbackLast = app.noop) => {
		let what = callbackStart(groups)
		let counter = 0
		let op1 = _.groupBy(data, (e) => e[groups[0]])
		let op2 = _.map(op1, (v, k) => toolkit.return({ key: k, val: v }))

		let op3 = op2.forEach((g) => {
			let k = g.key, v = g.val
			callbackEach(groups, counter, what, k, v)

			let groupsLeft = _.filter(groups, (d, i) => i != 0)
			if (groupsLeft.length > 0) {
				groupThenLoop(v, groupsLeft, callbackStart, callbackEach, callbackLast)
			} else {
				callbackLast(groups, counter, what, k, v)
			}

			counter++
		})
	}

	// GENERATE TABLE CONTENT HEADER

	columns.forEach((d) => {
		groupThenLoop(all, columns, (groups) => {
			let rowHeader = tableContent.find(`tr[data-key=${groups.length}]`)
			if (rowHeader.size() == 0) {
				rowHeader = toolkit.newEl('tr')
					.appendTo(tableContent)
					.attr('data-key', groups.length)
			}

			return rowHeader
		}, (groups, counter, what, k, v) => {
			let tdHeaderTableContent = toolkit.newEl('td')
				.addClass('align-center title')
				.html(k)
				.width(tableHeaderWidth)
				.appendTo(what)

			if (v.length > 1) {
				tdHeaderTableContent.attr('colspan', v.length)
			}

			if (k.length > 15) {
				tdHeaderTableContent.width(columnWidth + 50)
				totalWidth += 50
			}

			totalWidth += columnWidth
		}, (groups, counter, what, k, v) => {
			// GENERATE CONTENT OF TABLE HEADER & TABLE CONTENT

			groupThenLoop(v[0].rows, rows, app.noop, app.noop /* {
				w.forEach((x) => {
					let key = [k, String(counter)].join('_')
					console.log(k, counter, x, x, key)

					let rowTrContentHeader = tableHeader.find(`tr[data-key=${key}]`)
					if (rowTrContentHeader.size() == 0) {
						rowTrContentHeader = toolkit.newEl('tr')
							.appendTo(tableHeader)
							.attr('data-key', key)
					}

					let rowTdContentHeader = tableHeader.find(`tr[data-key=${key}]`)
					if (rowTdContentHeader.size() == 0) {
						rowTdContentHeader = toolkit.newEl('tr')
							.appendTo(rowTrContentHeader)
							.attr('data-key', key)
					}
				})
			} */, (groups, counter, what, k, v) => {
				let key = rows.map((d) => v[0][d]).join("_")

				let rowTrHeader = tableHeader.find(`tr[data-key="${key}"]`)
				if (rowTrHeader.size() == 0) {
					rowTrHeader = toolkit.newEl('tr')
						.appendTo(tableHeader)
						.attr('data-key', key)
				}

				rows.forEach((e) => {
					let tdKey = [e, key].join('_')
					let rowTdHeader = rowTrHeader.find(`td[data-key="${tdKey}"]`)
					if (rowTdHeader.size() == 0) {
						toolkit.newEl('td')
							.addClass('title')
							.appendTo(rowTrHeader)
							.attr('data-key', tdKey)
							.html(v[0][e])
					}
				})

				let rowTrContent = tableContent.find(`tr[data-key="${key}"]`)
				if (rowTrContent.size() == 0) {
					rowTrContent = toolkit.newEl('tr')
						.appendTo(tableContent)
						.attr('data-key', key)
				}

				let rowTdContent = toolkit.newEl('td')
					.addClass('align-right')
					.html(kendo.toString(v[0].value, 'n0'))
					.appendTo(rowTrContent)
			})
		})

		tableContent.width(totalWidth)
	})

	let tableClear = toolkit.newEl('div')
		.addClass('clearfix')
		.appendTo(container)

	container.height(tableContent.height())
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

vm.currentMenu('Analysis')
vm.currentTitle('Custom Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Custom Analysis', href: '#' }
])

cst.title('Custom Analysis')


$(() => {
	cst.refresh()
	// cst.selectfield()
})