viewModel.growth = new Object()
let grw = viewModel.growth

grw.contentIsLoading = ko.observable(false)

grw.optionBreakdowns = ko.observableArray([
	{ field: "date.quartertxt", name: "Quarter" },
	{ field: "date.month", name: "Month" }
])
grw.breakdownBy = ko.observable('date.quartertxt')
grw.breakdownByFiscalYear = ko.observable('date.fiscal')
grw.rows = ko.observableArray([
	{ pnl: "Net Sales", plcodes: ["PL9"] }, // ["PL8A"] },
	{ pnl: "EBIT", plcodes: ["PL9"] }, // ["PL44B"] },
])
grw.columns = ko.observableArray([])

grw.data = ko.observableArray([])
grw.fiscalYears = ko.observableArray(rpt.optionFiscalYears())
// grw.level = ko.observable(3)

grw.emptyGrid = () => {
	$('.grid').replaceWith(`<div class="grid"></div>`)
	$('.chart').replaceWith(`<div class="chart"></div>`)
}

grw.refresh = (useCache = false) => {
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([grw.breakdownByFiscalYear(), grw.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, grw.fiscalYears)

	grw.contentIsLoading(true)

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				grw.contentIsLoading(false)
				return
			}

			// grw.data(grw.buildStructure(res.Data.Data))
			// rpt.plmodels(res.Data.PLModels)
			grw.emptyGrid()
			grw.contentIsLoading(false)
			grw.renderGrid(res)
			grw.renderChart(res)
		}, () => {
			grw.emptyGrid()
			grw.contentIsLoading(false)
		})
	}

	fetch()
}

grw.reloadLayout = (d) => {
	toolkit.try(() => {
		$(d).find('.k-chart').data('kendoChart').redraw()
	})
	toolkit.try(() => {
		$(d).find('.k-grid').data('kendoGrid').refresh()
	})
}


grw.renderChart = (res) => {
	let data = res.Data.Data.map((d) => ({ 
		fiscal: d._id[`_id_${toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')}`], 
		sub: d._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`], 
		net: Math.abs(toolkit.sum(grw.rows()[0].plcodes, (plcode) => d[plcode])), 
		ebit: Math.abs(toolkit.sum(grw.rows()[1].plcodes, (plcode) => d[plcode])), 
	}))

	let series = [{
		field: 'net',
		type: 'line',
		name: grw.rows()[0].pnl
	}, {
		field: 'ebit',
		type: 'line',
		name: grw.rows()[1].pnl
	}]

	let config = {
		dataSource: { data: data },
        legend: {
            visible: true,
            position: "bottom"
        },
        seriesDefaults: {
            type: "line",
            missingValues: "gap",
        },
		seriesColors: toolkit.seriesColorsGodrej,
		series: [{
			field: 'net',
			type: 'line',
			name: grw.rows()[0].pnl,
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			tooltip: { visible: true },
			markers: { visible: false }
		}, {
			field: 'ebit',
			type: 'line',
			name: grw.rows()[0].pnl,
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			tooltip: { visible: true },
			markers: { visible: false }
		}],
        valueAxis: {
			majorGridLines: { color: '#fafafa' },
            label: { format: "{0:n2}" },
        },
        categoryAxis: {
            field: 'sub',
            labels: {
				font: '"Source Sans Pro" 11px',
            },
			majorGridLines: { color: '#fafafa' }
		}
    }

    $('.chart').kendoChart(config)
}

grw.renderGrid = (res) => {
	let rows = []
	let rowsAfter = []
	let columnsPlaceholder = [{ 
		field: 'pnl', 
		title: 'PNL', 
		attributes: { class: 'bold' }, 
		headerAttributes: { style: 'font-weight: bold; vertical-align: middle;' }, 
		width: 120
	}, { 
		field: 'total', 
		title: 'Total', 
		format: '{0:n0}',
		attributes: { class: 'bold align-right bold' }, 
		headerAttributes: { style: 'font-weight: bold; vertical-align: middle; text-align: right;' }, 
		width: 120
	}]

	let columnGrouped = []
	let data = res.Data.Data

	grw.rows().forEach((row, rowIndex) => {
		row.columnData = []
		row.total = toolkit.sum(data, (each) => toolkit.number(
			toolkit.sum(row.plcodes, (d) => each[d])
		))

		let op1 = _.groupBy(data, (d) => d._id[`_id_${toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')}`])
		let op9 = _.map(op1, (v, k) => ({ key: k, values: v }))
		op9.forEach((r, j) => {
			let k = r.key
			let v = r.values
			let op2 = _.groupBy(v, (d) => d._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`])
			let op3 = _.map(op2, (w, l) => {
				let o = {}
				
				o.order = l
				o.key = l
				o.data = w

				if (grw.breakdownBy() == 'date.month') {
					o.order = parseInt(d.key)
					o.key = moment(d.key).format('MMMM')
				}

				return o
			})
			let op4 = _.orderBy(op3, (d) => d.order, 'asc')

			let columnGroup = {}
			columnGroup.title = k
			columnGroup.headerAttributes = { class: `align-center color-${j}` }
			columnGroup.columns = []

			if (rowIndex == 0) {
				columnGrouped.push(columnGroup)
			}

			op4.forEach((d, i) => {
				let value = toolkit.sum(row.plcodes, (plcode) => {
					return toolkit.sum(d.data, (d) => toolkit.number(d[plcode]))
				})
				let prev = 0

				if (i > 0) {
					prev = toolkit.sum(row.plcodes, (plcode) => {
						return toolkit.sum(op4[i - 1].data, (d) => toolkit.number(d[plcode]))
					})
				}

				let title = d.key
				if (grw.breakdownBy() == 'date.quartertxt') {
					title = `Quarter ${toolkit.getNumberFromString(d.key.split(' ')[1])}`
				} else {
					title = moment(d.key).format('MMMM')
				}

				row.columnData.push({
					title: d.key,
					value: value,
					growth: toolkit.number((value - prev) / prev * 100)
				})

				let columnEach = {}
				columnEach.title = title
				columnEach.headerAttributes = { class: 'align-center' }
				columnEach.columns = []

				columnGroup.columns.push(columnEach)

				let columnValue = {}
				columnValue.title = 'Value'
				columnValue.field = `columnData[${i}].value`
				columnValue.width = 120
				columnValue.format = '{0:n0}'
				columnValue.attributes = { class: 'align-right' }
				columnValue.headerAttributes = { class: `align-center` } // color-${j}` }
				columnEach.columns.push(columnValue)

				let columnGrowth = {}
				columnGrowth.title = '%'
				columnGrowth.width = 60
				columnGrowth.template = (d) => `${kendo.toString(d.columnData[i].growth, 'n2')} %`
				columnGrowth.headerAttributes = { class: 'align-center' }
				columnGrowth.attributes = { class: 'align-right' }
				columnEach.columns.push(columnGrowth)
			})
		})

		rowsAfter.push(row)
	})

	if (columnGrouped.length > 0) {
		columnsPlaceholder[0].locked = true
		columnsPlaceholder[1].locked = true
	}

	grw.data(rowsAfter)
	grw.columns(columnsPlaceholder.concat(columnGrouped))

	let config = {
		dataSource: {
			data: grw.data()
		},
		columns: grw.columns(),
		resizable: false,
		sortable: false, 
		pageable: false,
		filterable: false,
		dataBound: () => {
			let sel = '.grid-dashboard .k-grid-content-locked tr, .grid-dashboard .k-grid-content tr'

			$(sel).on('mouseenter', function () {
				let index = $(this).index()
				console.log(this, index)
		        let elh = $(`.grid-dashboard .k-grid-content-locked tr:eq(${index})`).addClass('hover')
		        let elc = $(`.grid-dashboard .k-grid-content tr:eq(${index})`).addClass('hover')
			})
			$(sel).on('mouseleave', function () {
				$('.grid-dashboard tr.hover').removeClass('hover')
			})
		}
	}

	$('.grid').kendoGrid(config)
}

/*

grw.clickExpand = (e) => {
	let right = $(e).find('i.fa-chevron-right').length
	let down = $(e).find('i.fa-chevron-down').length
	if (right > 0){
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '530px')
			$('.pivot-pnl .table-content').css('margin-left', '530px')
		}

		$(e).find('i').removeClass('fa-chevron-right')
		$(e).find('i').addClass('fa-chevron-down')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
		rpt.refreshHeight(e.attr('idheaderpl'))
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '')
			$('.pivot-pnl .table-content').css('margin-left', '')
		}
		
		$(e).find('i').removeClass('fa-chevron-down')
		$(e).find('i').addClass('fa-chevron-right')
		$(`tr[idparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		$(`tr[idcontparent=${e.attr('idheaderpl')}]`).css('display', 'none')
		rpt.hideAllChild(e.attr('idheaderpl'))
	}
}

grw.buildStructure = (data) => {
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
		return d._id[`_id_${toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')}`]
	}).map((d) => {
		let subs = groupThenMap(d.subs, (e) => {
			return e._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`]
		}).map((e) => {
			let subs = groupThenMap(e.subs, (f) => {
				return f._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`]
			}).map((f) => {
				f._id = 'Value'
				f.count = 1
				return f
			})

			e.subs = subs
			e.count = e.subs.length
			return e
		})


		if (grw.breakdownBy() == 'date.quartertxt') {
			d.subs = _.orderBy(subs, (e) => e._id, 'asc')
		} else {
			d.subs = _.orderBy(subs, (e) => parseInt(e._id, 10), 'asc')
		}

		d.count = toolkit.sum(d.subs, (e) => e.count)
		return d
	})

	grw.level(3)
	parsed = _.orderBy(parsed, (d) => d._id, 'asc')
	return parsed
}

grw.render = () => {
	let container = $('.grid')
	if (grw.data().length == 0) {
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
		.css('height', `${34 * grw.level()}px`)
		.attr('data-rowspan', grw.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header')
		.appendTo(trHeader)

	toolkit.newEl('th')
		.html('Total')
		.css('height', `${34 * grw.level()}px`)
		.attr('data-rowspan', grw.level())
		.css('vertical-align', 'middle')
		.addClass('cell-percentage-header align-right')
		.appendTo(trHeader)

	let trContents = []
	for (let i = 0; i < grw.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent))
	}



	// ========================= BUILD HEADER

	let data = grw.data()

	let columnWidth = 130
	let totalColumnWidth = 0
	let pnlTotalSum = 0
	let dataFlat = []
	let percentageWidth = 70

	let countWidthThenPush = (thheader, each, key, start) => {
		let currentColumnWidth = columnWidth

		each.key = key.join('_')
		each.isStart = start
		dataFlat.push(each)

		totalColumnWidth += currentColumnWidth + percentageWidth
		thheader.width(currentColumnWidth)
	}

	data.forEach((lvl1, i) => {
		let thheader1 = toolkit.newEl('th')
			.html(lvl1._id)
			.attr('colspan', lvl1.count * 2)
			.addClass('align-center')
			.appendTo(trContents[0])
			.css('background-color', toolkit.seriesColorsGodrej[i])
			.css('color', 'white')

		if (grw.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id], false)
			return
		}

		lvl1.subs.forEach((lvl2, j) => {
			let text = lvl2._id

			if (grw.breakdownBy() == 'date.quartertxt') {
				text = `Quarter ${toolkit.getNumberFromString(lvl2._id.split(' ')[1])}`
			} else {
				text = moment(lvl2._id).format('MMMM')
			}

			let thheader2 = toolkit.newEl('th')
				.html(text)
				.addClass('align-center')
				.attr('colspan', 2)
				.appendTo(trContents[1])

			if (grw.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id], false)
				return
			}

			lvl2.subs.forEach((lvl3, k) => {
				let thheader3 = toolkit.newEl('th')
					.html(lvl3._id)
					.addClass('align-center')
					.appendTo(trContents[2])
					.css('background-color', toolkit.seriesColorsGodrej[i])
					.css('color', 'white')

				if (grw.level() == 3) {
					countWidthThenPush(thheader3, lvl3, [lvl1._id, lvl2._id, lvl3._id], (j == 0))

					let thheader3Percent = toolkit.newEl('th')
						.html('%')
						.width(percentageWidth)
						.addClass('align-center')
						.appendTo(trContents[2])
				}
			})
		})
	})

	tableContent.css('width', totalColumnWidth)



	// ========================= CONSTRUCT DATA
	
	let plmodels = _.sortBy(rpt.plmodels(), (d) => parseInt(d.OrderIndex.replace(/PL/g, '')))
	let exceptions = ["PL94C" , "PL39B", "PL41C"]
	let netSalesPLCode = 'PL8A'
	let netSalesRow = {}
	let rows = []

	rpt.fixRowValue(dataFlat)

	console.log("dataFlat", dataFlat)

	dataFlat.forEach((e) => {
		let breakdown = e.key
		netSalesRow[breakdown] = e[netSalesPLCode]
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

		let previousValue = 0;
		dataFlat.forEach((e) => {
			if (e.isStart) {
				previousValue = 0;
			}

			let breakdown = e.key
			let percentage = toolkit.number((row[breakdown] - previousValue) / previousValue) * 100;

			if (percentage < 0)
				percentage = percentage * -1

			row[`${breakdown} %`] = percentage

			previousValue = row[breakdown]
		})

		if (exceptions.indexOf(row.PLCode) > -1) {
			return
		}

		rows.push(row)
	})

	console.log("rows", rows)
	
	let TotalNetSales = _.find(rows, (r) => { return r.PLCode == "PL8A" }).PNLTotal
	rows.forEach((d, e) => {
		let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100;
		if (TotalPercentage < 0)
			TotalPercentage = TotalPercentage * -1 
		rows[e].Percentage = TotalPercentage
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

		trHeader.on('click', () => {
			grw.clickExpand(trHeader)
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
			.attr(`data-row`, `row-${i}`)
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

			let cellPercentage = toolkit.newEl('td')
				.html(percentage)
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
	grw.buildGridLevels(container, rows)
}







grw.buildGridLevels = (container, rows) => {
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
							let $parenttr = container.find(`tr[idheaderpl=${PLyo.PLCode}]`)
							let $parenttrcontent = container.find(`tr[idpl=${PLyo.PLCode}]`)
							// $trElem.insertAfter(container.find(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							// $columnElem.insertAfter(container.find(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							$trElem.insertAfter($parenttr)
							$columnElem.insertAfter($parenttrcontent)
						}
						else{
							$trElem.insertAfter(container.find(`tr.header${PLyo.PLCode}`))
							$columnElem.insertAfter(container.find(`tr.column${PLyo.PLCode}`))
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
}

*/

vm.currentMenu('Analysis')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'Growth Analysis', href: '#' }
])


$(() => {
	grw.refresh()
})