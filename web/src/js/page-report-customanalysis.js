viewModel.customtable = new Object()
let cst = viewModel.customtable

cst.contentIsLoading = ko.observable(false)
cst.title = ko.observable('Custom Analysis')
cst.fiscalYear = ko.observable(rpt.value.FiscalYear())
cst.data = ko.observableArray([])

cst.optionDimensionPNL = ko.observableArray([])
cst.dimensionPNL = ko.observable([])

cst.optionRowColumn = ko.observableArray([
	{ _id: 'row', Name: 'Row' },
	{ _id: 'column', Name: 'Column' },
])
cst.rowColumn = ko.observable('row')

cst.optionDimensionBreakdown = ko.observableArray([
	{ name: "Channel", field: "customer.channelname", title: "customer_channelname" },
	// { name: "RD by distributor name", field: "" },
	// { name: "GT by GT category", field: "" },
	{ name: "Branch", field: "customer.branchname", title: "customer_branchname" },
	{ name: "Customer Group", field: "customer.keyaccount", title: "customer_keyaccount" },
	{ name: "Key Account", field: "customer.customergroup", title: "customer_customergroupname" },
	{ name: "Brand", field: "product.brand", title: "product_brand" },
	{ name: "Zone", field: "customer.zone", title: "customer_zone" },
	{ name: "Region", field: "customer.region", title: "customer_region" },
	{ name: "City", field: "customer.areaname", title: "customer_areaname" },
	{ name: "Date Month", field: "date.month", title: "date_month" },
	{ name: "Date Quarter", field: "date.quartertxt", title: "date_quartertxt" },
])
cst.breakdown = ko.observableArray(['product.brand', 'customer.channelname'])

cst.refresh = () => {
	let param = {}
	let groups = ['date.fiscal']
		.concat(cst.breakdown())
		.filter((d) => d != 'pnl')

	param.pls = cst.dimensionPNL()
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

			if (rpt.isEmptyData(res)) {
				cst.contentIsLoading(false)
				return
			}

			cst.contentIsLoading(false)

			rpt.plmodels(res.Data.PLModels)
			cst.data(res.Data.Data)

			let opl1 = _.orderBy(rpt.plmodels(), (d) => d.OrderIndex)
			let opl2 = _.map(opl1, (d) => ({ field: d._id, name: d.PLHeader3 }))
			cst.optionDimensionPNL(opl2)
			if (cst.dimensionPNL().length == 0) {
				cst.dimensionPNL(['PL8A', "PL7", "PL74B", "PL74C", "PL94A", "PL44B", "PL44C"])
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
	let keys = _.orderBy(cst.dimensionPNL(), (d) => {
		let plmodel = rpt.plmodels().find((e) => e._id == d)
	    return (plmodel != undefined) ? plmodel.OrderIndex : ''
	}, 'asc')

	let all = []
	let columns = []
	let rows = []

	if (cst.rowColumn() == 'row') {
		columns = cst.breakdown().map((d) => toolkit.replace(d, '.', '_'))
		rows = ['pnl'].map((d) => toolkit.replace(d, '.', '_'))
	} else {
		columns = ['pnl'].map((d) => toolkit.replace(d, '.', '_'))
		rows = cst.breakdown().map((d) => toolkit.replace(d, '.', '_'))
	}

	// BUILD WELL STRUCTURED DATA

	let allRaw = []
	cst.data().forEach((d) => {
		let o = {}

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

	all = _.orderBy(all, (d) => (d.rows.length > 0) ? d.rows[0].value : d, 'desc')

	console.log('columns', columns)
	console.log('plmodels', rpt.plmodels())
	console.log('keys', keys)
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

	// REORDER

	if (cst.breakdown().indexOf('date.month') > -1) {
		all = _.orderBy(all, (d) => {
			return parseInt(d.date_month, 10)
		}, 'asc')

		all.forEach((d) => {
			d.date_month = moment(new Date(2015, d.date_month - 1, 1)).format('MMMM')
		})
	} else 

	if (cst.breakdown().indexOf('date.quartertxt') > -1) {
		all = _.orderBy(all, (d) => {
			return d.date_quartertxt
		}, 'asc')
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

vm.currentMenu('Analysis')
vm.currentTitle('Custom Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'Custom Analysis', href: '#' }
])

cst.title('&nbsp;')


$(() => {
	cst.refresh()
	// cst.selectfield()
})