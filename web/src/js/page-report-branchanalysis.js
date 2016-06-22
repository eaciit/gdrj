viewModel.breakdown = new Object()
let ba = viewModel.breakdown

ba.contentIsLoading = ko.observable(false)
ba.popupIsLoading = ko.observable(false)
ba.title = ko.observable('Branch Analysis')
ba.detail = ko.observableArray([])
ba.limit = ko.observable(10)
ba.breakdownNote = ko.observable('')

ba.breakdownBy = ko.observable('customer.branchname')
ba.breakdownByChannel = ko.observable('customer.channelname')
ba.breakdownByFiscalYear = ko.observable('date.fiscal')
ba.oldBreakdownBy = ko.observable(ba.breakdownBy())
ba.optionDimensions = ko.observableArray(rpt.optionDimensions().filter((d) => d.field != 'customer.channelname'))

ba.expand = ko.observable(false)
ba.data = ko.observableArray([])
ba.zeroValue = ko.observable(false)
ba.fiscalYear = ko.observable(rpt.value.FiscalYear())
ba.breakdownValue = ko.observableArray([])
ba.breakdownRD = ko.observable("All")
ba.optionBranch = ko.observableArray([{
		id: "All",
		title: "RD & Non RD",
	}, {
		id: "OnlyRD",
		title: "Only RD Sales"
	}, {
		id: "NonRD",
		title: "Non RD Sales"
	}
]) //rpt.masterData.Channel()

ba.breakdown2ndLevel = ko.observable(false)
ba.breakdown2ndLevelKey = ko.observable('customer.name')
ba.level = ko.observable(2)

ba.buildStructure = (data) => {
	let rdCategories = ["RD", "Non RD"]
	let keys = [
		"_id_customer_branchname",
		"_id_customer_channelid",
		"_id_customer_channelname",
	]

	let fixEmptySubs = (d) => {
		let subs = []
		rdCategories.forEach((cat, i) => {
			let row = d.subs.find((e) => e._id == cat)
			if (row == undefined) {
				let newRow = {}
				newRow._id = cat
				newRow.count = 1
				newRow.subs = []

				let newSubRow = {}
				newSubRow._id = cat
				newSubRow.count = 1
				newSubRow.subs = []
				for (let p in d.subs[0]) {
					if (d.subs[0].hasOwnProperty(p) && p.search("PL") > -1) {
						newSubRow[p] = 0
						newRow[p] = 0
					}
				}
				newRow.subs.push(newSubRow)

				row = newRow
			}

			subs[i] = row
		})
		return subs
	}

	let showAsBreakdown = (data) => {
		let renderTotalColumn = (d) => {
			let totalColumn = {}
			totalColumn._id = 'Total'
			totalColumn.count = 1
			totalColumn.excludeFromTotal = true

			let totalSubColumn = {}
			totalSubColumn._id = 'Total'
			totalSubColumn.count = 1
			totalSubColumn.excludeFromTotal = true

			for (let p in d.subs[0]) {
				if (d.subs[0].hasOwnProperty(p) && p.search('PL') > -1) {
					totalColumn[p] = toolkit.sum(d.subs, (e) => e[p])
					totalSubColumn[p] = toolkit.sum(d.subs, (e) => e[p])
				}
			}

			totalColumn.subs = [totalSubColumn]
			return totalColumn
		}

		switch (ba.breakdownRD()) {
			case 'All': {
				data.forEach((d) => {
					let totalColumn = renderTotalColumn(d)
					d.subs = [totalColumn].concat(d.subs)
					d.count = toolkit.sum(d.subs, (e) => e.count)
				})
			} break;
			case 'OnlyRD': {
				data.forEach((d) => {
					d.subs = d.subs.filter((e) => e._id == 'RD')
					d.count = toolkit.sum(d.subs, (e) => e.count)
				})
			} break;
			case 'NonRD': {
				data.forEach((d) => {
					d.subs = d.subs.filter((e) => e._id != 'RD')

					if (ba.expand()) {
						let totalColumn = renderTotalColumn(d)
						d.subs = [totalColumn].concat(d.subs)
					}

					d.count = toolkit.sum(d.subs, (e) => e.count)
				})
			} break;
		}
	}

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

	if (ba.expand()) {
		let parsed = groupThenMap(data, (d) => {
			return d._id._id_customer_branchname
		}).map((d) => {
			d.subs = groupThenMap(d.subs, (e) => {
				return e._id._id_customer_channelid == "I1" ? rdCategories[0] : rdCategories[1]
			}).map((e) => {
				e.subs = groupThenMap(e.subs, (f) => {
					return f._id._id_customer_channelname
				}).map((f) => {
					f.count = 1
					return f
				})

				e.count = e.subs.length
				return e
			})

			// INJECT THE EMPTY RD / NON RD
			d.subs = fixEmptySubs(d)

			d.count = toolkit.sum(d.subs, (e) => e.count)
			return d
		})

		ba.level(3)
		showAsBreakdown(parsed)
		return parsed
	}

	if (ba.breakdown2ndLevel()) {
		let parsed = groupThenMap(data, (d) => {
			return d._id._id_customer_branchname
		}).map((d) => {

			d.subs = groupThenMap(d.subs, (e) => {
				return e._id._id_customer_channelname
			}).map((e) => {

				e.subs = groupThenMap(d.subs, (f) => {
					return f._id._id_customer_name
				}).map((f) => {
					f.subs = []
					f.count = 1
					return f
				})
				
				e.count = e.subs.length
				return e
			})

			d.count = toolkit.sum(d.subs, (e) => e.count)
			return d
		})

		ba.level(3)
		return parsed
	}

	let parsed = groupThenMap(data, (d) => {
		return d._id._id_customer_branchname
	}).map((d) => {

		d.subs = groupThenMap(d.subs, (e) => {
			return e._id._id_customer_channelid == "I1" ? rdCategories[0] : rdCategories[1]
		}).map((e) => {
			e.subs = []
			e.count = 1
			return e
		})

		// INJECT THE EMPTY RD / NON RD
		d.subs = fixEmptySubs(d)

		d.count = toolkit.sum(d.subs, (e) => e.count)
		return d
	})

	ba.level(2)
	showAsBreakdown(parsed)
	return parsed
}
ba.refresh = (useCache = false) => {
	let param = {}
	param.pls = []
	param.groups = [ba.breakdownByChannel(), ba.breakdownBy()]
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

	if (ba.breakdown2ndLevel()) {
		param.groups.push(ba.breakdown2ndLevelKey())
	}
	
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

			// if (ba.breakdown2ndLevel()) { // hardcode, use DUMMY data
			// 	res.Data.Data = branch_analysis_dummy
			// }

			let data = ba.buildStructure(res.Data.Data)

			ba.data(data)
			let date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			ba.breakdownNote(`Last refreshed on: ${date}`)

			rpt.plmodels(res.Data.PLModels)
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

ba.idarrayhide = ko.observableArray(['PL44A'])
ba.render = () => {
	if (ba.breakdownRD() == "All") {
		ba.expand(false)
	}

	if (ba.data().length == 0) {
		$('.breakdown-view').html('No data found.')
		return
	}


	// ========================= TABLE STRUCTURE
	
	let data = _.orderBy(ba.data(), (d) => d.PL8A, 'desc')

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
		.css('height', `${34 * ba.level()}px`)
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${34 * ba.level()}px`)
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('%')
		.css('height', `${34 * ba.level()}px`)
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < ba.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent))
	}

	// ========================= BUILD HEADER

	let columnWidth = 100
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []

	let countWidthThenPush = (each, key) => {
		let currentColumnWidth = each._id.length * 4
		if (currentColumnWidth < columnWidth) {
			currentColumnWidth = columnWidth
		}

		each.key = key.join('_')
		dataFlat.push(each)
		totalColumnWidth += currentColumnWidth
	}

	data.forEach((lvl1, i) => {
		let thheader1 = toolkit.newEl('th')
			.html(lvl1._id)
			.attr('colspan', lvl1.count)
			.addClass('align-center')
			.appendTo(trContents[0])

		if (ba.level() == 1) {
			countWidthThenPush(lvl1, [lvl1._id])
			return
		}
		thheader1.attr('colspan', lvl1.count)

		lvl1.subs.forEach((lvl2, j) => {
			let thheader2 = toolkit.newEl('th')
				.html(lvl2._id)
				.addClass('align-center')
				.appendTo(trContents[1])

			if (ba.level() == 2) {
				countWidthThenPush(lvl2, [lvl1._id, lvl2._id])
				return
			}
			thheader2.attr('colspan', lvl2.count)

			lvl2.subs.forEach((lvl3, k) => {
				console.log("---------------", lvl3._id, lvl3)

				let thheader3 = toolkit.newEl('th')
					.html(lvl3._id)
					.addClass('align-center')
					.appendTo(trContents[2])

				if (ba.level() == 3) {
					countWidthThenPush(lvl3, [lvl1._id, lvl2._id, lvl3._id])
					return
				}
				thheader3.attr('colspan', lvl3.count)
			})
		})
	})



	// ========================= CONSTRUCT DATA
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */]
	let netSalesPLCode = 'PL8A'
	let netSalesPlModel = rpt.plmodels().find((d) => d._id == netSalesPLCode)
	let netSalesRow = {}, changeformula, formulayo

	let rows = []

	rpt.fixRowValue(dataFlat)
	
	plmodels.forEach((d) => {
		let row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 }
		dataFlat.forEach((e) => {
			let breakdown = e.key
			let value = e[`${d._id}`]; 
			value = toolkit.number(value)
			row[breakdown] = value

			if (toolkit.isDefined(e.excludeFromTotal)) {
				return
			}

			row.PNLTotal += value
		})
		dataFlat.forEach((e) => {
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
	
	let TotalNetSales = _.find(rows, (r) => { return r.PLCode == "PL8A" }).PNLTotal
	rows.forEach((d, e) => {
		let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100;
		if (TotalPercentage < 0)
			TotalPercentage = TotalPercentage * -1 
		rows[e].Percentage = TotalPercentage
	})

	// ========================= PLOT DATA

	tableContent.css('min-width', totalColumnWidth)

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
			ba.clickExpand(trHeader)
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
			.attr(`data-row`, `row-${i}`)
			.appendTo(tableContent)

		dataFlat.forEach((e, f) => {
			let key = e.key
			let value = kendo.toString(d[key], 'n0')

			let percentage = kendo.toString(d[`${key} %`], 'n2')

			if ($.trim(value) == '') {
				value = 0
			}

			let cell = toolkit.newEl('td')
				.html(value)
				.addClass('align-right')
				.appendTo(trContent)
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

ba.prepareEvents = () => {
	$('.breakdown-view').parent().on('mouseover', 'tr', function () {
		let rowID = $(this).attr('data-row')

        let elh = $(`.breakdown-view .table-header tr[data-row="${rowID}"]`).addClass('hover')
        let elc = $(`.breakdown-view .table-content tr[data-row="${rowID}"]`).addClass('hover')
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

ba.optionBreakdownValues = ko.observableArray([])
ba.breakdownValueAll = { _id: 'All', Name: 'All' }
ba.changeBreakdown = () => {
	let all = ba.breakdownValueAll
	let map = (arr) => arr.map((d) => {
		if ("customer.channelname" == ba.breakdownBy()) {
			return d
		}
		if ("customer.keyaccount" == ba.breakdownBy()) {
			return { _id: d._id, Name: d._id }
		}

		return { _id: d.Name, Name: d.Name }
	})
	setTimeout(() => {
		switch (ba.breakdownBy()) {
			case "customer.areaname":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
				ba.breakdownValue([all._id])
			break;
			case "customer.region":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
				ba.breakdownValue([all._id])
			break;
			case "customer.zone":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
				ba.breakdownValue([all._id])
			break;
			case "product.brand":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
				ba.breakdownValue([all._id])
			break;
			case "customer.branchname":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
				ba.breakdownValue([all._id])
			break;
			case "customer.channelname":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
				ba.breakdownValue([all._id])
			break;
			case "customer.keyaccount":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
				ba.breakdownValue([all._id])
			break;
		}
	}, 100)
}
ba.changeBreakdownValue = () => {
	let all = ba.breakdownValueAll
	setTimeout(() => {
		let condA1 = ba.breakdownValue().length == 2
		let condA2 = ba.breakdownValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			ba.breakdownValue.remove(all._id)
			return
		}

		let condB1 = ba.breakdownValue().length > 1
		let condB2 = ba.breakdownValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			ba.breakdownValue([all._id])
			return
		}

		let condC1 = ba.breakdownValue().length == 0
		if (condC1) {
			ba.breakdownValue([all._id])
		}
	}, 100)
}

vm.currentMenu('Branch Analysis')
vm.currentTitle('Branch Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Branch Analysis', href: '/web/report/dashboard' }
])

ba.title('Branch Analysis')

rpt.refresh = () => {
	ba.changeBreakdown()
	setTimeout(() => {
		ba.breakdownValue(['All'])
		ba.refresh(false)
	}, 200)

	ba.prepareEvents()
}

$(() => {
	rpt.refresh()
})
