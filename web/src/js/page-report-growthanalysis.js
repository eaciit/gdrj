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
	{ pnl: "Net Sales", plcodes: ["PL8A"] }, //  ["PL9"] }, //
	{ pnl: "EBIT", plcodes: ["PL44B"] }, // ["PL9"] }, // 
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
	let data = res.Data.Data.map((d) => {
		let fiscal = d._id[`_id_${toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')}`]
		let order = d._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`]
		let sub = d._id[`_id_${toolkit.replace(grw.breakdownBy(), '.', '_')}`]
		let net = Math.abs(toolkit.sum(grw.rows()[0].plcodes, (plcode) => d[plcode]))
		let ebit = Math.abs(toolkit.sum(grw.rows()[1].plcodes, (plcode) => d[plcode]))

		if (grw.breakdownBy() == 'date.month') {
			let month = moment(new Date(2015, parseInt(sub, 10) - 1, 1)).format('MMMM')
			sub = `${fiscal}\n${month}`
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
			name: grw.rows()[0].pnl,
		}, {
			field: 'ebit',
			name: grw.rows()[1].pnl
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

	grw.rows().forEach((row, rowIndex) => {
		row.columnData = []
		row.total = toolkit.sum(data, (each) => toolkit.number(
			toolkit.sum(row.plcodes, (d) => each[d])
		))

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
				let value = toolkit.sum(row.plcodes, (plcode) => {
					return toolkit.sum(current, (d) => toolkit.number(d[plcode]))
				})

				let prevValue = 0
				if (!(j == 0 && i == 0)) {
					prevValue = toolkit.sum(row.plcodes, (plcode) => {
						return toolkit.sum(prev, (d) => toolkit.number(d[plcode]))
					})
				}

				prev = current

				let title = d.key
				if (grw.breakdownBy() == 'date.quartertxt') {
					title = `Quarter ${toolkit.getNumberFromString(d.key.split(' ')[1])}`
				} else {
					title = moment(new Date(2015, parseInt(d.key, 10), 1)).format('MMMM')
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
				columnGrowth.title = '%'
				columnGrowth.width = 70
				columnGrowth.template = (d) => {
					return `${kendo.toString(d.columnData[left].growth, 'n2')} %`
				}
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