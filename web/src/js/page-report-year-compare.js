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

	if (['customer.branchname', 'customer.branchgroup'].indexOf(yc.breakdownBy()) > -1) {
		let noExport = {
			Field: 'customer.channelname',
			Op: '$in',
			Value: rpt.masterData.Channel()
				.map((d) => d._id)
				.filter((d) => d != "EXP")
		}
		param.filters = [noExport].concat(param.filters)
	}

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

	let total2015_netSales = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[plCodeNetSales])
	let total2014_netSales = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[plCodeNetSales])

	let total2015_ebit = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[plCodeEBIT])
	let total2014_ebit = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[plCodeEBIT])
	
	let total2015_GrossMargin = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[plGrossMargin])
	let total2014_GrossMargin = toolkit.sum(yc.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[plGrossMargin])

	let calcGrowth = (data2015, data2014, plcode) => {
		let v2015 = data2015[0][plcode]
		let v2014 = data2014[0][plcode]
		if (v2015 <= 0 && v2014 <= 0) {
			return 0
		}

		console.log('----', plcode, v2015, v2014)

		return toolkit.number((v2015 - v2014) / v2014) * 100
	}

	let op1 = yc.groupMap(yc.data(), (d) => d._id[yc.breakdownKey()], (v, k) => {
		let o = {}
		o.dimension = k.replace(/ /g, '&nbsp;')
		o.sorter = 0

		let data2015 = v.filter((e) => e._id._id_date_fiscal === '2015-2016')
		let data2014 = v.filter((e) => e._id._id_date_fiscal === '2014-2015')

		toolkit.try(() => { o.sorter = data2015[0][plCodeNetSales] })

		o.v2015_nsal_value = 0
		o.v2015_nsal_growth = 0
		toolkit.try(() => { o.v2015_nsal_value = data2015[0][plCodeNetSales] })
		toolkit.try(() => { o.v2015_nsal_growth = calcGrowth(data2015, data2014, plCodeNetSales) })

		o.v2015_ebit_value = 0
		o.v2015_ebit_growth = 0
		toolkit.try(() => { o.v2015_ebit_value = data2015[0][plCodeEBIT] })
		toolkit.try(() => { o.v2015_ebit_growth = calcGrowth(data2015, data2014, plCodeEBIT) })

		o.v2015_gs_ctb_value = 0
		toolkit.try(() => { o.v2015_gs_ctb_value = data2015[0][plGrossMargin] / total2015_GrossMargin * 100 })
		o.v2014_gs_ctb_value = 0
		toolkit.try(() => { o.v2014_gs_ctb_value = data2014[0][plGrossMargin] / total2014_GrossMargin * 100 })

		o.v2015_gs_ctb_growth = 0
		toolkit.try(() => {
			let prcnt = (o.v2015_gs_ctb_value - o.v2014_gs_ctb_value) / o.v2014_gs_ctb_value * 100
			o.v2015_gs_ctb_growth = prcnt
		})

		o.v2015_ebit_ctb_value = 0
		toolkit.try(() => { o.v2015_ebit_ctb_value = data2015[0][plCodeEBIT] / total2015_ebit * 100 })
		o.v2014_ebit_ctb_value = 0
		toolkit.try(() => { o.v2014_ebit_ctb_value = data2014[0][plCodeEBIT] / total2014_ebit * 100 })
		
		o.v2015_ebit_ctb_growth = 0
		toolkit.try(() => {
			let prcnt = (o.v2015_ebit_ctb_value - o.v2014_ebit_ctb_value) / o.v2014_ebit_ctb_value * 100
			o.v2015_ebit_ctb_growth = prcnt
		})

		o.v2014_nsal_value = 0
		toolkit.try(() => { o.v2014_nsal_value = data2014[0][plCodeNetSales] })

		o.v2014_ebit_value = 0
		toolkit.try(() => { o.v2014_ebit_value = data2014[0][plCodeEBIT] })

		return o
	})
	let op2 = _.orderBy(op1, (d) => {
		return rpt.orderByChannel(d.dimension, d.sorter)
	}, 'desc')
	let dataParsed = op2



	let total = {}
	total.dimension = 'Total'

	total.v2015_nsal_value = toolkit.sum(dataParsed, (d) => d.v2015_nsal_value)
	total.v2015_ebit_value = toolkit.sum(dataParsed, (d) => d.v2015_ebit_value)
	total.v2015_gs_ctb_value = toolkit.sum(dataParsed, (d) => d.v2015_gs_ctb_value)
	total.v2015_ebit_ctb_value = toolkit.sum(dataParsed, (d) => d.v2015_ebit_ctb_value)

	total.v2014_nsal_value = toolkit.sum(dataParsed, (d) => d.v2014_nsal_value)
	total.v2014_ebit_value = toolkit.sum(dataParsed, (d) => d.v2014_ebit_value)
	total.v2014_gs_ctb_value = toolkit.sum(dataParsed, (d) => d.v2014_gs_ctb_value)
	total.v2014_ebit_ctb_value = toolkit.sum(dataParsed, (d) => d.v2014_ebit_ctb_value)

	total.v2015_nsal_growth = toolkit.number((total.v2015_nsal_value - total.v2014_nsal_value) / total.v2014_nsal_value) * 100
	total.v2015_ebit_growth = toolkit.number((total.v2015_ebit_value - total.v2014_ebit_value) / total.v2014_ebit_value) * 100
	total.v2015_gs_ctb_growth = toolkit.number((total.v2015_gs_ctb_value - total.v2014_gs_ctb_value) / total.v2014_gs_ctb_value) * 100
	total.v2015_ebit_ctb_growth = toolkit.number((total.v2015_ebit_ctb_value - total.v2014_ebit_ctb_value) / total.v2014_ebit_ctb_value) * 100



	let dimensionWidth = 140
	if (yc.breakdownBy() == 'customer.region') {
		dimensionWidth = 160
	}

	let widthValue = 120
	let widthPrcnt = 90
	let tableWidth = 1200
	if (yc.unit() == 'v1000000') {
		tableWidth += (120 * 1)
		widthValue += (10 * 1)
	}
	if (yc.unit() == 'v1000') {
		tableWidth += (120 * 2)
		widthValue += (10 * 2)
	}
	if (yc.unit() == 'v1') {
		tableWidth += (120 * 3)
		widthValue += (10 * 3)
	}


	let columns = [{
		title: dimensionTitle,
		template: (d) => d.dimension,
		headerAttributes: { style: 'vertical-align: middle;' },
		footerTemplate: 'Total',
		width: dimensionWidth,
		locked: true
	}, {
		title: 'FY 2015-2016',
		headerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
		columns: [{
			headerTemplate: 'Net Sales<br />Value',
			field: 'v2015_nsal_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_nsal_value, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'Net Sales<br />Growth',
			field: 'v2015_nsal_growth',
			format: '{0:n1} %',
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_nsal_growth, 'n1')} %</div>`,
			width: widthPrcnt,
		},

		{
			headerTemplate: 'EBIT<br />Value',
			field: 'v2015_ebit_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_ebit_value, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'EBIT<br />Growth',
			field: 'v2015_ebit_growth',
			format: '{0:n1} %',
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_ebit_growth, 'n1')} %</div>`,
			width: widthPrcnt,
		},

		{
			headerTemplate: 'GM %<br />Value',
			field: 'v2015_gs_ctb_value',
			format: `{0:n1} %`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_gs_ctb_value, 'n0')} %</div>`,
			width: widthPrcnt,
		}, {
			headerTemplate: 'GM %<br />Growth',
			field: 'v2015_gs_ctb_growth',
			format: '{0:n1} %',
			attributes: { class: 'align-right' },
			// footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_gs_ctb_growth, 'n1')} %</div>`,
			width: widthPrcnt,
		},

		{
			headerTemplate: 'EBIT %<br />Value',
			field: 'v2015_ebit_ctb_value',
			format: `{0:n1} %`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_ebit_ctb_value, 'n0')} %</div>`,
			width: widthPrcnt,
		}, {
			headerTemplate: 'EBIT %<br />Growth',
			field: 'v2015_ebit_ctb_growth',
			format: '{0:n1} %',
			attributes: { class: 'align-right', style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
			headerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
			footerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
			// footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_ebit_ctb_growth, 'n1')} %</div>`,
			width: widthPrcnt,
		}]
	}, {
		title: 'FY 2014-2015',
		columns: [{
			headerTemplate: 'Net Sales<br />Value',
			field: 'v2014_nsal_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_nsal_value, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'EBIT<br />Value',
			field: 'v2014_ebit_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_ebit_value, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'GM %<br />Value',
			field: 'v2014_gs_ctb_value',
			format: `{0:n1} %`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_gs_ctb_value, 'n1')} %</div>`,
			width: widthPrcnt,
		}, {
			title: "EBIT %<br />Value",
			field: "v2014_ebit_ctb_value",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_ebit_ctb_value, 'n1')} %</div>`,
			headerAttributes: { style: 'vertical-align: middle;' },
			width: widthPrcnt,
		}]
	}]

	console.log('----', dataParsed)

	let config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns
	}

	$('#year-comparison').replaceWith(`<div class="breakdown-view ez" id="year-comparison"></div>`)
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

