viewModel.cogs = {}
let cogs = viewModel.cogs

cogs.contentIsLoading = ko.observable(false)
cogs.breakdownBy = ko.observable('customer.channelname')
cogs.breakdownByFiscalYear = ko.observable('date.fiscal')
cogs.data = ko.observableArray([])
cogs.fiscalYear = ko.observable(rpt.value.FiscalYear())
cogs.level = ko.observable(1)

cogs.refresh = (useCache = false) => {
	let param = {}
	param.pls = []
	param.aggr = 'sum'
	param.flag = 'cogs'
	param.filters = rpt.getFilterValue(false, cogs.fiscalYear)
	let groups = [cogs.breakdownBy()]

	param.groups = rpt.parseGroups(groups)
	cogs.contentIsLoading(true)

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				cogs.contentIsLoading(false)
				return
			}

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
			cogs.data(cogs.buildStructure(res.Data.Data))
			rpt.plmodels(cogs.buildPLModels(res.Data.PLModels))
			cogs.emptyGrid()
			cogs.contentIsLoading(false)
			cogs.render()
			rpt.prepareEvents()
			
			$('.columnPL891_perunit,.columnPL891').each((i, e) => $(e).find('td').empty())
			$('.headerPL891_perunit,.headerPL891').each((i, e) => $(e).find('td:last').empty())
			$('.headerPL891_perunit,.headerPL891').each((i, e) => $(e).find('td:first').trigger('click'))
		}, () => {
			cogs.emptyGrid()
			cogs.contentIsLoading(false)
		})
	}

	fetch()
}

cogs.clickExpand = (e) => {
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

cogs.emptyGrid = () => {
	$('#cogs').replaceWith(`<div class="breakdown-view ez" id="cogs"></div>`)
}

cogs.buildPLModels = (plmodels) => {
	let plsSplittable = ["PL14", "PL74A", "PL74", "PL9", "PL74B", "PL14A", "Pl20", "PL21"]
	let plsUnsplittable = ["PL1", "PL8A", "PL6A", "PL7A", "PL0", "PL7"]

	plmodels = plmodels.filter((d) => {
		if (plsSplittable.indexOf(d._id) > -1) {
			return true
		}
		if (plsUnsplittable.indexOf(d._id) > -1) {
			return true
		}
		return false
	})

	// let plSpecials = ['Cost of Goods Sold', 'Indirect Expense', 'Direct Expense']
	// let plmodelsNew = []
	// plmodels.forEach((d) => {
	// 	if (plsSplittable.indexOf(d._id) > -1) {
	// 		let e = toolkit.clone(d)
	// 		e._id = `${d._id}_perunit`
	// 		e.PLHeader1 = d.PLHeader1
	// 		e.PLHeader2 = d.PLHeader2
	// 		e.PLHeader3 = d.PLHeader3

	// 		;['PLHeader1', 'PLHeader2', 'PLHeader3'].forEach((f) => {
	// 			if (plSpecials.indexOf(e[f]) > -1) {
	// 				e[f] = `${e[f]} (Per Unit)`
	// 			}

	// 			e[f] = `${e[f]} `
	// 		})

	// 		plmodelsNew.push(e)
	// 	}

	// 	plmodelsNew.push(d)
	// })

	let plParents = ['Original', 'Per Unit']
	let plmodelsNew = []
	plmodels.forEach((d) => {
		if (plsSplittable.indexOf(d._id) > -1) {
			let e = toolkit.clone(d)
			e._id = `${d._id}_perunit`
			e.OrderIndex = d.OrderIndex
			e.PLHeader3 = `${d.PLHeader3} `
			e.PLHeader2 = `${d.PLHeader1} `
			e.PLHeader1 = plParents[1]
			plmodelsNew.push(e)

			d.PLHeader2 = d.PLHeader1
			d.PLHeader1 = plParents[0]
		}

		plmodelsNew.push(d)
	})

	plParents.forEach((d, i) => {
		let o = {}
		o._id = 'PL891'
		o.OrderIndex = 'PL0027'
		o.PLHeader1 = d
		o.PLHeader2 = d
		o.PLHeader3 = d

		if (i == 1) {
			o._id = `${o._id}_perunit`
		}

		plmodelsNew.push(o)
	})

	return plmodelsNew
}

cogs.buildStructure = (data) => {
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
		return d._id[`_id_${toolkit.replace(cogs.breakdownBy(), '.', '_')}`]
	}).map((d) => {
		d.breakdowns = d.subs[0]._id
		d.count = 1

		return d
	})

	cogs.level(1)
	let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
	return newParsed
}

cogs.render = () => {
	if (cogs.data().length == 0) {
		$('#cogs').html('No data found.')
		return
	}


	// ========================= TABLE STRUCTURE

	let percentageWidth = 100

	let wrapper = toolkit.newEl('div')
		.addClass('pivot-pnl-branch pivot-pnl')
		.appendTo($('#cogs'))

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
		.css('height', `${rpt.rowHeaderHeight() * cogs.level()}px`)
		.attr('data-rowspan', cogs.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${rpt.rowHeaderHeight() * cogs.level()}px`)
		.attr('data-rowspan', cogs.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
		.css('height', `${rpt.rowHeaderHeight() * cogs.level()}px`)
		.css('vertical-align', 'middle')
		.css('font-weight', 'normal')
		.css('font-style', 'italic')
		.width(percentageWidth - 20)
		.attr('data-rowspan', cogs.level())
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < cogs.level(); i++) {
		trContents.push(toolkit.newEl('tr')
			.appendTo(tableContent)
			.css('height', `${rpt.rowHeaderHeight()}px`))
	}



	// ========================= BUILD HEADER

	let data = cogs.data()

	let columnWidth = 130
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []

	let countWidthThenPush = (thheader, each, key) => {
		let currentColumnWidth = each._id.length * ((cogs.breakdownBy() == 'customer.channelname') ? 7 : 10)
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
			.html(lvl1._id.replace(/\ /g, '&nbsp;'))
			.attr('colspan', lvl1.count)
			.addClass('align-center')
			.css('border-top', 'none')
			.appendTo(trContents[0])

		let thheader2p = $('<div />')

		if (cogs.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id])

			totalColumnWidth += percentageWidth
			let thheader1p = toolkit.newEl('th')
				.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
				.width(percentageWidth)
				.addClass('align-center')
				.css('font-weight', 'normal')
				.css('font-style', 'italic')
				.css('border-top', 'none')
				.appendTo(trContents[0])

			if (rpt.showPercentOfTotal()) {
				totalColumnWidth += percentageWidth
				thheader2p = toolkit.newEl('th')
					.html('% of Total'.replace(/\ /g, '&nbsp;'))
					.width(percentageWidth)
					.addClass('align-center')
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.css('border-top', 'none')
					.appendTo(trContents[0])
			}

			return
		}
		thheader1.attr('colspan', lvl1.count * (rpt.showPercentOfTotal() ? 3 : 2))

		lvl1.subs.forEach((lvl2, j) => {
			let thheader2 = toolkit.newEl('th')
				.html(lvl2._id.replace(/\ /g, '&nbsp;'))
				.addClass('align-center')
				.appendTo(trContents[1])

			if (cogs.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
					.width(percentageWidth)
					.addClass('align-center')
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.appendTo(trContents[1])

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth
					thheader2p = toolkit.newEl('th')
						.html('% of Total'.replace(/\ /g, '&nbsp;'))
						.width(percentageWidth)
						.addClass('align-center')
						.css('font-weight', 'normal')
						.css('font-style', 'italic')
						.css('border-top', 'none')
						.appendTo(trContents[1])
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
			let percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100; 
			let percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100; 

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
			cogs.clickExpand(trHeader)
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

			$([cell, cellPercentage]).on('click', () => {
				cogs.renderDetail(d.PLCode, e.breakdowns)
			})
		})

		rpt.putStatusVal(trHeader, trContent)
	})
	

	// ========================= CONFIGURE THE HIRARCHY
	rpt.buildGridLevels(rows)
}



vm.currentMenu('Analysis')
vm.currentTitle('COGS Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Analysis', href: '#' },
	{ title: 'COGS Analysis', href: '#' }
])

$(() => {
	cogs.refresh()
	rpt.showExport(true)
})
