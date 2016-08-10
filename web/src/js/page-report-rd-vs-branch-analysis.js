let colors = ['rgb(17, 134, 212)', 'rgb(32, 162, 87)', 'rgb(234, 144, 0)']

viewModel.RDvsBranchView1 = {}
let v1 = viewModel.RDvsBranchView1

v1.contentIsLoading = ko.observable(false)

v1.breakdownBy = ko.observable('customer.channelname')
v1.breakdownByFiscalYear = ko.observable('date.fiscal')

v1.data = ko.observableArray([])
v1.fiscalYear = ko.observable(rpt.value.FiscalYear())
v1.level = ko.observable(2)
v1.title = ko.observable('Total Branch & RD')

v1.changeTo = (d, e, c) => {
	rpt.resetMonthQuarter()
	v1.title(d)
	c()
	$(window).trigger('scroll')
}

v1.refresh = (useCache = false) => {
	$('.breakdown-view').empty()
	
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([v1.breakdownBy()])
	param.aggr = 'sum'
	param.flag = 'branch-vs-rd'
	param.filters = rpt.getFilterValue(false, v1.fiscalYear)

	v1.contentIsLoading(true)

	let fetch = () => {
		rpt.injectMonthQuarterFilter(param.filters)
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				v1.contentIsLoading(false)
				return
			}
			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
			v1.data(v1.buildStructure(res.Data.Data))
			rpt.plmodels(res.Data.PLModels)
			v1.emptyGrid()
			v1.contentIsLoading(false)
			v1.render()
			rpt.prepareEvents()
		}, () => {
			v1.emptyGrid()
			v1.contentIsLoading(false)
		})
	}

	fetch()
}

v1.clickExpand = (e) => {
	let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
	if (right > 0){
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
			$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
		}

		$(e).find('i').removeClass('fa-chevron-right')
		if (e.attr('idheaderpl') == 'PL0')
			$(e).find('i').addClass('fa-chevron-up')
		else
			$(e).find('i').addClass('fa-chevron-down')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
		rpt.refreshHeight(e.attr('idheaderpl'))
		rpt.refreshchildadd(e.attr('idheaderpl'))
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '')
			$('.pivot-pnl .table-content').css('margin-left', '')
		}
		
		$(e).find('i').removeClass('fa-chevron-up')
		$(e).find('i').removeClass('fa-chevron-down')
		$(e).find('i').addClass('fa-chevron-right')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		rpt.hideAllChild(e.attr('idheaderpl'))
	}
}

v1.emptyGrid = () => {
	$('.grid-breakdown-branch-rd').replaceWith(`<div class="breakdown-view ez grid-breakdown-branch-rd" id="breakdown-branch-rd"></div>`)
}

v1.buildStructure = (data) => {
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

	let parsed = groupThenMap(data, (d) => {
		return d._id._id_branchrd
	}).map((d) => {
		let subs = groupThenMap(d.subs, (e) => {
			return e._id._id_customer_channelname
		}).map((e) => {
			e.breakdowns = e.subs[0]._id
			d.count = 1
			return e
		})

		d.subs = _.orderBy(subs, (e) => e.PL8A, 'desc')
		d.breakdowns = d.subs[0]._id
		d.count = d.subs.length

		let total = {}
		total._id = 'Total'
		total.key = 'Total'
		total.excludeFromTotal = true

		for (let prop in subs[0]) if (subs[0].hasOwnProperty(prop) && (prop.search('PL') > -1)) {
			let val = subs[0][prop]
			total[prop] = toolkit.sum(subs, (f) => f[prop])
		}

		d.subs = [total].concat(d.subs)
		d.count++

		return d
	})

	v1.level(2)
	let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
	return newParsed
}

v1.render = () => {
	let container = $('.grid-breakdown-branch-rd')
	if (v1.data().length == 0) {
		container.html('No data found.')
		return
	}


	// ========================= TABLE STRUCTURE

	let percentageWidth = 100

	let wrapper = toolkit.newEl('div')
		.addClass('pivot-pnl-branch pivot-pnl')
		.appendTo(container)

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
		.css('height', `${rpt.rowHeaderHeight() * v1.level()}px`)
		.attr('data-rowspan', v1.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${rpt.rowHeaderHeight() * v1.level()}px`)
		.attr('data-rowspan', v1.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('% of N Sales')
		.css('height', `${rpt.rowHeaderHeight() * v1.level()}px`)
		.css('vertical-align', 'middle')
		.css('font-weight', 'normal')
		.css('font-style', 'italic')
		.width(percentageWidth - 20)
		.attr('data-rowspan', v1.level())
		.css('vertical-align', 'middle')
		.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < v1.level(); i++) {
		trContents.push(toolkit.newEl('tr')
			.appendTo(tableContent)
			.css('height', `${rpt.rowHeaderHeight()}px`))
	}



	// ========================= BUILD HEADER

	let data = v1.data()

	let columnWidth = 140
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []

	let countWidthThenPush = (thheader, each, key) => {
		let currentColumnWidth = columnWidth

		each.key = key.join('_')
		dataFlat.push(each)

		totalColumnWidth += currentColumnWidth
		thheader.width(currentColumnWidth)
	}

	data.forEach((lvl1, i) => {
		let thheader1 = toolkit.newEl('th')
			.html(lvl1._id.replace(/\ /g, '&nbsp;'))
			.attr('colspan', lvl1.count)
			.addClass('align-center')
			.appendTo(trContents[0])
			.css('background-color', colors[i])
			.css('color', 'white')
			.css('border-top', 'none')

		let thheader2p = $('<div />')

		if (v1.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id])

			totalColumnWidth += percentageWidth
			let thheader1p = toolkit.newEl('th')
				.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
				.css('font-weight', 'normal')
				.css('font-style', 'italic')
				.width(percentageWidth)
				.addClass('align-center')
				.appendTo(trContents[0])
				.css('background-color', colors[i])
				.css('color', 'white')
				.css('border-top', 'none')

			if (rpt.showPercentOfTotal()) {
				totalColumnWidth += percentageWidth
				thheader2p = toolkit.newEl('th')
					.html('% of Total'.replace(/\ /g, '&nbsp;'))
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[0])
					.css('background-color', colors[i])
					.css('color', 'white')
					.css('border-top', 'none')
			}

			return
		}
		thheader1.attr('colspan', lvl1.count * (rpt.showPercentOfTotal() ? 3 : 2))

		lvl1.subs.forEach((lvl2, j) => {
			let thheader2 = toolkit.newEl('th')
				.html(lvl2._id.replace(/\ /g, '&nbsp;'))
				.addClass('align-center')
				.appendTo(trContents[1])

			if (lvl2._id == 'Total') {
				thheader2.css('background-color', 'rgb(116, 149, 160)')
				thheader2.css('color', 'white')
			}

			if (v1.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[1])

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth
					thheader2p = toolkit.newEl('th')
						.html('% of Total'.replace(/\ /g, '&nbsp;'))
						.css('font-weight', 'normal')
						.css('font-style', 'italic')
						.width(percentageWidth)
						.addClass('align-center')
						.appendTo(trContents[1])
				}

				if (lvl2._id == 'Total') {
					thheader1p.css('background-color', 'rgb(116, 149, 160)')
					thheader1p.css('color', 'white')
					thheader2p.css('background-color', 'rgb(116, 149, 160)')
					thheader2p.css('color', 'white')
				}

				return
			}
			thheader2.attr('colspan', lvl2.count)
		})
	})

	tableContent.css('min-width', totalColumnWidth)



	// ========================= CONSTRUCT DATA
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
	let netSalesPLCode = 'PL8A'
	let netSalesRow = {}
	let grossSalesPLCode = 'PL0'
	let grossSalesRow = {}
	let discountActivityPLCode = 'PL7A'
	let rows = []

	rpt.fixRowValue(dataFlat)

	console.log("dataFlat", dataFlat)

	dataFlat.forEach((e) => {
		let breakdown = e.key
		netSalesRow[breakdown] = e[netSalesPLCode]
		grossSalesRow[breakdown] = e[grossSalesPLCode]
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
			let breakdown = e.key
			let percentage = 100
			let percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
			} else if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
			}

			row[`${breakdown} %`] = percentage
			row[`${breakdown} %t`] = percentageOfTotal
		})

		if (exceptions.indexOf(row.PLCode) > -1) {
			return
		}

		rows.push(row)
	})

	console.log("rows", rows)

	let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
	let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
	rows.forEach((d, e) => {
		let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
		if (d.PLCode == discountActivityPLCode) {
			TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
		}

		if (TotalPercentage < 0)
			TotalPercentage = TotalPercentage * -1 
		d.Percentage = toolkit.number(TotalPercentage)

		for (let p in d) if (d.hasOwnProperty(p)) {
			if (p.indexOf('%') > -1 || p == "Percentage") {
				d[p] = Math.abs(d[p])
			}
		}
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
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableHeader)

		trHeader.on('click', () => {
			v1.clickExpand(trHeader)
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
			.html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%')
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = toolkit.newEl('tr')
			.addClass(`column${PL}`)
			.attr(`idpl`, PL)
			.attr(`data-row`, `row-${i}`)
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableContent)

		dataFlat.forEach((e, f) => {
			let key = e.key
			let value = kendo.toString(d[key], 'n0')
			let percentage = kendo.toString(d[`${key} %`], 'n2') + '&nbsp;%'
			let percentageOfTotal = kendo.toString(d[`${key} %t`], 'n2') + '&nbsp;%'

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

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td')
					.html(percentageOfTotal)
					.addClass('align-right')
					.appendTo(trContent)
			}
		})

		rpt.putStatusVal(trHeader, trContent)
	})
	

	// ========================= CONFIGURE THE HIRARCHY
	
	v3.buildGridLevels(container, rows)
}






viewModel.RDvsBranchView2 = {}
let v2 = viewModel.RDvsBranchView2

v2.contentIsLoading = ko.observable(false)

v2.breakdownBy = ko.observable('customer.channelname')
v2.breakdownByFiscalYear = ko.observable('date.fiscal')

v2.data = ko.observableArray([])
v2.fiscalYear = ko.observable(rpt.value.FiscalYear())
v2.level = ko.observable(2)

v2.refresh = (useCache = false) => {
	$('.breakdown-view').empty()
	
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([v2.breakdownBy()])
	param.aggr = 'sum'
	param.flag = 'branch-vs-rd-only-mt-gt'
	param.filters = rpt.getFilterValue(false, v2.fiscalYear)

	v2.contentIsLoading(true)

	let fetch = () => {
		rpt.injectMonthQuarterFilter(param.filters)
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				v2.contentIsLoading(false)
				return
			}
			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
			v2.data(v2.buildStructure(res.Data.Data))
			rpt.plmodels(res.Data.PLModels)
			v2.emptyGrid()
			v2.contentIsLoading(false)
			v2.render()
			rpt.prepareEvents()
		}, () => {
			v2.emptyGrid()
			v2.contentIsLoading(false)
		})
	}

	fetch()
}

v2.clickExpand = (e) => {
	let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
	if (right > 0){
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
			$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
		}

		$(e).find('i').removeClass('fa-chevron-right')
		if (e.attr('idheaderpl') == 'PL0')
			$(e).find('i').addClass('fa-chevron-up')
		else
			$(e).find('i').addClass('fa-chevron-down')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
		rpt.refreshHeight(e.attr('idheaderpl'))
		rpt.refreshchildadd(e.attr('idheaderpl'))
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '')
			$('.pivot-pnl .table-content').css('margin-left', '')
		}
		
		$(e).find('i').removeClass('fa-chevron-up')
		$(e).find('i').removeClass('fa-chevron-down')
		$(e).find('i').addClass('fa-chevron-right')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		rpt.hideAllChild(e.attr('idheaderpl'))
	}
}

v2.emptyGrid = () => {
	$('.grid-breakdown-channel').replaceWith(`<div class="breakdown-view ez grid-breakdown-channel" id="breakdown-channel"></div>`)
}

v2.buildStructure = (data) => {
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

	let parsed = groupThenMap(data, (d) => {
		return d._id._id_customer_channelname
	}).map((d) => {
		let subs = groupThenMap(d.subs, (e) => {
			return e._id._id_branchrd
		}).map((e) => {
			if (d._id == 'Total') {
				e.excludeFromTotal = true
			}

			e.breakdowns = e.subs[0]._id
			e.count = 1
			return e
		})

		d.subs = _.orderBy(subs, (e) => e._id, 'asc')
		d.breakdowns = d.subs[0]._id
		d.count = d.subs.length

		let total = {}
		total._id = 'Total'
		total.key = 'Total'
		total.excludeFromTotal = true

		for (let prop in subs[0]) if (subs[0].hasOwnProperty(prop) && (prop.search('PL') > -1)) {
			let val = subs[0][prop]
			total[prop] = toolkit.sum(subs, (f) => f[prop])
		}

		d.subs = [total].concat(d.subs)
		d.count++

		return d
	})

	console.log('------>>>>-------', parsed)

	v2.level(2)
	let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
	return newParsed
}

v2.render = () => {
	let container = $('.grid-breakdown-channel')
	if (v2.data().length == 0) {
		container.html('No data found.')
		return
	}


	// ========================= TABLE STRUCTURE

	let wrapper = toolkit.newEl('div')
		.addClass('pivot-pnl-branch pivot-pnl')
		.appendTo(container)

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
		.css('height', `${rpt.rowHeaderHeight() * v2.level()}px`)
		.attr('data-rowspan', v2.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${rpt.rowHeaderHeight() * v2.level()}px`)
		.attr('data-rowspan', v2.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('% of N Sales')
		.css('height', `${rpt.rowHeaderHeight() * v2.level()}px`)
		.css('vertical-align', 'middle')
		.css('font-weight', 'normal')
		.css('font-style', 'italic')
		.width(percentageWidth - 20)
		.attr('data-rowspan', v2.level())
		.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < v2.level(); i++) {
		trContents.push(toolkit.newEl('tr')
			.appendTo(tableContent)
			.css('height', `${rpt.rowHeaderHeight()}px`))
	}



	// ========================= BUILD HEADER

	let data = v2.data()

	let columnWidth = 120
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []
	let percentageWidth = 100

	let countWidthThenPush = (thheader, each, key) => {
		let currentColumnWidth = columnWidth

		each.key = key.join('_')
		dataFlat.push(each)

		totalColumnWidth += currentColumnWidth + percentageWidth
		thheader.width(currentColumnWidth)
	}

	data.forEach((lvl1, i) => {
		let thheader1 = toolkit.newEl('th')
			.html(lvl1._id.replace(/\ /g, '&nbsp;'))
			.attr('colspan', lvl1.count)
			.addClass('align-center')
			.appendTo(trContents[0])
			.css('background-color', colors[i])
			.css('color', 'white')
			.css('border-top', 'none')

		let thheader2p = $('<div />')

		if (v1.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id])

			totalColumnWidth += percentageWidth
			let thheader1p = toolkit.newEl('th')
				.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
				.css('font-weight', 'normal')
				.css('font-style', 'italic')
				.width(percentageWidth)
				.addClass('align-center')
				.appendTo(trContents[0])
				.css('background-color', colors[i])
				.css('color', 'white')
				.css('border-top', 'none')

			if (rpt.showPercentOfTotal()) {
				totalColumnWidth += percentageWidth
				thheader2p = toolkit.newEl('th')
					.html('% of Total'.replace(/\ /g, '&nbsp;'))
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[0])
					.css('background-color', colors[i])
					.css('color', 'white')
					.css('border-top', 'none')
			}

			return
		}
		thheader1.attr('colspan', lvl1.count * (rpt.showPercentOfTotal() ? 3 : 2))

		lvl1.subs.forEach((lvl2, j) => {
			let thheader2 = toolkit.newEl('th')
				.html(lvl2._id.replace(/\ /g, '&nbsp;'))
				.addClass('align-center')
				.appendTo(trContents[1])

			if (lvl2._id == 'Total') {
				thheader2.css('background-color', 'rgb(116, 149, 160)')
				thheader2.css('color', 'white')
			}

			if (v1.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[1])

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth
					thheader2p = toolkit.newEl('th')
						.html('% of Total'.replace(/\ /g, '&nbsp;'))
						.css('font-weight', 'normal')
						.css('font-style', 'italic')
						.width(percentageWidth)
						.addClass('align-center')
						.appendTo(trContents[1])
				}

				if (lvl2._id == 'Total') {
					thheader1p.css('background-color', 'rgb(116, 149, 160)')
					thheader1p.css('color', 'white')
					thheader2p.css('background-color', 'rgb(116, 149, 160)')
					thheader2p.css('color', 'white')
				}

				return
			}
			thheader2.attr('colspan', lvl2.count)
		})
	})

	tableContent.css('width', totalColumnWidth)



	// ========================= CONSTRUCT DATA
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
	let netSalesPLCode = 'PL8A'
	let netSalesRow = {}
	let grossSalesPLCode = 'PL0'
	let grossSalesRow = {}
	let discountActivityPLCode = 'PL7A'
	let rows = []

	rpt.fixRowValue(dataFlat)

	console.log("dataFlat", dataFlat)

	dataFlat.forEach((e) => {
		let breakdown = e.key
		netSalesRow[breakdown] = e[netSalesPLCode]
		grossSalesRow[breakdown] = e[grossSalesPLCode]
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
			let breakdown = e.key
			let percentage = 100
			let percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
			} else if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
			}

			if (percentage < 0)
				percentage = percentage * -1

			row[`${breakdown} %`] = percentage
			row[`${breakdown} %t`] = percentageOfTotal
		})

		if (exceptions.indexOf(row.PLCode) > -1) {
			return
		}

		rows.push(row)
	})

	console.log("rows", rows)

	let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
	let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
	rows.forEach((d, e) => {
		let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
		if (d.PLCode == discountActivityPLCode) {
			TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
		}

		if (TotalPercentage < 0)
			TotalPercentage = TotalPercentage * -1 
		d.Percentage = toolkit.number(TotalPercentage)

		for (let p in d) if (d.hasOwnProperty(p)) {
			if (p.indexOf('%') > -1 || p == "Percentage") {
				d[p] = Math.abs(d[p])
			}
		}
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
			.css('height', `${rpt.rowContentHeight()}px`)

		trHeader.on('click', () => {
			v2.clickExpand(trHeader)
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
			.html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%')
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = toolkit.newEl('tr')
			.addClass(`column${PL}`)
			.attr(`idpl`, PL)
			.attr(`data-row`, `row-${i}`)
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableContent)

		dataFlat.forEach((e, f) => {
			let key = e.key
			let value = kendo.toString(d[key], 'n0')
			let percentage = kendo.toString(d[`${key} %`], 'n2') + '&nbsp;%'
			let percentageOfTotal = kendo.toString(d[`${key} %t`], 'n2') + '&nbsp;%'

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

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td')
					.html(percentageOfTotal)
					.addClass('align-right')
					.appendTo(trContent)
			}
		})

		rpt.putStatusVal(trHeader, trContent)
	})
	

	// ========================= CONFIGURE THE HIRARCHY
	v3.buildGridLevels(container, rows)
}













viewModel.RDvsBranchView3 = {}
let v3 = viewModel.RDvsBranchView3

v3.contentIsLoading = ko.observable(false)

v3.breakdownBy = ko.observable('customer.channelname')
v3.breakdownByFiscalYear = ko.observable('date.fiscal')

v3.data = ko.observableArray([])
v3.fiscalYear = ko.observable(rpt.value.FiscalYear())
v3.level = ko.observable(1)

v3.refresh = (useCache = false) => {
	$('.breakdown-view').empty()
	
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([v3.breakdownBy()])
	param.aggr = 'sum'
	param.flag = 'branch-vs-rd'
	param.filters = rpt.getFilterValue(false, v3.fiscalYear)

	v3.contentIsLoading(true)

	let fetch = () => {
		rpt.injectMonthQuarterFilter(param.filters)
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				v3.contentIsLoading(false)
				return
			}

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
			v3.data(v3.buildStructure(res.Data.Data))
			rpt.plmodels(res.Data.PLModels)
			v3.emptyGrid()
			v3.contentIsLoading(false)
			v3.render()
			rpt.prepareEvents()
		}, () => {
			v3.emptyGrid()
			v3.contentIsLoading(false)
		})
	}

	fetch()
}

v3.clickExpand = (e) => {
	let right = $(e).find('i.fa-chevron-right').length, down = 0
		if (e.attr('idheaderpl') == 'PL0')
			down = $(e).find('i.fa-chevron-up').length
		else
			down = $(e).find('i.fa-chevron-down').length
	if (right > 0){
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
			$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
		}

		$(e).find('i').removeClass('fa-chevron-right')
		if (e.attr('idheaderpl') == 'PL0')
			$(e).find('i').addClass('fa-chevron-up')
		else
			$(e).find('i').addClass('fa-chevron-down')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
		rpt.refreshHeight(e.attr('idheaderpl'))
		rpt.refreshchildadd(e.attr('idheaderpl'))
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '')
			$('.pivot-pnl .table-content').css('margin-left', '')
		}
		
		$(e).find('i').removeClass('fa-chevron-up')
		$(e).find('i').removeClass('fa-chevron-down')
		$(e).find('i').addClass('fa-chevron-right')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		rpt.hideAllChild(e.attr('idheaderpl'))
	}
}

v3.emptyGrid = () => {
	$('.grid-total-branch-rd').replaceWith(`<div class="breakdown-view ez grid-total-branch-rd" id="breakdown-total-branch-rd"></div>`)
}

v3.buildStructure = (data) => {
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

	let parsed = groupThenMap(data, (d) => {
		return `Total ${d._id._id_branchrd}`
	}).map((d) => {
		d.subs = []
		d.count = 1
		return d
	})

	v3.level(1)
	let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
	return newParsed
}

v3.render = () => {
	let container = $('.grid-total-branch-rd')
	if (v3.data().length == 0) {
		container.html('No data found.')
		return
	}

	let percentageWidth = 100

	// ========================= TABLE STRUCTURE

	let wrapper = toolkit.newEl('div')
		.addClass('pivot-pnl-branch pivot-pnl')
		.appendTo(container)

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
		.css('height', `${rpt.rowHeaderHeight() * v3.level()}px`)
		.attr('data-rowspan', v3.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${rpt.rowHeaderHeight() * v3.level()}px`)
		.attr('data-rowspan', v3.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
		.css('height', `${rpt.rowHeaderHeight() * v3.level()}px`)
		.css('vertical-align', 'middle')
		.css('font-weight', 'normal')
		.css('font-style', 'italic')
		.width(percentageWidth - 20)
		.attr('data-rowspan', v3.level())
		.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < v3.level(); i++) {
		trContents.push(toolkit.newEl('tr')
			.appendTo(tableContent)
			.css('height', `${rpt.rowHeaderHeight()}px`))
	}



	// ========================= BUILD HEADER

	let data = v3.data()

	let columnWidth = 170
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []

	let countWidthThenPush = (thheader, each, key) => {
		let currentColumnWidth = columnWidth

		each.key = key.join('_')
		dataFlat.push(each)

		totalColumnWidth += currentColumnWidth
		thheader.width(currentColumnWidth)
	}

	data.forEach((lvl1, i) => {
		let thheader1 = toolkit.newEl('th')
			.html(lvl1._id.replace(/\ /g, '&nbsp;'))
			.attr('colspan', lvl1.count)
			.addClass('align-right')
			.appendTo(trContents[0])
			.css('background-color', colors[i])
			.css('color', 'white')
			.css('border-top', 'none')

		if (v3.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id])

			totalColumnWidth += percentageWidth
			let thheader1p = toolkit.newEl('th')
				.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
				.css('font-weight', 'normal')
				.css('font-style', 'italic')
				.width(percentageWidth)
				.addClass('align-center')
				.appendTo(trContents[0])
				.css('background-color', colors[i])
				.css('color', 'white')
				.css('border-top', 'none')

			if (rpt.showPercentOfTotal()) {
				totalColumnWidth += percentageWidth
				toolkit.newEl('th')
					.html('% of Total'.replace(/\ /g, '&nbsp;'))
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[0])
					.css('background-color', colors[i])
					.css('color', 'white')
					.css('border-top', 'none')
			}

			return
		}
		thheader1.attr('colspan', lvl1.count * 2)

		lvl1.subs.forEach((lvl2, j) => {
			let thheader2 = toolkit.newEl('th')
				.html(lvl2._id)
				.addClass('align-center')
				.appendTo(trContents[1])

			if (v3.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales')
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.width(percentageWidth)
					.addClass('align-center')
					.appendTo(trContents[1])

				return
			}
			thheader2.attr('colspan', lvl2.count)
		})
	})

	tableContent.css('width', totalColumnWidth)



	// ========================= CONSTRUCT DATA
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
	let netSalesPLCode = 'PL8A'
	let netSalesRow = {}
	let grossSalesPLCode = 'PL0'
	let grossSalesRow = {}
	let discountActivityPLCode = 'PL7A'
	let rows = []

	rpt.fixRowValue(dataFlat)

	console.log("dataFlat", dataFlat)

	dataFlat.forEach((e) => {
		let breakdown = e.key
		netSalesRow[breakdown] = e[netSalesPLCode]
		grossSalesRow[breakdown] = e[grossSalesPLCode]
	})

	plmodels.forEach((d, i) => {
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
			let breakdown = e.key
			let percentage = 100
			let percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
			} else if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
			}

			if (percentage < 0)
				percentage = percentage * -1

			row[`${breakdown} %`] = percentage
			row[`${breakdown} %t`] = percentageOfTotal
		})

		if (exceptions.indexOf(row.PLCode) > -1) {
			return
		}

		rows.push(row)
	})

	console.log("rows", rows)

	let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
	let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
	rows.forEach((d, e) => {
		let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
		if (d.PLCode == discountActivityPLCode) {
			TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
		}

		if (TotalPercentage < 0)
			TotalPercentage = TotalPercentage * -1 
		rows[e].Percentage = toolkit.number(TotalPercentage)
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
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableHeader)

		trHeader.on('click', () => {
			v3.clickExpand(trHeader)
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
			.html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%')
			.addClass('align-right')
			.appendTo(trHeader)

		let trContent = toolkit.newEl('tr')
			.addClass(`column${PL}`)
			.attr(`idpl`, PL)
			.attr(`data-row`, `row-${i}`)
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableContent)

		dataFlat.forEach((e, f) => {
			let key = e.key
			let value = kendo.toString(d[key], 'n0')
			let percentage = kendo.toString(d[`${key} %`], 'n2') + '&nbsp;%'
			let percentageOfTotal = kendo.toString(d[`${key} %t`], 'n2') + '&nbsp;%'

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

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td')
					.html(percentageOfTotal)
					.addClass('align-right')
					.appendTo(trContent)
			}
		})

		rpt.putStatusVal(trHeader, trContent)
	})
	

	// ========================= CONFIGURE THE HIRARCHY
	v3.buildGridLevels(container, rows)
}







v3.buildGridLevels = (container, rows) => {
	let grouppl1 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader1}), (k , v) => { return { data: k, key:v}})
	let grouppl2 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader2}), (k , v) => { return { data: k, key:v}})
	let grouppl3 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader3}), (k , v) => { return { data: k, key:v}})

	let $trElem, $columnElem
	let resg1, resg2, resg3, PLyo, PLyo2, child = 0, parenttr = 0, textPL
	container.find(".table-header tbody>tr").each(function( i ) {
		if (i > 0){
			$trElem = $(this)
			resg1 = _.find(grouppl1, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg2 = _.find(grouppl2, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg3 = _.find(grouppl3, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })

			let idplyo = _.find(rpt.idarrayhide(), (a) => { return a == $trElem.attr("idheaderpl") })
			if (idplyo != undefined){
				$trElem.remove()
				container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).remove()
			}
			if (resg1 == undefined && idplyo2 == undefined){
				if (resg2 != undefined){ 
					textPL = _.find(resg2.data, function(o) { return o._id == $trElem.attr("idheaderpl") })
					PLyo = _.find(rows, function(o) { return o.PNL == textPL.PLHeader1 })
					PLyo2 = _.find(rows, function(o) { return o.PLCode == textPL._id })
					$trElem.find('td:eq(0)').css('padding-left','40px')
					$trElem.attr('idparent', PLyo.PLCode)
					child = container.find(`tr[idparent=${PLyo.PLCode}]`).length
					$columnElem = container.find(`.table-content tr.column${PLyo2.PLCode}`)
					$columnElem.attr('idcontparent', PLyo.PLCode)
					let PLCodeChange = rpt.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
					if (PLCodeChange != "")
						PLyo.PLCode = PLCodeChange
					if (child > 1){
						let $parenttr = container.find(`tr[idheaderpl=${PLyo.PLCode}]`)
						let $parenttrcontent = container.find(`tr[idpl=${PLyo.PLCode}]`)
						// $trElem.insertAfter($(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
						// $columnElem.insertAfter($(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
						$trElem.insertAfter($parenttr)
						$columnElem.insertAfter($parenttrcontent)
					}
					else{
						$trElem.insertAfter(container.find(`tr.header${PLyo.PLCode}`))
						$columnElem.insertAfter(container.find(`tr.column${PLyo.PLCode}`))
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
						child = container.find(`tr[idparent=${PLyo.PLCode}]`).length
						$columnElem = container.find(`.table-content tr.column${PLyo2.PLCode}`)
						$columnElem.attr('idcontparent', PLyo.PLCode)
						let PLCodeChange = rpt.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
						if (PLCodeChange != "")
							PLyo.PLCode = PLCodeChange
						if (child > 1){
							// $trElem.insertAfter(container.find(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							// $columnElem.insertAfter(container.find(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							$trElem.insertAfter(container.find(`tr[idheaderpl=${PLyo.PLCode}]`))
							$columnElem.insertAfter(container.find(`tr[idpl=${PLyo.PLCode}]`))
						}
						else{
							$trElem.insertAfter(container.find(`tr.header${PLyo.PLCode}`))
							$columnElem.insertAfter(container.find(`tr.column${PLyo.PLCode}`))
						}
						if ($trElem.attr('idparent') == "PL33" || $trElem.attr('idparent') == "PL34" || $trElem.attr('idparent') == "PL35"){
							let texthtml = $trElem.find('td:eq(0)').text()
							$trElem.find('td:eq(0)').text(texthtml.substring(5,texthtml.length))
						}
					}
				}
			}

			let idplyo2 = _.find(rpt.idarrayhide(), (a) => { return a == $trElem.attr("idparent") })
			if (idplyo2 != undefined){
				$trElem.removeAttr('idparent')
				$trElem.addClass('bold')
				$trElem.css('display','inline-grid')
				container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).removeAttr("idcontparent")
				container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusval', 'show')
				container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusvaltemp', 'show')
				container.find(`.table-content tr.column${$trElem.attr("idheaderpl")}`).css('display','inline-grid')
			}
		}
	})

	let countChild = ''
	container.find(".table-header tbody>tr").each(function( i ) {
		$trElem = container.find(this)
		parenttr = container.find(`tr[idparent=${$trElem.attr('idheaderpl')}]`).length
		if (parenttr>0){
			$trElem.addClass('dd')
			$trElem.find(`td:eq(0)>i`)
				.addClass('fa fa-chevron-right')
				.css('margin-right', '5px')
			container.find(`tr[idparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
			container.find(`tr[idcontparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
			container.find(`tr[idparent=${$trElem.attr('idheaderpl')}]`).each((a,e) => {
				if (container.find(e).attr('statusval') == 'show'){
					container.find(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
					container.find(`tr[idpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
					if (container.find(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('idparent') == undefined) {
						container.find(`tr[idpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
						container.find(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
					}
				}
			})
		} else {
			countChild = $trElem.attr('idparent')
			if (countChild == '' || countChild == undefined)
				$trElem.find(`td:eq(0)`).css('padding-left', '20px')
		}
	})

	rpt.showZeroValue(false)
	container.find(".table-header tr:not([idparent]):not([idcontparent])").addClass('bold')
	rpt.refreshHeight()
	rpt.addScrollBottom(container)
}

vm.currentMenu('Analysis')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Analysis', href: '#' },
	{ title: 'Branch vs RD Analysis', href: '#' }
])

$(() => {
	v3.refresh()
	rpt.showExport(true)
})