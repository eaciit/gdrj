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
bkd.plmodels = ko.observableArray([])
bkd.zeroValue = ko.observable(false)
bkd.fiscalYear = ko.observable(rpt.value.FiscalYear())
bkd.breakdownValue = ko.observableArray([])

bkd.generateDataForX = () => {
	let param = {
	    "pls": [],
	    "groups": ["customer.channelname", "customer.branchname", "product.brand", "customer.region", "date.year", "date.fiscal"],
	    "aggr": "sum",
	    "filters": [{
	        "Field": "date.year",
	        "Op": "$gte",
	        "Value": "2013-12-31T17:00:00.000Z"
	    }, {
	        "Field": "date.year",
	        "Op": "$lte",
	        "Value": "2016-12-30T17:00:00.000Z"
	    }]
	}

	toolkit.ajaxPost("/report/getpnldatanew", param)
}

bkd.refresh = (useCache = false) => {
	if (bkd.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value')
		return
	}

	let param = {}
	param.pls = []
	param.groups = [bkd.breakdownBy() /** , 'date.year' */]
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
	console.log("bdk", param.filters)
	
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

bkd.clickExpand = (e) => {
	let right = $(e).find('i.fa-chevron-right').length
	let down = $(e).find('i.fa-chevron-down').length
	if (right > 0){
		$(e).find('i').removeClass('fa-chevron-right')
		$(e).find('i').addClass('fa-chevron-down')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
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

bkd.idarrayhide = ko.observableArray(['PL44A'])
bkd.render = () => {
	if (bkd.data().length == 0) {
		$('.breakdown-view').html('No data found.')
		return
	}
	
	let breakdowns = [bkd.breakdownBy() /** , 'date.year' */]
	let rows = []
	
	let data = _.map(bkd.data(), (d) => {
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
	
	let plmodels = _.sortBy(bkd.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = [
		"PL94C" /* "Operating Income" */, 
		"PL39B" /* "Earning Before Tax" */, 
		"PL41C" /* "Earning After Tax" */,
	]
	let netSalesPLCode = 'PL8A'
	let netSalesPlModel = bkd.plmodels().find((d) => d._id == netSalesPLCode)
	let netSalesRow = {}
	data.forEach((e) => {
		let breakdown = e._id
		let value = e[`${netSalesPlModel._id}`]; 
		value = toolkit.number(value)
		netSalesRow[breakdown] = value
	})
	data = _.orderBy(data, (d) => netSalesRow[d._id], 'desc')

	plmodels.forEach((d) => {
		let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0 }
		data.forEach((e) => {
			let breakdown = e._id
			let value = e[`${d._id}`]; 
			value = toolkit.number(value)
			row[breakdown] = value
			row.PNLTotal += value
		})
		data.forEach((e) => {
			let breakdown = e._id
			let percentage = e[`${d._id}`] / row.PNLTotal * 100; 
			percentage = toolkit.number(percentage)

			if (d._id != netSalesPLCode) {
				percentage = row[breakdown] / netSalesRow[breakdown] * 100
			}

			row[`${breakdown} %`] = percentage
		})

		if (exceptions.indexOf(row.PLCode) > -1) {
			return
		}

		rows.push(row)
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

	let trContent1 = toolkit.newEl('tr')
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
				bkd.renderDetail(d.PLCode, e.breakdowns)
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

	let $trElem, $columnElem
	let resg1, resg2, resg3, PLyo, PLyo2, child = 0, parenttr = 0, textPL
	$(".table-header tbody>tr").each(function( i ) {
		if (i > 0){
			$trElem = $(this)
			resg1 = _.find(grouppl1, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg2 = _.find(grouppl2, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg3 = _.find(grouppl3, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })

			let idplyo = _.find(bkd.idarrayhide(), (a) => { return a == $trElem.attr("idheaderpl") })
			if (idplyo != undefined){
				$trElem.remove()
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).remove()
			}
			if (resg1 == undefined && idplyo2 == undefined){
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

			let idplyo2 = _.find(bkd.idarrayhide(), (a) => { return a == $trElem.attr("idparent") })
			if (idplyo2 != undefined){
				$trElem.removeAttr('idparent')
				$trElem.addClass('bold')
				$trElem.css('display','inline-grid')
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).removeAttr("idcontparent")
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusval', 'show')
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusvaltemp', 'show')
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).css('display','inline-grid')
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
			$(`tr[idparent=${$trElem.attr('idheaderpl')}]`).each((a,e) => {
				if ($(e).attr('statusval') == 'show'){
					$(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
					$(`tr[idpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
					if ($(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('idparent') == undefined) {
						$(`tr[idpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
						$(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
					}
				}
			})
		} else {
			countChild = $trElem.attr('idparent')
			if (countChild == '' || countChild == undefined)
				$trElem.find(`td:eq(0)`).css('padding-left', '20px')
		}
	})

	bkd.showZeroValue(false)
	$(".pivot-pnl .table-header tr:not([idparent]):not([idcontparent])").addClass('bold')
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

bkd.showExpandAll = (a) => {
	if (a == true) {
		$(`tr.dd`).find('i').removeClass('fa-chevron-right')
		$(`tr.dd`).find('i').addClass('fa-chevron-down')
		$(`tr[idparent]`).css('display', '')
		$(`tr[idcontparent]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
	} else {
		$(`tr.dd`).find('i').removeClass('fa-chevron-down')
		$(`tr.dd`).find('i').addClass('fa-chevron-right')
		$(`tr[idparent]`).css('display', 'none')
		$(`tr[idcontparent]`).css('display', 'none')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
	}
}

bkd.showZeroValue = (a) => {
	bkd.zeroValue(a)
	if (a == true) {
		$(".table-header tbody>tr").each(function( i ) {
			if (i > 0){
				$(this).attr('statusvaltemp', 'show')
				$(`tr[idpl=${$(this).attr('idheaderpl')}]`).attr('statusvaltemp', 'show')
				if (!$(this).attr('idparent')){
					$(this).show()
					$(`tr[idpl=${$(this).attr('idheaderpl')}]`).show()
				}
			}
		})
	} else {
		$(".table-header tbody>tr").each(function( i ) {
			if (i > 0){
				$(this).attr('statusvaltemp', $(this).attr('statusval'))
				$(`tr[idpl=${$(this).attr('idheaderpl')}]`).attr('statusvaltemp', $(this).attr('statusval'))
			}
		})
	}

	bkd.showExpandAll(false)
}

bkd.optionBreakdownValues = ko.observableArray([])
bkd.breakdownValueAll = { _id: 'All', Name: 'All' }
bkd.changeBreakdown = () => {
	let all = bkd.breakdownValueAll
	let map = (arr) => arr.map((d) => {
		if (bkd.breakdownBy() == "customer.channelname") {
			return d
		}

		return { _id: d.Name, Name: d.Name }
	})
	setTimeout(() => {
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
rs.selectedPNLNetSales = ko.observable("PL8A") // PL1
rs.selectedPNL = ko.observable("PL44B")
rs.chartComparisonNote = ko.observable('')
rs.optionDimensionSelect = ko.observableArray([])
rs.fiscalYear = ko.observable(rpt.value.FiscalYear())

rs.getSalesHeaderList = () => {
	app.ajaxPost("/report/getplmodel", {}, (res) => {
		let data = res.map((d) => app.o({ field: d._id, name: d.PLHeader3 }))
			.filter((d) => d.PLHeader3 !== rs.selectedPNLNetSales())
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

	let param = {}
	param.pls = [rs.selectedPNL(), rs.selectedPNLNetSales()]
	param.groups = [rs.breakdownBy() /** , 'date.year' */]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, rs.fiscalYear)

	let fetch = () => {
		app.ajaxPost("/report/getpnldatanew", param, (res1) => {
			if (res1.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			let date = moment(res1.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			rs.chartComparisonNote(`Last refreshed on: ${date}`)

			let dataAllPNL = res1.Data.Data
				.filter((d) => d.hasOwnProperty(rs.selectedPNL()))
				.map((d) => { return { _id: d._id, value: d[rs.selectedPNL()] } })
			let dataAllPNLNetSales = res1.Data.Data
				.filter((d) => d.hasOwnProperty(rs.selectedPNLNetSales()))
				.map((d) => { return { _id: d._id, value: d[rs.selectedPNLNetSales()] } })

			let years = _.map(_.groupBy(dataAllPNL, (d) => d._id._id_date_year), (v, k) => k)

			var sumNetSales = _.reduce(dataAllPNLNetSales, (m, x) => m + x.value, 0);
			let sumPNL = _.reduce(dataAllPNL, (m, x) => m + x.value, 0)
			let countPNL = dataAllPNL.length
			let avgPNL = sumPNL / countPNL

			let dataScatter = []
			let multiplier = (sumNetSales == 0 ? 1 : sumNetSales)

			dataAllPNL.forEach((d, i) => {
				dataScatter.push({
					valueNetSales: dataAllPNLNetSales[i].value,
					// category: app.nbspAble(`${d._id["_id_" + app.idAble(rs.breakdownBy())]} ${d._id._id_date_year}`, ''),
					category: d._id[`_id_${app.idAble(rs.breakdownBy())}`],
					year: d._id._id_date_year,
					valuePNL: Math.abs(d.value),
					valuePNLPercentage: Math.abs(d.value / dataAllPNLNetSales[i].value * 100),
					avgPNL: Math.abs(avgPNL),
					avgPNLPercentage: Math.abs(avgPNL / multiplier * 100),
					sumPNL: Math.abs(sumPNL),
					sumPNLPercentage: Math.abs(sumPNL / multiplier * 100)
				})
			})

			console.log("dataScatter", dataScatter)
			console.log("dataAllPNL", dataAllPNL)

			rs.contentIsLoading(false)
			rs.generateReport(dataScatter, years)
		}, () => {
			rs.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'pivot chart' : false
		})
	}

	fetch()
}

rs.generateReport = (data, years) => {
	data = _.orderBy(data, (d) => d.valueNetSales, 'desc')

	let max = _.max(_.map(data, (d) => d.avgNetSalesPercentage)
		.concat(_.map(data, (d) => d.valuePNLPercentage)))

	let netSalesTitle = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNLNetSales()).name
	let breakdownTitle = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNL()).name

	$('#scatter-view').replaceWith('<div id="scatter-view" style="height: 350px;"></div>')
	if ((data.length * 100) > $('#scatter-view').parent().width())
    	$('#scatter-view').width(data.length * 120)
    else
	    $('#scatter-view').css('width', '100%')
	$("#scatter-view").kendoChart({
		dataSource: {
            data: data
        },
        title: {
            text: ""
        },
        legend: {
            visible: true,
            position: "bottom"
        },
        seriesDefaults: {
            type: "line",
            missingValues: "gap",
        },
		seriesColors: ['#3498DB', "#ff8d00", "#678900"],
		series: [{
			name: `Sum of ${breakdownTitle} to ${netSalesTitle}`,
			field: 'sumPNLPercentage',
			width: 3,
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			tooltip: {
				visible: true,
				template: `Sum of ${breakdownTitle} to ${netSalesTitle}: #: kendo.toString(dataItem.sumPNLPercentage, 'n2') # % (#: kendo.toString(dataItem.sumPNL, 'n2') #)`
			},
			markers: {
				visible: false
			}
		}, {
			name: `Average of ${breakdownTitle} to ${netSalesTitle}`,
			field: 'avgPNLPercentage',
			dashType: "dash",
			width: 3,
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			tooltip: {
				visible: true,
				template: `Average of ${breakdownTitle} to ${netSalesTitle}: #: kendo.toString(dataItem.avgPNLPercentage, 'n2') # % (#: kendo.toString(dataItem.avgPNL, 'n2') #)`
			},
			markers: {
				visible: false
			}
		}, 
		// {
		// 	name: `${breakdownTitle} to ${netSalesTitle}`,
		// 	field: "valuePNLPercentage",
		// 	width: 3,
		// 	opacity: 0,
		// 	markers: {
		// 		type: 'cross',
		// 		size: 12
		// 	},
		// 	tooltip: {
		// 		visible: true,
		// 		template: `${breakdownTitle} #: dataItem.category # to ${netSalesTitle}: #: kendo.toString(dataItem.valuePNLPercentage, 'n2') # % (#: kendo.toString(dataItem.valuePNL, 'n2') #)`
		// 	},
		// 	labels: {
		// 		visible: true,
		// 		position: 'top',
		// 		template: (d) => {
		// 			return `${breakdownTitle} ${d.category}\n${kendo.toString(d.value, 'n2')} %`
		// 		}
		// 	},
		// },
		{
			type: 'column',
			name: `${breakdownTitle} to ${netSalesTitle}`,
			field: "valuePNLPercentage",
			overlay: {
				gradient: 'none'
			},
			border: {
				width: 0
			},
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
			majorGridLines: {
				color: '#fafafa'
			},
            label: {
            	format: "{0}%"
            },
        },
        categoryAxis: [{
            field: 'category',
            labels: {
            	rotation: 20,
				font: '"Source Sans Pro" 11px',
            },
			majorGridLines: {
				color: '#fafafa'
			}
		}],
    })
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

vm.currentMenu('PNL Analysis')
vm.currentTitle('PNL Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Daashboard', href: '/web/report/dashboard' }
])

bkd.title('P&L Analysis')
rs.title('P&L Comparison to Net Sales')
ccr.title('Quantity, Price & Outlet')

rpt.refresh = () => {
	rpt.refreshView('analysis')

	rs.getSalesHeaderList()

	bkd.changeBreakdown()
	setTimeout(() => {
		bkd.breakdownValue(['All'])
		bkd.refresh(false)
	}, 200)

	bkd.prepareEvents()

	ccr.getDecreasedQty(false)
}

$(() => {
	rpt.refresh()
})
