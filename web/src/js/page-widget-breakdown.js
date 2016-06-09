viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

bkd.contentIsLoading = ko.observable(false)
bkd.popupIsLoading = ko.observable(false)
bkd.title = ko.observable('P&L Analytic')
bkd.detail = ko.observableArray([])
bkd.limit = ko.observable(10)
bkd.breakdownNote = ko.observable('')

bkd.data = ko.observableArray([])
bkd.plmodels = ko.observableArray([])

bkd.refresh = (useCache = false) => {
	let param = {}
	param.pls = []
	param.groups = [bkd.breakdownBy()]
	param.aggr = 'sum'
	param.filters = [] // rpt.getFilterValue()
	
	bkd.oldBreakdownBy(bkd.breakdownBy())
	bkd.contentIsLoading(true)

	app.ajaxPost("/report/getpnldata", param, (res) => {
		let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
		bkd.breakdownNote(`Last refreshed on: ${date}`)

		bkd.data(res.Data.Data)
		bkd.plmodels(res.Data.PLModels)
		bkd.emptyGrid()
		bkd.contentIsLoading(false)
		bkd.render()
	}, () => {
		bkd.emptyGrid()
		bkd.contentIsLoading(false)
	}, {
		cache: (useCache == true) ? 'breakdown chart' : false
	})
}

bkd.breakdownBy = ko.observable('customer.channelname')
bkd.oldBreakdownBy = ko.observable(bkd.breakdownBy())

bkd.clickCell = (plcode, breakdown) => {
	// if (pnl == "Net Sales") {
	// 	bkd.renderDetailSalesTrans(breakdown)
	// 	return
	// }

	bkd.renderDetail(plcode, breakdown)
}
bkd.emptyGrid = () => {
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
}

bkd.renderDetailSalesTrans = (breakdown) => {
	bkd.popupIsLoading(true)
	$('#modal-detail-ledger-summary').appendTo($('body'))
	$('#modal-detail-ledger-summary').modal('show')

	let columns = [
		// { field: '_id', title: 'ID', width: 100, locked: true },
		{ field: 'date', title: 'Date', width: 150, locked: true, template: (d) => {
			return moment(d.date).format('DD/MM/YYYY HH:mm')
		} },
		{ field: "grossamount", headerTemplate: '<div class="align-right">Gross</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
		{ field: "discountamount", headerTemplate: '<div class="align-right">Discount</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
		{ field: "netamount", headerTemplate: '<div class="align-right">Net Sales</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
		{ field: "salesqty", headerTemplate: '<div class="align-right">Sales Qty</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } },
		{ field: "customer.branchname", title: 'Branch', width: 100 },
		{ field: "product.name", title: 'Product', width: 250 },
		{ field: "product.brand", title: 'Brand', width: 100 },
	]

	let config = {
		dataSource: {
			transport: {
			    read: (options) => {
			    	let param = options.data
			    	param.tablename = "browsesalestrxs"
			    	param[bkd.breakdownBy()] = [breakdown]

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
							bkd.popupIsLoading(false)
							setTimeout(() => {
								options.success(res.data)
							}, 200)
		                },
		                error: () => {
							bkd.popupIsLoading(false)
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
			columns: [],
			pageSize: 5,
		},
		sortable: true,
        pageable: true,
        scrollable: true,
		columns: columns,
	}

	$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
	$('.grid-detail').kendoGrid(config)
}
bkd.renderDetail = (plcode, breakdown) => {
	bkd.popupIsLoading(true)
	$('#modal-detail-ledger-summary').appendTo($('body'))
	$('#modal-detail-ledger-summary').modal('show')

	let render = () => {
		let columns = [
			{ title: 'Date', width: 120, locked: true, footerTemplate: 'Total :', template: (d) => moment(d.date.date).format('DD/MM/YYYY HH:mm'), attributes: { class: 'bold' } },
			// { field: `pldatas.${plcode}.amount`, width: 120, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: (d) => d[`pldatas.${plcode}.amount`].sum, format: '{0:n2}', attributes: { class: 'align-right' } },
			{ field: 'grossamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Gross</div>", footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.grossamount.sum, 'n0')}</div>`, format: '{0:n2}', attributes: { class: 'align-right' } },
			{ field: 'discountamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Discount</div>", footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.discountamount.sum, 'n0')}</div>`, format: '{0:n2}', attributes: { class: 'align-right' } },
			{ field: 'netamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Net Sales</div>", footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.netamount.sum, 'n0')}</div>`, format: '{0:n2}', attributes: { class: 'align-right' } },
			{ field: 'cc.name', title: 'Cost Center', width: 250 },
			{ field: 'customer.name', title: 'Outlet', width: 250 },
			{ field: 'customer.branchname', title: 'Branch', width: 150 },
			{ field: 'customer.channelname', title: 'Channel', width: 120 },
			{ field: 'product.brand', title: 'Brand', width: 100 },
			{ field: 'product.name', title: 'Product', width: 250 },
		]
		let config = {
			dataSource: {
				data: bkd.detail(),
				pageSize: 5,
				aggregate: [
					{ field: "netamount", aggregate: "sum" },
					{ field: "grossamount", aggregate: "sum" },
					{ field: "discountamount", aggregate: "sum" },
					{ field: `pldatas.${plcode}.amount`, aggregate: 'sum' }
				]
			},
			columns: columns,
			pageable: true,
			resizable: false,
			sortable: true
		}

		$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
		$('.grid-detail').kendoGrid(config)
	}

	let param = {}
	param.PLCode = plcode
	param.BreakdownBy = bkd.breakdownBy()
	param.BreakdownValue = breakdown
	param.filters = [] // rpt.getFilterValue()

	app.ajaxPost('/report/getpnldatadetail', param, (res) => {
		bkd.detail(res.Data)
		bkd.popupIsLoading(false)
		setTimeout(render, 200)
	}, () => {
		bkd.popupIsLoading(false)
	})
}
bkd.render = () => {
	let rows = []
	let data = _.sortBy(bkd.data(), (d) => d._id[app.idAble(bkd.breakdownBy())])
	let plmodels = _.sortBy(bkd.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	plmodels.forEach((d) => {
		let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0 }
		data.forEach((e) => {
			let breakdown = e._id[app.idAble(bkd.breakdownBy())]
			let value = e[d._id]
			row[breakdown] = value
			row.PNLTotal += value
		})
		data.forEach((e) => {
			let breakdown = e._id[app.idAble(bkd.breakdownBy())]
			let value = e[d._id] / row.PNLTotal * 100
			row[`${breakdown} %`] = value
		})
		rows.push(row)
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
	let colPercentWidth = 60
	let totalWidth = 0
	let pnlTotalSum = 0

	data.forEach((d, i) => {
		app.newEl('th')
			.html(app.nbspAble(d._id[app.idAble(bkd.breakdownBy())], 'Uncategorized'))
			.addClass('align-right')
			.appendTo(trContent1)
			.width(colWidth)

		app.newEl('th')
			.html('%')
			.addClass('align-right cell-percentage')
			.appendTo(trContent1)
			.width(colPercentWidth)

		totalWidth += colWidth + colPercentWidth
	})

	tableContent.css('min-width', totalWidth)

	rows.forEach((d, i) => {
		pnlTotalSum += d.PNLTotal

		let trHeader = app.newEl('tr')
			.appendTo(tableHeader)

		app.newEl('td')
			.html(d.PNL)
			.appendTo(trHeader)

		let pnlTotal = kendo.toString(d.PNLTotal, 'n0')
		app.newEl('td')
			.html(pnlTotal)
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = app.newEl('tr')
			.appendTo(tableContent)

		data.forEach((e, f) => {
			let key = e._id[app.idAble(bkd.breakdownBy())]
			let value = kendo.toString(d[key], 'n0')
			let percentage = kendo.toString(d[`${key} %`], 'n2')

			if ($.trim(value) == '') {
				value = 0
			}

			let cell = app.newEl('td')
				.html(value)
				.addClass('align-right')
				.appendTo(trContent)

			cell.on('click', () => {
				bkd.clickCell(d.PLCode, key)
			})

			app.newEl('td')
				.html(`${percentage} %`)
				.addClass('align-right cell-percentage')
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
}

$(() => {
	bkd.refresh(false)
})
