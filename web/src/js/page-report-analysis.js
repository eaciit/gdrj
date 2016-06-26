viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

bkd.contentIsLoading = ko.observable(false)
bkd.popupIsLoading = ko.observable(false)
bkd.title = ko.observable('P&L Analytic')
bkd.detail = ko.observableArray([])
bkd.limit = ko.observable(10)
bkd.breakdownNote = ko.observable('')

bkd.breakdownBy = ko.observable('customer.channelname')
bkd.breakdownByFiscalYear = ko.observable('date.fiscal')
bkd.oldBreakdownBy = ko.observable(bkd.breakdownBy())

bkd.data = ko.observableArray([])
bkd.fiscalYear = ko.observable(rpt.value.FiscalYear())
bkd.breakdownValue = ko.observableArray([])
bkd.level = ko.observable(1)
bkd.isBreakdownChannel = ko.observable(false)
bkd.breakdownChannels = ko.observableArray([])
bkd.optionBreakdownChannels = ko.observableArray([
	{ _id: "I1", Name: "RD" },
	{ _id: "I2", Name: "GT" },
	{ _id: "I3", Name: "MT" },
	{ _id: "I4", Name: "IT" },
])
bkd.breakdownChannelLocation = ko.observable('')
bkd.optionBreakdownChannelLocations = ko.observableArray([
	{ _id: "zone", Name: "Zone" },
	{ _id: "region", Name: "Region" },
	{ _id: "areaname", Name: "City" },
])

bkd.refresh = (useCache = false) => {
	if (bkd.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value')
		return
	}

	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([bkd.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, bkd.fiscalYear)

	let breakdownValue = bkd.breakdownValue().filter((d) => d != 'All')
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: bkd.breakdownBy(),
			Op: '$in',
			Value: bkd.breakdownValue()
		})
	}

	if (bkd.breakdownChannels().length > 0) {
		param.groups.push('customer.reportsubchannel')
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: bkd.breakdownChannels()
		})

		bkd.level(2)
	}

	if (bkd.breakdownChannelLocation() != '') {
		param.groups.push(`customer.${bkd.breakdownChannelLocation()}`)
		bkd.level(2)
	}
	
	bkd.oldBreakdownBy(bkd.breakdownBy())
	bkd.contentIsLoading(true)

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			bkd.breakdownNote(`Last refreshed on: ${date}`)

			let data = bkd.buildStructure(res.Data.Data)
			bkd.data(data)
			rpt.plmodels(res.Data.PLModels)
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

bkd.clickExpand = (e) => {
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
	}
	rpt.refreshHeight()
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

bkd.renderDetail = (plcode, breakdowns) => {
	bkd.popupIsLoading(true)
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
								field: p.replace(/_id_/g, '').replace(/_/g, '.'),
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
							bkd.popupIsLoading(false)
							setTimeout(() => {
								console.log("++++", res)
								options.success(res.Data)
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

bkd.buildStructure = (data) => {
	let groupThenMap = (data, group) => {
		let op1 = _.groupBy(data, (d) => group(d))
		let op2 = _.map(op1, (v, k) => {
			let key = { _id: k, subs: v }
			let sample = v[0]

			for (let prop in sample) {
				if (sample.hasOwnProperty(prop) && prop != '_id') {
					key[prop] = toolkit.sum(v, (d) => d[prop])
				}
			}

			return key
		})

		return op2
	}

	if (bkd.breakdownChannels().length > 0) {
		let parsed = groupThenMap(data, (d) => {
			return d._id[`_id_${toolkit.replace(bkd.breakdownBy(), '.', '_')}`]
		}).map((d) => {
			let subs = groupThenMap(d.subs, (e) => {
				return e._id._id_customer_reportsubchannel
			}).map((e) => {
				e.breakdowns = e.subs[0]._id
				d.count = 1
				return e
			})

			d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
			d.breakdowns = d.subs[0]._id
			d.count = d.subs.length
			return d
		})
	
		bkd.level(2)
		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	if (bkd.breakdownChannelLocation() != '') {
		let parsed = groupThenMap(data, (d) => {
			return d._id[`_id_${toolkit.replace(bkd.breakdownBy(), '.', '_')}`]
		}).map((d) => {
			let subs = groupThenMap(d.subs, (e) => {
				return e._id[`_id_customer_${bkd.breakdownChannelLocation()}`]
			}).map((e) => {
				e.breakdowns = e.subs[0]._id
				d.count = 1
				return e
			})

			d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
			d.breakdowns = d.subs[0]._id
			d.count = d.subs.length
			return d
		})
	
		bkd.level(2)
		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	let parsed = groupThenMap(data, (d) => {
		return d._id[`_id_${toolkit.replace(bkd.breakdownBy(), '.', '_')}`]
	}).map((d) => {
		d.breakdowns = d.subs[0]._id
		d.count = 1

		return d
	})

	bkd.level(1)
	let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
	return newParsed
}

bkd.render = () => {
	if (bkd.data().length == 0) {
		$('.breakdown-view').html('No data found.')
		return
	}


	// ========================= TABLE STRUCTURE

	let wrapper = toolkit.newEl('div')
		.addClass('pivot-pnl-branch pivot-pnl')
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

	let trHeader = toolkit.newEl('tr')
		.appendTo(tableHeader)

	toolkit.newEl('th')
		.html('P&L')
		.css('height', `${34 * bkd.level()}px`)
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${34 * bkd.level()}px`)
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('%')
		.css('height', `${34 * bkd.level()}px`)
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < bkd.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent))
	}



	// ========================= BUILD HEADER

	let data = bkd.data()

	let columnWidth = 130
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []
	let percentageWidth = 80

	let countWidthThenPush = (thheader, each, key) => {
		let currentColumnWidth = each._id.length * (bkd.isBreakdownChannel() ? 10 : 6)
		if (currentColumnWidth < columnWidth) {
			currentColumnWidth = columnWidth
		}

		if (each.hasOwnProperty('width')) {
			currentColumnWidth = each.width
		}

		each.key = key.join('_')
		dataFlat.push(each)

		totalColumnWidth += currentColumnWidth
		thheader.width(currentColumnWidth)
	}

	data.forEach((lvl1, i) => {
		let thheader1 = toolkit.newEl('th')
			.html(lvl1._id)
			.attr('colspan', lvl1.count)
			.addClass('align-center')
			.appendTo(trContents[0])

		if (bkd.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id])

			totalColumnWidth += percentageWidth
			let thheader1p = toolkit.newEl('th')
				.html('%')
				.width(percentageWidth)
				.addClass('align-center')
				.appendTo(trContents[0])

			return
		}
		thheader1.attr('colspan', lvl1.count * 2)

		lvl1.subs.forEach((lvl2, j) => {
			let thheader2 = toolkit.newEl('th')
				.html(lvl2._id)
				.addClass('align-center')
				.appendTo(trContents[1])

			if (bkd.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('%')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[1])

				return
			}
			thheader2.attr('colspan', lvl2.count)
		})
	})

	tableContent.css('min-width', totalColumnWidth)



	// ========================= CONSTRUCT DATA
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */]
	let netSalesPLCode = 'PL8A'
	let netSalesRow = {}
	let rows = []

	rpt.fixRowValue(dataFlat)

	console.log("dataFlat", dataFlat)

	dataFlat.forEach((e) => {
		let breakdown = e._id
		netSalesRow[breakdown] = e[netSalesPLCode]
	})

	plmodels.forEach((d) => {
		let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
		dataFlat.forEach((e) => {
			let breakdown = e.key
			let value = e[`${d._id}`]; 
			row[breakdown] = value

			if (toolkit.isDefined(e.excludeFromTotal)) {
				return
			}

			row.PNLTotal += value
		})
		dataFlat.forEach((e) => {
			dataFlat.find((f) => f.key == '')
			let breakdown = e.key
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

	console.log("rows", rows)
	
	let TotalNetSales = _.find(rows, (r) => { return r.PLCode == "PL8A" }).PNLTotal
	rows.forEach((d, e) => {
		let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100;
		if (TotalPercentage < 0)
			TotalPercentage = TotalPercentage * -1 
		rows[e].Percentage = TotalPercentage
	})




	// ========================= PLOT DATA

	rows.forEach((d, i) => {
		pnlTotalSum += d.PNLTotal

		let PL = d.PLCode
		PL = PL.replace(/\s+/g, '')
		let trHeader = toolkit.newEl('tr')
			.addClass(`header${PL}`)
			.attr(`idheaderpl`, PL)
			.attr(`data-row`, `row-${i}`)
			.appendTo(tableHeader)

		trHeader.on('click', () => {
			bkd.clickExpand(trHeader)
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
			.html(kendo.toString(d.Percentage, 'n2') + ' %')
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = toolkit.newEl('tr')
			.addClass(`column${PL}`)
			.attr(`idpl`, PL)
			.attr(`data-row`, `row-${i}`)
			.appendTo(tableContent)

		dataFlat.forEach((e, f) => {
			let key = e.key
			let value = kendo.toString(d[key], 'n0')
			let percentage = kendo.toString(d[`${key} %`], 'n2') + ' %'

			if ($.trim(value) == '') {
				value = 0
			}

			let cell = toolkit.newEl('td')
				.html(value)
				.addClass('align-right')
				.appendTo(trContent)

			let cellPercentage = toolkit.newEl('td')
				.html(percentage)
				.addClass('align-right')
				.appendTo(trContent)

			$([cell, cellPercentage]).on('click', () => {
				bkd.renderDetail(d.PLCode, e.breakdowns)
			})
		})

		let boolStatus = false
		trContent.find('td').each((a,e) => {
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
	

	// ========================= CONFIGURE THE HIRARCHY
	rpt.buildGridLevels(rows)


	return





	
	// let breakdowns = [bkd.breakdownBy()]
	// let rows = []
	
	// let data = _.map(bkd.data(), (d) => {
	// 	d.breakdowns = {}
	// 	let titleParts = []

	// 	breakdowns.forEach((e) => {
	// 		let title = d._id[`_id_${toolkit.replace(e, '.', '_')}`]
	// 		title = toolkit.whenEmptyString(title, '')
	// 		d.breakdowns[e] = title
	// 		titleParts.push(title)
	// 	})
		
	// 	d._id = titleParts.join(' ')
	// 	return d 
	// })
	
	// let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	// let exceptions = [
	// 	"PL94C" /* "Operating Income" */, 
	// 	"PL39B" /* "Earning Before Tax" */, 
	// 	"PL41C" /* "Earning After Tax" */,
	// ]
	// let netSalesPLCode = 'PL8A'
	// let netSalesPlModel = rpt.plmodels().find((d) => d._id == netSalesPLCode)
	// let netSalesRow = {}, changeformula, formulayo

	// rpt.fixRowValue(data)

	// data.forEach((e) => {
	// 	let breakdown = e._id
	// 	let value = e[`${netSalesPlModel._id}`]; 
	// 	value = toolkit.number(value)
	// 	netSalesRow[breakdown] = value
	// })

	// data = _.orderBy(data, (d) => netSalesRow[d._id], 'desc')

	// plmodels.forEach((d) => {
	// 	let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
	// 	data.forEach((e) => {
	// 		let breakdown = e._id
	// 		let value = e[`${d._id}`]; 
	// 		value = toolkit.number(value)
	// 		row[breakdown] = value
	// 		row.PNLTotal += value
	// 	})
	// 	data.forEach((e) => {
	// 		let breakdown = e._id
	// 		let percentage = toolkit.number(e[`${d._id}`] / row.PNLTotal) * 100; 
	// 		percentage = toolkit.number(percentage)

	// 		if (d._id != netSalesPLCode) {
	// 			percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
	// 		}

	// 		if (percentage < 0)
	// 			percentage = percentage * -1

	// 		row[`${breakdown} %`] = percentage
	// 	})

	// 	if (exceptions.indexOf(row.PLCode) > -1) {
	// 		return
	// 	}

	// 	rows.push(row)
	// })

	// let TotalNetSales = _.find(rows, (r) => { return r.PLCode == "PL8A" }).PNLTotal
	// rows.forEach((d, e) => {
	// 	let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100; 
	// 	if (TotalPercentage < 0)
	// 		TotalPercentage = TotalPercentage * -1
	// 	rows[e].Percentage = TotalPercentage
	// })

	// let wrapper = toolkit.newEl('div')
	// 	.addClass('pivot-pnl')
	// 	.appendTo($('.breakdown-view'))

	// let tableHeaderWrap = toolkit.newEl('div')
	// 	.addClass('table-header')
	// 	.appendTo(wrapper)

	// let tableHeader = toolkit.newEl('table')
	// 	.addClass('table')
	// 	.appendTo(tableHeaderWrap)

	// let tableContentWrap = toolkit.newEl('div')
	// 	.appendTo(wrapper)
	// 	.addClass('table-content')

	// let tableContent = toolkit.newEl('table')
	// 	.addClass('table')
	// 	.appendTo(tableContentWrap)

	// let trHeader1 = toolkit.newEl('tr')
	// 	.appendTo(tableHeader)

	// toolkit.newEl('th')
	// 	.html('P&L')
	// 	.appendTo(trHeader1)

	// toolkit.newEl('th')
	// 	.html('Total')
	// 	.addClass('align-right')
	// 	.appendTo(trHeader1)

	// toolkit.newEl('th')
	// 	.html('%')
	// 	.addClass('align-right')
	// 	.appendTo(trHeader1)

	// let trContent1 = toolkit.newEl('tr')
	// 	.appendTo(tableContent)

	// let colWidth = 160
	// let colPercentWidth = 60
	// let totalWidth = 0
	// let pnlTotalSum = 0

	// if (bkd.breakdownBy() == "customer.branchname") {
	// 	colWidth = 200
	// }

	// if (bkd.breakdownBy() == "customer.region") {
	// 	colWidth = 230
	// }

	// data.forEach((d, i) => {
	// 	if (d._id.length > 22)
	// 		colWidth += 30
	// 	toolkit.newEl('th')
	// 		.html(d._id)
	// 		.addClass('align-right')
	// 		.appendTo(trContent1)
	// 		.width(colWidth)

	// 	toolkit.newEl('th')
	// 		.html('%')
	// 		.addClass('align-right cell-percentage')
	// 		.appendTo(trContent1)
	// 		.width(colPercentWidth)

	// 	totalWidth += colWidth + colPercentWidth
	// })
	// // console.log('data ', data)

	// tableContent.css('min-width', totalWidth)

	// // console.log('row ', rows)
	// rows.forEach((d, i) => {
	// 	pnlTotalSum += d.PNLTotal

	// 	let PL = d.PLCode
	// 	PL = PL.replace(/\s+/g, '')
	// 	let trHeader = toolkit.newEl('tr')
	// 		.addClass(`header${PL}`)
	// 		.attr(`idheaderpl`, PL)
	// 		.appendTo(tableHeader)

	// 	trHeader.on('click', () => {
	// 		bkd.clickExpand(trHeader)
	// 	})

	// 	toolkit.newEl('td')
	// 		.html('<i></i>' + d.PNL)
	// 		.appendTo(trHeader)

	// 	let pnlTotal = kendo.toString(d.PNLTotal, 'n0')
	// 	toolkit.newEl('td')
	// 		.html(pnlTotal)
	// 		.addClass('align-right')
	// 		.appendTo(trHeader)

	// 	toolkit.newEl('td')
	// 		.html(kendo.toString(d.Percentage, 'n2') + '%')
	// 		.addClass('align-right')
	// 		.appendTo(trHeader)

	// 	let trContent = toolkit.newEl('tr')
	// 		.addClass(`column${PL}`)
	// 		.attr(`idpl`, PL)
	// 		.appendTo(tableContent)

	// 	data.forEach((e, f) => {
	// 		let key = e._id
	// 		let value = kendo.toString(d[key], 'n0')

	// 		let percentage = kendo.toString(d[`${key} %`], 'n2')

	// 		if ($.trim(value) == '') {
	// 			value = 0
	// 		}

	// 		let cell = toolkit.newEl('td')
	// 			.html(value)
	// 			.addClass('align-right')
	// 			.appendTo(trContent)

	// 		cell.on('click', () => {
	// 			bkd.renderDetail(d.PLCode, e.breakdowns)
	// 		})

	// 		toolkit.newEl('td')
	// 			.html(`${percentage} %`)
	// 			.addClass('align-right cell-percentage')
	// 			.appendTo(trContent)
	// 	})

	// 	let boolStatus = false
	// 	trContent.find('td').each((a,e) => {
	// 		// console.log(trHeader.find('td:eq(0)').text(),$(e).text())
	// 		if ($(e).text() != '0' && $(e).text() != '0.00 %') {
	// 			boolStatus = true
	// 		}
	// 	})
	// 	if (boolStatus) {
	// 		trContent.attr('statusval', 'show')
	// 		trHeader.attr('statusval', 'show')
	// 	} else {
	// 		trContent.attr('statusval', 'hide')
	// 		trHeader.attr('statusval', 'hide')
	// 	}
	// })

	// rpt.buildGridLevels(rows)

	// setTimeout(() => {
	// 	let newdata  = [], finddata
	// 	$('.table-header tr.bold').each((a, e) => {
	// 		finddata = _.find(rs.optionDimensionSelect(), (a) => { return a.field == $(e).attr('idheaderpl') })
	// 		if (finddata != undefined)
	// 			newdata.push(finddata)
	// 	})
	// 	newdata = _.sortBy(newdata, function(item) { return [item.name] })
	// 	rs.optionDimensionSelect(newdata)
	// })
}

bkd.optionBreakdownValues = ko.observableArray([])
bkd.breakdownValueAll = { _id: 'All', Name: 'All' }
bkd.changeBreakdown = () => {
	let all = bkd.breakdownValueAll
	let map = (arr) => arr.map((d) => {
		if ("customer.channelname" == bkd.breakdownBy()) {
			return d
		}
		if ("customer.keyaccount" == bkd.breakdownBy()) {
			return { _id: d._id, Name: d._id }
		}

		return { _id: d.Name, Name: d.Name }
	})
	setTimeout(() => {
		bkd.isBreakdownChannel(false)
		bkd.breakdownChannels([])
		bkd.breakdownChannelLocation([])

		switch (bkd.breakdownBy()) {
			case "customer.areaname":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
				bkd.breakdownValue([all._id])
			break;
			case "customer.region":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
				bkd.breakdownValue([all._id])
			break;
			case "customer.zone":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
				bkd.breakdownValue([all._id])
			break;
			case "product.brand":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
				bkd.breakdownValue([all._id])
			break;
			case "customer.branchname":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
				bkd.breakdownValue([all._id])
			break;
			case "customer.channelname":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
				bkd.breakdownValue([all._id])

				bkd.isBreakdownChannel(true)
				bkd.breakdownChannels([])
			break;
			case "customer.keyaccount":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
				bkd.breakdownValue([all._id])
			break;
		}
	}, 100)
}
bkd.changeBreakdownValue = () => {
	let all = bkd.breakdownValueAll
	setTimeout(() => {
		let condA1 = bkd.breakdownValue().length == 2
		let condA2 = bkd.breakdownValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			bkd.breakdownValue.remove(all._id)
			return
		}

		let condB1 = bkd.breakdownValue().length > 1
		let condB2 = bkd.breakdownValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			bkd.breakdownValue([all._id])
			return
		}

		let condC1 = bkd.breakdownValue().length == 0
		if (condC1) {
			bkd.breakdownValue([all._id])
		}
	}, 100)
}



viewModel.scatter = new Object()
let rs = viewModel.scatter
let dataPoints = [
	{field: "value1", name: "value1", aggr: "sum"}
]

rs.contentIsLoading = ko.observable(false)
rs.title = ko.observable('P&L Analytic')
rs.breakdownBy = ko.observable('customer.channelname')
rs.breakdownTimeBy = ko.observable('')
rs.selectedPNLNetSales = ko.observable("PL8A") // PL1
rs.selectedPNL = ko.observable("PL44B")
rs.chartComparisonNote = ko.observable('')
rs.optionDimensionSelect = ko.observableArray([])
rs.optionTimeBreakdowns = ko.observableArray([
	{ field: 'date.fiscal', name: 'Fiscal Year' },
	{ field: 'date.quartertxt', name: 'Quarter' },
	{ field: 'date.month', name: 'Month' },
])
rs.fiscalYear = ko.observable(rpt.value.FiscalYear())
rs.columnWidth = ko.observable(130)
rs.breakdownTimeValue = ko.observableArray([])
rs.optionTimeSubBreakdowns = ko.computed(() => {
	switch (rs.breakdownTimeBy()) {
		case 'date.fiscal': 
			return rpt.optionFiscalYears().slice(0).map((d) => {
				return { field: d, name: d }
			})
		break;
		case 'date.quartertxt': 
			return ['Q1', 'Q2', 'Q3', 'Q4'].map((d) => {
				return { field: d, name: d }
			})
		break;
		case 'date.month': 
			return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => {
				return { field: d, name: moment(new Date(2015, d, 0)).format('MMMM') }
			})
		break;
		default: return []; break;
	}
}, rs.breakdownTimeBy)
rs.changeBreakdownTimeBy = () => {
	rs.breakdownTimeValue([])
}

rs.getSalesHeaderList = () => {
	app.ajaxPost("/report/getplmodel", {}, (res) => {
		let data = res.map((d) => app.o({ field: d._id, name: d.PLHeader3 }))
			.filter((d) => d.PLHeader3 !== rs.selectedPNLNetSales())
		data = _.sortBy(data, function(item) {
					return [item.name]
				})
		rs.optionDimensionSelect(data)

		let prev = rs.selectedPNL()
		rs.selectedPNL('')
		setTimeout(() => {
			rs.selectedPNL(prev)
			rs.refresh(false)
		}, 300)
	})
}

rs.refresh = (useCache = false) => {
	rs.contentIsLoading(true)

	let groups = [rs.breakdownBy()]
	if (rs.breakdownTimeBy() != '') {
		groups.push(rs.breakdownTimeBy())
	}

	let param = {}
	param.pls = [rs.selectedPNL(), rs.selectedPNLNetSales()]
	param.groups = rpt.parseGroups(groups)
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, rs.fiscalYear)

	if (rs.breakdownTimeBy() == 'date.fiscal') {
		let fiscal = param.filters.find((d) => d.Field == rs.breakdownTimeBy())
		fiscal.Op = "$in"
		fiscal.Value = []

		if (rs.breakdownTimeValue().length > 0) {
			fiscal.Value = rs.breakdownTimeValue()
		} else {
			fiscal.Value = rpt.optionFiscalYears()
		}
	}

	let fetch = () => {
		app.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			rs.chartComparisonNote(`Last refreshed on: ${date}`)

			rs.contentIsLoading(false)

			let scatterViewWrapper = $('.scatter-view-wrapper').empty()
			let width = 0
			let raw = res.Data.Data

			if ((['date.fiscal', ''].indexOf(rs.breakdownTimeBy()) == -1) && rs.breakdownTimeValue().length > 0) {
				let field = `_id_${toolkit.replace(rs.breakdownTimeBy(), '.', '_')}`
				raw = raw.filter((d) => {
					for (let i = 0; i < rs.breakdownTimeValue().length; i++) {
						let each = rs.breakdownTimeValue()[i]

						switch (rs.breakdownTimeBy()) {
							case 'date.fiscal':
								if (each == d._id[field]) {
									return true
								}
							break;
							case 'date.quartertxt':
								if (d._id[field].indexOf(each) > -1) {
									return true
								}
							break;
							case 'date.month': 
								if (each == d._id[field]) {
									return true
								}
							break;
						}
					}

					return false
				})
			}

			if (rs.breakdownTimeBy() != '') {
				let op1 = _.groupBy(raw, (d) => d._id[`_id_${app.idAble(rs.breakdownBy())}`])
				_.map(op1, (v, k) => { 
					let eachWidth = rs.generateReport(k, v)
					width += eachWidth
				})
			} else {
				width = rs.generateReport('', raw)

				if (width < scatterViewWrapper.parent().width()) {
					width = '100%'
					scatterViewWrapper.find('.scatter-view').width(width)

					setTimeout(() => {
						scatterViewWrapper.find('.scatter-view').data('kendoChart').redraw()
					}, 100)
				}
			}

		    scatterViewWrapper
		    	.width(width)
				.append('<div class="clearfix" style="clear: both;"></div>')
		}, () => {
			rs.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'pivot chart' : false
		})
	}

	fetch()
}

rs.generateReport = (title, raw) => {
	let breakdown = rs.breakdownTimeBy() == '' ? rs.breakdownBy() : rs.breakdownTimeBy()

	let dataAllPNL = raw
		.filter((d) => d.hasOwnProperty(rs.selectedPNL()))
		.map((d) => { return { _id: d._id, value: d[rs.selectedPNL()] } })
	let dataAllPNLNetSales = raw
		.filter((d) => d.hasOwnProperty(rs.selectedPNLNetSales()))
		.map((d) => { return { _id: d._id, value: d[rs.selectedPNLNetSales()] } })

	var sumNetSales = _.reduce(dataAllPNLNetSales, (m, x) => m + x.value, 0);
	let sumPNL = _.reduce(dataAllPNL, (m, x) => m + x.value, 0)
	let countPNL = dataAllPNL.length
	let avgPNL = sumPNL

	let data = []
	let multiplier = (sumNetSales == 0 ? 1 : sumNetSales)

	dataAllPNL.forEach((d, i) => {
		let category = d._id[`_id_${app.idAble(breakdown)}`]
		let order = category

		if (breakdown == 'date.month') {
			category = moment(new Date(2015, category - 1, 1)).format('MMMM')
		}

		data.push({
			valueNetSales: dataAllPNLNetSales[i].value,
			category: category,
			order: order,
			valuePNL: Math.abs(d.value),
			valuePNLPercentage: Math.abs(d.value / dataAllPNLNetSales[i].value * 100),
			avgPNL: Math.abs(avgPNL),
			avgPNLPercentage: Math.abs(avgPNL / multiplier * 100),
		})
	})

	if (breakdown == 'date.month') {
		data = _.orderBy(data, (d) => parseInt(d.order, 10), 'asc')
	} else {
		data = _.orderBy(data, (d) => d.valuePNLPercentage, 'desc')
	}

	let max = _.max(_.map(data, (d) => d.avgNetSalesPercentage)
		.concat(_.map(data, (d) => d.valuePNLPercentage)))

	let netSalesTitle = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNLNetSales()).name
	let breakdownTitle = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNL()).name

	let scatterViewWrapper = $('.scatter-view-wrapper')
	let scatterView = $('<div class="scatter-view"></div>')
		.height(350)
		.css('float', 'left')
		.appendTo(scatterViewWrapper)

	console.log('----', data)

	let config = {
		dataSource: { data: data },
        // title: title,
        legend: {
            visible: true,
            position: "bottom"
        },
        seriesDefaults: {
            type: "line",
            missingValues: "gap",
        },
		seriesColors: ['#3498DB', "#678900"],
		series: [{
			name: `Average ${breakdownTitle} to ${netSalesTitle}`,
			field: 'avgPNLPercentage',
			width: 3,
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			tooltip: {
				visible: true,
				template: `Average ${breakdownTitle} to ${netSalesTitle}: #: kendo.toString(dataItem.avgPNLPercentage, 'n2') # % (#: kendo.toString(dataItem.avgPNL, 'n2') #)`
			},
			markers: { visible: false }
		}, {
			type: 'column',
			name: `${breakdownTitle} to ${netSalesTitle}`,
			field: "valuePNLPercentage",
			overlay: {
				gradient: 'none'
			},
			border: { width: 0 },
			tooltip: {
				visible: true,
				template: `${breakdownTitle} #: dataItem.category # to ${netSalesTitle}: #: kendo.toString(dataItem.valuePNLPercentage, 'n2') # % (#: kendo.toString(dataItem.valuePNL, 'n2') #)`
			},
			labels: {
				font: '"Source Sans Pro" 11px',
				visible: true,
				position: 'outsideEnd',
				template: (d) => {
					return `${breakdownTitle} ${d.category}\n${kendo.toString(d.value, 'n2')} %`
				}
			},
		}],
        valueAxis: {
			majorGridLines: { color: '#fafafa' },
            label: { format: "{0}%" },
            axisCrossingValue: [0, -10],
        	max: (max + 20),
        },
        categoryAxis: [{
            field: 'category',
            labels: {
				font: '"Source Sans Pro" 11px',
            },
			majorGridLines: { color: '#fafafa' }
		}],
    }

    if (rs.breakdownTimeBy() != '') {
    	config.categoryAxis.push({
			categories: [title],
            labels: {
				font: '"Source Sans Pro" 18px bold',
            },
		})
    }

	let width = (data.length * rs.columnWidth())
	if (width < 300) width = 300
	scatterView.width(width).kendoChart(config)
	return width
}


viewModel.chartCompare = {}
let ccr = viewModel.chartCompare

ccr.data = ko.observableArray([])
ccr.dataComparison = ko.observableArray([])
ccr.title = ko.observable('Chart Comparison')
ccr.contentIsLoading = ko.observable(false)
ccr.categoryAxisField = ko.observable('category')
ccr.breakdownBy = ko.observable('')
ccr.limitchart = ko.observable(6)
ccr.optionComparison = ko.observableArray([
	{ field: 'outlet', name: 'Outlet' },
	{ field: 'price', name: 'Price' },
	{ field: 'qty', name: 'Quantity' },
])
ccr.comparison = ko.observableArray(['price', 'qty'])
ccr.fiscalYear = ko.observable(rpt.value.FiscalYear())
ccr.order = ko.observable(ccr.optionComparison()[2].field)

ccr.getDecreasedQty = (useCache = false) => {
	let param = {}
	param.filters = rpt.getFilterValue(false, ccr.fiscalYear)
	param.groups = ["skuid", "date.quartertxt"]

	let fetch = () => {
		toolkit.ajaxPost(`/report/GetDecreasedQty`, param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			ccr.contentIsLoading(false)
			ccr.dataComparison(res.Data.Data)
			ccr.plot()
		}, () => {
			ccr.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'chart comparison' : false
		})
	}

	ccr.contentIsLoading(true)
	fetch()
}
ccr.refresh = () => {
	// if (ccr.dataComparison().length > 0) {
	// 	ccr.plot()
	// } else {
		ccr.getDecreasedQty()
	// }
}
ccr.plot = () => {
	let orderedData = _.orderBy(ccr.dataComparison(), (d) => {
		if (ccr.order() == 'outlet') {
			return d.outletList
		}

		return d[ccr.order()]
	}, 'desc')
	ccr.dataComparison(orderedData)

	// ccr.dataComparison(ccr.dummyJson)
	let tempdata = []
	// let qty = 0
	// let price = 0
	let outlet = 0, maxline = 0, maxprice = 0, maxqty = 0, quarter = []
	for (var i in ccr.dataComparison()){
		if (ccr.dataComparison()[i].productName != undefined){
			// qty = _.filter(ccr.dataComparison()[i].qty, function(resqty){ return resqty == 0}).length
			// price = _.filter(ccr.dataComparison()[i].price, function(resprice){ return resprice == 0}).length
			maxprice = _.max(ccr.dataComparison()[i].price)
			maxqty = _.max(ccr.dataComparison()[i].qty)
			outlet = _.max(ccr.dataComparison()[i].outletList)
			// if (maxprice > maxqty)
			// 	maxline = maxprice
			// else
			// 	maxline = maxqty
			quarter = []
			for (var a in ccr.dataComparison()[i].qty){
				quarter.push(`Quarter ${parseInt(a)+1}`)
			}
			tempdata.push({
				qty: ccr.dataComparison()[i].qtyCount,
				price: ccr.dataComparison()[i].priceCount,
				quarter: quarter,
				maxoutlet: outlet + (outlet/2),
				maxprice: maxprice + (maxprice/4),
				maxqty: maxqty + (maxqty/4),
				productName: ccr.dataComparison()[i].productName,
				data: ccr.dataComparison()[i]
			})
		}
	}
	// let sortPriceQty = _.take(_.sortBy(tempdata, function(item) {
	//    return [item.qty, item.price]
	// }).reverse(), ccr.limitchart())
	console.log("--------> TEMP DATA", tempdata)
	let sortPriceQty = _.take(tempdata, ccr.limitchart())
	ccr.data(sortPriceQty)
	ccr.render()
}
ccr.render = () => {
	let configure = (data, full) => {
		let seriesLibs = {
			price: { 
				name: 'Price', 
				// field: 'value1', 
				data: data.price, 
				width: 3, 
				markers: {
					visible: true,
					size: 10,
					border: {
						width: 3
					}
				},
				axis: "price",
				color: '#5499C7',
				labels: {
					visible: false,
					background: 'rgba(84,153,199,0.2)'
				}
			},
			qty: { 
				name: 'Qty', 
				// field: 'value2', 
				data: data.qty, 
				width: 3, 
				markers: {
					visible: true,
					size: 10,
					border: {
						width: 3
					}
				},
				axis: "qty",
				color: '#ff8d00',
				labels: {
					visible: false,
					background: 'rgba(255,141,0,0.2)'
				}
			},
			outlet: { 
				name: 'Outlet', 
				// field: 'value3', 
				data: data.outletList,
				type: 'column', 
				width: 3, 
				overlay: {
					gradient: 'none'
				},
				border: {
					width: 0
				},
				markers: {
					visible: true,
					style: 'smooth',
					type: 'column',
				},
				axis: "outlet",
				color: '#678900',
				labels: {
					visible: false,
					background: 'rgba(103,137,0,0.2)'
				}
			}
		}

		let series = []
		ccr.comparison().forEach((d) => {
			series.push(seriesLibs[d])
		})

		let valueAxes = []
		// , maxyo = 0, fieldmax = '', maxselect = 0
		// if (ccr.comparison().indexOf('qty') > -1 || ccr.comparison().indexOf('price') > -1) {
		// 	valueAxes.push({
		// 		name: "priceqty",
  //               title: { text: "Qty & Price" },
		// 		majorGridLines: {
		// 			color: '#fafafa'
		// 		},
		// 		max: full.maxline,
		// 	})
		// }
		// if (ccr.comparison().indexOf('outlet') > -1) {
		// 	valueAxes.push({
		// 		name: "outlet",
  //               title: { text: "Outlet" },
  //               majorGridLines: {
		// 			color: '#fafafa'
		// 		},
		// 		max: full.maxoutlet,
		// 	})
		// }
		// if (ccr.comparison().length > 1) {
		// 	if (ccr.comparison()[0] > ccr.comparison()[1]){
		// 		maxyo = full["max"+ccr.comparison()[0]]
		// 		fieldmax = ccr.comparison()[0]
		// 	} else {
		// 		maxyo = full["max"+ccr.comparison()[1]]
		// 		fieldmax = ccr.comparison()[1]
		// 	}
		// } else if (ccr.comparison() > 0) {
		// 	maxyo = full["max"+ccr.comparison()[0]]
		// 	fieldmax = ccr.comparison()[0]
		// }
		// maxyo += maxyo / 4
		for (let e in ccr.comparison()){
			valueAxes.push({
				name: ccr.comparison()[e],
                title: { text: ccr.comparison()[e].charAt(0).toUpperCase() + ccr.comparison()[e].slice(1) },
                majorGridLines: {
					color: '#fafafa'
				},
				max: full["max"+ccr.comparison()[e]],
			})
		}

		return {
			// dataSource: {
			// 	data: data
			// },
			series: series,
			seriesDefaults: {
	            type: "line",
	            style: "smooth",
				labels: {
					font: '"Source Sans Pro" 11px',
					visible: true,
					position: 'top',
					template: (d) => {
						return `${d.series.name}: ${kendo.toString(d.value, 'n0')}`
					}
				}
			},
			categoryAxis: {
				baseUnit: "month",
				// field: ccr.categoryAxisField(),
				categories: full.quarter,
				majorGridLines: {
					color: '#fafafa'
				},
				axisCrossingValue: [0, 8],
				labels: {
					font: '"Source Sans Pro" 11px',
					rotation: 40
					// template: (d) => `${toolkit.capitalize(d.value).slice(0, 3)}`
				}
			},
			legend: {
				position: 'bottom'
			},
			valueAxes: valueAxes,
			tooltip: {
				visible: true,
				template: (d) => `${d.series.name} on : ${kendo.toString(d.value, 'n0')}`
			}
		}
	}

	let chartContainer = $('.chart-comparison')
	chartContainer.empty()
	for (var e in ccr.data()){
		let html = $($('#template-chart-comparison').html())
		let config = configure(ccr.data()[e].data, ccr.data()[e])

		html.appendTo(chartContainer)
		html.find('.title').html(ccr.data()[e].data.productName)
		html.find('.chart').kendoChart(config)
	}
	chartContainer.append($('<div />').addClass('clearfix'))
}

rpt.toggleFilterCallback = () => {
	$('.chart-comparison .k-chart').each((i, e) => {
		$(e).data('kendoChart').redraw()
	})
}

vm.currentMenu('Analysis')
vm.currentTitle('P&L Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'PNL Analysis', href: '/web/report/dashboard' }
])

bkd.title('P&L Analysis')
rs.title('P&L Comparison to Net Sales')
ccr.title('Quantity, Price & Outlet')

rpt.refresh = () => {
	rpt.tabbedContent()
	rpt.refreshView('analysis')

	rs.getSalesHeaderList()

	bkd.changeBreakdown()
	setTimeout(() => {
		bkd.breakdownValue(['All'])
		bkd.refresh(false)
	}, 200)

	rpt.prepareEvents()

	ccr.getDecreasedQty(false)
}

$(() => {
	rpt.refresh()
})
