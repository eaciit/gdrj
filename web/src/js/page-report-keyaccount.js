viewModel.breakdown = new Object()
let kac = viewModel.breakdown

kac.contentIsLoading = ko.observable(false)
kac.popupIsLoading = ko.observable(false)
kac.title = ko.observable('Key Account Analysis')
kac.detail = ko.observableArray([])
kac.limit = ko.observable(10)
kac.breakdownNote = ko.observable('')

kac.breakdownBy = ko.observable('customer.customergroupname')
kac.breakdownByFiscalYear = ko.observable('date.fiscal')
kac.oldBreakdownBy = ko.observable(kac.breakdownBy())

kac.data = ko.observableArray([])
kac.plmodels = ko.observableArray([])
kac.zeroValue = ko.observable(false)
kac.fiscalYear = ko.observable(rpt.value.FiscalYear())
kac.breakdownValue = ko.observableArray([])

kac.refresh = (useCache = false) => {
	if (kac.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value')
		return
	}

	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([kac.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, kac.fiscalYear)
	param.filters.push({
		Field: 'customer.keyaccount',
		Op: '$eq',
		Value: 'KEY'
	})

	let breakdownValue = kac.breakdownValue().filter((d) => d != 'All')
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: kac.breakdownBy(),
			Op: '$in',
			Value: kac.breakdownValue()
		})
	}
	console.log("bdk", param.filters)
	
	kac.oldBreakdownBy(kac.breakdownBy())
	kac.contentIsLoading(true)

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			kac.breakdownNote(`Last refreshed on: ${date}`)

			kac.data(res.Data.Data)
			kac.plmodels(res.Data.PLModels)
			kac.emptyGrid()
			kac.contentIsLoading(false)
			kac.render()
		}, () => {
			kac.emptyGrid()
			kac.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'breakdown chart' : false
		})
	}

	fetch()
}

kac.clickExpand = (e) => {
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
kac.emptyGrid = () => {
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
}

kac.renderDetailSalesTrans = (breakdown) => {
	kac.popupIsLoading(true)
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
			    	param[kac.breakdownBy()] = [breakdown]

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
							kac.popupIsLoading(false)
							setTimeout(() => {
								options.success(res.data)
							}, 200)
		                },
		                error: () => {
							kac.popupIsLoading(false)
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
kac.renderDetail = (plcode, breakdowns) => {
	kac.popupIsLoading(true)
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
							kac.popupIsLoading(false)
							setTimeout(() => {
								console.log("++++", res)
								options.success(res.Data)
							}, 200)
		                },
		                error: () => {
							kac.popupIsLoading(false)
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


kac.arrChangeParent = ko.observableArray([
	{ idfrom: 'PL6A', idto: '', after: 'PL0'},
	{ idfrom: 'PL1', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL2', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL3', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL4', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL5', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL6', idto: 'PL8A', after: 'PL8A'}
])

kac.changeParent = (elemheader, elemcontent, PLCode) => {
	let change = _.find(kac.arrChangeParent(), (a) => {
		return a.idfrom == PLCode
	})
	if (change != undefined){
		if (change.idto != ''){
			elemheader.attr('idparent', change.idto)
			elemcontent.attr('idcontparent', change.idto)
		} else {
			elemheader.removeAttr('idparent')
			elemheader.find('td:eq(0)').css('padding-left','8px')
			elemcontent.removeAttr('idcontparent')
		}
		return change.after
	} else {
		return ""
	}
}

kac.idarrayhide = ko.observableArray(['PL44A'])
kac.render = () => {
	if (kac.data().length == 0) {
		$('.breakdown-view').html('No data found.')
		return
	}
	
	let breakdowns = [kac.breakdownBy() /** , 'date.year' */]
	let rows = []
	
	let data = _.map(kac.data(), (d) => {
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
	
	let plmodels = _.sortBy(kac.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = [
		"PL94C" /* "Operating Income" */, 
		"PL39B" /* "Earning Before Tax" */, 
		"PL41C" /* "Earning After Tax" */,
	]
	let netSalesPLCode = 'PL8A'
	let netSalesPlModel = kac.plmodels().find((d) => d._id == netSalesPLCode)
	let netSalesRow = {}
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

	if (kac.breakdownBy() == "customer.branchname") {
		colWidth = 200
	}

	if (kac.breakdownBy() == "customer.region") {
		colWidth = 230
	}

	let grouppl1 = _.map(_.groupBy(kac.plmodels(), (d) => {return d.PLHeader1}), (k , v) => { return { data: k, key:v}})
	let grouppl2 = _.map(_.groupBy(kac.plmodels(), (d) => {return d.PLHeader2}), (k , v) => { return { data: k, key:v}})
	let grouppl3 = _.map(_.groupBy(kac.plmodels(), (d) => {return d.PLHeader3}), (k , v) => { return { data: k, key:v}})
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
			kac.clickExpand(trHeader)
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
				kac.renderDetail(d.PLCode, e.breakdowns)
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

			let idplyo = _.find(kac.idarrayhide(), (a) => { return a == $trElem.attr("idheaderpl") })
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
					let PLCodeChange = kac.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
					if (PLCodeChange != "")
						PLyo.PLCode = PLCodeChange
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
						let PLCodeChange = kac.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
						if (PLCodeChange != "")
							PLyo.PLCode = PLCodeChange
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

			let idplyo2 = _.find(kac.idarrayhide(), (a) => { return a == $trElem.attr("idparent") })
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

	kac.showZeroValue(false)
	$(".pivot-pnl .table-header tr:not([idparent]):not([idcontparent])").addClass('bold')
}

kac.prepareEvents = () => {
	$('.breakdown-view').parent().on('mouseover', 'tr', function () {
		let index = $(this).index()
        let elh = $(`.breakdown-view .table-header tr:eq(${index})`).addClass('hover')
        let elc = $(`.breakdown-view .table-content tr:eq(${index})`).addClass('hover')
	})
	$('.breakdown-view').parent().on('mouseleave', 'tr', function () {
		$('.breakdown-view tr.hover').removeClass('hover')
	})
}

kac.showExpandAll = (a) => {
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

kac.showZeroValue = (a) => {
	kac.zeroValue(a)
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
	kac.showExpandAll(false)
	if (a == false) {
		let countchild = 0, hidechild = 0
		$(".table-header tbody>tr.dd").each(function( i ) {
			if (i > 0){
				countchild = $(`.table-header tr[idparent=${$(this).attr('idheaderpl')}]`).length
				hidechild = $(`.table-header tr[idparent=${$(this).attr('idheaderpl')}][statusvaltemp=hide]`).length
				if (countchild > 0) {
					if (countchild == hidechild){
						$(this).find('td:eq(0)>i').removeClass().css('margin-right', '0px')
						if ($(this).attr('idparent') == undefined)
							$(this).find('td:eq(0)').css('padding-left', '20px')
					}
				}
			}
		})
	}
}

kac.optionBreakdownValues = ko.observableArray([])
kac.breakdownValueAll = { _id: 'All', Name: 'All' }
kac.changeBreakdown = () => {
	let all = kac.breakdownValueAll
	setTimeout(() => {
		kac.optionBreakdownValues([all].concat(
			rpt.masterData.CustomerGroup().map((d) => { 
				return { _id: d.Name, Name: d.Name } })
			)
		)
		kac.breakdownValue([all._id])
	}, 100)
}
kac.changeBreakdownValue = () => {
	let all = kac.breakdownValueAll
	setTimeout(() => {
		let condA1 = kac.breakdownValue().length == 2
		let condA2 = kac.breakdownValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			kac.breakdownValue.remove(all._id)
			return
		}

		let condB1 = kac.breakdownValue().length > 1
		let condB2 = kac.breakdownValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			kac.breakdownValue([all._id])
			return
		}

		let condC1 = kac.breakdownValue().length == 0
		if (condC1) {
			kac.breakdownValue([all._id])
		}
	}, 100)
}

vm.currentMenu('Key Account Analysis')
vm.currentTitle('Key Account Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Key Account Analysis', href: '/web/report/dashboard' }
])

kac.title('Key Account Analysis')

rpt.refresh = () => {
	kac.changeBreakdown()
	setTimeout(() => {
		kac.breakdownValue(['All'])
		kac.refresh(false)
	}, 200)

	kac.prepareEvents()
}

$(() => {
	rpt.refresh()
})
