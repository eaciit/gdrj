viewModel.yearCompare = {}
let yc = viewModel.yearCompare

yc.title = ko.observable('YoY Rev & EBIT')
yc.subTitle = ko.observable('Channel')
yc.breakdownBy = ko.observable('customer.channelname')
yc.contentIsLoading = ko.observable(false)
yc.data = ko.observableArray([])
yc.flag = ko.observable('')
yc.unit = ko.observable('v1000000000')
yc.optionUnit = ko.observableArray([
	{ _id: 'v1', Name: 'Actual', suffix: '' },
	{ _id: 'v1000', Name: 'Hundreds', suffix: 'K' },
	{ _id: 'v1000000', Name: 'Millions', suffix: 'M' },
	{ _id: 'v1000000000', Name: 'Billions', suffix: 'B' },
])

yc.groupMap = (arr, c, d) => {
	return _.map(_.groupBy(arr, c), d)
}

yc.breakdownKey = () => {
	return `_id_${toolkit.replace(yc.breakdownBy(), '.', '_')}`
}

yc.refresh = () => {
	let param = {}
	param.pls = ['PL44B', 'PL8A', 'PL74C']
	param.groups = rpt.parseGroups([yc.breakdownBy()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(true, rpt.optionFiscalYears)

	if (yc.flag() === 'gt-breakdown') {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ['I2']
		})
	} else if (yc.flag() === 'mt-breakdown') {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ['I3']
		})
	} else if (yc.flag() === 'rd-breakdown') {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ['I1']
		})
	}

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				yc.contentIsLoading(false)
				return
			}
	
			yc.contentIsLoading(false)
			yc.data(res.Data.Data)
			yc.render()
		}, () => {
			yc.contentIsLoading(false)
		})
	}

	yc.contentIsLoading(true)
	fetch()
}

yc.render = () => {
	let divider = parseInt(yc.unit().replace(/v/g, ''), 10)
	let unitSuffix = yc.optionUnit().find((d) => d._id == yc.unit()).suffix

	let dimensionTitle = 'Dimension'
	toolkit.try(() => {
		dimensionTitle = rpt.optionDimensions().find((d) => d.field == yc.breakdownBy()).name
	})

	let plCodeEBIT = 'PL44B'
	let plCodeNetSales = 'PL8A'
	let plGrossMargin = 'PL74C'

	let total2015_ebit     = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[plCodeEBIT])
	let total2015_netSales = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[plCodeNetSales])
	let total2014_ebit     = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[plCodeEBIT])
	let total2014_netSales = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[plCodeNetSales])

	let total2015_GrossMargin = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[plGrossMargin])
	let total2014_GrossMargin = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[plGrossMargin])

	let op1 = yc.groupMap(yc.data(), (d) => d._id[yc.breakdownKey()], (v, k) => {
		let o = {}
		o.dimension = k.replace(/ /g, '&nbsp;')
		o.sorter = 0

		o.v2015_ebit_value = 0
		o.v2015_ebit_prcnt = 0
		o.v2015_nsal_value = 0
		o.v2015_nsal_prcnt = 0
		o.v2015_gs_prcnt = 0
		o.v2015_ebit_prcnt = 0

		o.v2014_ebit_value = 0
		o.v2014_ebit_prcnt = 0
		o.v2014_nsal_value = 0
		o.v2014_nsal_prcnt = 0
		o.v2014_gs_prcnt = 0
		o.v2014_ebit_prcnt = 0

		let data2015 = v.filter((e) => e._id._id_date_fiscal === '2015-2016')
		let data2014 = v.filter((e) => e._id._id_date_fiscal === '2014-2015')

		toolkit.try(() => { o.sorter = data2015[0][plCodeEBIT] })

		toolkit.try(() => { o.v2014_ebit_value = data2014[0][plCodeEBIT] / divider })
		toolkit.try(() => { o.v2014_ebit_prcnt = 0 })
		toolkit.try(() => { o.v2014_nsal_value = data2014[0][plCodeNetSales] / divider })
		toolkit.try(() => { o.v2014_nsal_prcnt = 0 })
		toolkit.try(() => { o.v2014_gs_prcnt = data2014[0][plGrossMargin]/total2014_GrossMargin*100 })
		toolkit.try(() => { o.v2014_ebit_prcnt = data2014[0][plCodeEBIT]/total2014_ebit*100 })

		toolkit.try(() => { o.v2015_ebit_value = data2015[0][plCodeEBIT] / divider })
		toolkit.try(() => { 
			let v2015 = data2015[0][plCodeEBIT]
			let v2014 = data2014[0][plCodeEBIT]
			if (v2015 <= 0 && v2014 <= 0) {
				return
			}
			o.v2015_ebit_prcnt = toolkit.number((v2015 - v2014) / v2014) * 100
		})
		toolkit.try(() => { o.v2015_nsal_value = data2015[0][plCodeNetSales] / divider })
		toolkit.try(() => { o.v2015_gs_prcnt = data2015[0][plGrossMargin] / total2015_GrossMargin*100 })
		toolkit.try(() => { o.v2015_ebit_prcnt = data2015[0][plCodeEBIT] / total2015_ebit*100 })
		toolkit.try(() => { 
			let v2015 = data2015[0][plCodeNetSales]
			let v2014 = data2014[0][plCodeNetSales]
			if (v2015 <= 0 && v2014 <= 0) {
				return
			}
			o.v2015_nsal_prcnt = toolkit.number((v2015 - v2014) / v2014) * 100
		})

		return o
	})
	let op2 = _.orderBy(op1, (d) => d.sorter, 'desc')
	let dataParsed = op2

	let total = {
		dimension: 'Total',
		v2015_ebit_value: toolkit.sum(dataParsed, (d) => d.v2015_ebit_value),
		v2015_nsal_value: toolkit.sum(dataParsed, (d) => d.v2015_nsal_value),
		v2014_ebit_value: toolkit.sum(dataParsed, (d) => d.v2014_ebit_value),
		v2014_nsal_value: toolkit.sum(dataParsed, (d) => d.v2014_nsal_value)
	}
	total.v2015_ebit_prcnt = toolkit.number((total.v2015_ebit_value - total.v2014_ebit_value) / total.v2014_ebit_value) * 100
	total.v2015_nsal_prcnt = toolkit.number((total.v2015_nsal_value - total.v2014_nsal_value) / total.v2014_nsal_value) * 100

	// dataParsed.push(total)

	let dimensionWidth = 140
	if (yc.breakdownBy() == 'customer.region') {
		dimensionWidth = 160
	}

	let tableWidth = 1200
	if (yc.unit() == 'v1000000') {
		tableWidth += (80 * 1)
	}
	if (yc.unit() == 'v1000') {
		tableWidth += (80 * 2)
	}
	if (yc.unit() == 'v1') {
		tableWidth += (80 * 3)
	}

	let columns = [{
		title: dimensionTitle,
		template: (d) => d.dimension,
		headerAttributes: { style: 'vertical-align: middle;' },
		footerTemplate: 'Total',
		width: dimensionWidth
		// width: 200,
		// locked: true
	}, {
		title: 'FY 2015-2016',
		columns: [{
			title: 'Net Sales',
			columns: [{
				title: 'Value',
				field: 'v2015_nsal_value',
				format: `{0:n0}`, // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_nsal_value, 'n0')}</div>`,
				// width: 130,
				// locked: true
			}, {
				title: '% Growth',
				field: 'v2015_nsal_prcnt',
				format: '{0:n1} %',
				attributes: { class: 'align-right' },
				footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_nsal_prcnt, 'n1')} %</div>`,
				// locked: true
			}]
		}, {
			title: "% Gross Margin",
			field: "v2015_gs_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">100 %</div>`
		}, {
			title: 'EBIT',
			columns: [{
				title: 'Value',
				field: 'v2015_ebit_value',
				format: `{0:n0}`, // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_ebit_value, 'n0')}</div>`,
				// width: 130,
				// locked: true
			}, {
				title: '% Growth',
				field: 'v2015_ebit_prcnt',
				format: '{0:n1} %',
				attributes: { class: 'align-right' },
				footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_ebit_prcnt, 'n1')} %</div>`,
				// locked: true
			}]
		}, {
			title: "% Ebit",
			field: "v2015_ebit_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">100 %</div>`
		}]
	}, {
		title: 'FY 2014-2015',
		columns: [{
			title: 'Net Sales',
			columns: [{
				title: 'Value',
				field: 'v2014_nsal_value',
				format: `{0:n0}`, // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_nsal_value, 'n0')}</div>`,
				// width: 130,
				// locked: true
			}]
		},{
			title: "% Gross Margin",
			field: "v2014_gs_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">100 %</div>`
		}, {
			title: 'EBIT',
			columns: [{
				title: 'Value',
				field: 'v2014_ebit_value',
				format: `{0:n0}`, // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_ebit_value, 'n0')}</div>`,
				// width: 130,
				// locked: true
			}]
		}, {
			title: "% Ebit",
			field: "v2014_ebit_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">100 %</div>`
		}]
	}]

	console.log('----', dataParsed)

	let config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns
	}

	$('#year-comparison').replaceWith(`<div class="breakdown-view ez" id="year-comparison" style="width: ${tableWidth}px;"></div>`)
	$('#year-comparison').kendoGrid(config)
}

yc.changeDimension = (title, args) => {
	yc.subTitle(title)
	yc.breakdownBy(args.split('|')[0])
	yc.flag('')

	if (args.indexOf('|') > -1) {
		yc.flag(args.split('|')[1])
	}

	yc.refresh()
}


vm.currentMenu('YoY Rev & EBIT')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: yc.title(), href: '#' }
])


$(() => {
	yc.refresh()
	rpt.showExport(true)
})


/**

---------------------------------------------------------
|       |          2016         |          2015         |
---------------------------------------------------------
|       |   EBIT    | NET SALES |   EBIT    | NET SALES |
---------------------------------------------------------
|       | Value | % | Value | % | Value | % | Value | % |
---------------------------------------------------------
| Total |  124  | 6 |  124  | 6 |  124  | 6 |  124  | 6 |
---------------------------------------------------------
| MT    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
| GT    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
| RD    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
---------------------------------------------------------

*/

