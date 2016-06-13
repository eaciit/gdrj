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
	param.groups = [bkd.breakdownBy(), bkd.breakdownByFiscalYear()]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue()
	
	bkd.oldBreakdownBy(bkd.breakdownBy())
	bkd.contentIsLoading(true)

	let fetch = () => {
		app.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

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

	fetch()
}

bkd.breakdownBy = ko.observable('customer.channelname')
bkd.breakdownByFiscalYear = ko.observable('date.fiscal')
bkd.oldBreakdownBy = ko.observable(bkd.breakdownBy())

bkd.clickCell = (plcode, breakdown) => {
	// if (pnl == "Net Sales") {
	// 	bkd.renderDetailSalesTrans(breakdown)
	// 	return
	// }

	bkd.renderDetail(plcode, breakdown)
}
bkd.clickExpand = (e) => {
	let right = $(e).find('i.fa-chevron-right').length
	let down = $(e).find('i.fa-chevron-down').length
	if (right > 0){
		$(e).find('i').removeClass('fa-chevron-right')
		$(e).find('i').addClass('fa-chevron-down')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
	}
	if (down > 0) {
		$(e).find('i').removeClass('fa-chevron-down')
		$(e).find('i').addClass('fa-chevron-right')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
	}
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
	if (bkd.data().length == 0) {
		$('.breakdown-view').html('No data found.')
		return
	}
	
	let breakdowns = [bkd.breakdownBy(), bkd.breakdownByFiscalYear()]
	let rows = []
	
	let data = _.sortBy(_.map(bkd.data(), (d) => {
		let _id = breakdowns.map((e) => d._id[`_id_${app.idAble(e)}`]).join(' ')
		d._id = _id

		return d 
	}), (d) => d._id)
	
	let plmodels = _.sortBy(bkd.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	plmodels.forEach((d) => {
		let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0 }
		data.forEach((e) => {
			let breakdown = e._id
			let value = e[`${d._id}`]; value = app.validateNumber(value)
			row[breakdown] = value
			row.PNLTotal += value
		})
		data.forEach((e) => {
			let breakdown = e._id
			let value = e[`${d._id}`] / row.PNLTotal * 100; value = app.validateNumber(value)
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

	let colWidth = 160
	let colPercentWidth = 60
	let totalWidth = 0
	let pnlTotalSum = 0

	if (bkd.breakdownBy() == "customer.branchname") {
		colWidth = 200
	}

	if (bkd.breakdownBy() == "customer.region") {
		colWidth = 230
	}

	let grouppl1 = _.map(_.groupBy(bkd.plmodels(), (d) => {return d.PLHeader1}), (k , v) => { return { data: k, key:v}})
	let grouppl2 = _.map(_.groupBy(bkd.plmodels(), (d) => {return d.PLHeader2}), (k , v) => { return { data: k, key:v}})
	let grouppl3 = _.map(_.groupBy(bkd.plmodels(), (d) => {return d.PLHeader3}), (k , v) => { return { data: k, key:v}})
	data.forEach((d, i) => {
		app.newEl('th')
			.html(app.nbspAble(d._id, 'Uncategorized'))
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
	// console.log('data ', data)

	tableContent.css('min-width', totalWidth)

	// console.log('row ', rows)
	rows.forEach((d, i) => {
		pnlTotalSum += d.PNLTotal

		let PL = d.PLCode
		PL = PL.replace(/\s+/g, '')
		let trHeader = app.newEl('tr')
			.addClass(`header${PL}`)
			.attr(`idheaderpl`, PL)
			.appendTo(tableHeader)

		trHeader.on('click', () => {
			bkd.clickExpand(trHeader)
		})

		app.newEl('td')
			.html('<i></i>' + d.PNL)
			.appendTo(trHeader)

		let pnlTotal = kendo.toString(d.PNLTotal, 'n0')
		app.newEl('td')
			.html(pnlTotal)
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = app.newEl('tr')
			.addClass(`column${PL}`)
			.attr(`idpl`, PL)
			.appendTo(tableContent)

		data.forEach((e, f) => {
			let key = e._id
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

	let $trElem, $columnElem
	let resg1, resg2, resg3, PLyo, PLyo2, child = 0, parenttr = 0, textPL
	$(".table-header tbody>tr").each(function( i ) {
		if (i > 0){
			$trElem = $(this)
			resg1 = _.find(grouppl1, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg2 = _.find(grouppl2, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg3 = _.find(grouppl3, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			if (resg1 == undefined){
				if (resg2 != undefined){ 
					textPL = _.find(resg2.data, function(o) { return o._id == $trElem.attr("idheaderpl") })
					PLyo = _.find(rows, function(o) { return o.PNL == textPL.PLHeader1 })
					PLyo2 = _.find(rows, function(o) { return o.PLCode == textPL._id })
					$trElem.find('td:eq(0)').css('padding-left','40px')
					$trElem.attr('idparent', PLyo.PLCode)
					child = $(`tr[idparent=${PLyo.PLCode}]`).length
					$columnElem = $(`.table-content tr.column${PLyo2.PLCode}`)
					$columnElem.attr('idcontparent', PLyo.PLCode)
					if (child > 1){
						$trElem.insertAfter($(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
						$columnElem.insertAfter($(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
					}
					else{
						$trElem.insertAfter($(`tr.header${PLyo.PLCode}`))
						$columnElem.insertAfter($(`tr.column${PLyo.PLCode}`))
					}
				} else if (resg2 == undefined){
					if (resg3 != undefined){
						PLyo = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader2 })
						PLyo2 = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader3 })
						$trElem.find('td:eq(0)').css('padding-left','70px')
						if (PLyo == undefined){
							PLyo = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader1 })
							if(PLyo != undefined)
								$trElem.find('td:eq(0)').css('padding-left','40px')
						}
						$trElem.attr('idparent', PLyo.PLCode)
						child = $(`tr[idparent=${PLyo.PLCode}]`).length
						$columnElem = $(`.table-content tr.column${PLyo2.PLCode}`)
						$columnElem.attr('idcontparent', PLyo.PLCode)
						if (child > 1){
							$trElem.insertAfter($(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							$columnElem.insertAfter($(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
						}
						else{
							$trElem.insertAfter($(`tr.header${PLyo.PLCode}`))
							$columnElem.insertAfter($(`tr.column${PLyo.PLCode}`))
						}
					}
				}
			}

		}
	})

	let countChild = ''
	$(".table-header tbody>tr").each(function( i ) {
		$trElem = $(this)
		parenttr = $(`tr[idparent=${$trElem.attr('idheaderpl')}]`).length
		if (parenttr>0){
			$trElem.addClass('dd')
			$trElem.find(`td:eq(0)>i`)
				.addClass('fa fa-chevron-right')
				.css('margin-right', '5px')
			$(`tr[idparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
		} else {
			countChild = $trElem.attr('idparent')
			if (countChild == '' || countChild == undefined)
				$trElem.find(`td:eq(0)`).css('padding-left', '20px')
		}
	})
}

bkd.prepareEvents = () => {
	$('.breakdown-view').parent().on('mouseover', 'tr', function () {
		let index = $(this).index()
        let elh = $(`.breakdown-view .table-header tr:eq(${index})`).addClass('hover')
        let elc = $(`.breakdown-view .table-content tr:eq(${index})`).addClass('hover')
	})
	$('.breakdown-view').parent().on('mouseleave', 'tr', function () {
		$('.breakdown-view tr.hover').removeClass('hover')
	})
}

$(() => {
	bkd.refresh(false)
	bkd.prepareEvents()
})
