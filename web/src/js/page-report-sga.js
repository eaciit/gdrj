viewModel.sga = {}
let sga = viewModel.sga

// ========== PARSE ======

sga.sampleData = [
	{ function: 'Contr', account: 'SALARY BASIC', accountGroup: 'SALARY & BONUS', value: 182497000 },
	{ function: 'Factory', account: 'SALARY BASIC', accountGroup: 'SALARY & BONUS', value: 44948025651 },
	{ function: 'FAD', account: 'SALARY BASIC', accountGroup: 'SALARY & BONUS', value: 5901941886 },

	{ function: 'Contr', account: 'BONUS', accountGroup: 'SALARY & BONUS', value: 18687784590 },
	{ function: 'Factory', account: 'BONUS', accountGroup: 'SALARY & BONUS', value: 178332727 },
	{ function: 'FAD', account: 'BONUS', accountGroup: 'SALARY & BONUS', value: 0 },

	{ function: 'Contr', account: 'OUTSOURSING EXPENSES', accountGroup: 'SALARY & BONUS', value: 162518906 },
	{ function: 'Factory', account: 'OUTSOURSING EXPENSES', accountGroup: 'SALARY & BONUS', value: 2181389826 },
	{ function: 'FAD', account: 'OUTSOURSING EXPENSES', accountGroup: 'SALARY & BONUS', value: 3455862907 },

	{ function: 'Contr', account: 'SALARY BASIC-FOH', accountGroup: 'SALARY & BONUS', value: 14890082565 },
	{ function: 'Factory', account: 'SALARY BASIC-FOH', accountGroup: 'SALARY & BONUS', value: 0 },
	{ function: 'FAD', account: 'SALARY BASIC-FOH', accountGroup: 'SALARY & BONUS', value: 0 },

	{ function: 'Contr', account: 'CON ST & SP-FOH', accountGroup: 'SALARY & BONUS', value: 11855798316 },
	{ function: 'Factory', account: 'CON ST & SP-FOH', accountGroup: 'SALARY & BONUS', value: 0 },
	{ function: 'FAD', account: 'CON ST & SP-FOH', accountGroup: 'SALARY & BONUS', value: 0 },
]

sga.rawData = ko.observableArray(sga.sampleData)
sga.getAlphaNumeric = (what) => what.replace(/\W/g, '')

sga.constructData = () => {
	sga.data([])

	let op1 = _.groupBy(sga.rawData(), (d) => [d.account, d.accountGroup].join('|'))
	let op2 = _.map(op1, (v, k) => ({
		_id: sga.getAlphaNumeric(k),
		PLHeader1: v[0].accountGroup,
		PLHeader2: v[0].accountGroup,
		PLHeader3: v[0].account,
	}))

	let oq1 = _.groupBy(sga.rawData(), (d) => d.accountGroup)
	let oq2 = _.map(oq1, (v, k) => ({
		_id: sga.getAlphaNumeric(k),
		PLHeader1: v[0].accountGroup,
		PLHeader2: v[0].accountGroup,
		PLHeader3: v[0].accountGroup,
	}))
	rpt.plmodels(op2.concat(oq2))

	let key = sga.breakdownBy()
	let rawData = []
	sga.rawData().forEach((d) => {
		let breakdown = d[key]
		let o = rawData.find((e) => e._id[`_id_${key}`] === breakdown)
		if (typeof o == 'undefined') {
			o = {}
			o._id = {}
			o._id[`_id_${key}`] = breakdown
			rawData.push(o)
		}

		let plID = sga.getAlphaNumeric([d.account, d.accountGroup].join('|'))
		let plmodel = rpt.plmodels().find((e) => e._id == plID)
		if (o.hasOwnProperty(plmodel._id)) {
			o[plmodel._id] += d.value
		} else {
			o[plmodel._id] = d.value
		}

		let plIDHeader = sga.getAlphaNumeric(d.accountGroup)
		let plmodelHeader = rpt.plmodels().find((e) => e._id == plIDHeader)
		if (o.hasOwnProperty(plmodelHeader._id)) {
			o[plmodelHeader._id] += d.value
		} else {
			o[plmodelHeader._id] = d.value
		}
	})
	sga.data(rawData)
}

// ==========



sga.contentIsLoading = ko.observable(false)
sga.breakdownNote = ko.observable('')

sga.breakdownBy = ko.observable('function')
sga.breakdownValue = ko.observableArray([])
sga.breakdownByFiscalYear = ko.observable('date.fiscal')

sga.data = ko.observableArray([])
sga.fiscalYear = ko.observable(rpt.value.FiscalYear())
sga.level = ko.observable(1)

sga.refresh = (useCache = false) => {
	sga.constructData()
	sga.data(sga.buildStructure(sga.data()))
	sga.emptyGrid()
	sga.render()
	rpt.showExpandAll(true)
	rpt.prepareEvents()
	return

	let param = {}
	param.pls = []
	param.aggr = 'sum'
	param.flag = 'sga'
	param.filters = rpt.getFilterValue(false, sga.fiscalYear)
	param.groups = rpt.parseGroups([sga.breakdownBy()])
	sga.contentIsLoading(true)

	let breakdownValue = sga.breakdownValue().filter((d) => d !== 'All')
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: sga.breakdownBy(),
			Op: '$in',
			Value: breakdownValue
		})
	}

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
				sga.contentIsLoading(false)
				return
			}

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
			let data = sga.buildStructure(res.Data.Data)
			sga.data(data)
			let plmodels = sga.buildPLModels(res.Data.PLModels)
			rpt.plmodels(plmodels)
			sga.emptyGrid()
			sga.contentIsLoading(false)
			sga.render()
			rpt.showExpandAll(true)
			rpt.prepareEvents()
		}, () => {
			sga.emptyGrid()
			sga.contentIsLoading(false)
		})
	}

	fetch()
}

sga.emptyGrid = () => {
	$('#sga').replaceWith(`<div class="breakdown-view ez" id="sga"></div>`)
}

sga.buildStructure = (data) => {
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
		return d._id[`_id_${toolkit.replace(sga.breakdownBy(), '.', '_')}`]
	}).map((d) => {
		d.breakdowns = d.subs[0]._id
		d.count = 1

		return d
	})

	sga.level(1)
	let newParsed = _.orderBy(parsed, (d) => {
		return rpt.orderByChannel(d._id, d.PL8A)
	}, 'desc')
	return newParsed
}

sga.render = () => {
	if (sga.data().length == 0) {
		$('#sga').html('No data found.')
		return
	}


	// ========================= TABLE STRUCTURE

	let container = $('#sga')
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
		.css('height', `${rpt.rowHeaderHeight() * sga.level()}px`)
		.attr('data-rowspan', sga.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${rpt.rowHeaderHeight() * sga.level()}px`)
		.attr('data-rowspan', sga.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	// toolkit.newEl('th')
	// 	.html('% of N Sales')
	// 	.css('height', `${rpt.rowHeaderHeight() * sga.level()}px`)
	// 	.css('vertical-align', 'middle')
	// 	.css('font-weight', 'normal')
	// 	.css('font-style', 'italic')
	// 	.width(percentageWidth - 20)
	// 	.attr('data-rowspan', sga.level())
	// 	.addClass('cell-percentage-header align-right')
	// 	.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < sga.level(); i++) {
		trContents.push(toolkit.newEl('tr')
			.appendTo(tableContent)
			.css('height', `${rpt.rowHeaderHeight()}px`))
	}



	// ========================= BUILD HEADER

	let data = sga.data()

	let columnWidth = 130
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []

	let countWidthThenPush = (thheader, each, key) => {
		let currentColumnWidth = each._id.length * 10
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
			.css('border-top', 'none')
			.appendTo(trContents[0])

		if (sga.level() == 1) {
			console.log('--------', thheader1, lvl1, [lvl1._id])
			countWidthThenPush(thheader1, lvl1, [lvl1._id])

			// totalColumnWidth += percentageWidth
			// let thheader1p = toolkit.newEl('th')
			// 	.html('% of N Sales')
			// 	.width(percentageWidth)
			// 	.addClass('align-center')
			// 	.css('font-weight', 'normal')
			// 	.css('font-style', 'italic')
			// 	.css('border-top', 'none')
			// 	.appendTo(trContents[0])

			return
		}
		thheader1.attr('colspan', lvl1.count * 2)

		lvl1.subs.forEach((lvl2, j) => {
			let thheader2 = toolkit.newEl('th')
				.html(lvl2._id)
				.addClass('align-center')
				.appendTo(trContents[1])

			if (sga.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales')
					.width(percentageWidth)
					.addClass('align-center')
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.appendTo(trContents[1])

				return
			}
			thheader2.attr('colspan', lvl2.count)
		})
	})

	tableContent.css('min-width', totalColumnWidth)



	// ========================= CONSTRUCT DATA
	
	let plmodels = rpt.plmodels()
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

		rows.push(row)
	})

	console.log("rows", rows)
	
	// let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
	// let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
	rows.forEach((d, e) => {
		// let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
		// if (d.PLCode == discountActivityPLCode) {
		// 	TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
		// }

		// if (TotalPercentage < 0)
		// 	TotalPercentage = TotalPercentage * -1 
		// rows[e].Percentage = toolkit.number(TotalPercentage)
		rows[e].Percentage = 0
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
			rpt.clickExpand(container, trHeader)
		})

		toolkit.newEl('td')
			.html('<i></i>' + d.PNL)
			.appendTo(trHeader)

		let pnlTotal = kendo.toString(d.PNLTotal, 'n0')
		toolkit.newEl('td')
			.html(pnlTotal)
			.addClass('align-right')
			.appendTo(trHeader)

		// toolkit.newEl('td')
		// 	.html(kendo.toString(d.Percentage, 'n2') + ' %')
		// 	.addClass('align-right')
		// 	.appendTo(trHeader)

		let trContent = toolkit.newEl('tr')
			.addClass(`column${PL}`)
			.attr(`idpl`, PL)
			.attr(`data-row`, `row-${i}`)
			.css('height', `${rpt.rowContentHeight()}px`)
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

			// let cellPercentage = toolkit.newEl('td')
			// 	.html(percentage)
			// 	.addClass('align-right')
			// 	.appendTo(trContent)

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
}







sga.optionBreakdownValues = ko.observableArray([])
sga.breakdownValueAll = { _id: 'All', Name: 'All' }
sga.changeBreakdown = () => {
	let all = sga.breakdownValueAll
	let map = (arr) => arr.map((d) => {
		if ("customer.channelname" == sga.breakdownBy()) {
			return d
		}
		if ("customer.keyaccount" == sga.breakdownBy()) {
			return { _id: d._id, Name: d._id }
		}

		return { _id: d.Name, Name: d.Name }
	})
	setTimeout(() => {
		sga.breakdownValue([])

		switch (sga.breakdownBy()) {
			case "customer.areaname":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
				sga.breakdownValue([all._id])
			break;
			case "customer.region":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
				sga.breakdownValue([all._id])
			break;
			case "customer.zone":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
				sga.breakdownValue([all._id])
			break;
			case "product.brand":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
				sga.breakdownValue([all._id])
			break;
			case "customer.branchname":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
				sga.breakdownValue([all._id])
			break;
			case "customer.branchgroup":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.BranchGroup())))
				sga.breakdownValue([all._id])
			break;
			case "customer.channelname":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
				sga.breakdownValue([all._id])
			break;
			case "customer.keyaccount":
				sga.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
				sga.breakdownValue([all._id])
			break;
		}
	}, 100)
}
sga.changeBreakdownValue = () => {
	let all = sga.breakdownValueAll
	setTimeout(() => {
		let condA1 = sga.breakdownValue().length == 2
		let condA2 = sga.breakdownValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			sga.breakdownValue.remove(all._id)
			return
		}

		let condB1 = sga.breakdownValue().length > 1
		let condB2 = sga.breakdownValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			sga.breakdownValue([all._id])
			return
		}

		let condC1 = sga.breakdownValue().length == 0
		if (condC1) {
			sga.breakdownValue([all._id])
		}
	}, 100)
}





vm.currentMenu('Analysis')
vm.currentTitle('SG&A Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Analysis', href: '#' },
	{ title: 'SG&A Analysis', href: '#' }
])

rpt.refresh = () => {
	sga.changeBreakdown()
	sga.changeBreakdownValue()
	setTimeout(() => {
		sga.breakdownValue(['All'])
		sga.refresh()
	}, 200)
}

$(() => {
	rpt.refresh()
	rpt.showExport(true)
})
