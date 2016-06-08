viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

bkd.keyOrder = ko.observable('plmodel.orderindex') //plorder
bkd.keyPLHeader1 = ko.observable('plmodel.plheader1') //plgroup1
bkd.contentIsLoading = ko.observable(false)
bkd.title = ko.observable('P&L Analytic')
bkd.data = ko.observableArray([])
bkd.detail = ko.observableArray([])
bkd.getParam = () => {
	let orderIndex = { field: bkd.keyOrder(), name: 'Order' }

	let breakdown = rpt.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))
	let dimensions = bkd.dimensions().concat([breakdown, orderIndex])
	let dataPoints = bkd.dataPoints()
	return rpt.wrapParam(dimensions, dataPoints)
}
bkd.refresh = () => {
	let param = $.extend(true, bkd.getParam(), {
		breakdownBy: bkd.breakdownBy()
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

	return





	// let schemaModelFields = {}
	// let schemaCubeDimensions = {}
	// let schemaCubeMeasures = {}
	// let rows = []
	// let columns = []
	// let measures = []
	// let breakdown = rpt.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))

	// app.koUnmap(bkd.dimensions).concat([breakdown]).forEach((d, i) => {
	// 	let field = app.idAble(d.field)
	// 	schemaModelFields[field] = { type: 'string' }
	// 	schemaCubeDimensions[field] = { caption: d.name }

	// 	if (field.indexOf('plheader') > -1) {
	// 		rows.push({ name: field, expand: (rows.length == 0) })
	// 	} else {
	// 		columns.push({ name: field, expand: true })
	// 	}

	// 	rows = rows.slice(0, 2)
	// })

	// app.koUnmap(bkd.dataPoints).forEach((d) => {
	// 	let measurement = 'Amount'
	// 	let field = app.idAble(d.field)
	// 	schemaModelFields[field] = { type: 'number' }
	// 	schemaCubeMeasures[measurement] = { field: field, aggregate: 'sum', format: '{0:n0}' }
	// 	measures.push(measurement)
	// })

	// bkd.emptyGrid()
	// let wrapper = app.newEl('div').addClass('pivot-pnl')
	// 	.appendTo($('.breakdown-view'))

	// let tableHeaderWrap = app.newEl('div')
	// 	.addClass('table-header')
	// 	.appendTo(wrapper)

	// let tableHeader = app.newEl('table')
	// 	.addClass('table')
	// 	.appendTo(tableHeaderWrap)

	// let tableContentWrap = app.newEl('div')
	// 	.appendTo(wrapper)
	// 	.addClass('table-content')

	// let tableContent = app.newEl('table')
	// 	.addClass('table')
	// 	.appendTo(tableContentWrap)

	// let header = Lazy(data)
	// 	.groupBy((d) => d[app.idAble(bkd.breakdownBy())])
	// 	.map((v, k) => k)
	// 	.sortBy((k) => k)
	// 	.toArray()
			
	// let trTopHeader = app.newEl('tr')
	// 	.appendTo(tableHeader)

	// let tdTopHead = app.newEl('th')
	// 	.appendTo(trTopHeader)
	// 	.html("P&L")

	// let trTopBody = app.newEl('tr')
	// 	.appendTo(tableContent)

	// let columnWidth = 150

	// header.forEach((d) => {
	// 	let tdTopBody = app.newEl('th')
	// 		.width(columnWidth)
	// 		.addClass('align-right')
	// 		.html(d == '' ? 'No Name' : d)
	// 		.appendTo(trTopBody)
	// })

	// app.newEl('th')
	// 	.addClass('align-right bold')
	// 	.html('Total')
	// 	.appendTo(trTopHeader)

	// tableContent.css('min-width', columnWidth * header.length)

	// let totalAll = 0
	// let values = []
	// let i = 0

	// Lazy(data)
	// 	.groupBy((v) => v[app.idAble(bkd.keyPLHeader1())])
	// 	.map((v, k) => app.o({ key: k, data: v }))
	// 	.each((d, r) => {
	// 		values[i] = []
	// 		let total = 0

	// 		let trHeader = app.newEl('tr')
	// 			.appendTo(tableHeader)

	// 		let tdHead = app.newEl('td')
	// 			.appendTo(trHeader)
	// 			.html(d.key)

	// 		let trBody = app.newEl('tr')
	// 			.appendTo(tableContent)

	// 		let rowHeader1 = Lazy(d.data)
	// 			.groupBy((k) => k[app.idAble(bkd.breakdownBy())])
	// 			.map((v, k) => app.o({ key: k, data: v }))
	// 			.toArray()

	// 		let j = 0
	// 		header.forEach((d) => {
	// 			let val = Lazy(rowHeader1)
	// 				.filter((e) => e.key == d)
	// 				.sum((e) => Lazy(e.data)
	// 				.sum((e) => e.value1))
	// 			values[i][j] = val
	// 			total += val
	// 			totalAll += val

	// 			let tdEachCell = app.newEl('td')
	// 				.appendTo(trBody)
	// 				.html(kendo.toString(val, 'n0'))
	// 				.addClass('align-right')

	// 			tdEachCell.on('click', () => {
	// 				bkd.clickCell(r, d)
	// 			})

	// 			j++
	// 		})

	// 		app.newEl('td')
	// 			.appendTo(trHeader)
	// 			.html(kendo.toString(total, 'n0'))
	// 			.addClass('align-right bold')

	// 		i++
	// 	})

	// let trHeadFooter = app.newEl('tr')
	// 	.appendTo(tableHeader)
	// 	.addClass('footer')

	// let tdHeadFooter = app.newEl('td')
	// 	.addClass('bold footer')
	// 	.appendTo(trHeadFooter)
	// 	.html('Total')

	// let trBodyFooter = app.newEl('tr')
	// 	.appendTo(tableContent)
	// 	.addClass('footer')

	// let tdBodyFooter = app.newEl('td')
	// 	.addClass('bold align-right')
	// 	.appendTo(trHeadFooter)
	// 	.html(kendo.toString(totalAll, 'n0'))

	// header.forEach((d, i) => {
	// 	let columnTotal = Lazy(values).sum((e) => e[i])

	// 	let tdEachCell = app.newEl('td')
	// 		.appendTo(trBodyFooter)
	// 		.html(kendo.toString(columnTotal, 'n0'))
	// 		.addClass('align-right bold')
	// })

	// console.log("=====", values)
}

$(() => {
	bkd.refresh()
})
