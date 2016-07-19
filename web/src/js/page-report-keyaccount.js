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
kac.fiscalYear = ko.observable(rpt.value.FiscalYear())
kac.breakdownValue = ko.observableArray([])
kac.breakdownGroupValue = ko.observableArray([])

kac.refresh = (useCache = false) => {
	if (kac.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value')
		return
	}

	let breakdownKeyAccount = 'customer.keyaccount'
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([kac.breakdownBy(), breakdownKeyAccount])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, kac.fiscalYear)

	let breakdownGroupValue = kac.breakdownGroupValue().filter((d) => d != 'All')
	if (breakdownGroupValue.length > 0) {
		param.filters.push({
			Field: breakdownKeyAccount,
			Op: '$in',
			Value: kac.breakdownGroupValue()
		})
	}

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
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				kac.contentIsLoading(false)
				return
			}

			let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			kac.breakdownNote(`Last refreshed on: ${date}`)

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
			kac.data(res.Data.Data)
			rpt.plmodels(res.Data.PLModels)
			kac.emptyGrid()
			kac.contentIsLoading(false)
			kac.render()
			rpt.prepareEvents()
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
	let down = $(e).find('i.fa-chevron-up').length
	if (right > 0){
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth())
			$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth())
		}
		
		$(e).find('i').removeClass('fa-chevron-right')
		$(e).find('i').addClass('fa-chevron-up')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
		rpt.refreshchildadd(e.attr('idheaderpl'))
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '')
			$('.pivot-pnl .table-content').css('margin-left', '')
		}
		
		$(e).find('i').removeClass('fa-chevron-up')
		$(e).find('i').addClass('fa-chevron-right')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		rpt.hideAllChild(e.attr('idheaderpl'))
	}
}
kac.emptyGrid = () => {
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez" id="key-account-analysis"></div>`)
}

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
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
	let netSalesPLCode = 'PL8A'
	let netSalesRow = {}
	let grossSalesPLCode = 'PL0'
	let grossSalesRow = {}
	let discountActivityPLCode = 'PL7A'

	rpt.fixRowValue(data)

	data.forEach((e) => {
		let breakdown = e._id
		netSalesRow[breakdown] = e[netSalesPLCode]
		grossSalesRow[breakdown] = e[grossSalesPLCode]
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

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
			} else if (d._id != netSalesPLCode) {
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

	let percentageWidth = 100

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
		.css('height', `${rpt.rowHeaderHeight()}px`)
		.appendTo(trHeader1)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${rpt.rowHeaderHeight()}px`)
		.addClass('align-right')
		.appendTo(trHeader1)

	toolkit.newEl('th')
		.html('% of N Sales')
		.css('height', `${rpt.rowHeaderHeight()}px`)
		.css('font-weight', 'normal')
		.css('font-style', 'italic')
		.width(percentageWidth - 20)
		.addClass('align-right')
		.appendTo(trHeader1)

	let trContent1 = toolkit.newEl('tr')
		.appendTo(tableContent)

	let colWidth = 160
	let totalWidth = 0
	let pnlTotalSum = 0

	if (kac.breakdownBy() == "customer.branchname") {
		colWidth = 200
	}

	if (kac.breakdownBy() == "customer.region") {
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
			.html('% of N Sales')
			.css('font-weight', 'normal')
			.css('font-style', 'italic')
			.width(percentageWidth)
			.addClass('align-right cell-percentage')
			.appendTo(trContent1)
			.width(percentageWidth)

		totalWidth += colWidth + percentageWidth
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
			.attr(`data-row`, `row-${i}`)
			.appendTo(tableHeader)
			.css('height', `${rpt.rowContentHeight()}px`)

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
			.attr(`data-row`, `row-${i}`)
			.attr(`idpl`, PL)
			.css('height', `${rpt.rowContentHeight()}px`)
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

	rpt.buildGridLevels(rows)
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


kac.optionBreakdownGroupValues = ko.observableArray([])
kac.changeBreakdownGroup = () => {
	let all = kac.breakdownValueAll
	setTimeout(() => {
		kac.optionBreakdownGroupValues([all].concat(
			rpt.masterData.KeyAccount().map((d) => { 
				let name = `(${d._id}) ${d.Name}`
				if (d.Name == 'OTHER') {
					name = d.Name
				}

				return { _id: d._id, Name: name } })
			)
		)
		kac.breakdownGroupValue([all._id])
	}, 100)
}
kac.changeBreakdownGroupValue = () => {
	let all = kac.breakdownValueAll
	setTimeout(() => {
		let condA1 = kac.breakdownGroupValue().length == 2
		let condA2 = kac.breakdownGroupValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			kac.breakdownGroupValue.remove(all._id)
			return
		}

		let condB1 = kac.breakdownGroupValue().length > 1
		let condB2 = kac.breakdownGroupValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			kac.breakdownGroupValue([all._id])
			return
		}

		let condC1 = kac.breakdownGroupValue().length == 0
		if (condC1) {
			kac.breakdownGroupValue([all._id])
		}
	}, 100)
}

vm.currentMenu('Analysis')
vm.currentTitle('Key Account Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'Key Account Analysis', href: '#' }
])

kac.title('&nbsp;')

rpt.refresh = () => {
	kac.changeBreakdown()
	kac.changeBreakdownGroup()
	setTimeout(() => {
		kac.breakdownValue(['All'])
		kac.breakdownGroupValue(['KEY'])
		kac.refresh(false)
	}, 200)
}

$(() => {
	rpt.refresh()
	rpt.showExport(true)
})
