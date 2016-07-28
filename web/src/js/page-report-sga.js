viewModel.sga = {}
let sga = viewModel.sga

;(() => {
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

	sga.constructData = (raw) => {
		sga.data([])

		// let op1 = _.groupBy(raw, (d) => [d.account, d.accountGroup].join('|'))
		// let op2 = _.map(op1, (v, k) => ({
		// 	_id: sga.getAlphaNumeric(k),
		// 	PLHeader1: v[0].accountGroup,
		// 	PLHeader2: v[0].accountGroup,
		// 	PLHeader3: v[0].account,
		// }))

		// let oq1 = _.groupBy(sga.rawData(), (d) => d.accountGroup)
		// let oq2 = _.map(oq1, (v, k) => ({
		// 	_id: sga.getAlphaNumeric(k),
		// 	PLHeader1: v[0].accountGroup,
		// 	PLHeader2: v[0].accountGroup,
		// 	PLHeader3: v[0].accountGroup,
		// }))
		// rpt.plmodels(op2.concat(oq2))

		let oq1 = _.groupBy(raw, (d) => d.AccountDescription)
		let oq2 = _.map(oq1, (v, k) => ({
			_id: sga.getAlphaNumeric(k),
			PLHeader1: v[0].AccountDescription,
			PLHeader2: v[0].AccountDescription,
			PLHeader3: v[0].AccountDescription,
		}))
		rpt.plmodels(oq2)

		let key = sga.breakdownBy()
		let cache = {}
		let rawData = []
		raw.forEach((d) => {
			let breakdown = d[key]
			let o = cache[breakdown]
			if (typeof o === 'undefined') {
				o = {}
				o._id = {}
				o._id[`_id_${key}`] = breakdown
				rawData.push(o)
			}
			cache[breakdown] = o

			// let plID = sga.getAlphaNumeric([d.account, d.accountGroup].join('|'))
			// let plmodel = rpt.plmodels().find((e) => e._id == plID)
			// if (o.hasOwnProperty(plmodel._id)) {
			// 	o[plmodel._id] += d.value
			// } else {
			// 	o[plmodel._id] = d.value
			// }

			// let plIDHeader = sga.getAlphaNumeric(d.accountGroup)
			// let plmodelHeader = rpt.plmodels().find((e) => e._id == plIDHeader)
			// if (o.hasOwnProperty(plmodelHeader._id)) {
			// 	o[plmodelHeader._id] += d.value
			// } else {
			// 	o[plmodelHeader._id] = d.value
			// }

			let plID = sga.getAlphaNumeric(d.AccountDescription)
			let plmodel = rpt.plmodels().find((e) => e._id == plID)
			if (o.hasOwnProperty(plmodel._id)) {
				o[plmodel._id] += d.Amount
			} else {
				o[plmodel._id] = d.Amount
			}
		})
		sga.data(rawData)
	}

	// ==========



	sga.contentIsLoading = ko.observable(false)
	sga.breakdownNote = ko.observable('')
	sga.showFilter = ko.observable(false)

	sga.breakdownBy = ko.observable('BranchName')
	sga.breakdownValue = ko.observableArray([])
	sga.breakdownByFiscalYear = ko.observable('date.fiscal')

	sga.data = ko.observableArray([])
	sga.fiscalYear = ko.observable(rpt.value.FiscalYear())
	sga.level = ko.observable(1)

	sga.filterBranch = ko.observableArray([])
	sga.filterCostGroup = ko.observableArray([])

	sga.optionFilterCostGroups = ko.observableArray([])

	rpt.fillFilterCostGroup = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getdatafunction", {}, (res) => {
			sga.optionFilterCostGroups(_.orderBy(res.data, (d) => d.Name))
		})
	}

	sga.changeAndRefresh = (what) => {
		sga.filterBranch([])
		sga.filterCostGroup([])

		sga.breakdownBy(what)
		sga.refresh()
	}

	sga.refresh = (useCache = false) => {
		let param = {}
		param.year = parseInt(sga.fiscalYear().split('-')[0], 10)

		if (sga.filterBranch().length > 0) {
			param.branchnames = sga.filterBranch()
		}
		if (sga.filterCostGroup().length > 0) {
			param.costgroups = sga.filterCostGroup()
		}

		sga.contentIsLoading(true)

		let fetch = () => {
			toolkit.ajaxPost(viewModel.appName + "report/getdatasga", param, (res) => {
				if (res.Status == "NOK") {
					setTimeout(() => {
						fetch()
					}, 1000 * 5)
					return
				}

				sga.contentIsLoading(false)
				sga.constructData(res.data)
				sga.data(sga.buildStructure(sga.data()))
				sga.emptyGrid()
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
		// let newParsed = _.orderBy(parsed, (d) => d._id, 'asc')
		return parsed
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

				row.PNLTotal += toolkit.number(value)
			})
			// dataFlat.forEach((e) => {
			// 	let breakdown = e.key
			// 	let percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100; 
			// 	percentage = toolkit.number(percentage)

			// 	if (d._id == discountActivityPLCode) {
			// 		percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
			// 	} else if (d._id != netSalesPLCode) {
			// 		percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
			// 	}

			// 	if (percentage < 0)
			// 		percentage = percentage * -1

			// 	row[`${breakdown} %`] = percentage
			// })

			rows.push(row)
		})

		console.log("rows", rows)
		
		// let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
		// let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
		// rows.forEach((d, e) => {
		// 	// let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
		// 	// if (d.PLCode == discountActivityPLCode) {
		// 	// 	TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
		// 	// }

		// 	// if (TotalPercentage < 0)
		// 	// 	TotalPercentage = TotalPercentage * -1 
		// 	// rows[e].Percentage = toolkit.number(TotalPercentage)
		// 	rows[e].Percentage = 0
		// })




		// ========================= PLOT DATA

		_.orderBy(rows, (d) => d.PNLTotal, 'desc').forEach((d, i) => {
		// rows.forEach((d, i) => {
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


		// ======= TOTAL

		let trFooterContainer

		let trFooterLeft = toolkit.newEl('tr')
			.addClass(`footerTotal`)
			.attr(`idheaderpl`, 'Total')
			.attr(`data-row`, `row-${rows.length}`)
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableHeader)

		toolkit.newEl('td')
			.html('<i></i> Total')
			.appendTo(trFooterLeft)

		let pnlTotal = kendo.toString(toolkit.sum(rows, (d) => d.PNLTotal), 'n0')
		toolkit.newEl('td')
			.html(pnlTotal)
			.addClass('align-right')
			.appendTo(trFooterLeft)

		let trFooterRight = toolkit.newEl('tr')
			.addClass(`footerTotal`)
			.attr(`idpl`, 'Total')	
			.attr(`data-row`, `row-${rows.length}`)
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableContent)

		dataFlat.forEach((e, f) => {
			let value = kendo.toString(toolkit.sum(rows, (d) => d[e.key]), 'n0')

			if ($.trim(value) == '') {
				value = 0
			}

			let cell = toolkit.newEl('td')
				.html(value)
				.addClass('align-right')
				.appendTo(trFooterRight)
		})
		

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows)
	}
})()






viewModel.allocated = {}
let au = viewModel.allocated

;(() => {
	au.contentIsLoading = ko.observable(false)
	au.breakdownNote = ko.observable('')

	au.breakdownBy = ko.observable('customer.channelname')
	au.breakdownSGA = ko.observable('sgaalloc')
	au.breakdownValue = ko.observableArray([])
	au.breakdownByFiscalYear = ko.observable('date.fiscal')

	au.data = ko.observableArray([])
	au.fiscalYear = ko.observable(rpt.value.FiscalYear())
	au.level = ko.observable(1)

	au.refresh = (useCache = false) => {
		let param = {}
		param.pls = []
		param.aggr = 'sum'
		param.flag = 'gna'
		param.filters = rpt.getFilterValue(false, au.fiscalYear)
		param.groups = rpt.parseGroups([au.breakdownBy(), au.breakdownSGA()])
		au.contentIsLoading(true)

		let breakdownValue = au.breakdownValue().filter((d) => d !== 'All')
		if (breakdownValue.length > 0) {
			param.filters.push({
				Field: au.breakdownBy(),
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
					au.contentIsLoading(false)
					return
				}

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
				rpt.plmodels(res.Data.PLModels)
				au.data(au.buildStructure(res.Data.Data))
				au.emptyGrid()
				au.contentIsLoading(false)
				au.render()
				rpt.showZeroValue(true)
				rpt.prepareEvents()

				// HHHHHHAAAA

				$("#au .table-header tr:gt(0):lt(88)").hide()
				$("#au .table-content tr:gt(0):lt(88)").hide()

				$("#au .table-header tr:gt(70)").hide()
				$("#au .table-content tr:gt(70)").hide()

				$('.fa.fa-chevron-right').trigger('click')
			}, () => {
				au.emptyGrid()
				au.contentIsLoading(false)
			})
		}

		fetch()
	}
	au.clickExpand = (e) => {
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

	au.emptyGrid = () => {
		$('#au').replaceWith(`<div class="breakdown-view ez" id="au"></div>`)
	}

	au.buildPLModels = (plmodels) => {
		plmodels
			.filter((d) => d.PLHeader1 === 'G&A Expenses')
			.forEach((d) => {
				d.PLHeader1 = 'Direct'
			})
		plmodels
			.filter((d) => d.PLHeader2 === 'G&A Expenses')
			.forEach((d) => {
				d.PLHeader2 = 'Direct'
			})
		plmodels
			.filter((d) => d.PLHeader3 === 'G&A Expenses')
			.forEach((d) => {
				d.PLHeader3 = 'Direct'
			})

		plmodels.forEach((d) => {
			if (d.PLHeader1 == 'Direct' || d.PLHeader2 == 'Direct' || d.PLHeader3 == 'Direct') {
				let c = toolkit.clone(d)
				c._id = `${d._id}_allocated`
				if (c.PLHeader1 == 'Direct') {
					c.PLHeader1 = 'Allocated'
				} else {
					c.PLHeader1 = `${c.PLHeader1} `
				}
				if (c.PLHeader2 == 'Direct') {
					c.PLHeader2 = 'Allocated'
				} else {
					c.PLHeader2 = `${c.PLHeader2} `
				}
				if (c.PLHeader3 == 'Direct') {
					c.PLHeader3 = 'Allocated'
				} else {
					c.PLHeader3 = `${c.PLHeader3} `
				}
				plmodels.push(c)
			}
		})

		console.log('plmodels', plmodels)
		return plmodels
	}

	au.buildStructure = (data) => {
		let breakdown = toolkit.replace(au.breakdownBy(), '.', '_')
		let indirectData = data.filter((d) => d._id._id_sgaalloc != 'Direct')
		data = data.filter((d) => d._id._id_sgaalloc == 'Direct')
		data.forEach((d) => {
			let target = indirectData.find((k) => k._id[`_id_${breakdown}`] == d._id[`_id_${breakdown}`])
			// console.log('---target', target)

			for (let p in d) {
				if (d.hasOwnProperty(p)) {
					if ((p.indexOf('PL33') > -1) || (p.indexOf('PL34') > -1) || (p.indexOf('PL35') > -1) || (p.indexOf('PL94A') > -1)) {
						if (typeof target !== 'undefined') {
							d[`${p}_allocated`] = target[p]
						}
					}
				}
			}
		})

		// console.log('----data', data)

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
			return d._id[`_id_${toolkit.replace(au.breakdownBy(), '.', '_')}`]
		}).map((d) => {
			d.breakdowns = d.subs[0]._id
			d.count = 1

			return d
		})

		au.level(1)
		let newParsed = _.orderBy(parsed, (d) => {
			return rpt.orderByChannel(d._id, d.PL8A)
		}, 'desc')
		return newParsed
	}

	au.render = () => {
		let plmodels = au.buildPLModels(rpt.plmodels())
		plmodels = _.sortBy(plmodels, (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
		plmodels = _.filter(plmodels, (d) => {
			return (d._id.indexOf('PL33') > -1) || (d._id.indexOf('PL34') > -1) || (d._id.indexOf('PL35') > -1) || (d._id.indexOf('PL94A') > -1)
		})
		rpt.plmodels(plmodels)

		if (au.data().length == 0) {
			$('#au').html('No data found.')
			return
		}


		// ========================= TABLE STRUCTURE

		let percentageWidth = 100

		let wrapper = toolkit.newEl('div')
			.addClass('pivot-pnl-branch pivot-pnl')
			.appendTo($('#au'))

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
			.css('height', `${rpt.rowHeaderHeight() * au.level()}px`)
			.attr('data-rowspan', au.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header')
			.appendTo(trHeader)

		toolkit.newEl('th')
			.html('Total')
			.css('height', `${rpt.rowHeaderHeight() * au.level()}px`)
			.attr('data-rowspan', au.level())
			.css('vertical-align', 'middle')
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

		// toolkit.newEl('th')
		// 	.html('% of N Sales')
		// 	.css('height', `${rpt.rowHeaderHeight() * au.level()}px`)
		// 	.css('vertical-align', 'middle')
		// 	.css('font-weight', 'normal')
		// 	.css('font-style', 'italic')
		// 	.width(percentageWidth - 20)
		// 	.attr('data-rowspan', au.level())
		// 	.addClass('cell-percentage-header align-right')
		// 	.appendTo(trHeader)

		let trContents = []
		for (let i = 0; i < au.level(); i++) {
			trContents.push(toolkit.newEl('tr')
				.appendTo(tableContent)
				.css('height', `${rpt.rowHeaderHeight()}px`))
		}



		// ========================= BUILD HEADER

		let data = au.data()

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

			if (au.level() == 1) {
				countWidthThenPush(thheader1, lvl1, [lvl1._id])

				totalColumnWidth += percentageWidth
				let thheader1p = toolkit.newEl('th')
					.html('% of N Sales')
					.width(percentageWidth)
					.addClass('align-center')
					.css('font-weight', 'normal')
					.css('font-style', 'italic')
					.css('border-top', 'none')
					// .appendTo(trContents[0])

				return
			}
			thheader1.attr('colspan', lvl1.count * 2)

			lvl1.subs.forEach((lvl2, j) => {
				let thheader2 = toolkit.newEl('th')
					.html(lvl2._id)
					.addClass('align-center')
					.appendTo(trContents[1])

				if (au.level() == 2) {
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
		
		let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */]
		let netSalesPLCode = 'PL8A'
		let netSalesRow = {}
		let grossSalesPLCode = 'PL0'
		let grossSalesRow = {}
		let discountActivityPLCode = 'PL7A'
		let rows = []

		rpt.fixRowValue(dataFlat)

		// console.log("dataFlat", dataFlat)

		// dataFlat.forEach((e) => {
		// 	let breakdown = e.key
		// 	netSalesRow[breakdown] = e[netSalesPLCode]
		// 	grossSalesRow[breakdown] = e[grossSalesPLCode]
		// })

		// console.log('asdfasdfasdf', plmodels)

		plmodels.forEach((d) => {
			let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
			console.log('-----', row.PNL, row.PLCode)

			dataFlat.forEach((e) => {
				let breakdown = e.key
				let value = e[`${d._id}`]; 
				row[breakdown] = value

				if (toolkit.isDefined(e.excludeFromTotal)) {
					return
				}

				row.PNLTotal += value
			})
			// dataFlat.forEach((e) => {
			// 	let breakdown = e.key
			// 	let percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100; 
			// 	percentage = toolkit.number(percentage)

			// 	if (d._id == discountActivityPLCode) {
			// 		percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
			// 	} else if (d._id != netSalesPLCode) {
			// 		percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
			// 	}

			// 	if (percentage < 0)
			// 		percentage = percentage * -1

			// 	row[`${breakdown} %`] = percentage
			// })

			if (exceptions.indexOf(row.PLCode) > -1) {
				return
			}

			rows.push(row)
		})

		console.log("rows", rows)
		
		// let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
		// // let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
		// rows.forEach((d, e) => {
		// 	let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
		// 	// if (d.PLCode == discountActivityPLCode) {
		// 	// 	TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
		// 	// }

		// 	if (TotalPercentage < 0)
		// 		TotalPercentage = TotalPercentage * -1 
		// 	rows[e].Percentage = toolkit.number(TotalPercentage)
		// })




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
				au.clickExpand(trHeader)
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

				// $([cell, cellPercentage]).on('click', () => {
				// 	au.renderDetail(d.PLCode, e.breakdowns)
				// })
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







	au.optionBreakdownValues = ko.observableArray([])
	au.breakdownValueAll = { _id: 'All', Name: 'All' }
	au.changeBreakdown = () => {
		let all = au.breakdownValueAll
		let map = (arr) => arr.map((d) => {
			if ("customer.channelname" == au.breakdownBy()) {
				return d
			}
			if ("customer.keyaccount" == au.breakdownBy()) {
				return { _id: d._id, Name: d._id }
			}

			return { _id: d.Name, Name: d.Name }
		})
		setTimeout(() => {
			au.breakdownValue([])

			switch (au.breakdownBy()) {
				case "customer.areaname":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
					au.breakdownValue([all._id])
				break;
				case "customer.region":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
					au.breakdownValue([all._id])
				break;
				case "customer.zone":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
					au.breakdownValue([all._id])
				break;
				case "product.brand":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
					au.breakdownValue([all._id])
				break;
				case "customer.branchname":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
					au.breakdownValue([all._id])
				break;
				case "customer.branchgroup":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.BranchGroup())))
					au.breakdownValue([all._id])
				break;
				case "customer.channelname":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
					au.breakdownValue([all._id])
				break;
				case "customer.keyaccount":
					au.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
					au.breakdownValue([all._id])
				break;
			}
		}, 100)
	}
	au.changeBreakdownValue = () => {
		let all = au.breakdownValueAll
		setTimeout(() => {
			let condA1 = au.breakdownValue().length == 2
			let condA2 = au.breakdownValue().indexOf(all._id) == 0
			if (condA1 && condA2) {
				au.breakdownValue.remove(all._id)
				return
			}

			let condB1 = au.breakdownValue().length > 1
			let condB2 = au.breakdownValue().reverse()[0] == all._id
			if (condB1 && condB2) {
				au.breakdownValue([all._id])
				return
			}

			let condC1 = au.breakdownValue().length == 0
			if (condC1) {
				au.breakdownValue([all._id])
			}
		}, 100)
	}
})()


vm.currentMenu('Analysis')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Analysis', href: '#' },
	{ title: 'G&A Analysis', href: '#' }
])

rpt.refresh = () => {
	// sga.refresh()
	au.refresh()
}

$(() => {
	rpt.fillFilterCostGroup()
	rpt.refresh()
	rpt.showExport(true)
})
