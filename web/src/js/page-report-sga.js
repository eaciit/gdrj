viewModel.sga = {}
let sga = viewModel.sga

;(() => {
	// ========== PARSE ======
	sga.getAlphaNumeric = (what) => what.replace(/\W/g, '')

	sga.constructData = (raw) => {
		sga.data([])

		let op1 = _.groupBy(raw, (d) => [d.AccountDescription, d.AccountGroup].join('|'))
		let op2 = _.map(op1, (v, k) => ({
			_id: sga.getAlphaNumeric(k),
			PLHeader1: v[0].AccountGroup,
			PLHeader2: v[0].AccountGroup,
			PLHeader3: v[0].AccountDescription,
		}))

		let oq1 = _.groupBy(raw, (d) => d.AccountGroup)
		let oq2 = _.map(oq1, (v, k) => ({
			_id: sga.getAlphaNumeric(k),
			PLHeader1: v[0].AccountGroup,
			PLHeader2: v[0].AccountGroup,
			PLHeader3: v[0].AccountGroup,
		}))
		rpt.plmodels(op2.concat(oq2))

		// let oq1 = _.groupBy(raw, (d) => d.AccountDescription)
		// let oq2 = _.map(oq1, (v, k) => ({
		// 	_id: sga.getAlphaNumeric(k),
		// 	PLHeader1: v[0].AccountDescription,
		// 	PLHeader2: v[0].AccountDescription,
		// 	PLHeader3: v[0].AccountDescription,
		// }))
		// rpt.plmodels(oq2)

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

			let plID = sga.getAlphaNumeric([d.AccountDescription, d.AccountGroup].join('|'))
			let plmodel = rpt.plmodels().find((e) => e._id == plID)
			if (o.hasOwnProperty(plmodel._id)) {
				o[plmodel._id] += d.Amount
			} else {
				o[plmodel._id] = d.Amount
			}

			let plIDHeader = sga.getAlphaNumeric(d.AccountGroup)
			let plmodelHeader = rpt.plmodels().find((e) => e._id == plIDHeader)
			if (o.hasOwnProperty(plmodelHeader._id)) {
				o[plmodelHeader._id] += d.Amount
			} else {
				o[plmodelHeader._id] = d.Amount
			}

			// let plID = sga.getAlphaNumeric(d.AccountDescription)
			// let plmodel = rpt.plmodels().find((e) => e._id == plID)
			// if (o.hasOwnProperty(plmodel._id)) {
			// 	o[plmodel._id] += d.Amount
			// } else {
			// 	o[plmodel._id] = d.Amount
			// }
		})
		sga.data(rawData)
		console.log('rawData', rawData)
	}

	// ==========



	sga.contentIsLoading = ko.observable(false)
	sga.breakdownNote = ko.observable('')
	sga.filterbylv1 = [
		{ id: "BranchName", title: "Branch Level 1"},
		{ id: "BranchLvl2", title: "Branch Level 2"},
		{ id: "BranchGroup", title: "Branch Group"},
	]
	sga.filterbylv2 = [
		{ id: "BranchLvl2", title: "Branch Level 2"},
		{ id: "BranchGroup", title: "Branch Group"},
	]

	sga.breakdownBy = ko.observable('BranchName')
	sga.filterBy = ko.observable('BranchName')
	sga.breakdownValue = ko.observableArray([])
	sga.breakdownByFiscalYear = ko.observable('date.fiscal')

	sga.data = ko.observableArray([])
	sga.fiscalYear = ko.observable(rpt.value.FiscalYear())
	sga.level = ko.observable(1)

	sga.filterBranch = ko.observableArray([])
	sga.filterBranchLvl2 = ko.observableArray([])
	sga.filterBranchGroup = ko.observableArray([])
	sga.filterCostGroup = ko.observableArray([])

	sga.optionBranchLvl2 = ko.observableArray([])
	sga.optionFilterCostGroups = ko.observableArray([])
	sga.putNetSalesPercentage = ko.observable(true)
	sga.title = ko.observable('G&A by Branch Level 1')

	rpt.fillFilterCostGroup = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getdatafunction", {}, (res) => {
			sga.optionFilterCostGroups(_.orderBy(res.data, (d) => d.Name))
		})
	}

	rpt.fillFilterBranchLvl2 = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getdatamasterbranchlvl2", {}, (res) => {
			sga.optionBranchLvl2(_.orderBy(res.data, (d) => d.Name))
		})
	}

	sga.selectfilter = () => {
		sga.filterBranch([])
		sga.filterBranchLvl2([])
		sga.filterBranchGroup([])
	}

	sga.exportExcel = () => {
		rpt.export('#sga', `G&A Analysis - ${sga.title()}`, 'header-content')
	}

	sga.changeAndRefresh = (what, title) => {
		if ($('.panel-filter').is(':visible')) {
		    rpt.toggleFilter()
		}

		sga.putNetSalesPercentage(true)
		if (what == 'CostGroup') {
			sga.putNetSalesPercentage(false)
		}

		sga.title(title)

		sga.breakdownBy(what)
		sga.filterBy(what)
		sga.refresh()
	}

	sga.resetAllFilters = () => {
		sga.filterBranch([])
		sga.filterBranchLvl2([])
		sga.filterBranchGroup([])
		sga.filterCostGroup([])
		au.breakdownBranchGroup([])
		yoy.breakdownValue([])
		yoy.changeBreakdownBy()
	}

	sga.refresh = (useCache = false) => {
		let param = {}
		param.year = parseInt(sga.fiscalYear().split('-')[0], 10)
		param.groups = [sga.breakdownBy()]

		if (sga.filterBranch().length > 0) {
			param.branchnames = sga.filterBranch()
		}
		if (sga.filterBranchLvl2().length > 0) {
			param.branchlvl2 = sga.filterBranchLvl2()
		}
		if (sga.filterBranchGroup().length > 0) {
			param.branchgroups = sga.filterBranchGroup()
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

				sga.constructData(res.data)
				sga.data(sga.buildStructure(sga.data()))
				sga.emptyGrid()

				let callback = () => {
					sga.contentIsLoading(false)
					sga.render()
					rpt.prepareEvents()
				}

				if (sga.putNetSalesPercentage()) {
					let groups = []
					let groupBy = ''
					let groupByForInjectingNetSales = ''
					switch (sga.breakdownBy()) {
						case 'BranchName':
							groupBy = 'customer.branchname'
							groupByForInjectingNetSales = 'customer.branchname'
							groups.push('customer.branchid')
							if (sga.filterBy() == 'BranchLvl2')
								groups.push('customer.branchlvl2')
							else if (sga.filterBy() == 'BranchGroup')
								groups.push('customer.branchgroup')
						break
						case 'BranchLvl2':
							groupBy = 'customer.branchlvl2'
							groupByForInjectingNetSales = 'customer.branchname'
							groups.push('customer.branchid')
							groups.push('customer.branchname')
							if (sga.filterBy() == 'BranchGroup')
								groups.push('customer.branchgroup')
						break
						case 'BranchGroup':
							groupBy = 'customer.branchgroup'
							groupByForInjectingNetSales = 'customer.branchgroup'
						break
					}

					groups.push(groupBy)

					let param2 = {}
					param2.pls = []
					param2.aggr = 'sum'
					param2.filters = rpt.getFilterValue(false, sga.fiscalYear)
					param2.groups = rpt.parseGroups(groups)

					if (sga.filterBranch().length > 0) {
						param2.filters.push({
							Field: 'customer.branchname',
							Op: '$in',
							Value: sga.filterBranch()
						})
					}
					if (sga.filterBranchGroup().length > 0) {
						param2.filters.push({
							Field: 'customer.branchgroup',
							Op: '$in',
							Value: sga.filterBranchGroup()
						})
					}
					
					toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param2, (res2) => {
						rpt.plmodels([{
							PLHeader1: 'Net Sales',
							PLHeader2: 'Net Sales',
							PLHeader3: 'Net Sales',
							_id: 'PL8A'
						}].concat(rpt.plmodels()))

						sga.data().forEach((d) => {
							d.PL8A = 0

							let key = `_id_${toolkit.replace(groupByForInjectingNetSales, '.', '_')}`
							let target = res2.Data.Data.filter((e) => e._id[key] == d._id)
							if (target.length == 0) {
								return
							}

							d.PL8A = toolkit.sum(target, (k) => k.PL8A)
						})

						callback()
					}, () => {
						callback()
					})

					return
				}

				callback()
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

		if (sga.putNetSalesPercentage()) {
			toolkit.newEl('th')
				.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
				.css('height', `${rpt.rowHeaderHeight() * sga.level()}px`)
				.css('vertical-align', 'middle')
				.css('font-weight', 'normal')
				.css('font-style', 'italic')
				.width(percentageWidth - 20)
				.attr('data-rowspan', sga.level())
				.addClass('cell-percentage-header align-right')
				.appendTo(trHeader)
		}

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
				.html(lvl1._id.replace(/\ /g, '&nbsp;'))
				.attr('colspan', lvl1.count)
				.addClass('align-center')
				.css('border-top', 'none')
				.appendTo(trContents[0])

			if (sga.level() == 1) {
				countWidthThenPush(thheader1, lvl1, [lvl1._id])

				if (sga.putNetSalesPercentage()) {
					totalColumnWidth += percentageWidth
					let thheader1p = toolkit.newEl('th')
						.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
						.width(percentageWidth)
						.addClass('align-center')
						.css('font-weight', 'normal')
						.css('font-style', 'italic')
						.css('border-top', 'none')
						.appendTo(trContents[0])
				}

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth
					toolkit.newEl('th')
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
						.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
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
			dataFlat.forEach((e) => {
				let breakdown = e.key
				let percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100
				let percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100

				if (d._id != netSalesPLCode) {
					percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
				}

				if (percentage < 0)
					percentage = percentage * -1

				row[`${breakdown} %`] = percentage
				row[`${breakdown} %t`] = percentageOfTotal
			})

			rows.push(row)
		})

		console.log("rows", rows)
		
		if (sga.putNetSalesPercentage()) {
			let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
			rows.forEach((d, e) => {
				let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100

				if (TotalPercentage < 0)
					TotalPercentage = TotalPercentage * -1 
				rows[e].Percentage = toolkit.number(TotalPercentage)
			})
		}




		// ========================= PLOT DATA

		_.orderBy(rows, (d) => {
			if (d.PLCode == netSalesPLCode) {
				return -10000000000000
			}

			return d.PNLTotal
		}, 'asc').forEach((d, i) => {
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

			if (sga.putNetSalesPercentage()) {
				toolkit.newEl('td')
					.html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%')
					.addClass('align-right')
					.appendTo(trHeader)
			}

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

				if (sga.putNetSalesPercentage()) {
					toolkit.newEl('td')
						.html(percentage)
						.addClass('align-right')
						.appendTo(trContent)
				}

				if (rpt.showPercentOfTotal()) {
					toolkit.newEl('td')
						.html(percentageOfTotal)
						.addClass('align-right')
						.appendTo(trContent)
				}
			})

			rpt.putStatusVal(trHeader, trContent)
		})


		// ======= TOTAL

		let keys = _.map(_.groupBy(rpt.plmodels(), (d) => d.PLHeader1), (v, k) => k)
		let rowsForTotal = rows.filter((d) => keys.indexOf(d.PNL) > -1 && d.PLCode !== 'PL8A')

		let trFooterLeft = toolkit.newEl('tr')
			.addClass(`footerTotal`)
			.attr(`idheaderpl`, 'Total')
			.attr(`data-row`, `row-${rows.length}`)
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableHeader)

		toolkit.newEl('td')
			.html('<i></i> Total G&A')
			.appendTo(trFooterLeft)

		let pnlTotal = toolkit.sum(rowsForTotal, (d) => d.PNLTotal)
		let netSalesTotal = toolkit.sum(sga.data(), (d) => d.PL8A)
		toolkit.newEl('td')
			.html(kendo.toString(pnlTotal, 'n0'))
			.addClass('align-right')
			.appendTo(trFooterLeft)

		if (sga.putNetSalesPercentage()) {
			toolkit.newEl('td')
				.html(kendo.toString(pnlTotal / netSalesTotal * 100, 'n2') + '&nbsp;%')
				.addClass('align-right')
				.appendTo(trFooterLeft)
		}

		let trFooterRight = toolkit.newEl('tr')
			.addClass(`footerTotal`)
			.attr(`idpl`, 'Total')	
			.attr(`data-row`, `row-${rows.length}`)
			.css('height', `${rpt.rowContentHeight()}px`)
			.appendTo(tableContent)

		dataFlat.forEach((e, f) => {
			let netSales = 0 
			let columnData = sga.data().find((d) => d._id == e._id)
			if (toolkit.isDefined(columnData)) {
				netSales = columnData.PL8A
			}

			let value = toolkit.sum(rowsForTotal, (d) => d[e.key])

			if ($.trim(value) == '') {
				value = 0
			}

			let percentage = toolkit.number(value / netSales) * 100
			let percentageOfTotal = toolkit.number(value / pnlTotal) * 100

			toolkit.newEl('td')
				.html(kendo.toString(value, 'n0'))
				.addClass('align-right')
				.appendTo(trFooterRight)

			if (sga.putNetSalesPercentage()) {
				toolkit.newEl('td')
					.html(kendo.toString(percentage, 'n2') + '&nbsp;%')
					.addClass('align-right')
					.appendTo(trFooterRight)
			}

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td')
					.html(kendo.toString(percentageOfTotal, 'n2') + '&nbsp;%')
					.addClass('align-right')
					.appendTo(trFooterRight)
			}
		})
		

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows)
	}
})()






viewModel.allocated = {}
let au = viewModel.allocated

;(() => {
	au.optionDimensions = ko.observableArray([
		{ field: 'customer.branchname', name: 'Branch Level 1' }, 
		{ field: 'customer.branchlvl2', name: 'Branch Level 2' }
	].concat(rpt.optionDimensions().splice(1)))
	au.contentIsLoading = ko.observable(false)
	au.breakdownNote = ko.observable('')

	au.breakdownBy = ko.observable('customer.channelname')
	au.breakdownByBackup = ko.observable(au.breakdownBy())
	au.breakdownSGA = ko.observable('sgaalloc')
	au.breakdownByFiscalYear = ko.observable('date.fiscal')
	au.breakdownBranchGroup = ko.observableArray([])

	au.data = ko.observableArray([])
	au.fiscalYear = ko.observable(rpt.value.FiscalYear())
	au.level = ko.observable(1)

	au.isUseBreakdownBy = ko.observable(false)
	au.changeBreakdownBy = (d) => {
		setTimeout(() => {
			au.breakdownByBackup(au.breakdownBy())
		})
	}

	au.changeTo = (d) => {
		if (d == 'only-channel') {
			au.isUseBreakdownBy(false)
			au.breakdownBy('customer.channelname')
			return
		}
		
		au.isUseBreakdownBy(true)
		au.breakdownBy(au.breakdownByBackup())
	}

	au.refresh = (useCache = false) => {
		let param = {}
		param.pls = []
		param.groups = rpt.parseGroups([au.breakdownBy()])
		param.aggr = 'sum'
		param.filters = rpt.getFilterValue(false, au.fiscalYear)

		let breakdownBranchGroup = au.breakdownBranchGroup().filter((d) => d != 'All')
		if (breakdownBranchGroup.length > 0) {
			param.filters.push({
				Field: 'customer.branchgroup',
				Op: '$in',
				Value: au.breakdownBranchGroup()
			})
		}

		let fetch = () => {
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

				let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
				au.breakdownNote(`Last refreshed on: ${date}`)

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels)
				au.data(au.buildStructure(res.Data.Data))
				rpt.plmodels(au.buildPLModel(res.Data.PLModels))
				au.emptyGrid()
				au.contentIsLoading(false)
				au.render()
				rpt.prepareEvents()

				$('.headerPL94A_Direct,.headerPL94A_Allocated').trigger('click')
			}, () => {
				au.emptyGrid()
				au.contentIsLoading(false)
			}, {
				cache: (useCache == true) ? 'breakdown chart' : false
			})
		}

		au.contentIsLoading(true)
		fetch()
	}

	au.buildPLModel = (plmodels) => {
		return plmodels.filter((d) => {
			if (d._id.indexOf('PL94A') > -1) return true
			if (d._id.indexOf('PL33') > -1)  return true
			if (d._id.indexOf('PL34') > -1)  return true
			if (d._id.indexOf('PL35') > -1)  return true
			if (d._id.indexOf('PL8A') > -1)  return true

			return false
		})
	}

	au.clickExpand = (e) => {
		let right = $(e).find('i.fa-chevron-right').length, down = 0
			if (e.attr('idheaderpl') == 'PL0')
				down = $(e).find('i.fa-chevron-up').length
			else
				down = $(e).find('i.fa-chevron-down').length
		if (right > 0){
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', 480)
				$('.pivot-pnl .table-content').css('margin-left', 480)
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

	au.buildStructure = (data) => {
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
		let newParsed = _.orderBy(parsed, (d) => d.PL8A, 'desc')
		return newParsed
	}

	au.render = () => {
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

		toolkit.newEl('th')
			.html('% of N Sales'.replace(/\ /g, '&nbsp;'))
			.css('height', `${rpt.rowHeaderHeight() * au.level()}px`)
			.css('vertical-align', 'middle')
			.css('font-weight', 'normal')
			.css('font-style', 'italic')
			.width(percentageWidth - 20)
			.attr('data-rowspan', au.level())
			.addClass('cell-percentage-header align-right')
			.appendTo(trHeader)

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
			let currentColumnWidth = each._id.length * ((au.breakdownBy() == 'customer.channelname') ? 7 : 10)
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

			if (au.level() == 1) {
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
					let thheader1p = toolkit.newEl('th')
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

				if (au.level() == 2) {
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
						toolkit.newEl('th')
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
			// grossSalesRow[breakdown] = e[grossSalesPLCode]
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

				/** if (d._id == discountActivityPLCode) {
					percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
				} else */ if (d._id != netSalesPLCode) {
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
		// let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
		rows.forEach((d, e) => {
			let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
			// if (d.PLCode == discountActivityPLCode) {
			// 	TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
			// }

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
					au.renderDetail(d.PLCode, e.breakdowns)
				})
			})

			rpt.putStatusVal(trHeader, trContent)
		})
		

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows)
	}
})()







viewModel.yoy = {}
let yoy = viewModel.yoy

;(() => {
	yoy.optionDimensions = ko.observableArray([
		{ field: 'BranchName', name: 'Branch Level 1' }, 
		{ field: 'BranchLvl2', name: 'Branch Level 2' }, 
		{ field: 'BranchGroup', name: 'Branch Group' },
		{ field: 'CostGroup', name: 'Function' },
	])
	yoy.contentIsLoading = ko.observable(false)
	yoy.breakdownBy = ko.observable('BranchName')
	yoy.optionBreakdownValues = ko.observableArray([])
	yoy.breakdownValue = ko.observableArray([])
	yoy.data = ko.observableArray([])
	yoy.level = ko.observable(1)

	yoy.changeBreakdownBy = () => {
		toolkit.runAfter(() => {
			switch (yoy.breakdownBy()) {
				case 'BranchName': yoy.optionBreakdownValues(rpt.masterData.Branch()); break
				case 'BranchLvl2': yoy.optionBreakdownValues(sga.optionBranchLvl2()); break
				case 'BranchGroup': yoy.optionBreakdownValues(rpt.masterData.BranchGroup()); break
				case 'CostGroup': yoy.optionBreakdownValues(sga.optionFilterCostGroups()); break
			}

			yoy.breakdownValue([])
		}, 300)
	}

	yoy.refresh = () => {
		let param = {}
		param.groups = [yoy.breakdownBy()]
		yoy.contentIsLoading(true)

		if (yoy.breakdownValue().length > 0) {
			switch (yoy.breakdownBy()) {
				case 'BranchName': param.branchnames = yoy.breakdownValue(); break
				case 'BranchLvl2': param.branchlvl2 = yoy.breakdownValue(); break
				case 'BranchGroup': param.branchgroups = yoy.breakdownValue(); break
				case 'CostGroup': param.costgroups = yoy.breakdownValue(); break
			}
		}

		let fetch = () => {
			toolkit.ajaxPost(viewModel.appName + "report/getdatasga", param, (res) => {
				yoy.data(res.data)
				yoy.contentIsLoading(false)
				yoy.render()
			}, () => {
				yoy.contentIsLoading(false)
			})
		}

		fetch()
	}

	yoy.render = () => {
		let breakdownBy = yoy.breakdownBy()

		let op1 = _.groupBy(yoy.data(), (d) => d[breakdownBy])
		let op5 = _.map(op1, (v, k) => k)
		let columnsKey = _.orderBy(op5)

		let op2 = _.groupBy(yoy.data(), (d) => d.AccountGroup)
		let op3 = _.map(op2, (v, k) => {
			let o = {}
			o.key = k

			columnsKey.forEach((d, i) => {
				o[`col${i}`] = {}; let k = o[`col${i}`]
				k.key = d
				k.year2014 = toolkit.sum(_.filter(v, (e) => {
					return (e.Year == 2014) && (e[breakdownBy] == d)
				}), (e) => e.Amount)
				k.year2015 = toolkit.sum(_.filter(v, (e) => {
					return (e.Year == 2015) && (e[breakdownBy] == d)
				}), (e) => e.Amount)
				k.growth = toolkit.number((o[`col${i}`].year2015 - o[`col${i}`].year2014) / o[`col${i}`].year2014) * 100
			})

			return o
		})
		let mappedData = _.orderBy(op3, (d) => d.key)

		let firstColumnTitle = yoy.breakdownBy()
		let breakdownTitleRow = yoy.optionDimensions().find((d) => d.field == firstColumnTitle)
		if (toolkit.isDefined(breakdownTitleRow)) {
			firstColumnTitle = breakdownTitleRow.name
		}

		let columns = [{
			field: 'key',
			title: 'P&L',
			width: 200,
			locked: true,
			headerAttributes: { style: 'vertical-align: middle; text-align: center; font-weight: bold; border-right: 1px solid #ffffff;' }
		}].concat(columnsKey.map((d, i) => {
			let o = {}
			o.title = d
			o.headerAttributes = { style: 'text-align: center; font-weight: bold; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' }
			o.columns = [{
				field: `col${i}.year2015`,
				title: 'FY 2015-2016',
				width: 100,
				format: '{0:n0}',
				attributes: { class: 'align-right' },
				headerAttributes: { style: 'text-align: center; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' }
			}, {
				field: `col${i}.year2014`,
				title: 'FY 2014-2015',
				width: 100,
				format: '{0:n0}',
				attributes: { class: 'align-right' },
				headerAttributes: { style: 'text-align: center; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' }
			}, {
				field: `col${i}.growth`,
				title: '% Growth',
				width: 80,
				format: '{0:n2} %',
				attributes: { class: 'align-right' },
				headerAttributes: { style: 'text-align: center; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' }
			}]
			return o
		}))

		let config = {
			dataSource: {
				data: mappedData
			},
			columns: columns
		}

		$('#yoy').replaceWith(`<div class="breakdown-view ez" id="yoy"></div>`)
		$('#yoy').kendoGrid(config)
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
	sga.refresh()
	// au.refresh()
}

$(() => {
	rpt.fillFilterCostGroup()
	rpt.fillFilterBranchLvl2()
	rpt.refresh()
	rpt.showExport(true)
})
