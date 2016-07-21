viewModel.yearCompare = {}
let me = viewModel.yearCompare

me.title = ko.observable('Marketing Efficiency')
me.subTitle = ko.observable('Channel')
me.breakdownBy = ko.observable('customer.channelname')
me.contentIsLoading = ko.observable(false)
me.data = ko.observableArray([])
me.flag = ko.observable('')
me.unit = ko.observable('v1000000000')
me.optionUnit = ko.observableArray([
	{ _id: 'v1', Name: 'Actual', suffix: '' },
	{ _id: 'v1000', Name: 'Hundreds', suffix: 'K' },
	{ _id: 'v1000000', Name: 'Millions', suffix: 'M' },
	{ _id: 'v1000000000', Name: 'Billions', suffix: 'B' },
])
me.plSPG = ko.observable('PL31')
me.plPromo = ko.observable('PL29A')
me.plNetSales = ko.observable('PL8A')

me.groupMap = (arr, c, d) => {
	return _.map(_.groupBy(arr, c), d)
}

me.breakdownKey = () => {
	return `_id_${toolkit.replace(me.breakdownBy(), '.', '_')}`
}

me.refresh = () => {
	let param = {}
	param.pls = [me.plSPG(), me.plPromo(), me.plNetSales()]
	param.groups = rpt.parseGroups(['date.month'])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, rpt.optionFiscalYears)

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				me.contentIsLoading(false)
				return
			}
	
			me.contentIsLoading(false)
			me.data(res.Data.Data)
			me.render()
		}, () => {
			me.contentIsLoading(false)
		})
	}

	me.contentIsLoading(true)
	fetch()
}

me.render = () => {
	let divider = parseInt(me.unit().replace(/v/g, ''), 10)
	let unitSuffix = me.optionUnit().find((d) => d._id == me.unit()).suffix

	let dataParsed = []
	let years = rpt.optionFiscalYears()
	let months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
	let startDate = moment(new Date(2014, 3, 1))

	years.forEach((year) => {
		months.forEach((month) => {
			let row = me.data().find((d) => {
				let cond1 = (d._id._id_date_fiscal === year)
				let cond2 = (parseInt(d._id._id_date_month, 10) === month)
				return cond1 && cond2
			})

			let o = {}
			o.when = startDate.add(1, 'months').format('MMMM YYYY').replace(/ /g, '\n')
			o.promo = 0
			o.spg = 0
			o.promoSpg = 0
			o.netSales = 0

			dataParsed.push(o)

			toolkit.try(() => {
				o.promo = Math.abs(row[me.plPromo()]) / divider
				o.spg = Math.abs(row[me.plSPG()]) / divider
				o.promoSpg = Math.abs(row[me.plPromo()] + row[me.plSPG()]) / divider
				o.netSales = Math.abs(row[me.plNetSales()]) / divider
			})
		})
	})

	let seriesLabelFormat = '{0:n0}'
	if (divider > 1) {
		seriesLabelFormat = `{0:n1} ${unitSuffix}`
	}

	let config = {
		dataSource: { data: dataParsed },
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
				format: seriesLabelFormat
			},
			line: {
				border: {
					width: 1,
					color: 'white'
				},
			},
			tooltip: {
				visible: true,
				template: (d) => {
					return `${d.series.name} ${d.category.replace(/\n/g, ' ')} : ${kendo.format(seriesLabelFormat, d.value)}`
				}
			}
        },
		series: [{
			field: 'spg',
			name: 'SPG',
			axis: 'left',
			color: toolkit.seriesColorsGodrej[0]
		}, {
			field: 'promo',
			name: 'Promotions Expenses',
			axis: 'left',
			color: toolkit.seriesColorsGodrej[1]
		}, {
			field: 'promoSpg',
			name: 'Total (SPG + Promo)',
			axis: 'left',
			color: toolkit.seriesColorsGodrej[2]
		}, {
			field: 'netSales',
			name: 'Revenue',
			axis: 'right',
			color: '#b9105e'
		}],
        valueAxes: [{
        	name: 'left',
        	title: { text: "Cost Scale" },
			majorGridLines: { color: '#fafafa' },
            labels: { 
				font: '"Source Sans Pro" 11px',
            	format: "{0:n2}"
            },
        }, {
        	name: 'right',
        	title: { text: "Revenue Scale" },
			majorGridLines: { color: '#fafafa' },
            labels: { 
				font: '"Source Sans Pro" 11px',
            	format: "{0:n2}"
            },
            color: '#b9105e'
        }],
        categoryAxes: [{
            field: 'when',
            labels: {
				font: '"Source Sans Pro" 11px',
            	format: "{0:n2}"
            },
			majorGridLines: { color: '#fafafa' },
			axisCrossingValues: [0, 24]
		}, {
			categories: ['FY 2014-215', 'FY 2015-2016']
		}]
    }

	$('.chart').replaceWith(`<div class="chart" style="width: ${80 * 24}px;"></div>`)
	$('.chart').kendoChart(config)
}

me.changeDimension = (title, args) => {
	me.subTitle(title)
	me.breakdownBy(args.split('|')[0])
	me.flag('')

	if (args.indexOf('|') > -1) {
		me.flag(args.split('|')[1])
	}

	me.refresh()
}


vm.currentMenu('Analysis')
vm.currentTitle('Marketing Efficiency')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: me.title(), href: '#' }
])


$(() => {
	me.refresh()
	rpt.showExport(true)
})
