viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

bkd.keyOrder = ko.observable('plmodel.orderindex') //plorder
bkd.keyPLHeader1 = ko.observable('plmodel.plheader1') //plgroup1
bkd.contentIsLoading = ko.observable(false)
bkd.title = ko.observable('P&L Analytic')
bkd.data = ko.observableArray([])
bkd.detail = ko.observableArray([])
bkd.limit = ko.observable(10)
bkd.getParam = () => {
	let orderIndex = { field: bkd.keyOrder(), name: 'Order' }

	let breakdown = rpt.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))
	let dimensions = bkd.dimensions().concat([breakdown, orderIndex])
	let dataPoints = bkd.dataPoints()
	return rpt.wrapParam(dimensions, dataPoints)
}
bkd.refresh = () => {
	let param = $.extend(true, bkd.getParam(), {
		breakdownBy: bkd.breakdownBy(),
		limit: bkd.limit()
	})
	// bkd.data(DATATEMP_BREAKDOWN)
	bkd.contentIsLoading(true)
	app.ajaxPost("/report/summarycalculatedatapivot", param, (res) => {
		let data = _.sortBy(res.Data, (o, v) => 
			parseInt(o[app.idAble(bkd.keyOrder())].replace(/PL/g, "")))
		bkd.data(data)
		bkd.emptyGrid()
		bkd.contentIsLoading(false)
		bkd.render()
		window.data = res.Data
	}, () => {
		bkd.emptyGrid()
		bkd.contentIsLoading(false)
	})
}
bkd.refreshOnChange = () => {
	// setTimeout(bkd.refresh, 100)
}
bkd.breakdownBy = ko.observable('customer.channelname')
bkd.dimensions = ko.observableArray([
	{ field: bkd.keyPLHeader1(), name: ' ' },
	// { field: 'plmodel.plheader2', name: ' ' },
	// { field: 'plmodel.plheader3', name: ' ' }
])
bkd.dataPoints = ko.observableArray([
	{ field: "value1", name: "value1", aggr: "sum" }
])
bkd.clickCell = (pnl, breakdown) => {
	let pivot = $(`.breakdown-view`).data('kendoPivotGrid')
	let param = bkd.getParam()
	param.plheader1 = pnl
	param.filters.push({
		Field: bkd.breakdownBy(),
		Op: "$eq",
		Value: breakdown
	})
	param.note = 'pnl lvl 1'

	app.ajaxPost('/report/GetLedgerSummaryDetail', param, (res) => {
		let detail = res.Data.map((d) => { return {
			ID: d.ID,
			CostCenter: d.CC.Name,
			Customer: d.Customer.Name,
			Channel: d.Customer.ChannelName,
			Branch: d.Customer.BranchName,
			Brand: d.Product.Brand,
			Product: d.Product.Name,
			Year: d.Year,
			Amount: d.Value1
		} })

		bkd.detail(detail)
		bkd.renderDetail()
	})
}
bkd.renderDetailSalesTrans = () => {
	$('#modal-detail-ledger-summary').appendTo($('body'))
	$('#modal-detail-ledger-summary').modal('show')

	let columns = [
		{ field: '_id', title: 'ID', width: 100, locked: true },
		{ field: 'date', title: 'Date', width: 100, locked: true },
		{ field: "grossamount", title: 'Gross', width: 100 },
		{ field: "discountamount", title: 'Discount', width: 100 },
		{ field: "netamount", title: 'Net Sales', width: 100 },
		{ field: "salesqty", title: 'Sales Qty', width: 100 },
		{ field: "customer.branchname", title: 'Branch', width: 100 },
		{ field: "product.name", title: 'Branch', width: 100 },
		{ field: "product.brand", title: 'Brand', width: 100 },
	]

	let config = {
		dataSource: {
			transport: {
			    read: (options) => {
			    	let param = options.data
			    	param.tablename = "browsesalestrxs"

			    	if (app.isUndefined(param.page)) {
			    		param = $.extend(true, param, {
			    			take: 5,
			    			skip: 0,
			    			page: 1,
			    			pageSize: 5	
			    		})
			    	}

		            $.ajax({
		                type: "POST",
						url: "/databrowser/getdatabrowser",
		                contentType: "application/json; charset=utf-8",
		                dataType: 'json',
		                data: JSON.stringify(param),
		                success: (res) => {
		                    options.success(res.data)
		                }
		            });
		        },
		        pageSize: 5
			},
			schema: {
			    data: (d) => d.DataValue,
			    total: (d) => d.DataCount
			},
			serverPaging: true,
			columns: []
		},
		sortable: true,
        pageable: true,
        scrollable: true,
		columns: columns,
	}

	$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
	$('.grid-detail').kendoGrid(config)
}
bkd.renderDetail = () => {
	$('#modal-detail-ledger-summary').appendTo($('body'))
	$('#modal-detail-ledger-summary').modal('show')

	let columns = [
		{ field: 'Year', width: 60, locked: true, footerTemplate: 'Total :' },
		{ field: 'Amount', width: 80, locked: true, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: (d) => kendo.toString(d.Amount.sum, 'n0'), format: '{0:n0}', attributes: { class: 'align-right' } },
		{ field: 'CostCenter', title: 'Cost Center', width: 250 },
		{ field: 'Customer', width: 250 },
		{ field: 'Channel', width: 150 },
		{ field: 'Branch', width: 120 },
		{ field: 'Brand', width: 100 },
		{ field: 'Product', width: 250 },
	]
	let config = {
		dataSource: {
			data: bkd.detail(),
			pageSize: 5,
			aggregate: [
				{ field: "Amount", aggregate: "sum" }
			]
		},
		columns: columns,
		pageable: true,
		resizable: false,
		sortable: true
	}

	setTimeout(() => {
		$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
		$('.grid-detail').kendoGrid(config)
	}, 300)
}
bkd.emptyGrid = () => {
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
}
bkd.render = () => {
	let data = bkd.data()
	let header = [] 
	let rows = []
	let total = 0

	Lazy(data)
		.groupBy((d) => d[app.idAble(bkd.keyPLHeader1())])
		.each((v, pnl) => {
			let i = 0
			let row = {
				pnl: pnl,
				pnlTotal: 0,
				pnlOrder: v[0][app.idAble(bkd.keyOrder())]
			}

			let data = Lazy(v)
				.groupBy((e) => e[app.idAble(bkd.breakdownBy())])
				.each((w, dimension) => {
					let key = `value${i}`
					let value = Lazy(w).sum((x) => x.value1)
					row[key] = value
					header[`value${i}`] = dimension
					row.pnlTotal += value
					total += value
					i++

					if (header.filter((d) => d.key == key).length == 0) {
						header.push({
							key: key,
							title: dimension
						})
					}
				})
			rows.push(row)
		})

	header = Lazy(header)
		.sortBy((d) => d.title)
		.toArray()

	rows = Lazy(rows)
		.sortBy((d) => d.pnlOrder)
		.toArray()

	rows.forEach((d, i) => {
		header.forEach((j) => {
			let percent = app.NaNable(d[j.key]) / d.pnlTotal * 100
			d[j.key.replace(/value/g, 'percent')] = percent
		})
	})

	let wrapper = app.newEl('div')
		.addClass('pivot-pnl')
		.appendTo($('.breakdown-view'))

	let tableHeaderWrap = app.newEl('div')
		.addClass('table-header')
		.appendTo(wrapper)

	let tableHeader = app.newEl('table')
		.addClass('table')
		.appendTo(tableHeaderWrap)

	let tableContentWrap = app.newEl('div')
		.appendTo(wrapper)
		.addClass('table-content')

	let tableContent = app.newEl('table')
		.addClass('table')
		.appendTo(tableContentWrap)

	let trHeader1 = app.newEl('tr')
		.appendTo(tableHeader)

	app.newEl('th')
		.html('P&L')
		.appendTo(trHeader1)

	app.newEl('th')
		.html('Total')
		.addClass('align-right')
		.appendTo(trHeader1)

	let trContent1 = app.newEl('tr')
		.appendTo(tableContent)

	let colWidth = 150
	let colPercentWidth = 40
	let totalWidth = 0

	header.forEach((d, i) => {
		app.newEl('th')
			.html(app.nbspAble(d.title, 'Unnamed'))
			.addClass('align-right')
			.appendTo(trContent1)
			.width(colWidth)

		app.newEl('th')
			.html('%')
			.addClass('align-right')
			.appendTo(trContent1)
			.width(colPercentWidth)

		totalWidth += colWidth + colPercentWidth
	})

	tableContent.css('min-width', totalWidth)

	let pnlTotalSum = 0

	rows.forEach((d, i) => {
		pnlTotalSum += d.pnlTotal

		let trHeader = app.newEl('tr')
			.appendTo(tableHeader)

		app.newEl('td')
			.html(d.pnl)
			.appendTo(trHeader)

		let pnlTotal = kendo.toString(d.pnlTotal, 'n0')
		app.newEl('td')
			.html(pnlTotal)
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = app.newEl('tr')
			.appendTo(tableContent)

		header.forEach((e, f) => {
			let value = kendo.toString(d[e.key], 'n0')
			let percentage = kendo.toString(d[e.key.replace(/value/g, 'percent')], 'n0')

			if ($.trim(value) == '') {
				value = 0
			}

			let cell = app.newEl('td')
				.html(value)
				.addClass('align-right')
				.appendTo(trContent)

			cell.on('click', () => {
				bkd.clickCell(d.pnl, e.title)
			})

			app.newEl('td')
				.html(percentage)
				.addClass('align-right')
				.appendTo(trContent)
		})
	})

	return

	let trHeaderTotal = app.newEl('tr')
		.addClass('footer')
		.appendTo(tableHeader)

	app.newEl('td')
		.html('Total')
		.appendTo(trHeaderTotal)

	let totalAll = kendo.toString(pnlTotalSum, 'n0')
	app.newEl('td')
		.html(totalAll)
		.addClass('align-right')
		.appendTo(trHeaderTotal)

	let trContentTotal = app.newEl('tr')
		.addClass('footer')
		.appendTo(tableContent)

	header.forEach((e) => {
		let sum = kendo.toString(Lazy(rows).sum((g) => app.NaNable(g[e.key])), 'n0')
		let percentage = kendo.toString(sum / rows[0][e.key] * 100, 'n0')

		app.newEl('td')
			.html(sum)
			.addClass('align-right')
			.appendTo(trContentTotal)

		app.newEl('td')
			.html(percentage)
			.addClass('align-right')
			.appendTo(trContentTotal)
	})

	console.log("----", header)
	console.log("----", rows)
}

$(() => {
	bkd.refresh()
})
