viewModel.regionalDistributor = new Object()
let rd = viewModel.regionalDistributor

rd.contentIsLoading = ko.observable(false)
rd.popupIsLoading = ko.observable(false)
rd.title = ko.observable('RD Analysis')
rd.detail = ko.observableArray([])
rd.limit = ko.observable(10)
rd.breakdownNote = ko.observable('')

rd.breakdownBy = ko.observable('customer.areaname')
rd.breakdownByFiscalYear = ko.observable('date.fiscal')
rd.oldBreakdownBy = ko.observable(rd.breakdownBy())

rd.data = ko.observableArray([])
rd.fiscalYear = ko.observable(rpt.value.FiscalYear())
rd.breakdownValue = ko.observableArray([])

rd.refresh = (useCache = false) => {
	if (rd.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value')
		return
	}

	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([rd.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, rd.fiscalYear)
	param.filters.push({
		Field: 'customer.channelname',
		Op: '$in',
		Value: ['I1']
	})

	let breakdownValue = rd.breakdownValue().filter((d) => d != 'All')
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: rd.breakdownBy(),
			Op: '$in',
			Value: rd.breakdownValue()
		})
	}
	console.log("bdk", param.filters)
	
	rd.oldBreakdownBy(rd.breakdownBy())
	rd.contentIsLoading(true)

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			rd.breakdownNote(`Last refreshed on: ${date}`)

			rd.data(res.Data.Data)
			rpt.plmodels(res.Data.PLModels)
			rd.emptyGrid()
			rd.contentIsLoading(false)
			rd.render()
		}, () => {
			rd.emptyGrid()
			rd.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'breakdown chart' : false
		})
	}

	fetch()
}

rd.clickExpand = (e) => {
	let right = $(e).find('i.fa-chevron-right').length
	let down = $(e).find('i.fa-chevron-down').length
	if (right > 0){
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '530px')
			$('.pivot-pnl .table-content').css('margin-left', '530px')
		}
		
		$(e).find('i').removeClass('fa-chevron-right')
		$(e).find('i').addClass('fa-chevron-down')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '')
			$('.pivot-pnl .table-content').css('margin-left', '')
		}
		
		$(e).find('i').removeClass('fa-chevron-down')
		$(e).find('i').addClass('fa-chevron-right')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		rpt.hideAllChild(e.attr('idheaderpl'))
	}
}
rd.emptyGrid = () => {
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
}

rd.renderDetailSalesTrans = (breakdown) => {
	rd.popupIsLoading(true)
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
			    	param[rd.breakdownBy()] = [breakdown]

			    	if (toolkit.isUndefined(param.page)) {
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
							rd.popupIsLoading(false)
							setTimeout(() => {
								options.success(res.data)
							}, 200)
		                },
		                error: () => {
							rd.popupIsLoading(false)
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
rd.renderDetail = (plcode, breakdowns) => {
	rd.popupIsLoading(true)
	$('#modal-detail-ledger-summary .modal-title').html('Detail')
	$('#modal-detail-ledger-summary').appendTo($('body'))
	$('#modal-detail-ledger-summary').modal('show')

	let titleParts = []
	for (let p in breakdowns) {
		if (breakdowns.hasOwnProperty(p)) {
			titleParts.push(breakdowns[p])
		}
	}

	$('#modal-detail-ledger-summary .modal-title').html(`Detail of ${titleParts.join(' ')}`)

	let columns = [
		{ title: 'Date', width: 120, locked: true, footerTemplate: 'Total :', template: (d) => moment(d.date.date).format('DD/MM/YYYY HH:mm'), attributes: { class: 'bold' } },
		// { field: `pldatas.${plcode}.amount`, width: 120, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: (d) => d[`pldatas.${plcode}.amount`].sum, format: '{0:n2}', attributes: { class: 'align-right' } },
		{ field: 'grossamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Gross</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.grossamount.sum, 'n0')}</div>`,  */ format: '{0:n2}', attributes: { class: 'align-right' } },
		{ field: 'discountamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Discount</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.discountamount.sum, 'n0')}</div>`,  */ format: '{0:n2}', attributes: { class: 'align-right' } },
		{ field: 'netamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Net Sales</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.netamount.sum, 'n0')}</div>`,  */ format: '{0:n2}', attributes: { class: 'align-right' } },
		// { title: 'Cost Center', template: (d) => toolkit.redefine(toolkit.redefine(d.cc, {}).name, ''), width: 250 },
		{ title: 'Outlet', template: (d) => toolkit.redefine(toolkit.redefine(d.customer, {}).name, ''), width: 200 },
		{ title: 'Branch', template: (d) => toolkit.redefine(toolkit.redefine(d.customer, {}).branchname, ''), width: 150 },
		{ title: 'Channel', template: (d) => toolkit.redefine(toolkit.redefine(d.customer, {}).channelname, ''), width: 150 },
		{ title: 'Brand', template: (d) => toolkit.redefine(toolkit.redefine(d.product, {}).brand, ''), width: 100 },
		{ title: 'Product', template: (d) => toolkit.redefine(toolkit.redefine(d.product, {}).name, ''), width: 250 },
	]

	let config = {
		dataSource: {
			transport: {
			    read: (options) => {
			    	let param = options.data
			    	param.filters = []

					for (let p in breakdowns) {
						if (breakdowns.hasOwnProperty(p)) {
							param.filters.push({
								field: p,
								op: "$eq",
								value: breakdowns[p]
							})
						}
					}

			    	if (toolkit.isUndefined(param.page)) {
			    		param = $.extend(true, param, {
			    			take: 5,
			    			skip: 0,
			    			page: 1,
			    			pageSize: 5	
			    		})
			    	}

		            $.ajax({
		                type: "POST",
						url: "/report/getpnldetail",
		                contentType: "application/json; charset=utf-8",
		                dataType: 'json',
		                data: JSON.stringify(param),
		                success: (res) => {
							rd.popupIsLoading(false)
							setTimeout(() => {
								console.log("++++", res)
								options.success(res.Data)
							}, 200)
		                },
		                error: () => {
							rd.popupIsLoading(false)
		                }
		            });
		        },
		        pageSize: 5
			},
			schema: {
			    data: (d) => d.DataValue,
			    total: (d) => d.DataCount
			},
	  //       aggregates: [
			// 	{ field: "netamount", aggregate: "sum" },
			// 	{ field: "grossamount", aggregate: "sum" },
			// 	{ field: "discountamount", aggregate: "sum" },
			// 	{ field: `pldatas.${plcode}.amount`, aggregate: 'sum' }
			// ],
			serverPaging: true,
			pageSize: 5,
		},
		sortable: true,
        pageable: true,
        scrollable: true,
		columns: columns,
		dataBound: (d) => {
			$('.grid-detail .k-pager-nav.k-pager-last').hide()
			
			setTimeout(() => {
				let pager = $('.grid-detail .k-pager-info')
				let text = `rows ${pager.html().split(" ").slice(0, 3).join(" ")}`
				pager.html(text)
			}, 10)
		}
	}

	console.log("======", config)

	$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
	$('.grid-detail').kendoGrid(config)
}

rd.render = () => {
	if (rd.data().length == 0) {
		$('.breakdown-view').html('No data found.')
		return
	}
	
	let breakdowns = [rd.breakdownBy() /** , 'date.year' */]
	let rows = []
	
	let data = _.map(rd.data(), (d) => {
		d.breakdowns = {}
		let titleParts = []

		breakdowns.forEach((e) => {
			let title = d._id[`_id_${toolkit.replace(e, '.', '_')}`]
			title = toolkit.whenEmptyString(title, '')
			d.breakdowns[e] = title
			titleParts.push(title)
		})
		
		d._id = titleParts.join(' ')
		return d 
	})
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = [
		"PL94C" /* "Operating Income" */, 
		"PL39B" /* "Earning Before Tax" */, 
		"PL41C" /* "Earning After Tax" */,
	]
	let netSalesPLCode = 'PL8A'
	let netSalesPlModel = rpt.plmodels().find((d) => d._id == netSalesPLCode)
	let netSalesRow = {}

	rpt.fixRowValue(data)

	data.forEach((e) => {
		let breakdown = e._id
		let value = e[`${netSalesPlModel._id}`]; 
		value = toolkit.number(value)
		netSalesRow[breakdown] = value
	})
	data = _.orderBy(data, (d) => netSalesRow[d._id], 'desc')

	plmodels.forEach((d) => {
		let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
		data.forEach((e) => {
			let breakdown = e._id
			let value = e[`${d._id}`]; 
			value = toolkit.number(value)
			row[breakdown] = value
			row.PNLTotal += value
		})
		data.forEach((e) => {
			let breakdown = e._id
			let percentage = toolkit.number(e[`${d._id}`] / row.PNLTotal) * 100; 
			percentage = toolkit.number(percentage)

			if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
			}

			if (percentage < 0)
				percentage = percentage * -1

			row[`${breakdown} %`] = percentage
		})

		if (exceptions.indexOf(row.PLCode) > -1) {
			return
		}

		rows.push(row)
	})

	let TotalNetSales = _.find(rows, (r) => { return r.PLCode == "PL8A" }).PNLTotal
	rows.forEach((d, e) => {
		let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100;
		if (TotalPercentage < 0)
			TotalPercentage = TotalPercentage * -1 
		rows[e].Percentage = TotalPercentage
	})

	let wrapper = toolkit.newEl('div')
		.addClass('pivot-pnl')
		.appendTo($('.breakdown-view'))

	let tableHeaderWrap = toolkit.newEl('div')
		.addClass('table-header')
		.appendTo(wrapper)

	let tableHeader = toolkit.newEl('table')
		.addClass('table')
		.appendTo(tableHeaderWrap)

	let tableContentWrap = toolkit.newEl('div')
		.appendTo(wrapper)
		.addClass('table-content')

	let tableContent = toolkit.newEl('table')
		.addClass('table')
		.appendTo(tableContentWrap)

	let trHeader1 = toolkit.newEl('tr')
		.appendTo(tableHeader)

	toolkit.newEl('th')
		.html('P&L')
		.appendTo(trHeader1)

	toolkit.newEl('th')
		.html('Total')
		.addClass('align-right')
		.appendTo(trHeader1)

	toolkit.newEl('th')
		.html('%')
		.addClass('align-right')
		.appendTo(trHeader1)

	let trContent1 = toolkit.newEl('tr')
		.appendTo(tableContent)

	let colWidth = 160
	let colPercentWidth = 60
	let totalWidth = 0
	let pnlTotalSum = 0

	if (rd.breakdownBy() == "customer.branchname") {
		colWidth = 200
	}

	if (rd.breakdownBy() == "customer.region") {
		colWidth = 230
	}

	data.forEach((d, i) => {
		if (d._id.length > 22)
			colWidth += 30
		toolkit.newEl('th')
			.html(d._id)
			.addClass('align-right')
			.appendTo(trContent1)
			.width(colWidth)

		toolkit.newEl('th')
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
		let trHeader = toolkit.newEl('tr')
			.addClass(`header${PL}`)
			.attr(`idheaderpl`, PL)
			.appendTo(tableHeader)

		trHeader.on('click', () => {
			rd.clickExpand(trHeader)
		})

		toolkit.newEl('td')
			.html('<i></i>' + d.PNL)
			.appendTo(trHeader)

		let pnlTotal = kendo.toString(d.PNLTotal, 'n0')
		toolkit.newEl('td')
			.html(pnlTotal)
			.addClass('align-right')
			.appendTo(trHeader)

		toolkit.newEl('td')
			.html(kendo.toString(d.Percentage, 'n2') + '%')
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = toolkit.newEl('tr')
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

			let cell = toolkit.newEl('td')
				.html(value)
				.addClass('align-right')
				.appendTo(trContent)

			cell.on('click', () => {
				rd.renderDetail(d.PLCode, e.breakdowns)
			})

			toolkit.newEl('td')
				.html(`${percentage} %`)
				.addClass('align-right cell-percentage')
				.appendTo(trContent)
		})

		let boolStatus = false
		trContent.find('td').each((a,e) => {
			// console.log(trHeader.find('td:eq(0)').text(),$(e).text())
			if ($(e).text() != '0' && $(e).text() != '0.00 %') {
				boolStatus = true
			}
		})
		if (boolStatus) {
			trContent.attr('statusval', 'show')
			trHeader.attr('statusval', 'show')
		} else {
			trContent.attr('statusval', 'hide')
			trHeader.attr('statusval', 'hide')
		}
	})

	rpt.buildGridLevels(rows)
}

rd.optionBreakdownValues = ko.observableArray([])
rd.breakdownValueAll = { _id: 'All', Name: 'All' }
rd.changeBreakdown = () => {
	let all = rd.breakdownValueAll
	setTimeout(() => {
		rd.optionBreakdownValues([all].concat(
			rpt.masterData.Area().map((d) => { 
				return { _id: d.Name, Name: d.Name } })
			)
		)
		rd.breakdownValue([all._id])
	}, 100)
}
rd.changeBreakdownValue = () => {
	let all = rd.breakdownValueAll
	setTimeout(() => {
		let condA1 = rd.breakdownValue().length == 2
		let condA2 = rd.breakdownValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			rd.breakdownValue.remove(all._id)
			return
		}

		let condB1 = rd.breakdownValue().length > 1
		let condB2 = rd.breakdownValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			rd.breakdownValue([all._id])
			return
		}

		let condC1 = rd.breakdownValue().length == 0
		if (condC1) {
			rd.breakdownValue([all._id])
		}
	}, 100)
}

vm.currentMenu('Analysis')
vm.currentTitle('RD Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'RD Analysis', href: '/web/report/dashboard' }
])

rd.title('RD Analysis')

rpt.refresh = () => {
	rd.changeBreakdown()
	setTimeout(() => {
		rd.breakdownValue(['All'])
		rd.refresh(false)
	}, 200)

	rpt.prepareEvents()
}

$(() => {
	rpt.refresh()
})
