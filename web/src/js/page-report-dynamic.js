viewModel.dynamic = new Object()
let rd = viewModel.dynamic

rd.optionDivide = ko.observableArray([
	{ field: 'v1', name: 'Actual' },
	{ field: 'v1000', name: 'Hundreds' },
	{ field: 'v1000000', name: 'Millions' },
	{ field: 'v1000000000', name: 'Billions' },
])
rd.divideBy = ko.observable('v1000000000')
rd.divider = () => {
	return toolkit.getNumberFromString(rd.divideBy())
}
rd.contentIsLoading = ko.observable(false)
rd.breakdownBy = ko.observable('')
rd.series = ko.observableArray([])
rd.limit = ko.observable(6)
rd.data = ko.observableArray([])
rd.fiscalYear = ko.observable(rpt.value.FiscalYear())
rd.useLimit = ko.computed(() => {
	switch (rd.breakdownBy()) {
		case 'customer.channelname':
		case 'date.quartertxt':
		case 'date.month':
			return false
		default:
			return true
	}
}, rd.breakdownBy)

rd.refresh = () => {
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([rd.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, rd.fiscalYear)

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				rd.contentIsLoading(false)
				return
			}

			rd.contentIsLoading(false)
			rd.data(res.Data.Data)
			rd.render()
		}, () => {
			rd.contentIsLoading(false)
		})
	}

	rd.contentIsLoading(true)
	fetch()
}

rd.render = () => {
	let op1 = _.groupBy(rd.data(), (d) => d._id[`_id_${toolkit.replace(rd.breakdownBy(), '.', '_')}`])
	let op2 = _.map(op1, (v, k) => {
		v = _.orderBy(v, (e) => e._id._id_date_fiscal, 'asc')

		let o = {}
		o.breakdown = k

		rd.series().forEach((d) => {
			if (toolkit.isString(d.callback)) {
				o[d._id] = toolkit.sum(v, (e) => e[d.callback]) / rd.divider()
			} else {
				o[d._id] = d.callback(v, k)
			}
		})

		return o
	})
	let op3 = _.orderBy(op2, (d) => d[rd.series()[0]._id], 'desc')
	if (rd.limit() != 0 && rd.useLimit()) {
		op3 = _.take(op3, rd.limit())
	}

	let width = $('#tab1').width()
	if (_.min([rd.limit(), op3.length]) > 6) {
		width = 160 * rd.limit()
	}
	if (width == $('#tab1').width()) {
		width = `${width - 22}px`
	}

	let axes = []

	let series = rd.series().map((d, i) => {
		let color = toolkit.seriesColorsGodrej[i % toolkit.seriesColorsGodrej.length]

		let o = {}
		o.field = d._id
		o.name = d.plheader
		o.axis = `axis${i+1}`
		o.color = color
		o.tooltip = {
			visible: true,
			template: (e) => {
				let val = kendo.toString(e.value, 'n1')
				return `${e.series.name} - ${e.category} : ${val}`
			}
		}
		o.labels = {
			visible: true,
			template: (e) => {
				let val = kendo.toString(e.value, 'n1')
				return val
				// return `${e.series.name}\n${val}`
			}
		}

		axes.push({
			name: `axis${i+1}`,
			title: { text: d.plheader },
			majorGridLines: { color: '#fafafa' },
	        labels: { 
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n2}"
	        },
	        color: color
		})

		return o
	})

	console.log('-----', axes)
	console.log('-----', series)

    let categoryAxis = {
        field: 'breakdown',
        labels: {
			font: '"Source Sans Pro" 11px',
        	format: "{0:n2}"
        },
		majorGridLines: { color: '#fafafa' },
		axisCrossingValues: [0, 0, op3.length]
	}

	let config = {
		dataSource: { data: op3 },
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
        categoryAxis: categoryAxis
    }

    rd.configure(config)

    $('.report').replaceWith(`<div class="report" style="width: ${width}px;"></div>`)
    $('.report').kendoChart(config)
}

rd.configure = (config) => toolkit.noop

rd.getQueryStringValue = (key) => {
	return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"))
}  

rd.setup = () => {
	switch (rd.getQueryStringValue('p')) {
		case 'sales-return-rate': {
			vm.currentTitle('Sales Return Rate')
			rd.breakdownBy('customer.channelname')
			rd.series = ko.observableArray([{ 
				_id: 'salesreturn', 
				plheader: 'Sales Return',
				callback: (v, k) => {
					return Math.abs(toolkit.sum(v, (e) => e.salesreturn)) / rd.divider()
				}
			}, { 
				_id: 'salesrevenue', 
				plheader: 'Sales Revenue',
				callback: 'PL8A'
			}, { 
				_id: 'salesreturnrate', 
				plheader: 'Sales Return Rate',
				callback: (v, k) => {
					let salesreturn = Math.abs(toolkit.sum(v, (e) => e.salesreturn)) / rd.divider()
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A)) / rd.divider()
					return salesreturn / netsales * 100
				}
			}])
			rd.configure = (config) => {
				config.series[2].labels.template = (e) => {
					let val = kendo.toString(e.value, 'n1')
					return `${val} %`
					// return `${e.series.name}\n${val} %`
				}
			}
		} break;
		default: {
			location.href = viewModel.appName + "page/report"
		} break;
	}
}









vm.currentMenu('Analysis')
vm.currentTitle('Report Dynamic')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'Growth Analysis', href: '#' }
])


$(() => {
	rd.setup()
	rd.refresh()
})