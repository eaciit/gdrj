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
rd.isFilterShown = ko.observable(true)
rd.doToggleAnalysisFilter = (which) => {
	if (which) {
		$('.list-analysis').slideDown(300, () => {
			rd.isFilterShown(true)
		})
	} else {
		$('.list-analysis').slideUp(300, () => {
			rd.isFilterShown(false)
		})
	}
}
rd.toggleAnalysisFilter = () => {
	rd.doToggleAnalysisFilter(!rd.isFilterShown())
}
rd.hasOutlet = () => {
	return rd.getParameterByName('p').toLowerCase().indexOf('outlet') > -1
}

rd.refresh = () => {
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([rd.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, rd.fiscalYear)
	if (rd.hasOutlet()) {
		param.flag = "hasoutlet"
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
				rd.contentIsLoading(false)
				return
			}

			rd.contentIsLoading(false)
			if (rd.hasOutlet()) {
				let addoutlet = rd.addTotalOutlet(res.Data.Data, res.Data.Outlet)
				rd.data(addoutlet)
			} else {
				rd.data(res.Data.Data)
			}
			rd.render()

			// if ($('.list-analysis').is(':visible')) {
			// 	rd.doToggleAnalysisFilter(false)
			// }
		}, () => {
			rd.contentIsLoading(false)
		})
	}

	rd.contentIsLoading(true)
	fetch()
}

rd.getParameterByName = (name, url) => {
    if (!url) url = window.location.href
    name = name.replace(/[\[\]]/g, "\\$&")
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
    if (!results) return null
    if (!results[2]) return ''
    return decodeURIComponent(results[2].replace(/\+/g, " "))
}

rd.addTotalOutlet = (data, outlet) => {
	for (var i in data){
		data[i]['totaloutlet'] = 0
		toolkit.try(() => {
			data[i]['totaloutlet'] = _.find(outlet, (d) => { return d._id[`_id_${toolkit.replace(rd.breakdownBy(), '.', '_')}`] == data[i]._id[`_id_${toolkit.replace(rd.breakdownBy(), '.', '_')}`] }).qty
		})
	}
	return data
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
				return `${e.series.name} : ${val}`
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
		axisCrossingValues: [op3.length, 0, 0]
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
        valueAxis: axes.reverse(),
        categoryAxis: categoryAxis
    }

    rd.configure(config)

    $('.report').replaceWith(`<div class="report" style="width: ${width}px;"></div>`)
    $('.report').kendoChart(config)
}

rd.configure = (config) => {
	config.series[2].labels.template = (e) => {
		let val = kendo.toString(e.value, 'n1')
		return `${val} %`
	}
	config.series[2].tooltip.template = (e) => {
		let val = kendo.toString(e.value, 'n1')
		return `${e.series.name} : ${val} %`
	}
}

rd.getQueryStringValue = (key) => {
	return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"))
}  

rd.setup = () => {
	rd.breakdownBy('customer.channelname')

	switch (rd.getQueryStringValue('p')) {
		case 'sales-return-rate': {
			vm.currentTitle('Sales Return Rate')
			rd.series = ko.observableArray([{ 
				_id: 'salesreturn', 
				plheader: 'Sales Return',
				callback: (v, k) => {
					return toolkit.number(Math.abs(toolkit.sum(v, (e) => e.salesreturn)) / rd.divider())
				}
			}, { 
				_id: 'salesrevenue', 
				plheader: 'Sales Revenue',
				callback: 'PL8A'
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let salesreturn = Math.abs(toolkit.sum(v, (e) => e.salesreturn)) / rd.divider()
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A)) / rd.divider()
					return toolkit.number(salesreturn / netsales)
				}
			}])
		} break;



		case 'sales-discount-by-gross-sales': {
			vm.currentTitle('Sales Discount by Gross Sales')
			rd.series = ko.observableArray([{ 
				_id: 'salesdiscount', 
				plheader: 'Sales Discount',
				callback: (v, k) => {
					let salesDiscount = Math.abs(toolkit.sum(v, (e) =>
						toolkit.sum(['PL7', 'PL8'], (f) => toolkit.number(e[f]))
					))

					return salesDiscount / rd.divider()
				}
			}, { 
				_id: 'grosssales', 
				plheader: 'Gross Sales',
				callback: 'PL0'
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let salesDiscount = Math.abs(toolkit.sum(v, (e) =>
						toolkit.sum(['PL7', 'PL8'], (f) => toolkit.number(e[f]))
					))
					let grossSales = Math.abs(toolkit.sum(v, (e) => e.PL0))

					return toolkit.number(salesDiscount / grossSales)
				}
			}])
		} break;



		case 'gross-sales-by-qty': {
			vm.currentTitle('Gross Sales / Qty')
			rd.divideBy('v1000000')
			rd.series = ko.observableArray([{ 
				_id: 'grosssales', 
				plheader: 'Gross Sales',
				callback: 'PL0'
			}, { 
				_id: 'salesqty', 
				plheader: 'Quantity',
				callback: (v, k) => {
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))
					return quantity / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let grossSales = Math.abs(toolkit.sum(v, (e) => e.PL0))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))

					return toolkit.number(grossSales / quantity)
				}
			}])
		} break;



		case 'discount-by-qty': {
			vm.currentTitle('Discount / Qty')
			rd.divideBy('v1000000')
			rd.series = ko.observableArray([{ 
				_id: 'salesdiscount', 
				plheader: 'Sales Discount',
				callback: (v, k) => {
					let salesDiscount = Math.abs(toolkit.sum(v, (e) =>
						toolkit.sum(['PL7', 'PL8'], (f) => toolkit.number(e[f]))
					))

					return salesDiscount / rd.divider()
				}
			}, { 
				_id: 'salesqty', 
				plheader: 'Quantity',
				callback: (v, k) => {
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))
					return quantity / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let salesDiscount = Math.abs(toolkit.sum(v, (e) =>
						toolkit.sum(['PL7', 'PL8'], (f) => toolkit.number(e[f]))
					))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))

					return toolkit.number(salesDiscount / quantity)
				}
			}])
		} break;



		case 'net-price-by-qty': {
			vm.currentTitle('Net Price / Qty')
			rd.divideBy('v1000000')
			rd.series = ko.observableArray([{ 
				_id: 'netprice', 
				plheader: 'Net Price',
				callback: (v, k) => {
					let amount = Math.abs(toolkit.sum(v, (e) => e.netamount))

					return amount / rd.divider()
				}
			}, { 
				_id: 'salesqty', 
				plheader: 'Quantity',
				callback: (v, k) => {
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))
					return quantity / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let amount = Math.abs(toolkit.sum(v, (e) => e.netamount))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))

					return toolkit.number(amount / quantity)
				}
			}])
		} break;



		case 'btl-by-qty': {
			vm.currentTitle('BTL / Qty')
			rd.divideBy('v1000000')
			rd.series = ko.observableArray([{ 
				_id: 'btl', 
				plheader: 'BTL',
				callback: (v, k) => {
					let btl = Math.abs(toolkit.sum(v, (e) => 
						toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], (f) => toolkit.number(e[f]))
					))

					return btl / rd.divider()
				}
			}, { 
				_id: 'salesqty', 
				plheader: 'Quantity',
				callback: (v, k) => {
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))
					return quantity / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let btl = Math.abs(toolkit.sum(v, (e) => 
						toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], (f) => toolkit.number(e[f]))
					))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))

					return toolkit.number(btl / quantity)
				}
			}])
		} break;



		case 'freight-cost-by-sales': {
			vm.currentTitle('Freight Cost by Sales')
			rd.series = ko.observableArray([{ 
				_id: 'freightcost', 
				plheader: 'Freight Cost',
				callback: (v, k) => {
					let freightCost = Math.abs(toolkit.sum(v, (e) => e.PL23))

					return freightCost / rd.divider()
				}
			}, { 
				_id: 'netsales', 
				plheader: 'Net Sales',
				callback: (v, k) => {
					let netSales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return netSales / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let freightCost = Math.abs(toolkit.sum(v, (e) => e.PL23))
					let netSales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return toolkit.number(freightCost / netSales)
				}
			}])
		} break;

		case 'direct-labour-index': {
			vm.currentTitle('Direct Labour Index')
			rd.series = ko.observableArray([{ 
				_id: 'directlabour', 
				plheader: 'Direct Labour',
				callback: (v, k) => {
					let directlabour = Math.abs(toolkit.sum(v, (e) => e.PL14))

					return directlabour / rd.divider()
				}
			}, { 
				_id: 'cogs', 
				plheader: 'COGS',
				callback: (v, k) => {
					let cogs = Math.abs(toolkit.sum(v, (e) => e.PL74B))

					return cogs / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let directlabour = Math.abs(toolkit.sum(v, (e) => e.PL14))
					let cogs = Math.abs(toolkit.sum(v, (e) => e.PL74B))

					return toolkit.number(directlabour / cogs)
				}
			}])
		} break;

		case 'material-type-index': {
			vm.currentTitle('Material Type Index')
			rd.series = ko.observableArray([{ 
				_id: 'material', 
				plheader: 'Material',
				callback: (v, k) => {
					let material1 = Math.abs(toolkit.sum(v, (e) => e.PL9))
					let material2 = Math.abs(toolkit.sum(v, (e) => e.PL10))
					let material3 = Math.abs(toolkit.sum(v, (e) => e.PL13))

					return (material1+material2+material3) / rd.divider()
				}
			}, { 
				_id: 'cogs', 
				plheader: 'COGS',
				callback: (v, k) => {
					let cogs = Math.abs(toolkit.sum(v, (e) => e.PL74B))

					return cogs / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let material1 = Math.abs(toolkit.sum(v, (e) => e.PL9))
					let material2 = Math.abs(toolkit.sum(v, (e) => e.PL10))
					let material3 = Math.abs(toolkit.sum(v, (e) => e.PL13))
					let cogs = Math.abs(toolkit.sum(v, (e) => e.PL74B))

					return toolkit.number((material1+material2+material3) / cogs)
				}
			}])
		} break;

		case 'indirect-expense-index': {
			vm.currentTitle('Indirect Expense Index')
			rd.series = ko.observableArray([{ 
				_id: 'indirect', 
				plheader: 'Indirect',
				callback: (v, k) => {
					let indirect1 = Math.abs(toolkit.sum(v, (e) => e.PL15))
					let indirect2 = Math.abs(toolkit.sum(v, (e) => e.PL16))
					let indirect3 = Math.abs(toolkit.sum(v, (e) => e.PL17))
					let indirect4 = Math.abs(toolkit.sum(v, (e) => e.PL18))
					let indirect5 = Math.abs(toolkit.sum(v, (e) => e.PL19))
					let indirect6 = Math.abs(toolkit.sum(v, (e) => e.PL20))
					let indirect7 = Math.abs(toolkit.sum(v, (e) => e.PL21))
					let indirect8 = Math.abs(toolkit.sum(v, (e) => e.PL74))

					return (indirect1+indirect2+indirect3+indirect4+indirect5+indirect6+indirect7+indirect8) / rd.divider()
				}
			}, { 
				_id: 'cogs', 
				plheader: 'COGS',
				callback: (v, k) => {
					let cogs = Math.abs(toolkit.sum(v, (e) => e.PL74B))

					return cogs / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let indirect1 = Math.abs(toolkit.sum(v, (e) => e.PL15))
					let indirect2 = Math.abs(toolkit.sum(v, (e) => e.PL16))
					let indirect3 = Math.abs(toolkit.sum(v, (e) => e.PL17))
					let indirect4 = Math.abs(toolkit.sum(v, (e) => e.PL18))
					let indirect5 = Math.abs(toolkit.sum(v, (e) => e.PL19))
					let indirect6 = Math.abs(toolkit.sum(v, (e) => e.PL20))
					let indirect7 = Math.abs(toolkit.sum(v, (e) => e.PL21))
					let indirect8 = Math.abs(toolkit.sum(v, (e) => e.PL74))
					let cogs = Math.abs(toolkit.sum(v, (e) => e.PL74B))

					return toolkit.number((indirect1+indirect2+indirect3+indirect4+indirect5+indirect6+indirect7+indirect8) / cogs)
				}
			}])
		} break;

		case 'marketing-expense-index': {
			vm.currentTitle('Marketing Expense Index')
			rd.series = ko.observableArray([{ 
				_id: 'marketing', 
				plheader: 'Marketing',
				callback: (v, k) => {
					let marketing1 = Math.abs(toolkit.sum(v, (e) => e.PL28))
					let marketing2 = Math.abs(toolkit.sum(v, (e) => e.PL29))
					let marketing3 = Math.abs(toolkit.sum(v, (e) => e.PL30))
					let marketing4 = Math.abs(toolkit.sum(v, (e) => e.PL31))

					return (marketing1+marketing2+marketing3+marketing4) / rd.divider()
				}
			}, { 
				_id: 'netsales', 
				plheader: 'Net Sales',
				callback: (v, k) => {
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return netsales / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let marketing1 = Math.abs(toolkit.sum(v, (e) => e.PL28))
					let marketing2 = Math.abs(toolkit.sum(v, (e) => e.PL29))
					let marketing3 = Math.abs(toolkit.sum(v, (e) => e.PL30))
					let marketing4 = Math.abs(toolkit.sum(v, (e) => e.PL31))
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return toolkit.number((marketing1+marketing2+marketing3+marketing4) / netsales)
				}
			}])
		} break;

		case 'sga-by-sales': {
			vm.currentTitle('SGA by Sales')
			rd.series = ko.observableArray([{ 
				_id: 'sga', 
				plheader: 'SGA',
				callback: (v, k) => {
					let sga = Math.abs(toolkit.sum(v, (e) => e.PL94A))

					return sga / rd.divider()
				}
			}, { 
				_id: 'netsales', 
				plheader: 'Net Sales',
				callback: (v, k) => {
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return netsales / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let sga = Math.abs(toolkit.sum(v, (e) => e.PL94A))
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return toolkit.number(sga / netsales)
				}
			}])
		} break;

		case 'cost-by-sales': {
			vm.currentTitle('Cost by Sales')
			rd.series = ko.observableArray([{ 
				_id: 'cost', 
				plheader: 'Cost',
				callback: (v, k) => {
					let cost = Math.abs(toolkit.sum(v, (e) => e.PL74B))

					return cost / rd.divider()
				}
			}, { 
				_id: 'netsales', 
				plheader: 'Net Sales',
				callback: (v, k) => {
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return netsales / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let cost = Math.abs(toolkit.sum(v, (e) => e.PL74B))
					let netsales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return toolkit.number(cost / netsales)
				}
			}])
		} break;

		case 'sales-by-outlet': {
			vm.currentTitle('Sales by Outlet')
			rd.series = ko.observableArray([{ 
				_id: 'netSales', 
				plheader: 'Net Sales',
				callback: (v, k) => {
					let netSales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return netSales / rd.divider()
				}
			}, { 
				_id: 'totaloutlet', 
				plheader: 'Total Outlet',
				callback: (v, k) => {
					let totaloutlet = Math.abs(toolkit.sum(v, (e) => e.totaloutlet))
					return totaloutlet / rd.divider()
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {					
					let netSales = Math.abs(toolkit.sum(v, (e) => e.PL8A))
					let totaloutlet = Math.abs(toolkit.sum(v, (e) => e.totaloutlet))

					return toolkit.number(netSales / totaloutlet) / rd.divider()
				}
			}])
		} break;



		default: {
			location.href = viewModel.appName + "page/report"
		} break;
	}
}









vm.currentMenu('Analysis Ideas')
vm.currentTitle('&nbsp;')
vm.currentTitle.subscribe((d) => {
	vm.breadcrumb([
		{ title: 'Godrej', href: '#' },
		{ title: 'Analysis Ideas', href: '#' },
		{ title: d, href: '#' }
	])
})


$(() => {
	rd.setup()
	rd.refresh()
})