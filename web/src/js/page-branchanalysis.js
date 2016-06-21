viewModel.breakdown = new Object()
let ba = viewModel.breakdown

ba.contentIsLoading = ko.observable(false)
ba.popupIsLoading = ko.observable(false)
ba.title = ko.observable('Branch Analysis')
ba.detail = ko.observableArray([])
ba.limit = ko.observable(10)
ba.breakdownNote = ko.observable('')

ba.breakdownBy = ko.observable('customer.branchname')
ba.breakdownByFiscalYear = ko.observable('date.fiscal')
ba.oldBreakdownBy = ko.observable(ba.breakdownBy())

ba.data = ko.observableArray([])
ba.plmodels = ko.observableArray([])
ba.zeroValue = ko.observable(false)
ba.fiscalYear = ko.observable(rpt.value.FiscalYear())
ba.breakdownValue = ko.observableArray([])
ba.breakdownRD = ko.observable("All")
ba.optionBranch = ko.observableArray([{
		id: "All",
		title: "All",
	}, {
		id: "OnlyRD",
		title: "Only RD Sales"
	}, {
		id: "NonRD",
		title: "Non RD Sales"
	}
]) //rpt.masterData.Channel()

ba.refresh = (useCache = false) => {
	let param = {}
	param.pls = []
	param.groups = [ba.breakdownBy(), 'customer.channelname' /** , 'date.year' */]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, ba.fiscalYear)

	let breakdownValue = ba.breakdownValue().filter((d) => d != 'All')
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: ba.breakdownBy(),
			Op: '$in',
			Value: ba.breakdownValue()
		})
	}
	console.log("bdk", param.filters)
	
	ba.oldBreakdownBy(ba.breakdownBy())
	ba.contentIsLoading(true)

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}
			ba.data(res.Data.Data)
			let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			ba.breakdownNote(`Last refreshed on: ${date}`)

			ba.plmodels(res.Data.PLModels)
			ba.emptyGrid()
			ba.contentIsLoading(false)
			ba.render()
		}, () => {
			ba.emptyGrid()
			ba.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'breakdown chart' : false
		})
	}

	fetch()
}

ba.clickExpand = (e) => {
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
ba.emptyGrid = () => {
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
}

ba.renderDetailSalesTrans = (breakdown) => {
	ba.popupIsLoading(true)
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
			    	param[ba.breakdownBy()] = [breakdown]

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
							ba.popupIsLoading(false)
							setTimeout(() => {
								options.success(res.data)
							}, 200)
		                },
		                error: () => {
							ba.popupIsLoading(false)
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
ba.renderDetail = (plcode, breakdowns) => {
	ba.popupIsLoading(true)
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
							ba.popupIsLoading(false)
							setTimeout(() => {
								console.log("++++", res)
								options.success(res.Data)
							}, 200)
		                },
		                error: () => {
							ba.popupIsLoading(false)
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

ba.idarrayhide = ko.observableArray(['PL44A'])
ba.render = () => {
	if (ba.data().length == 0) {
		$('.breakdown-view').html('No data found.')
		return
	}
	
	let breakdowns = [ba.breakdownBy(), "customer.channelname" /** , 'date.year' */]
	let rows = [], datayo = [], dataok = []

	let groupbyrd = _.groupBy(ba.data(), (a) => { return a._id._id_customer_branchname})
	$.each( groupbyrd, function( key, value ) {
		let sumdata = {}
		let sumdata2 = {}
		datayo = _.filter(value, (d) => { return d._id._id_customer_channelname == "RD" })
		if (datayo.length > 0) {
			for (var a in datayo) {
				$.each( datayo[a], function( keya, valuea ) {
					if (keya != "_id"){
						if (sumdata[keya] == undefined)
							sumdata[keya] = 0
						sumdata[keya] = sumdata[keya] + valuea
					}
				}) 
			}
		} else {
			$.each( value[0], function( keya, valuea ) {
				sumdata[keya] = 0
			})
		}

		datayo = _.filter(value, (d) => { return d._id._id_customer_channelname != "RD" })
		for (var a in datayo) {
			$.each( datayo[a], function( keya, valuea ) {
				if (keya != "_id"){
					if (sumdata2[keya] == undefined)
						sumdata2[keya] = 0
					sumdata2[keya] = sumdata2[keya] + valuea
				}
			}) 
		}

		let newstruct = {}
		// newstruct["_id"] = {}
		newstruct["_id_customer_branchname"] = key
		toolkit.forEach( sumdata, function( key2, value2 ) {
			newstruct[key2] = [value2, sumdata2[key2]]
		})
		dataok.push(newstruct)
	});
	let data = _.map(dataok, (d) => {
		d.breakdowns = {}
		let titleParts = []

		breakdowns.forEach((e) => {
			let title = d[`_id_${toolkit.replace(e, '.', '_')}`]
			title = toolkit.whenEmptyString(title, '')
			d.breakdowns[e] = title
			titleParts.push(title)
		})
		
		d._id = titleParts.join(' ')
		return d 
	})
	
	let plmodels = _.sortBy(ba.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = [
		"PL94C" , 
		"PL39B" , 
		"PL41C" ,
	]
	let netSalesPLCode = 'PL8A'
	let netSalesPlModel = ba.plmodels().find((d) => d._id == netSalesPLCode)
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
			let value1 = toolkit.number(value[0])
			let value2 = toolkit.number(value[1])
			row[breakdown+'1'] = value1
			row[breakdown+'2'] = value2
		})
		data.forEach((e) => {
			let breakdown = e._id
			let total = e[`${d._id}`][0] + e[`${d._id}`][1]; 
			total = toolkit.number(total)
			row[`${breakdown} total`] = total
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

	let trHeader2 = toolkit.newEl('tr')
		.appendTo(tableHeader)

	toolkit.newEl('th')
		.html('&nbsp;')
		.addClass('cell-percentage')
		.appendTo(trHeader1)

	toolkit.newEl('th')
		.html('Branch Analysis')
		.addClass('cell-percentage')
		.appendTo(trHeader2)

	let trContent1 = toolkit.newEl('tr')
		.appendTo(tableContent)

	let trContent2 = toolkit.newEl('tr')
		.appendTo(tableContent)

	let colWidth = 100
	let colPercentWidth = 100
	let totalWidth = 0
	let pnlTotalSum = 0

	if (ba.breakdownBy() == "customer.branchname") {
		colWidth = 200
	}

	if (ba.breakdownBy() == "customer.region") {
		colWidth = 230
	}

	let grouppl1 = _.map(_.groupBy(ba.plmodels(), (d) => {return d.PLHeader1}), (k , v) => { return { data: k, key:v}})
	let grouppl2 = _.map(_.groupBy(ba.plmodels(), (d) => {return d.PLHeader2}), (k , v) => { return { data: k, key:v}})
	let grouppl3 = _.map(_.groupBy(ba.plmodels(), (d) => {return d.PLHeader3}), (k , v) => { return { data: k, key:v}})
	data.forEach((d, i) => {
		if (d._id.length > 22)
			colWidth += 30
		let thheader = toolkit.newEl('th')
			.html(d._id)
			.attr('colspan', '3')
			.addClass('align-center cell-percentage')
			.appendTo(trContent1)
			.width(colWidth)

		let cell1 = toolkit.newEl('th')
			.html('Total')
			.addClass('align-right')
			.attr('statuscolumn', 'TotalRD')
			.appendTo(trContent2)
			.width(colPercentWidth)

		let cell2 = toolkit.newEl('th')
			.html('RD')
			.addClass('align-right')
			.attr('statuscolumn', 'RD')
			.appendTo(trContent2)
			.width(colPercentWidth)

		let cell3 = toolkit.newEl('th')
			.html('Non RD')
			.attr('statuscolumn', 'NonRD')
			.addClass('align-right cell-percentage')
			.appendTo(trContent2)
			.width(colPercentWidth)

		if (ba.breakdownRD() == "OnlyRD") {
			cell1.css('display','none')
			cell3.css('display','none')
			cell2.addClass('cell-percentage').width(colWidth)
			thheader.removeAttr("colspan")
			totalWidth += colWidth + colPercentWidth
		} else if (ba.breakdownRD() == "NonRD") {
			cell1.css('display','none')
			cell2.css('display','none')
			cell3.addClass('cell-percentage').width(colWidth)
			thheader.removeAttr("colspan")
			totalWidth += colWidth + colPercentWidth
		} else {
			totalWidth += colWidth + (colPercentWidth*3)
		}
	})
	// console.log('data ', data)

	tableContent.css('min-width', totalWidth)
	rows.forEach((d, i) => {
		pnlTotalSum += d.PNLTotal

		let PL = d.PLCode
		PL = PL.replace(/\s+/g, '')
		let trHeader = toolkit.newEl('tr')
			.addClass(`header${PL}`)
			.attr(`idheaderpl`, PL)
			.appendTo(tableHeader)

		trHeader.on('click', () => {
			ba.clickExpand(trHeader)
		})

		toolkit.newEl('td')
			.html('<i></i>' + d.PNL)
			.appendTo(trHeader)

		let trContent = toolkit.newEl('tr')
			.addClass(`column${PL}`)
			.attr(`idpl`, PL)
			.appendTo(tableContent)

		data.forEach((e, f) => {
			let key = e._id
			let value1 = kendo.toString(d[key+"1"], 'n0')
			let value2 = kendo.toString(d[key+"2"], 'n0')
			let total = kendo.toString(d[key+" total"], 'n0')

			if ($.trim(value1) == '') 
				value1 = 0
			if ($.trim(value2) == '') 
				value2 = 0
			if ($.trim(total) == '') 
				total = 0

			let cell1 = toolkit.newEl('td')
				.html(total)
				.addClass('align-right')
				.attr('statuscolumn', 'TotalRD')
				.appendTo(trContent)

			let cell2 = toolkit.newEl('td')
				.html(value1)
				.addClass('align-right')
				.attr('statuscolumn', 'RD')
				.appendTo(trContent)

			let cell3 = toolkit.newEl('td')
				.html(value2)
				.addClass('align-right cell-percentage')
				.attr('statuscolumn', 'NonRD')
				.appendTo(trContent)

			if (ba.breakdownRD() == "OnlyRD") {
				cell1.css('display','none')
				cell3.css('display','none')
				cell2.addClass('cell-percentage')
			} else if (ba.breakdownRD() == "NonRD") {
				cell1.css('display','none')
				cell2.css('display','none')
				cell3.addClass('cell-percentage')
			}

			// cell.on('click', () => {
			// 	ba.renderDetail(d.PLCode, e.breakdowns)
			// })
		})

		let boolStatus = false
		trContent.find('td').each((a,e) => {
			if ($(e).text() != '0') {
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

			let idplyo = _.find(ba.idarrayhide(), (a) => { return a == $trElem.attr("idheaderpl") })
			if (idplyo != undefined){
				$trElem.remove()
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).remove()
			}
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

			let idplyo2 = _.find(ba.idarrayhide(), (a) => { return a == $trElem.attr("idparent") })
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

	ba.showZeroValue(false)
	$(".pivot-pnl .table-header tr:not([idparent]):not([idcontparent])").addClass('bold')
}

ba.prepareEvents = () => {
	$('.breakdown-view').parent().on('mouseover', 'tr', function () {
		let index = $(this).index()
        let elh = $(`.breakdown-view .table-header tr:eq(${index})`).addClass('hover')
        let elc = $(`.breakdown-view .table-content tr:eq(${index})`).addClass('hover')
	})
	$('.breakdown-view').parent().on('mouseleave', 'tr', function () {
		$('.breakdown-view tr.hover').removeClass('hover')
	})
}

ba.showExpandAll = (a) => {
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

ba.showZeroValue = (a) => {
	ba.zeroValue(a)
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

	ba.showExpandAll(false)
}

// ba.optionBreakdownValues = ko.observableArray([])
// ba.breakdownValueAll = { _id: 'All', Name: 'All' }
// ba.changeBreakdown = () => {
// 	let all = ba.breakdownValueAll
// 	let map = (arr) => arr.map((d) => {
// 		if (ba.breakdownBy() == "customer.channelname") {
// 			return d
// 		}

// 		return { _id: d.Name, Name: d.Name }
// 	})
// 	setTimeout(() => {
// 		switch (ba.breakdownBy()) {
// 			case "customer.areaname":
// 				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
// 				ba.breakdownValue([all._id])
// 			break;
// 			case "customer.region":
// 				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
// 				ba.breakdownValue([all._id])
// 			break;
// 			case "customer.zone":
// 				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
// 				ba.breakdownValue([all._id])
// 			break;
// 			case "product.brand":
// 				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
// 				ba.breakdownValue([all._id])
// 			break;
// 			case "customer.branchname":
// 				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
// 				ba.breakdownValue([all._id])
// 			break;
// 			case "customer.channelname":
// 				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
// 				ba.breakdownValue([all._id])
// 			break;
// 			case "customer.keyaccount":
// 				ba.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
// 				ba.breakdownValue([all._id])
// 			break;
// 		}
// 	}, 100)
// }
// ba.changeBreakdownValue = () => {
// 	let all = ba.breakdownValueAll
// 	setTimeout(() => {
// 		let condA1 = ba.breakdownValue().length == 2
// 		let condA2 = ba.breakdownValue().indexOf(all._id) == 0
// 		if (condA1 && condA2) {
// 			ba.breakdownValue.remove(all._id)
// 			return
// 		}

// 		let condB1 = ba.breakdownValue().length > 1
// 		let condB2 = ba.breakdownValue().reverse()[0] == all._id
// 		if (condB1 && condB2) {
// 			ba.breakdownValue([all._id])
// 			return
// 		}

// 		let condC1 = ba.breakdownValue().length == 0
// 		if (condC1) {
// 			ba.breakdownValue([all._id])
// 		}
// 	}, 100)
// }

rpt.refresh = () => {
	rpt.refreshView('analysis')

	// bkd.changeBreakdown()
	setTimeout(() => {
		// bkd.breakdownValue(['All'])
		ba.refresh(false)
	}, 200)

	ba.prepareEvents()
}

$(() => {
	rpt.refresh()
})