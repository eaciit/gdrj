viewModel.growth = new Object()
let grw = viewModel.growth

grw.contentIsLoading = ko.observable(false)

grw.optionBreakdowns = ko.observableArray([
	{ field: "date.quartertxt", name: "Quarter" },
	{ field: "date.month", name: "Month" }
])
grw.breakdownBy = ko.observable('date.quartertxt')
grw.breakdownByFiscalYear = ko.observable('date.fiscal')
grw.plNetSales = ko.observable('')
grw.plEBIT = ko.observable('')
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
			rpt.plmodels(res.Data.PLModels)
			if (grw.plNetSales() == '') {
				grw.plNetSales('PL8A')
				grw.plEBIT('PL44B')
			}
			
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
	setTimeout(() => {
		toolkit.try(() => {
			$(d).find('.k-chart').data('kendoChart').redraw()
		})
		toolkit.try(() => {
			$(d).find('.k-grid').data('kendoGrid').refresh()
		})
	}, 100)
}


grw.renderChart = (res) => {
	let data = res.Data.Data.map((d) => {
		let fiscal = d._id[`_id_${toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')}`]
		let order = d._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`]
		let sub = d._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`]
		let net = Math.abs(d[grw.plNetSales()])
		let ebit = Math.abs(d[grw.plEBIT()])

		if (grw.breakdownBy() == 'date.month') {
			let m = parseInt(sub, 10) - 1 + 3
			let y = parseInt(fiscal.split('-')[0], 10)
			let mP = moment(new Date(y, m, 1)).format(`MMMM`)
			let yP = moment(new Date(y, m, 1)).format(`YYYY`)
			sub = `${mP}\n${yP}`
		}

		return { 
			fiscal: fiscal, 
			sub: sub, 
			order: order,
			net: net, 
			ebit: ebit, 
		}
	})

	data = _.orderBy(data, (d) => {
		if (grw.breakdownBy() == 'date.quartertxt') {
			return d.order
		} else {
			return `${d.fiscal} ${parseInt(d.order) + 10}`
		}
	}, 'asc')

	let config = {
		dataSource: { data: data },
        legend: {
            visible: true,
            position: "bottom"
        },
        seriesDefaults: {
            type: "line",
            style: "smooth",
            missingValues: "gap",
			labels: { 
				visible: true,
				position: 'top',
				format: '{0:n0}'
			},
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
        },
		seriesColors: toolkit.seriesColorsGodrej,
		series: [{
			field: 'net',
			name: (() => {
				let row = rpt.plmodels().find((d) => d._id == grw.plNetSales())
				if (row != undefined) {
					return row.PLHeader3
				}

				return '&nbsp;'
			})(),
		}, {
			field: 'ebit',
			name: (() => {
				let row = rpt.plmodels().find((d) => d._id == grw.plEBIT())
				if (row != undefined) {
					return row.PLHeader3
				}

				return '&nbsp;'
			})(),
		}],
        valueAxis: {
			majorGridLines: { color: '#fafafa' },
            labels: { 
				font: '"Source Sans Pro" 11px',
            	format: "{0:n2}"
            },
        },
        categoryAxis: {
            field: 'sub',
            labels: {
				font: '"Source Sans Pro" 11px',
            	format: "{0:n2}"
            },
			majorGridLines: { color: '#fafafa' }
		}
    }

    $('.chart').replaceWith(`<div class="chart"></div>`)
    if (grw.breakdownBy() == 'date.month') {
    	$('.chart').width(data.length * 100)
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

	;[grw.plNetSales(), grw.plEBIT()].forEach((g, rowIndex) => {
		let row = {}
		row.pnl = '&nbsp;'
		row.columnData = []
		row.total = toolkit.sum(data, (each) => toolkit.number(each[g]))

		let pl = rpt.plmodels().find((r) => r._id == g)
		if (pl != undefined) {
			row.pnl = pl.PLHeader3
		}

		let prev = null

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
					o.order = parseInt(o.key, 10)
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
				let current = d.data
				let value = toolkit.sum(current, (d) => toolkit.number(d[g]))

				let prevValue = 0
				if (!(j == 0 && i == 0)) {
					prevValue = toolkit.sum(prev, (d) => toolkit.number(d[g]))
				}

				prev = current

				let title = d.key
				if (grw.breakdownBy() == 'date.quartertxt') {
					title = `Quarter ${toolkit.getNumberFromString(d.key.split(' ')[1])}`
				} else {
					let m = parseInt(d.key, 10) - 1 + 3
					let y = parseInt(k.split('-')[0], 10)

					title = moment(new Date(y, m, 1)).format('MMMM YYYY')
				}

				row.columnData.push({
					title: d.key,
					value: value,
					growth: toolkit.number((value - prevValue) / prevValue * 100)
				})

				let left = i + (op4.length * j)

				let columnEach = {}
				columnEach.title = title
				columnEach.headerAttributes = { class: 'align-center' }
				columnEach.columns = []

				columnGroup.columns.push(columnEach)

				let columnValue = {}
				columnValue.title = 'Value'
				columnValue.field = `columnData[${left}].value`
				columnValue.width = 120
				columnValue.format = '{0:n0}'
				columnValue.attributes = { class: 'align-right' }
				columnValue.headerAttributes = { class: `align-center` } // color-${j}` }
				columnEach.columns.push(columnValue)

				let columnGrowth = {}
				columnGrowth.title = 'Growth %'
				columnGrowth.width = 70
				columnGrowth.template = (d) => {
					return `${kendo.toString(d.columnData[left].growth, 'n2')} %`
				}
				columnGrowth.headerAttributes = { class: 'align-center', style: 'font-style: italic;' }
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

	columnGrouped = _.orderBy(columnGrouped, (d) => d.title, 'asc')

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






viewModel.annualGrowth = new Object()
let ag = viewModel.annualGrowth

ag.optionBreakdowns = ko.observableArray([
	{"field":"customer.branchname","name":"Branch/RD","title":"customer_branchname"},
	{"field":"product.brand","name":"Brand","title":"product_brand"},
	{"field":"customer.channelname","name":"Channel","title":"customer_channelname"},
	{"field":"customer.areaname","name":"City","title":"customer_areaname"},
	{"field":"customer.region","name":"Region","title":"customer_region"},
	{"field":"customer.zone","name":"Zone","title":"customer_zone"},
	{"field":"customer.keyaccount","name":"Customer Group","title":"customer_keyaccount"}
])
ag.contentIsLoading = ko.observable(false)
ag.breakdownBy = ko.observable('customer.channelname')
ag.series1PL = ko.observable('PL8A|value')
ag.series2PL = ko.observable('PL44B|value')
ag.limit = ko.observable(6)
ag.data = ko.observableArray([])
ag.optionSeries = ko.observableArray([
	{ _id: 'PL8A|value', name: 'Net Sales' },
	{ _id: 'PL8A|percentage', name: 'Net Sales Percent' },
	{ _id: 'PL44B|value', name: 'EBIT' },
	{ _id: 'PL44B|percentage', name: 'EBIT Percent' },
])
ag.panelNote = ko.observable('&nbsp;')

ag.refresh = () => {
	let param = {}
	param.pls = [ag.series1PL().split('|')[0], ag.series2PL().split('|')[0]]
	param.groups = rpt.parseGroups([ag.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()))

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				ag.contentIsLoading(false)
				return
			}

			ag.contentIsLoading(false)
			ag.data(res.Data.Data)
			ag.panelNote(`Growth <span class='color-red'>FY 2014-2015</span> to <span class='color-green'>FY 2014-2015</span>`)
			ag.render()
		}, () => {
			ag.contentIsLoading(false)
		})
	}

	ag.contentIsLoading(true)
	fetch()
}

ag.render = () => {
	let series1PL = ag.series1PL().split('|')[0]
	let series1Type = ag.series1PL().split('|')[1]
	let series2PL = ag.series2PL().split('|')[0]
	let series2Type = ag.series2PL().split('|')[1]

	let billion = 1000000000
	let op1 = _.groupBy(ag.data(), (d) => d._id[`_id_${toolkit.replace(ag.breakdownBy(), '.', '_')}`])
	let op2 = _.map(op1, (v, k) => {
		v = _.orderBy(v, (e) => e._id._id_date_fiscal, 'asc')

		let o = {}
		o.breakdown = k
		o.series1 = 0
		o.series2 = 0

		toolkit.try(() => {
			if (series1Type == 'percentage') {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / v[0][series1PL] * 100
			} else {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / billion
			}
		})

		toolkit.try(() => {
			if (series2Type == 'percentage') {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / v[0][series2PL] * 100
			} else {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / billion
			}
		})

		return o
	})
	let op3 = _.orderBy(op2, (d) => {
		let hack = parseInt('10 000 000 000 000'.replace(/\ /g, ''), 10)

		if (ag.breakdownBy() == 'customer.channelname') {
			let order = ag.getChannelOrderByChannelName(d.breakdown)
			if (order > -1) {
				return hack - order
			}
		} else

		if (ag.breakdownBy() == 'product.brand') {
			let order = ag.getBrandOrderByBrand(d.breakdown)
			if (order > -1) {
				return hack - order
			}
		}

		return d.series1
	}, 'desc')
	let op4 = _.take(op3, ag.limit())

	let width = $('#tab1').width()
	if (_.min([ag.limit(), op4.length]) > 6) {
		width = 160 * ag.limit()
	}
	if (width == $('#tab1').width()) {
		width = `${width - 22}px`
	}

	let series = [{
		field: 'series1',
		name: (() => {
			let row = ag.optionSeries().find((d) => d._id == ag.series1PL())
			if (row != undefined) {
				return row.name
			}

			return '&nbsp;'
		})(),
		axis: series1Type,
		color: toolkit.seriesColorsGodrej[0]
	}, {
		field: 'series2',
		name: (() => {
			let row = ag.optionSeries().find((d) => d._id == ag.series2PL())
			if (row != undefined) {
				return row.name
			}

			return '&nbsp;'
		})(),
		axis: series2Type,
		color: toolkit.seriesColorsGodrej[2]
	}]

	let axes = [{
		name: series1Type,
		majorGridLines: { color: '#fafafa' },
        labels: { 
			font: '"Source Sans Pro" 11px',
        	format: "{0:n2}"
        },
    }]

    let categoryAxis = {
        field: 'breakdown',
        labels: {
			font: '"Source Sans Pro" 11px',
        	format: "{0:n2}"
        },
		majorGridLines: { color: '#fafafa' }
	}

    if (series1Type != series2Type) {
    	axes.push({
			name: series2Type,
			majorGridLines: { color: '#fafafa' },
	        labels: { 
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n2}"
	        },
	    })
    }

	if (axes.length > 1) {
		categoryAxis.axisCrossingValue = [0, op4.length]

		axes.forEach((d, i) => {
			let s = toolkit.seriesColorsGodrej
			d.color = [s[0], s[2]][i]

			let orig = _.max(op4.map((f) => Math.abs(f[`series${i + 1}`])))
			let max = Math.pow(10, String(parseInt(orig, 10)).length - 1) * (parseInt(String(parseInt(orig, 10))[0], 10) + 1)

			d.min = (max * -1)
			d.max = (max)

			let seriesType = (i == 0) ? series1Type : series2Type
			if (seriesType == 'percentage') {
				d.labels.format = "{0:n1} %"
			} else {
				d.labels.format = "{0:n1} B"
			}
		})
	} else {
		let max = _.max(op4.map((e) => _.max([e.series1, e.series2])))
		let min = _.min(op4.map((e) => _.min([e.series1, e.series2])))
		axes[0].max = toolkit.hardCeil(max)
		// axes[0].min = toolkit.hardFloor(min)
	}

	series.forEach((d, i) => {
		let seriesType = (i == 0) ? series1Type : series2Type

		d.tooltip = {
			visible: true,
			template: (e) => {
				let value = `${kendo.toString(e.value, 'n1')} B`

				let seriesType = (i == 0) ? series1Type : series2Type
				if (seriesType == 'percentage') {
					value = `${kendo.toString(e.value, 'n1')} %`
				}

				return `${d.name}: ${value}<br />Click to show detail`
			}
		}

		d.labels = {
			visible: true,
		}

		if (seriesType == 'percentage') {
			d.labels.template = (g) => {
				return `${g.series.name}\n${kendo.toString(g.value, 'n1')} %`
			}
		} else {
			d.labels.template = (g) => {
				return `${g.series.name}\n${kendo.toString(g.value, 'n1')} B`
			}
		}
	})

	let config = {
		dataSource: { data: op4 },
        legend: {
            visible: true,
            position: "bottom"
        },
        seriesDefaults: {
            type: "column",
            style: "smooth",
            missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			overlay: { gradient: 'none' },
			border: { width: 0 },
        },
		series: series,
        valueAxis: axes,
        categoryAxis: categoryAxis,
        seriesClick: ag.seriesClick
    }

    $('.annually-diff').replaceWith(`<div class="annually-diff" style="width: ${width}px;"></div>`)
    $('.annually-diff').kendoChart(config)
    $('.annually-diff').data('kendoChart').bind('seriesClick', (e) => {
    	if (ag.breakdownBy() == 'customer.channelname') {
	    	let channelMap = {
				"Modern Trade": "I3",
				"General Trade": "I2",
				"Regional Distributor": "I1",
				"Industrial": "I4",
				"Motorist": "I6",
				"Export": "EXP",
			}

	    	ag.selectedData([channelMap[e.category]])
    	} else {
	    	ag.selectedData([e.category])
    	}

    	ag.modalDetailTitle(`Detail of ${e.category}`)
    	ag.showDetailAs('value')
    	ag.showDetail()
    })
}

ag.popupIsLoading = ko.observable(false)
ag.modalDetailTitle = ko.observable('Detail Growth')
ag.detailPNL = ko.observableArray([
	{ plcode: 'PL8A', plname: 'Net Sales' },
	{ plcode: 'PL44B', plname: 'EBIT' },
	{ plcode: 'PL74B', sub: true, plname: 'Cost of Goods Sold' },
	{ plcode: 'PL32B', sub: true, plname: 'Selling Expenses' },
	{ plcode: 'PL94A', sub: true, plname: 'G&A Expenses' }
])
ag.showDetailAs = ko.observable('value')
ag.optionShowDetailAs = ko.observableArray([
	{ _id: 'percentage', name: 'Percentage' },
	{ _id: 'value', name: 'Value' },
])
ag.selectedData = ko.observableArray([])


ag.showDetail = () => {
	ag.doRefreshDetail(true)
}

ag.refreshDetail = () => {
	ag.doRefreshDetail(false)
}

ag.doRefreshDetail = (withModal = false) => {
	let param = {}
	param.pls = ag.detailPNL().map((d) => d.plcode)
	param.groups = rpt.parseGroups([ag.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()))
	param.filters.push({
		Field: ag.breakdownBy(),
		Op: '$in',
		Value: ag.selectedData()
	})

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				ag.popupIsLoading(false)
				if (withModal) {
					$('#modal-detail-annual-diff').modal('hide')
				}
				return
			}

			ag.popupIsLoading(false)
			if (withModal) {
				toolkit.runAfter(() => {
					ag.renderDetail(res.Data.Data)
				}, 300)
			} else {
				ag.renderDetail(res.Data.Data)
			}
		}, () => {
			ag.popupIsLoading(false)
			if (withModal) {
				$('#modal-detail-annual-diff').modal('hide')
			}
		})
	}

	ag.popupIsLoading(true)
	if (withModal) {
		$('#modal-detail-annual-diff').modal('show')
	}

	$('.chart-detail-annual-diff').empty()
	fetch()
}

ag.renderDetail = (data) => {
	let billion = 1000000000

	let values = []
	let op1 = _.groupBy(data, (d) => d._id[`_id_${toolkit.replace(ag.breakdownBy(), '.', '_')}`])
	let op2 = _.map(op1, (v, k) => {
		let op3 = _.orderBy(v, (d) => d._id._id_date_fiscal, 'asc')
		let o = {}
		o.breakdown = k

		ag.detailPNL().forEach((d) => {
			o[d.plcode] = 0

			toolkit.try(() => {
				if (ag.showDetailAs() == 'value') {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / billion
				} else {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / op3[0][d.plcode] * 100
				}

				o[d.plcode] = toolkit.number(o[d.plcode])
				values.push(o[d.plcode])
			})
		})

		return o
	})

	let series = ag.detailPNL()
		// .filter((d) => d.sub == true)
		.map((d) => ({
			name: d.plname,
			field: d.plcode,
			tooltip: {
				visible: true,
				template: (e) => {
					let suffix = (ag.showDetailAs() == 'value') ? 'B' : '%'
					return `${e.series.name}: ${kendo.toString(e.value, 'n1')} ${suffix}`
				}
			},
			labels: {
				visible: true,
				template: (e) => {
					let suffix = (ag.showDetailAs() == 'value') ? 'B' : '%'
					return `${e.series.name}\n${kendo.toString(e.value, 'n1')} ${suffix}`
				}
			},
			color: (e) => ((e.value < 0) ? '#e7505a' : '#74B841')
		}))

	let max = toolkit.increaseXPercent(toolkit.hardCeil(_.max(values)), 10)
	let min = toolkit.increaseXPercent(toolkit.hardFloor(_.min(values)), 5)

	let config = {
		dataSource: { data: op2 },
        legend: {
            visible: false,
            position: "bottom"
        },
        seriesDefaults: {
            type: "column",
            style: "smooth",
            missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			overlay: { gradient: 'none' },
			border: { width: 0 },
        },
		series: series,
        valueAxis: {
			majorGridLines: { color: '#fafafa' },
	        labels: { 
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n2}"
	        },
	        min: min,
	        max: max
	    },
        categoryAxis: {
	        field: 'breakdown',
	        labels: {
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n2}",
	        	padding: {
	        		bottom: 40
	        	}
	        },
			majorGridLines: { color: '#fafafa' }
		}
    }

	console.log('---- data', data)
	console.log('---- op2', op2)
	console.log('---- config', config)

    $('.chart-detail-annual-diff').replaceWith(`<div class="chart-detail-annual-diff" style="height: 300px;"></div>`)
    $('.chart-detail-annual-diff').kendoChart(config)
}

ag.getChannelOrderByChannelName = (channelname) => {
	// MT, GT, RD, INDUSTRIAL, MOTORIST, EXPORT
	switch (channelname.toLowerCase()) {
		case 'modern trade': case 'mt':
			return 0; break;
		case 'general trade': case 'gt':
			return 1; break;
		case 'regional distributor': case 'rd':
			return 2; break;
		case 'industrial trade': case 'industrial': case 'it':
			return 3; break;
		case 'motorist':
			return 4; break;
		case 'export':
			return 5; break;
	}

	return -1
}

ag.getBrandOrderByBrand = (brandname) => {
	// HIT, STELLA, MITU, other
	switch (brandname.toLowerCase()) {
		case 'hit':
			return 0; break;
		case 'stella':
			return 1; break;
		case 'mitu':
			return 2; break;
	}

	return -1
}






viewModel.quarterGrowth = new Object()
let qg = viewModel.quarterGrowth

qg.contentIsLoading = ko.observable(false)
qg.breakdownBy = ko.observable('customer.channelname')
qg.series1PL = ko.observable('PL8A|value')
qg.series2PL = ko.observable('PL44B|value')
qg.limit = ko.observable(6)
qg.data = ko.observableArray([])
qg.optionQuarters = ko.observableArray([
	"2014-2015 Q1",
	"2014-2015 Q2",
	"2014-2015 Q3",
	"2014-2015 Q4",

	"2015-2016 Q1",
	"2015-2016 Q2",
	"2015-2016 Q3",
	"2015-2016 Q4"
])
qg.quarter1 = ko.observable('2014-2015 Q1')
qg.quarter2 = ko.observable('2014-2015 Q2')
qg.panelNote = ko.observable('&nbsp;')


qg.refresh = () => {
	let param = {}
	param.pls = [qg.series1PL().split('|')[0], qg.series2PL().split('|')[0]]
	param.groups = rpt.parseGroups([qg.breakdownBy(), 'date.quartertxt'])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()))

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				qg.contentIsLoading(false)
				return
			}

			qg.contentIsLoading(false)
			qg.data(res.Data.Data)
			qg.panelNote(`Growth <span class='color-red'>${qg.quarter1()}</span> to <span class='color-green'>${qg.quarter2()}</span>`)
			qg.render()
		}, () => {
			qg.contentIsLoading(false)
		})
	}

	qg.contentIsLoading(true)
	fetch()
}

qg.render = () => {
	let series1PL = qg.series1PL().split('|')[0]
	let series1Type = qg.series1PL().split('|')[1]
	let series2PL = qg.series2PL().split('|')[0]
	let series2Type = qg.series2PL().split('|')[1]

	let billion = 1000000000
	let quarters = [qg.quarter1(), qg.quarter2()]
	let op0 = _.filter(qg.data(), (d) => quarters.indexOf(d._id._id_date_quartertxt) > -1)
	let op1 = _.groupBy(op0, (d) => d._id[`_id_${toolkit.replace(qg.breakdownBy(), '.', '_')}`])
	let op2 = _.map(op1, (v, k) => {
		v = _.orderBy(v, (e) => quarters.indexOf(e._id._id_date_quartertxt), 'asc')

		console.log('----v', v)

		let o = {}
		o.breakdown = k
		o.series1 = 0
		o.series2 = 0

		toolkit.try(() => {
			if (series1Type == 'percentage') {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / v[0][series1PL] * 100
			} else {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / billion
			}
		})

		toolkit.try(() => {
			if (series2Type == 'percentage') {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / v[0][series2PL] * 100
			} else {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / billion
			}
		})

		return o
	})
	let op3 = _.orderBy(op2, (d) => {
		let hack = parseInt('10 000 000 000 000'.replace(/\ /g, ''), 10)

		if (qg.breakdownBy() == 'customer.channelname') {
			let order = ag.getChannelOrderByChannelName(d.breakdown)
			if (order > -1) {
				return hack - order
			}
		} else

		if (qg.breakdownBy() == 'product.brand') {
			let order = ag.getBrandOrderByBrand(d.breakdown)
			if (order > -1) {
				return hack - order
			}
		}

		return d.series1
	}, 'desc')
	let op4 = _.take(op3, qg.limit())

	let width = $('#tab1').width()
	if (_.min([qg.limit(), op4.length]) > 6) {
		width = 160 * qg.limit()
	}
	if (width == $('#tab1').width()) {
		width = `${width - 22}px`
	}

	let series = [{
		field: 'series1',
		name: (() => {
			let row = ag.optionSeries().find((d) => d._id == qg.series1PL())
			if (row != undefined) {
				return row.name
			}

			return '&nbsp;'
		})(),
		axis: series1Type,
		color: toolkit.seriesColorsGodrej[0]
	}, {
		field: 'series2',
		name: (() => {
			let row = ag.optionSeries().find((d) => d._id == qg.series2PL())
			if (row != undefined) {
				return row.name
			}

			return '&nbsp;'
		})(),
		axis: series2Type,
		color: toolkit.seriesColorsGodrej[2]
	}]

	let axes = [{
		name: series1Type,
		majorGridLines: { color: '#fafafa' },
        labels: { 
			font: '"Source Sans Pro" 11px',
        	format: "{0:n2}"
        },
    }]

    let categoryAxis = {
        field: 'breakdown',
        labels: {
			font: '"Source Sans Pro" 11px',
        	format: "{0:n2}"
        },
		majorGridLines: { color: '#fafafa' }
	}

    if (series1Type != series2Type) {
    	axes.push({
			name: series2Type,
			majorGridLines: { color: '#fafafa' },
	        labels: { 
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n2}"
	        },
	    })
    }

	if (axes.length > 1) {
		categoryAxis.axisCrossingValue = [0, op4.length]

		axes.forEach((d, i) => {
			let s = toolkit.seriesColorsGodrej
			d.color = [s[0], s[2]][i]

			let orig = _.max(op4.map((f) => Math.abs(f[`series${i + 1}`])))
			let max = Math.pow(10, String(parseInt(orig, 10)).length - 1) * (parseInt(String(parseInt(orig, 10))[0], 10) + 1)

			d.min = (max * -1)
			d.max = (max)

			let seriesType = (i == 0) ? series1Type : series2Type
			if (seriesType == 'percentage') {
				d.labels.format = "{0:n1} %"
			} else {
				d.labels.format = "{0:n1} B"
			}
		})
	} else {
		let max = _.max(op4.map((e) => _.max([e.series1, e.series2])))
		let min = _.min(op4.map((e) => _.min([e.series1, e.series2])))
		axes[0].max = toolkit.hardCeil(max)
		// axes[0].min = toolkit.hardFloor(min)
	}

	series.forEach((d, i) => {
		let seriesType = (i == 0) ? series1Type : series2Type

		d.tooltip = {
			visible: true,
			template: (e) => {
				let value = `${kendo.toString(e.value, 'n1')} B`

				let seriesType = (i == 0) ? series1Type : series2Type
				if (seriesType == 'percentage') {
					value = `${kendo.toString(e.value, 'n1')} %`
				}

				return `${d.name}: ${value}<br />Click to show detail`
			}
		}

		d.labels = {
			visible: true,
		}

		if (seriesType == 'percentage') {
			d.labels.template = (g) => {
				return `${g.series.name}\n${kendo.toString(g.value, 'n1')} %`
			}
		} else {
			d.labels.template = (g) => {
				return `${g.series.name}\n${kendo.toString(g.value, 'n1')} B`
			}
		}
	})

	let config = {
		dataSource: { data: op4 },
        legend: {
            visible: true,
            position: "bottom"
        },
        seriesDefaults: {
            type: "column",
            style: "smooth",
            missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			overlay: { gradient: 'none' },
			border: { width: 0 },
        },
		series: series,
        valueAxis: axes,
        categoryAxis: categoryAxis,
        seriesClick: qg.seriesClick
    }

    $('.quarterly-diff').replaceWith(`<div class="quarterly-diff" style="width: ${width}px;"></div>`)
    $('.quarterly-diff').kendoChart(config)
    $('.quarterly-diff').data('kendoChart').bind('seriesClick', (e) => {
    	if (qg.breakdownBy() == 'customer.channelname') {
	    	let channelMap = {
				"Modern Trade": "I3",
				"General Trade": "I2",
				"Regional Distributor": "I1",
				"Industrial": "I4",
				"Motorist": "I6",
				"Export": "EXP",
			}

	    	qg.selectedData([channelMap[e.category]])
    	} else {
	    	qg.selectedData([e.category])
    	}

    	qg.modalDetailTitle(`Detail of ${e.category}`)
    	qg.showDetailAs('value')
    	qg.showDetail()
    })
}

qg.popupIsLoading = ko.observable(false)
qg.modalDetailTitle = ko.observable('Detail Growth')
qg.showDetailAs = ko.observable('value')
qg.selectedData = ko.observableArray([])


qg.showDetail = () => {
	qg.doRefreshDetail(true)
}

qg.refreshDetail = () => {
	qg.doRefreshDetail(false)
}

qg.doRefreshDetail = (withModal = false) => {
	let param = {}
	param.pls = ag.detailPNL().map((d) => d.plcode)
	param.groups = rpt.parseGroups([qg.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()))
	param.filters.push({
		Field: qg.breakdownBy(),
		Op: '$in',
		Value: qg.selectedData()
	})

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				qg.popupIsLoading(false)
				if (withModal) {
					$('#modal-detail-quarter-diff').modal('hide')
				}
				return
			}

			qg.popupIsLoading(false)
			if (withModal) {
				toolkit.runAfter(() => {
					qg.renderDetail(res.Data.Data)
				}, 300)
			} else {
				qg.renderDetail(res.Data.Data)
			}
		}, () => {
			qg.popupIsLoading(false)
			if (withModal) {
				$('#modal-detail-quarter-diff').modal('hide')
			}
		})
	}

	qg.popupIsLoading(true)
	if (withModal) {
		$('#modal-detail-quarter-diff').modal('show')
	}

	$('.chart-detail-quarter-diff').empty()
	fetch()
}

qg.renderDetail = (data) => {
	let billion = 1000000000

	let values = []
	let op1 = _.groupBy(data, (d) => d._id[`_id_${toolkit.replace(qg.breakdownBy(), '.', '_')}`])
	let op2 = _.map(op1, (v, k) => {
		let op3 = _.orderBy(v, (d) => d._id._id_date_fiscal, 'asc')
		let o = {}
		o.breakdown = k

		ag.detailPNL().forEach((d) => {
			o[d.plcode] = 0

			toolkit.try(() => {
				if (qg.showDetailAs() == 'value') {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / billion
				} else {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / op3[0][d.plcode] * 100
				}

				o[d.plcode] = toolkit.number(o[d.plcode])
				values.push(o[d.plcode])
			})
		})

		return o
	})

	let series = ag.detailPNL()
		// .filter((d) => d.sub == true)
		.map((d) => ({
			name: d.plname,
			field: d.plcode,
			tooltip: {
				visible: true,
				template: (e) => {
					let suffix = (qg.showDetailAs() == 'value') ? 'B' : '%'
					return `${e.series.name}: ${kendo.toString(e.value, 'n1')} ${suffix}`
				}
			},
			labels: {
				visible: true,
				template: (e) => {
					let suffix = (qg.showDetailAs() == 'value') ? 'B' : '%'
					return `${e.series.name}\n${kendo.toString(e.value, 'n1')} ${suffix}`
				}
			},
			color: (e) => ((e.value < 0) ? '#e7505a' : '#74B841')
		}))

	let max = toolkit.increaseXPercent(toolkit.hardCeil(_.max(values)), 10)
	let min = toolkit.increaseXPercent(toolkit.hardFloor(_.min(values)), 5)

	let config = {
		dataSource: { data: op2 },
        legend: {
            visible: false,
            position: "bottom"
        },
        seriesDefaults: {
            type: "column",
            style: "smooth",
            missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			overlay: { gradient: 'none' },
			border: { width: 0 },
        },
		series: series,
        valueAxis: {
			majorGridLines: { color: '#fafafa' },
	        labels: { 
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n2}"
	        },
	        min: min,
	        max: max
	    },
        categoryAxis: {
	        field: 'breakdown',
	        labels: {
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n2}",
	        	padding: {
	        		bottom: 40
	        	}
	        },
			majorGridLines: { color: '#fafafa' }
		}
    }

	console.log('---- data', data)
	console.log('---- op2', op2)
	console.log('---- config', config)

    $('.chart-detail-quarter-diff').replaceWith(`<div class="chart-detail-quarter-diff" style="height: 300px;"></div>`)
    $('.chart-detail-quarter-diff').kendoChart(config)
}






vm.currentMenu('Analysis')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'Growth Analysis', href: '#' }
])


$(() => {
	$('#modal-detail-annual-diff').appendTo($('body'))
	$('#modal-detail-quarter-diff').appendTo($('body'))
	grw.refresh()
	ag.refresh()
	qg.refresh()
})