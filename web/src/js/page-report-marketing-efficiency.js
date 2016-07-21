// MAKE NEW TAB, DUPLICATE THE CHART, THE VALUE WILL BE THE GROWTH OF EACH MONTH / QUARTER


viewModel.yearCompare = {}
let me = viewModel.yearCompare

me.title = ko.observable('Marketing Efficiency')
me.contentIsLoading = ko.observable(false)
me.data = ko.observableArray([])
me.unit = ko.observable('v1000000000')
me.optionUnit = ko.observableArray([
	{ _id: 'v1', Name: 'Actual', suffix: '' },
	{ _id: 'v1000', Name: 'Hundreds', suffix: 'K' },
	{ _id: 'v1000000', Name: 'Millions', suffix: 'M' },
	{ _id: 'v1000000000', Name: 'Billions', suffix: 'B' },
])
me.time = ko.observable('date.month')
me.optionTime = ko.observableArray([
	{ _id: 'date.month', Name: 'Month' },
	{ _id: 'date.quartertxt', Name: 'Quarter' },
])
me.optionDropDownPNL = ko.observableArray([
	{ key: 'spg', field: 'PL31', name: 'SPG' },
	{ key: 'promo',field: 'PL29A', name: 'Promotions Expenses' },
	{ key: 'promoSpg', field: 'spg-promo', name: 'Total SPG & Promo' },
	{ key: 'adv', field: 'PL28', name: 'Advertising Expenses' },
	{ key: 'discount', field: 'PL7A', name: 'Discount Activity' },
	{ key: 'netSales', field: 'PL8A', name: 'Revenue' },
])
me.valueDropDownPNL = ko.observableArray(me.optionDropDownPNL().map((d) => d.field))
me.multiSelectPNL = {
	data: me.optionDropDownPNL,
	dataValueField: 'field',
	dataTextField: 'name',
	value: me.valueDropDownPNL,
	// itemTemplate: '<span class="k-state-default" style="background-image: url(\'../content/web/Customers/#:data.CustomerID#.jpg\')"></span>' +
 //                                  '<span class="k-state-default"><h3>#: data.ContactName #</h3><p>#: data.CompanyName #</p></span>',
 //    tagTemplate:  '<span class="selected-value" style="background-image: url(\'../content/web/Customers/#:data.CustomerID#.jpg\')"></span><span>#:data.ContactName#</span>',
}

me.mode = ko.observable('efficiency')
me.show = (title, mode, unit) => {
	me.title(title)
	me.mode(mode)
	me.unit(unit)
	me.refresh()
}

me.refresh = () => {
	if (me.valueDropDownPNL().length == 0) {
		toolkit.showError('Select at least one PNL')
		return
	}

	let breakdownValues = me.breakdownValue().filter((d) => d != 'All')

	let param = {}
	param.pls = me.optionDropDownPNL().map((d) => d.field).filter((d) => d.indexOf('-') == -1)
	param.groups = rpt.parseGroups([me.time()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, rpt.optionFiscalYears)

	if (breakdownValues.length > 0) {
		param.filters.push({
			Field: me.breakdownBy(),
			Op: '$in',
			Value: breakdownValues
		})
	}

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
	let quarters = ['Q1', 'Q2', 'Q3', 'Q4']
	let startDate = moment(new Date(2014, 3, 1))
	let prev = null

	let inject = (o, row) => {
		me.optionDropDownPNL().forEach((d) => {
			o[d.key] = 0
		})

		dataParsed.push(o)

		if (me.mode() == 'efficiency') {
			toolkit.try(() => {
				o.spg = Math.abs(row.PL31) / divider
			})
			toolkit.try(() => {
				o.promo = Math.abs(row.PL29A) / divider
			})
			toolkit.try(() => {
				o.promoSpg = Math.abs(row.PL31 + row.PL29A) / divider
			})
			toolkit.try(() => {
				o.adv = Math.abs(row.PL28) / divider
			})
			toolkit.try(() => {
				o.discount = Math.abs(row.PL7A) / divider
			})
			toolkit.try(() => {
				o.netSales = Math.abs(row.PL8A) / divider
			})
		} else {
			if (prev != null) {
				toolkit.try(() => {
					o.spg = Math.abs(toolkit.number((row.PL31 - prev.PL31) / prev.PL31)) * 100
				})
				toolkit.try(() => {
					o.promo = Math.abs(toolkit.number((row.PL29A - prev.PL29A) / prev.PL29A)) * 100
				})
				toolkit.try(() => {
					o.promoSpg = Math.abs(toolkit.number(((row.PL31 + row.PL29A) - (prev.PL31 + prev.PL29A)) / (prev.PL31 + prev.PL29A))) * 100
				})
				toolkit.try(() => {
					o.adv = Math.abs(toolkit.number((row.PL28 - prev.PL28) / prev.PL28)) * 100
				})
				toolkit.try(() => {
					o.discount = Math.abs(toolkit.number((row.PL7A - prev.PL7A) / prev.PL7A)) * 100
				})
				toolkit.try(() => {
					o.netSales = Math.abs(toolkit.number((row.PL8A - prev.PL8A) / prev.PL8A)) * 100
				})
			}
			prev = row
		}
	}

	years.forEach((year) => {
		if (me.time() === 'date.month') {
			months.forEach((month) => {
				let row = me.data().find((d) => {
					let cond1 = (d._id._id_date_fiscal === year)
					let cond2 = (parseInt(d._id._id_date_month, 10) === month)
					return cond1 && cond2
				})

				let o = {}
				o.when = startDate.add(1, 'months').format('MMM YYYY').replace(/ /g, '\n')
				inject(o, row)
			})
		} else {
			quarters.forEach((quarter) => {
				let row = me.data().find((d) => {
					let cond1 = (d._id._id_date_fiscal === year)
					let cond2 = d._id._id_date_quartertxt === `${year} ${quarter}`
					return cond1 && cond2
				})

				let o = {}
				o.when = row._id._id_date_quartertxt.split(' ').reverse().join('\n')
				inject(o, row)
			})
		}
	})

	let seriesLabelFormat = '{0:n0}'
	let netSalesLabelsFormat = '{0:n1}'
	if (me.mode() == 'growth') {
		unitSuffix = ''
		seriesLabelFormat = `{0:n1} %`
		netSalesLabelsFormat = `{0:n1} %`
	}

	let selectedPNL = me.valueDropDownPNL().map((d) => me.optionDropDownPNL().find((e) => e.field == d).key)
	let series = [{
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
		field: 'adv',
		name: 'Advertising Expenses',
		axis: 'left',
		color: '#f00'
	}, {
		field: 'discount',
		name: 'Discount Activity',
		axis: 'left',
		color: '#5e331a'
	}, {
		field: 'netSales',
		name: 'Revenue',
		axis: 'right',
		color: '#b9105e',
		labels: { 
			format: netSalesLabelsFormat,
			font: '"Source Sans Pro" 8px',
		},
	}].filter((d) => selectedPNL.indexOf(d.field) > -1)

	let selectedAxis = _.uniq(series.map((d) => d.axis))
	let valueAxes = [{
    	name: 'left',
    	title: { text: "Cost Scale" },
		majorGridLines: { color: '#fafafa' },
        labels: { 
			font: '"Source Sans Pro" 11px',
        	format: "{0:n1}"
        },
    }, {
    	name: 'right',
    	title: { text: "Revenue Scale" },
		majorGridLines: { color: '#fafafa' },
        labels: { 
			font: '"Source Sans Pro" 11px',
        	format: "{0:n1}"
        },
        color: '#b9105e'
    }].filter((d) => selectedAxis.indexOf(d.name) > -1)

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
				format: seriesLabelFormat,
				font: '"Source Sans Pro" 8px',
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
					return `${d.series.name} ${d.category.replace(/\n/g, ' ')} : ${kendo.format(seriesLabelFormat, d.value)} ${unitSuffix}`
				}
			}
        },
		series: series,
        valueAxes: valueAxes,
        categoryAxes: [{
            field: 'when',
            labels: {
				font: '"Source Sans Pro" 11px',
            	format: "{0:n1}"
            },
			majorGridLines: { color: '#fafafa' },
			axisCrossingValues: [0, 24]
		}, {
			categories: ['FY 2014-215', 'FY 2015-2016']
		}]
    }

    let width = 'auto'
    if (me.time() == 'date.month') {
    	width = `${50 * 24}px`
    }

    console.log('-----', config)
	$('.chart').replaceWith(`<div class="chart" style="width: ${width};"></div>`)
	$('.chart').kendoChart(config)
}

me.optionDimensions = ko.observableArray(
	[{ field: '', name: 'Total' }].concat(rpt.optionDimensions())
)
me.breakdownBy = ko.observable('')
me.breakdownValue = ko.observableArray([])
me.optionBreakdownValues = ko.observableArray([])
me.breakdownValueAll = { _id: 'All', Name: 'All' }
me.changeBreakdown = () => {
	let all = me.breakdownValueAll
	let map = (arr) => arr.map((d) => {
		if ("customer.channelname" == me.breakdownBy()) {
			return d
		}
		if ("customer.keyaccount" == me.breakdownBy()) {
			return { _id: d._id, Name: d._id }
		}

		return { _id: d.Name, Name: d.Name }
	})
	setTimeout(() => {
		me.breakdownValue([])

		switch (me.breakdownBy()) {
			case "customer.areaname":
				me.optionBreakdownValues([all].concat(map(rpt.masterData.Area())))
				me.breakdownValue([all._id])
			break;
			case "customer.region":
				me.optionBreakdownValues([all].concat(map(rpt.masterData.Region())))
				me.breakdownValue([all._id])
			break;
			case "customer.zone":
				me.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())))
				me.breakdownValue([all._id])
			break;
			case "product.brand":
				me.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())))
				me.breakdownValue([all._id])
			break;
			case "customer.branchname":
				me.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())))
				me.breakdownValue([all._id])
			break;
			case "customer.channelname":
				me.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())))
				me.breakdownValue([all._id])
			break;
			case "customer.keyaccount":
				me.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())))
				me.breakdownValue([all._id])
			break;
		}
	}, 100)
}
me.changeBreakdownValue = () => {
	let all = me.breakdownValueAll
	setTimeout(() => {
		let condA1 = me.breakdownValue().length == 2
		let condA2 = me.breakdownValue().indexOf(all._id) == 0
		if (condA1 && condA2) {
			me.breakdownValue.remove(all._id)
			return
		}

		let condB1 = me.breakdownValue().length > 1
		let condB2 = me.breakdownValue().reverse()[0] == all._id
		if (condB1 && condB2) {
			me.breakdownValue([all._id])
			return
		}

		let condC1 = me.breakdownValue().length == 0
		if (condC1) {
			me.breakdownValue([all._id])
		}
	}, 100)
}







vm.currentMenu(me.title())
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: me.title(), href: '#' }
])


$(() => {
	me.changeBreakdown()

	toolkit.runAfter(() => { 
		me.breakdownValue(['All'])
		me.refresh()
	}, 200)

	rpt.showExport(true)
})
