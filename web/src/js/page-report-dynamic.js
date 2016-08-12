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

	if (rd.getQueryStringValue('p') == 'sales-invoice') {
		param.flag = 'sales-invoice'
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
				rd.data([])
				rd.render()
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
			format: '{0:n1}'
		}

		axes.push({
			name: `axis${i+1}`,
			title: { text: d.plheader },
			majorGridLines: { color: '#fafafa' },
	        labels: { 
				font: '"Source Sans Pro" 11px',
	        	format: "{0:n1}"
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
        	format: "{0:n1}"
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

    if (config.series.length > 2) {
		config.series[2].labels.template = (e) => {
			let val = kendo.toString(e.value, 'n1')
			return `${val}`
		}
		config.series[2].tooltip.template = (e) => {
			let val = kendo.toString(e.value, 'n1')
			return `${e.series.name} : ${val}`
		}
    }

    rd.configure(config)

    $('.report').replaceWith(`<div class="report" style="width: ${width}px;"></div>`)
    $('.report').kendoChart(config)
}

rd.configure = (config) => app.noop
rd.setPercentageOn = (config, axis, percentage) => {
	let percentageAxis = config.valueAxis.find((d) => d.name == axis)
	if (toolkit.isDefined(percentageAxis)) {
		percentageAxis.labels.format = `{0:n${percentage}}`
	}

	let serie = config.series.find((d) => d.axis == axis)
	if (toolkit.isDefined(serie)) {
		serie.labels.template = undefined
		serie.labels.format = `{0:n${percentage}}`
		serie.tooltip.template = (e) => {
			let val = kendo.toString(e.value, `n${percentage}`)
			return `${e.series.name} : ${val}`
		}
	}
}

rd.getQueryStringValue = (key) => {
	return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"))
}  

rd.refreshTruckAdequateIndex = () => {
	let param = {}
	param.fiscalYear = rd.fiscalYear()

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/gettruckoutletdata", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			let dataMapped = res.Data.DataValue.map((d) => {
				let o = {}
				o._id = {}
				o._id._id_branchname = d.BranchName
				o._id._id_branclvl2 = d.BranchLvl2
				o._id._id_brancGroup = d.BranchGroup
				o._id._id_date_fiscal = d.Key.Fiscal
				o.numoutlet = d.NumOutlet
				o.numtruct = d.NumTruct
				return o
			})

			if (dataMapped.length == 0) {
				rd.data([])
				rd.render()
				rd.contentIsLoading(false)
				return
			}

			rd.contentIsLoading(false)
			rd.data(dataMapped)
			rd.render()
		}, () => {
			rd.contentIsLoading(false)
		})
	}

	rd.contentIsLoading(true)
	fetch()
}

rd.refreshSGACostRatio = () => {
	let param = {}
	param.groups = ['CostGroup']
	param.year = parseInt(rd.fiscalYear().split('-')[0], 10)

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getdatasga", param, (res) => {
			if (res.data.length == 0) {
				rd.data([])
				rd.render()
				rd.contentIsLoading(false)
				return
			}

			let op1 = _.groupBy(res.data, (d) => d.CostGroup)
			let op2 = _.map(op1, (v, k) => {
				let o = {}
				o._id = {}
				o._id._id_costgroup = k
				o.amount = toolkit.sum(v, (e) => e.Amount) * -1
				return o
			})
			let op3 = _.map(op2, (d) => {
				d.total = toolkit.sum(op2, (d) => d.amount)
				return d
			})

			rd.contentIsLoading(false)
			rd.data(op3)
			rd.render()
		}, () => {
			rd.contentIsLoading(false)
		})
	}

	rd.contentIsLoading(true)
	fetch()
}

rd.setup = () => {
	rd.breakdownBy("customer.branchname")

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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
		} break;

		case 'gross-sales-by-qty': {
			vm.currentTitle('Gross Sales / Qty')
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis2', 3)
			}
		} break;

		case 'discount-by-qty': {
			vm.currentTitle('Discount / Qty')
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis2', 3)
			}
		} break;

		case 'net-price-by-qty': {
			vm.currentTitle('Net Price / Qty')
			rd.divideBy('v1000000')
			rd.series = ko.observableArray([{ 
				_id: 'netprice', 
				plheader: 'Net Price',
				callback: (v, k) => {
					let netAmount = Math.abs(toolkit.sum(v, (e) => e.PL8A))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))

					return toolkit.number(netAmount / quantity)
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
					let netAmount = Math.abs(toolkit.sum(v, (e) => e.PL8A))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))
					let netPrice = toolkit.number(netAmount / quantity)

					let qtyDivided = quantity / rd.divider()

					return toolkit.number(netPrice / qtyDivided)
				}
			}])
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis3', 3)
			}
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
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis3', 2)
			}
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
					return totaloutlet
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

			rpt.optionDimensions(rpt.optionDimensions().filter((d) => ['customer.channelname', 'customer.branchname', 'product.brand'].indexOf(d.field) > -1))
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
		} break;

		case 'net-price-after-btl-qty': {
			vm.currentTitle('Net Price After BTL / Qty')
			rd.divideBy('v1000000')
			rd.series = ko.observableArray([{ 
				_id: 'netprice', 
				plheader: 'Net Price',
				callback: (v, k) => {
					let netAmount = Math.abs(toolkit.sum(v, (e) => e.PL8A))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))

					return toolkit.number(netAmount / quantity)
				}
			}, { 
				_id: 'btlqty', 
				plheader: 'BTL / Qty',
				callback: (v, k) => {
					let btl = Math.abs(toolkit.sum(v, (e) => 
						toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], (f) => toolkit.number(e[f]))
					))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))
					return toolkit.number(btl / quantity)
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let netAmount = Math.abs(toolkit.sum(v, (e) => e.PL8A))
					let quantity = Math.abs(toolkit.sum(v, (e) => e.salesqty))

					let btl = Math.abs(toolkit.sum(v, (e) => 
						toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], (f) => toolkit.number(e[f]))
					))

					return toolkit.number((netAmount / quantity)/(btl / quantity))
				}
			}])
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
		} break;

		case 'number-of-outlets': {
			$('.filter-unit').remove()
			vm.currentTitle('Number of Outlets')
			rd.series = ko.observableArray([{ 
				_id: 'totaloutlet', 
				plheader: 'Total Outlet',
				callback: (v, k) => {
					let totaloutlet = Math.abs(toolkit.sum(v, (e) => e.totaloutlet))
					return totaloutlet
				}
			}])

			rpt.optionDimensions(rpt.optionDimensions().filter((d) => ['customer.channelname', 'customer.branchname', 'product.brand'].indexOf(d.field) > -1))
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 0)
			}
		} break;

		case 'truck-adequate-index': {
			$('.filter-unit').remove()
			vm.currentTitle('Truck Adequate Index')
			rd.series = ko.observableArray([{ 
				_id: 'numtruct', 
				plheader: 'Number of Truck',
				callback: (v, k) => {
					let numtruct = Math.abs(toolkit.sum(v, (e) => e.numtruct))
					return numtruct
				}
			}, { 
				_id: 'numoutlet', 
				plheader: 'Number of Outlet',
				callback: (v, k) => {
					let numoutlet = Math.abs(toolkit.sum(v, (e) => e.numoutlet))
					return numoutlet
				}
			}, { 
				_id: 'percentage', 
				plheader: 'Truck / Outlet',
				callback: (v, k) => {
					let numtruct = Math.abs(toolkit.sum(v, (e) => e.numtruct))
					let numoutlet = Math.abs(toolkit.sum(v, (e) => e.numoutlet))

					return toolkit.safeDiv(numtruct, numoutlet)
				}
			}])

			rpt.optionDimensions([
				{ field: 'branchname', name: 'Branch Level 1' },
				{ field: 'branchlvl2', name: 'Branch Level 2' },
				{ field: 'brancgroup', name: 'Branch Group' },
			])
			rd.breakdownBy('branchname')
			rd.refresh = rd.refreshTruckAdequateIndex

			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 0)
				rd.setPercentageOn(config, 'axis2', 0)
				rd.setPercentageOn(config, 'axis3', 3)
			}
		} break;

		case 'sga-cost-ratio': {
			vm.currentTitle('SGA Cost Ratio Adequate Index')
			rd.series = ko.observableArray([{ 
				_id: 'sgacost', 
				plheader: 'SGA Cost',
				callback: (v, k) => {
					let sgacost = Math.abs(toolkit.sum(v, (e) => e.amount)) / rd.divider()
					return sgacost
				}
			}, { 
				_id: 'total', 
				plheader: 'Total SGA Cost',
				callback: (v, k) => {
					let total = 0; toolkit.try(() => { total = v[0].total / rd.divider() })
					return total
				}
			}, { 
				_id: 'percentage', 
				plheader: 'SGA Cost / Total',
				callback: (v, k) => {
					let sgacost = Math.abs(toolkit.sum(v, (e) => e.amount))
					let total = 0; toolkit.try(() => { total = v[0].total })

					return toolkit.safeDiv(sgacost, total)
				}
			}])

			rpt.optionDimensions([
				{ field: 'costgroup', name: 'Function' },
			])
			rd.breakdownBy('costgroup')
			rd.refresh = rd.refreshSGACostRatio

			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 2)
				rd.setPercentageOn(config, 'axis3', 3)
			}
		} break;

		case 'sales-invoice': {
			vm.currentTitle('Sales / Invoice')
			rd.series = ko.observableArray([{ 
				_id: 'sales', 
				plheader: 'Net Sales',
				callback: (v, k) => {
					let netSales = Math.abs(toolkit.sum(v, (e) => e.PL8A))

					return netSales / rd.divider()
				}
			}, { 
				_id: 'invoice', 
				plheader: 'Number of Invoices',
				callback: (v, k) => {
					let salescount = Math.abs(toolkit.sum(v, (e) => e.salescount))

					return salescount
				}
			}, { 
				_id: 'prcnt', 
				plheader: vm.currentTitle(),
				callback: (v, k) => {
					let netSales = Math.abs(toolkit.sum(v, (e) => e.PL8A))
					let salescount = Math.abs(toolkit.sum(v, (e) => e.salescount))

					return toolkit.number(netSales / salescount)
				}
			}])
			
			rd.configure = (config) => {
				rd.setPercentageOn(config, 'axis1', 2)
				rd.setPercentageOn(config, 'axis2', 0)
				rd.setPercentageOn(config, 'axis3', 2)
			}
		} break;

		default: {
			location.href = viewModel.appName + "page/reportdynamic"
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