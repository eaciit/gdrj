viewModel.volPriceAnalysis = {}
let vpa = viewModel.volPriceAnalysis

vpa.title = ko.observable('Volume and Price Analysis')
vpa.breakdownBy = ko.observable('product.brandcategoryid')
vpa.brand = ko.observable('')
vpa.contentIsLoading = ko.observable(false)
vpa.data = ko.observableArray([])
vpa.flag = ko.observable('')
vpa.unit = ko.observable('v1000000000')
vpa.optionUnit = ko.observableArray([
	{ _id: 'v1', Name: 'Actual', suffix: '' },
	{ _id: 'v1000', Name: 'Hundreds', suffix: 'K' },
	{ _id: 'v1000000', Name: 'Millions', suffix: 'M' },
	{ _id: 'v1000000000', Name: 'Billions', suffix: 'B' },
])

vpa.optionFilterProductBrand = ko.observableArray([])
vpa.optionFilterProductBrandCategory = ko.observableArray([])

vpa.optionFilterOutletID = ko.observableArray([])
vpa.filterOutletID = ko.observableArray([])

vpa.getDivider = () => {
	return parseInt(vpa.unit().replace(/v/g, ''), 10)
}

vpa.groupMap = (arr, c, d) => {
	return _.map(_.groupBy(arr, c), d)
}

vpa.breakdownKey = () => {
	return `_id_${toolkit.replace(vpa.breakdownBy(), '.', '_')}`
}

vpa.refresh = () => {
	let param = {}
	// param.pls = ['PL44B', 'PL8A', 'PL74C']
	param.groups = rpt.parseGroups([vpa.breakdownBy()])
	param.aggr = 'sum'
	param.flag = 'volpriceanalysis'
	param.filters = rpt.getFilterValue(true, rpt.optionFiscalYears)

	param.filters.push({
		Field: "customer.channelname",
		Op: "$in",
		Value: rpt.masterData.Channel()
			.map((d) => d._id)
			.filter((d) => d != "EXP")
			.filter((d) => d != "I1")
	})

	if (vpa.brand().length > 0) {
		param.filters.push({
			Field: 'product.brand',
			Op: '$eq',
			Value: vpa.brand()
		})
	}

	if (vpa.filterOutletID().length > 0) {
		param.filters.push({
			Field: 'customer_customerid',
			Op: '$in',
			Value: vpa.filterOutletID()
		})
	}


	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				vpa.contentIsLoading(false)
				return
			}
	
			vpa.contentIsLoading(false)
			vpa.data(res.Data.Data)
			vpa.render()
		}, () => {
			vpa.contentIsLoading(false)
		})
	}

	vpa.contentIsLoading(true)
	fetch()
}

vpa.render = () => {
	let dimensionTitle = 'Dimension'
	toolkit.try(() => {
		dimensionTitle = rpt.optionDimensions().find((d) => d.field == vpa.breakdownBy()).name
	})

	let plGrossSales = 'PL0'
	let codeSalesQty = 'salesqty'

	let total2015_netSales = toolkit.sum(vpa.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[plGrossSales])
	let total2014_netSales = toolkit.sum(vpa.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[plGrossSales])

	let total2015_qty = toolkit.sum(vpa.data().filter((d) => d._id._id_date_fiscal === '2015-2016'), (d) => d[codeSalesQty])
	let total2014_qty = toolkit.sum(vpa.data().filter((d) => d._id._id_date_fiscal === '2014-2015'), (d) => d[codeSalesQty])

	let calcGrowth = (data2015, data2014, plcode) => {
		let v2015 = data2015[0][plcode]
		let v2014 = data2014[0][plcode]
		if (v2015 <= 0 && v2014 <= 0) {
			return 0
		}

		console.log('----', plcode, v2015, v2014)

		return toolkit.number((v2015 - v2014) / v2014) * 100
	}

	let op1 = vpa.groupMap(vpa.data(), (d) => d._id[vpa.breakdownKey()], (v, k) => {
		let o = {}
		o.dimension = k.replace(/ /g, '&nbsp;')
		o.sorter = 0

		let data2015 = v.filter((e) => e._id._id_date_fiscal === '2015-2016')
		let data2014 = v.filter((e) => e._id._id_date_fiscal === '2014-2015')

		toolkit.try(() => { o.sorter = data2015[0][plGrossSales] })
		//2015 Qty	Price	Gross Sales	Vol. Var	Price Var.
		o.v2015_nsal_value = 0
		toolkit.try(() => { o.v2015_nsal_value = data2015[0][plGrossSales] })

		o.v2015_nsal_qty = 0
		toolkit.try(() => { o.v2015_nsal_qty = data2015[0][codeSalesQty] })

		o.v2015_price_value = 0
		toolkit.try(() => { o.v2015_price_value = data2015[0][plGrossSales] / data2015[0][codeSalesQty] })

		o.v2015_vol_var = 0
		o.v2015_price_var = 0


		//2014
		o.v2014_nsal_value = 0
		toolkit.try(() => { o.v2014_nsal_value = data2014[0][plGrossSales] })

		o.v2014_nsal_qty = 0
		toolkit.try(() => { o.v2014_nsal_qty = data2014[0][codeSalesQty] })

		o.v2014_price_value = 0
		toolkit.try(() => { o.v2014_price_value = data2014[0][plGrossSales] / data2014[0][codeSalesQty] })

		o.v2014_vol_var = 0
		o.v2014_price_var = 0

		let deltaprice = 0
		toolkit.try(() => { deltaprice = o.v2015_price_value - o.v2014_price_value })

		let deltavolume = 0
		toolkit.try(() => { deltavolume = o.v2015_nsal_qty - o.v2014_nsal_qty })

		toolkit.try(() => { o.v2015_vol_var = deltavolume * o.v2015_price_value })
		toolkit.try(() => { o.v2015_price_var = deltaprice * o.v2015_nsal_qty })		

		toolkit.try(() => { o.v2014_vol_var = deltavolume * o.v2014_price_value })
		toolkit.try(() => { o.v2014_price_var = deltaprice * o.v2015_nsal_qty })

		return o
	})
	
	let op2 = _.orderBy(op1, (d) => {
		return rpt.orderByChannel(d.dimension, d.sorter)
	}, 'desc')
	let dataParsed = op2



	let total = {}
	total.dimension = 'Total'

	total.v2015_nsal_value = total2015_netSales
	total.v2015_nsal_qty = total2015_qty
	total.v2015_price_value = '-'
	total.v2015_vol_var = '-'
	total.v2015_price_var = '-'

	total.v2014_nsal_value = total2014_netSales
	total.v2014_nsal_qty = total2014_qty
	total.v2014_price_value = '-'
	total.v2014_vol_var = '-'
	total.v2014_price_var = '-'

	console.log('total', total)


	let dimensionWidth = 140
	if (vpa.breakdownBy() == 'customer.region') {
		dimensionWidth = 160
	}

	let widthValue = 105
	let widthQty = 90
	let tableWidth = 1200
	
	let columns = [{
		title: 'Brand Category<br />( '+vpa.brand()+' )',
		template: (d) => d.dimension,
		headerAttributes: { style: 'vertical-align: middle;' },
		footerTemplate: 'Total',
		width: dimensionWidth,
		locked: true
	}, {
		title: 'FY 2014-2015',
		headerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
		columns: [{
			headerTemplate: 'Sales Qty',
			field: 'v2014_nsal_qty',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_nsal_qty, 'n0')}</div>`,
			width: widthQty,
		}, {
			headerTemplate: 'Price',
			field: 'v2014_price_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_price_value, 'n0')}</div>`,
			width: widthQty,
		},
		{
			headerTemplate: 'Gross Sales',
			field: 'v2014_nsal_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_nsal_value, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'Volume<br />Variance',
			headerAttributes: { style: 'vertical-align: middle !important;' },
			field: 'v2014_vol_var',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_vol_var, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'Price<br />Variance',
			field: 'v2014_price_var',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_price_var, 'n0')}</div>`,
			width: widthValue,
		}]
	}, {
		title: 'FY 2015-2016',
		columns: [{
			headerTemplate: 'Sales Qty',
			field: 'v2015_nsal_qty',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_nsal_qty, 'n0')}</div>`,
			width: widthQty,
		}, {
			headerTemplate: 'Price',
			field: 'v2015_price_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_price_value, 'n0')}</div>`,
			width: widthQty,
		},
		{
			headerTemplate: 'Gross Sales',
			field: 'v2015_nsal_value',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_nsal_value, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'Volume<br />Variance',
			headerAttributes: { style: 'vertical-align: middle !important;' },
			field: 'v2015_vol_var',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_vol_var, 'n0')}</div>`,
			width: widthValue,
		}, {
			headerTemplate: 'Price<br />Variance',
			field: 'v2015_price_var',
			format: `{0:n0}`,
			attributes: { class: 'align-right' },
			footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_price_var, 'n0')}</div>`,
			width: widthValue,
		}]
	}]

	let config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns,
		dataBound: () => {
			let sel = '#year-comparison .k-grid-content-locked tr, #year-comparison .k-grid-content tr'

			$(sel).on('mouseenter', function () {
				let index = $(this).index()
		        let elh = $(`#year-comparison .k-grid-content-locked tr:eq(${index})`).addClass('hover')
		        let elc = $(`#year-comparison .k-grid-content tr:eq(${index})`).addClass('hover')
			})
			$(sel).on('mouseleave', function () {
				$('#year-comparison tr.hover').removeClass('hover')
			})
		}
	}

	$('#year-comparison').replaceWith(`<div class="breakdown-view ez" id="year-comparison"></div>`)
	$('#year-comparison').kendoGrid(config)
}

vpa.changeDimension = (title, args) => {
	vpa.subTitle(title)
	vpa.breakdownBy(args.split('|')[0])
	vpa.flag('')

	if (args.indexOf('|') > -1) {
		vpa.flag(args.split('|')[1])
	}

	vpa.refresh()
}


vm.currentMenu('Analysis')
vm.currentTitle('Volume Price Analysis')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Analysis', href: '#' },
	{ title: 'Volume Price Analysis', href: '#' }
])

vpa.fillProductBrandData = (callback) => {
	toolkit.ajaxPost(viewModel.appName + "report/getdatabrand", {}, (res) => {
		vpa.optionFilterProductBrand(res.data.map((d) => {
			let o = {}
			o._id = d._id
			o.Name = d.Name

			return o
		}))

		vpa.brand('HIT')
		if (typeof callback === 'function') {
			callback()
		}
	})
}

vpa.fillProductBrandCategory = () => {
	toolkit.ajaxPost(viewModel.appName + "report/getdatahbrandcategory", {}, (res) => {
		vpa.optionFilterProductBrandCategory(res.data.map((d) => {
			let o = {}
			o._id = d._id
			o.Name = `${d._id} - ${d.Name}`

			return o
		}))
	})
}

vpa.fillCustomerData = () => {
	let param = { keyword: '' }
	toolkit.ajaxPost(viewModel.appName + "report/getdatacustomer", param, (res) => {
		vpa.optionFilterOutletID(res.data.map((d) => {
			let o = {}
			o._id = d._id
			o.Name = `${d._id} - ${d.Name}`

			return o
		}))
	})
}

$(() => {
	vpa.fillProductBrandData(function () {
		vpa.refresh()
	})
	vpa.fillProductBrandCategory()
	vpa.fillCustomerData()
	
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

