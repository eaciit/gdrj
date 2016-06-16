// let menuLink = vm.menu()
// 	.find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

vm.currentMenu('Report')
vm.currentTitle('Report')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Report', href: '/web/report/all' }
])

viewModel.report = new Object()
let rpt = viewModel.report

rpt.filter = [
	{ _id: 'common', group: 'Base Filter', sub: [
		{ _id: 'Branch', from: 'Branch', title: 'Branch' },
		{ _id: 'Brand', from: 'Brand', title: 'Brand' },
		{ _id: 'Channel', from: 'Channel', title: 'Channel' },
		{ _id: 'RegionC', from: 'Region', title: 'Region' },
		{ _id: 'From', from: 'From' },
		{ _id: 'To', from: 'To' },
	] },
	{ _id: 'geo', group: 'Geographical', sub: [
		{ _id: 'Zone', from: 'Zone', title: 'Zone' },
		{ _id: 'Region', from: 'Region', title: 'Region' },
		{ _id: 'Area', from: 'Area', title: 'Area' }
	] },
	{ _id: 'customer', group: 'Customer', sub: [
		{ _id: 'ChannelC', from: 'Channel', title: 'Channel' },
		{ _id: 'KeyAccount', from: 'KeyAccount', title: 'Accounts' },
		{ _id: 'Customer', from: 'Customer', title: 'Outlet' }
	] },
	{ _id: 'product', group: 'Product', sub: [
		{ _id: 'HBrandCategory', from: 'HBrandCategory', title: 'Group' },
		{ _id: 'BrandP', from: 'Brand', title: 'Brand' },
		{ _id: 'Product', from: 'Product', title: 'SKU' }
	] },
	{ _id: 'profit_center', group: 'Profit Center', sub: [
		{ _id: 'Entity', from: 'Entity', title: 'Entity' },
		{ _id: 'Type', from: 'Type', title: 'Type' },
		{ _id: 'BranchPC', from: 'Branch', title: 'Branch' },
		{ _id: 'HQ', from: 'HQ', title: 'HQ' }
	] },
	{ _id: 'cost_center', group: 'Cost Center', sub: [
		{ _id: 'Group1', from: 'Group1', title: 'Group 1' },
		{ _id: 'Group2', from: 'Group2', title: 'Group 2' },
		{ _id: 'HCostCenterGroup', from: 'HCostCenterGroup', title: 'Function' }
	] },
	{ _id: 'ledger', group: 'Ledger', sub: [
		{ _id: 'LedgerAccount', from: 'LedgerAccount', title: 'GL Code' }
	] },
]

rpt.pivotModel = [
    { field: '_id', type: 'string', name: 'ID' },

    { field: 'PC._id', type: 'string', name: 'Profit Center - ID' },
    { field: 'PC.EntityID', type: 'string', name: 'Profit Center - Entity ID' },
    { field: 'PC.Name', type: 'string', name: 'Profit Center - Name' },
    { field: 'PC.BrandID', type: 'string', name: 'Profit Center - Brand ID' },
    { field: 'PC.BrandCategoryID', type: 'string', name: 'Profit Center - Brand Category ID' },
    { field: 'PC.BranchID', type: 'string', name: 'Profit Center - Branch ID' },
    { field: 'PC.BranchType', type: 'int', name: 'Profit Center - Branch Type' },

    { field: 'CC._id', type: 'string', name: 'Cost Center - ID' },
    { field: 'CC.EntityID', type: 'string', name: 'Cost Center - Entity ID' },
    { field: 'CC.Name', type: 'string', name: 'Cost Center - Name' },
    { field: 'CC.CostGroup01', type: 'string', name: 'Cost Center - Cost Group 01' },
    { field: 'CC.CostGroup02', type: 'string', name: 'Cost Center - Cost Group 02' },
    { field: 'CC.CostGroup03', type: 'string', name: 'Cost Center - Cost Group 03' },
    { field: 'CC.BranchID', type: 'string', name: 'Cost Center - Branch ID' },
    { field: 'CC.BranchType', type: 'string', name: 'Cost Center - Branch Type' },
    { field: 'CC.CCTypeID', type: 'string', name: 'Cost Center - Type' },
    { field: 'CC.HCCGroupID', type: 'string', name: 'Cost Center - HCC Group ID' },

    { field: 'CompanyCode', type: 'string', name: 'Company Code' },
    { field: 'LedgerAccount', type: 'string', name: 'Ledger Account' },

    { field: 'Customer._id', type: 'string', name: 'Customer - ID' },
    { field: 'Customer.BranchID', type: 'string', name: 'Customer - Branch ID' },
    { field: 'Customer.BranchName', type: 'string', name: 'Customer - branch Name' },
    { field: 'Customer.Name', type: 'string', name: 'Customer - Name' },
    { field: 'Customer.KeyAccount', type: 'string', name: 'Customer - Key Account' },
    { field: 'Customer.ChannelID', type: 'string', name: 'Customer - Channel ID' },
    { field: 'Customer.ChannelName', type: 'string', name: 'Customer - Channel Name' },
    { field: 'Customer.CustomerGroup', type: 'string', name: 'Customer - Customer Group' },
    { field: 'Customer.CustomerGroupName', type: 'string', name: 'Customer - Customer Group Name' },
    { field: 'Customer.National', type: 'string', name: 'Customer - National' },
    { field: 'Customer.Zone', type: 'string', name: 'Customer - Zone' },
    { field: 'Customer.Region', type: 'string', name: 'Customer - Region' },
    { field: 'Customer.Area', type: 'string', name: 'Customer - Area' },

    { field: 'Product._id', type: 'string', name: 'Product - ID' },
    { field: 'Product.Name', type: 'string', name: 'Product - Name' },
    { field: 'Product.ProdCategory', type: 'string', name: 'Product - Category' },
    { field: 'Product.Brand', type: 'string', name: 'Product - Brand' },
    { field: 'Product.BrandCategoryID', type: 'string', name: 'Product - Brand Category ID' },
    { field: 'Product.PCID', type: 'string', name: 'Product - PCID' },
    { field: 'Product.ProdSubCategory', type: 'string', name: 'Product - Sub Category' },
    { field: 'Product.ProdSubBrand', type: 'string', name: 'Product - Sub Brand' },
    { field: 'Product.ProdVariant', type: 'string', name: 'Product - Variant' },
    { field: 'Product.ProdDesignType', type: 'string', name: 'Product - Design Type' },

    { field: 'Date.ID', type: 'string', name: 'Date - ID' },
    { field: 'Date.Date', type: 'string', name: 'Date - Date' },
    { field: 'Date.Month', type: 'string', name: 'Date - Month' },
    { field: 'Date.Quarter', type: 'int', name: 'Date - Quarter' },
    { field: 'Date.YearTxt', type: 'string', name: 'Date - YearTxt' },
    { field: 'Date.QuarterTxt', type: 'string', name: 'Date - QuarterTxt' },
    { field: 'Date.Year', type: 'int', name: 'Date - Year' },

    { field: 'PLGroup1', type: 'string', name: 'PL Group 1' },
    { field: 'PLGroup2', type: 'string', name: 'PL Group 2' },
    { field: 'PLGroup3', type: 'string', name: 'PL Group 3' },
    { field: 'PLGroup4', type: 'string', name: 'PL Group 4' },
    { field: 'Value1', type: 'double', name: 'Value 1', as: 'dataPoints' },
    { field: 'Value2', type: 'double', name: 'Value 2', as: 'dataPoints' },
    { field: 'Value3', type: 'double', name: 'Value 3', as: 'dataPoints' },
    { field: 'PCID', type: 'string', name: 'Profit Center ID' },
    { field: 'CCID', type: 'string', name: 'Cost Center ID' },
    { field: 'SKUID', type: 'string', name: 'SKU ID' },
    { field: 'PLCode', type: 'string', name: 'PL Code' },
    { field: 'Month', type: 'string', name: 'Month' },
    { field: 'Year', type: 'string', name: 'Year' },
]

rpt.optionFiscalYears = ko.observableArray(['2014-2015', '2015-2016'])
rpt.analysisIdeas = ko.observableArray([])
rpt.data = ko.observableArray([])
rpt.optionDimensions = ko.observableArray([
	// { field: "", name: 'None', title: '' },
	{ field: "customer.branchname", name: 'Branch/RD', title: 'customer_branchname' },
    { field: "product.brand", name: 'Brand', title: 'product_brand' },
	{ field: 'customer.channelname', name: 'Channel', title: 'customer_channelname' },
    // { field: 'customer.name', name: 'Outlet', title: 'customer_name' },
	// { field: 'product.name', name: 'Product', title: 'product_name' },
    // { field: 'customer.zone', name: 'Zone', title: 'customer_zone' },
    // { field: 'customer.city', name: 'City', title: 'customer_city' },
    { field: 'customer.region', name: 'Region', title: 'customer_region' },
    // { field: 'date.fiscal', name: 'Fiscal Year', title: 'date_fiscal' },
    { field: 'date.quartertxt', name: 'Quarter', title: 'date_quartertxt' },
    { field: 'date.month', name: 'Month', title: 'date_month' },
])
rpt.optionDataPoints = ko.observableArray([
    { field: 'value1', name: o['value1'] },
    { field: 'value2', name: o['value2'] },
    { field: 'value3', name: o['value3'] }
])
rpt.optionAggregates = ko.observableArray([
	{ aggr: 'sum', name: 'Sum' },
	{ aggr: 'avg', name: 'Avg' },
	{ aggr: 'max', name: 'Max' },
	{ aggr: 'min', name: 'Min' }
])
rpt.mode = ko.observable('render')
rpt.refreshView = ko.observable('')
rpt.idanalysisreport = ko.observable()
rpt.valueMasterData = {}
rpt.masterData = {
	geographi: ko.observableArray([])
}
rpt.enableHolder = {}
rpt.eventChange = {}
rpt.value = {
	HQ: ko.observable(false),
	From: ko.observable(new Date(2014, 0, 1)),
	To: ko.observable(new Date(2016, 11, 31)),
	FiscalYear: ko.observable(rpt.optionFiscalYears()[0]),
	FiscalYears: ko.observableArray([rpt.optionFiscalYears()[0]])
}
rpt.masterData.Type = ko.observableArray([
	{ value: 'Mfg', text: 'Mfg' },
	{ value: 'Branch', text: 'Branch' }
])
rpt.masterData.HQ = ko.observableArray([
	{ value: true, text: 'True' },
	{ value: false, text: 'False' }
])
rpt.filter.forEach((d) => {
	d.sub.forEach((e) => {
		if (rpt.masterData.hasOwnProperty(e._id)) {
			return
		}

		if (!rpt.value.hasOwnProperty(e._id)) {
			rpt.value[e._id] = ko.observableArray([])
		}
		rpt.valueMasterData[e._id] = ko.observableArray([])
		rpt.masterData[e._id] = ko.observableArray([])
		rpt.enableHolder[e._id] = ko.observable(true)
		rpt.eventChange[e._id] = function () {
			let self = this
			let value = self.value()

			setTimeout(() => {
				let vZone = rpt.valueMasterData['Zone']()
				let vRegion = rpt.valueMasterData['Region']()
				let vArea = rpt.valueMasterData['Area']()

				if (e._id == 'Zone') {
					let raw = Lazy(rpt.masterData.geographi())
						.filter((f) => (vZone.length == 0) ? true : (vZone.indexOf(f.Zone) > -1))
						.toArray()

					rpt.masterData.Region(rpt.groupGeoBy(raw, 'Region'))
					rpt.masterData.Area(rpt.groupGeoBy(raw, 'Area'))
				} else if (e._id == 'Region') {
					let raw = Lazy(rpt.masterData.geographi())
						.filter((f) => (vZone.length == 0) ? true : (vZone.indexOf(f.Zone) > -1))
						.filter((f) => (vRegion.length == 0) ? true : (vRegion.indexOf(f.Region) > -1))
						.toArray()

					rpt.masterData.Area(rpt.groupGeoBy(raw, 'Area'))
					rpt.enableHolder['Zone'](vRegion.length == 0)
				} else if (e._id == 'Area') {
					let raw = Lazy(rpt.masterData.geographi())
						.filter((f) => (vZone.length == 0) ? true : (vZone.indexOf(f.Zone) > -1))
						.filter((f) => (vRegion.length == 0) ? true : (vRegion.indexOf(f.Region) > -1))
						.toArray()

					rpt.enableHolder['Region'](vArea.length == 0)
					rpt.enableHolder['Zone'](vRegion.length == 0)
				}

				// change value event goes here
				toolkit.log(e._id, value)
			}, 100)
		}
	})
})

rpt.groupGeoBy = (raw, category) => {
	let groupKey = (category == 'Area') ? '_id' : category
	let data = Lazy(raw)
		.groupBy((f) => f[groupKey])
		.map((k, v) => { return { _id: v, Name: toolkit.capitalize(v, true) } })
		.toArray()

	return data
}

rpt.filterMultiSelect = (d) => {
	let config = {
		filter: 'contains',
		placeholder: 'Choose items ...',
		change: rpt.eventChange[d._id],
		value: rpt.value[d._id]
	}

	if (['HQ', 'Type'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: 'value',
			dataTextField: 'text',
			value: rpt.value[d._id]
		})
	} else if (['Customer'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			autoBind: false,
			minLength: 1,
			placeholder: 'Type min 1 chars',
			dataValueField: '_id',
			dataTextField: 'Name',
			template: (d) => `${d._id} - ${d.Name}`,
			enabled: rpt.enableHolder[d._id],
			dataSource: {
				serverFiltering: true,
                transport: {
                    read: {
                        url: `/report/getdata${d.from.toLowerCase()}`,
                    },
                    parameterMap: function(data, type) {
                    	let keyword = data.filter.filters[0].value
						return { keyword: keyword }
					}
                },
                schema: {
					data: 'data'
				}
			},
			value: rpt.value[d._id]
		})
	} else if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity', 'Channel', 'HBrandCategory', 'Product', 'Type', 'KeyAccount', 'LedgerAccount'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id],
			template: (d) => {
				if (d._id == 'KeyAccount') {
					return toolkit.capitalize(d.KeyAccount)
				}

				return toolkit.capitalize($.trim(d.Name))
			},
			value: rpt.value[d._id]
		})

		if (['Branch', 'Brand', 'Channel'].indexOf(d.from) > -1) {
			config.dataValueField = 'Name'
		}

		if (d.from == 'Product') {
			config = $.extend(true, config, {
				minLength: 1,
				placeholder: 'Type min 1 chars'
			})
		}

		toolkit.ajaxPost(`/report/getdata${d.from.toLowerCase()}`, {}, (res) => {
			if (!res.success) {
				return
			}

			rpt.masterData[d._id](_.sortBy(res.data, (d) => d.Name))
		})
	} else if (['Region', 'Area', 'Zone'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id],
			value: rpt.value[d._id]
		})

		if (d.from == 'Region') {
			toolkit.ajaxPost(`/report/getdatahgeographi`, {}, (res) => {
				if (!res.success) {
					return
				}

				rpt.masterData.geographi(_.sortBy(res.data, (d) => d.Name));

				['Region', 'Area', 'Zone'].forEach((e) => {
					let res = rpt.groupGeoBy(rpt.masterData.geographi(), e)
					rpt.masterData[e](_.sortBy(res, (d) => d.Name))
				})

				rpt.masterData.RegionC(rpt.masterData.Region())
			})
		}
	} else {
		config.data = rpt.masterData[d._id]().map((f) => {
			if (!f.hasOwnProperty('Name')) {
				return f
			}

			return { _id: f._id, Name: toolkit.capitalize(f.Name, true) }
		})
	}

	return config
}

rpt.toggleFilterCallback = toolkit.noop
rpt.toggleFilter = () => {
	let panelFilter = $('.panel-filter')
	let panelContent = $('.panel-content')

	if (panelFilter.is(':visible')) {
		panelFilter.hide()
		panelContent.attr('class', 'col-md-12 col-sm-12 ez panel-content')
	} else {
		panelFilter.show()
		panelContent.attr('class', 'col-md-9 col-sm-9 ez panel-content')
	}

	$('.k-grid').each((i, d) => {
		$(d).data('kendoGrid').refresh()
	})

	$('.k-pivot').each((i, d) => {
		$(d).data('kendoPivotGrid').refresh()
	})

	$('.k-chart').each((i, d) => {
		$(d).data('kendoChart').redraw()
	})
}
rpt.getFilterValue = (multiFiscalYear = false) => {
	let res = [
		{ 'Field': 'customer.branchname', 'Op': '$in', 'Value': rpt.value.Branch() },
		{ 'Field': 'product.brand', 'Op': '$in', 'Value': rpt.value.Brand().concat(rpt.value.BrandP()) },
		{ 'Field': 'customer.region', 'Op': '$in', 'Value': rpt.value.Region().concat(rpt.value.RegionC()) },
		{ 'Field': 'customer.channelname', 'Op': '$in', 'Value': rpt.value.Channel().concat(rpt.value.ChannelC()) },
		{ 'Field': 'date.year', 'Op': '$gte', 'Value': rpt.value.From() },
		{ 'Field': 'date.year', 'Op': '$lte', 'Value': rpt.value.To() },
		{ 'Field': 'customer.zone', 'Op': '$in', 'Value': rpt.value.Zone() },
		{ 'Field': 'customer.areaname', 'Op': '$in', 'Value': rpt.value.Area() },
		{ 'Field': 'customer.keyaccount', 'Op': '$in', 'Value': rpt.value.KeyAccount() },
		{ 'Field': 'customer.name', 'Op': '$in', 'Value': rpt.value.Customer() },
		{ 'Field': 'product.name', 'Op': '$in', 'Value': rpt.value.Product() },
	]

	if (multiFiscalYear) {
		res.push({ 
			'Field': 'date.fiscal', 
			'Op': '$in', 
			'Value': rpt.value.FiscalYears()
		})
	} else {
		res.push({ 
			'Field': 'date.fiscal', 
			'Op': '$eq', 
			'Value': rpt.value.FiscalYear()
		})
	}

	res = res.filter((d) => {
		if (d.Value instanceof Array) {
			return d.Value.length > 0
		} else {
			return d.Value != ''
		}
	})

	return res
}

rpt.getIdeas = () => {
	toolkit.ajaxPost('/report/getdataanalysisidea', { }, (res) => {
		if (!toolkit.isFine(res)) {
			return
		}
		
		rpt.idanalysisreport('')
		rpt.analysisIdeas(_.sortBy(res.data, (d) => d.order))
		let idreport = _.find(rpt.analysisIdeas(), function(a) { return a._id == o.ID })
		if (idreport != undefined) {
			rpt.idanalysisreport(idreport.name)
			vm.currentTitle("Report " + rpt.idanalysisreport())
		}
	})
}
rpt.wrapParam = (dimensions = [], dataPoints = []) => {
    return {
        dimensions: dimensions,
        dataPoints: dataPoints,
        filters: rpt.getFilterValue(),
        which: o.ID
    }
}

rpt.setName = function (data, options) {
    return function () {
        setTimeout(function () {
            var row = options().find(function (d) {
                return d.field == data.field()
            })
            if (toolkit.isDefined(row)) {
                data.name(row.name)
            }

            console.log(toolkit.koUnmap(data), options())
        }, 150)
    }
}
rpt.refresh = function () {
    ['pvt', 'tbl', 'crt', 'sct', 'bkd'].forEach(function (d, i) {
        setTimeout(function () {
            if (toolkit.isDefined(window[d])) {
                window[d].refresh()
            }
        }, 1000 * i)
    })
}
rpt.refreshAll = () => {
	switch (rpt.refreshView()) {
		case 'analysis':
			bkd.refresh()
			rs.refresh()
			ccr.refresh()
		break
		case 'dashboard':
			dsbrd.changeBreakdown()
			dsbrd.refresh()
			rank.refresh()
			sd.refresh()
		break
		case 'reportwidget':
			pvt.refresh()
			crt.refresh()
		break
	}
}
rpt.panel_relocated = () => {
	if ($('.panel-yo').size() == 0) {
		return;
	}
	
	let window_top = $(window).scrollTop()
    var div_top = $('.panel-yo').offset().top
    if (window_top > div_top) {
		$('.panel-fix').css('width',$('.panel-yo').width())
        $('.panel-fix').addClass('contentfilter')
        $('.panel-yo').height($('.panel-fix').outerHeight())
    } else {
        $('.panel-fix').removeClass('contentfilter')
        $('.panel-yo').height(0)
    }
}

$(() => {
	$(window).scroll(rpt.panel_relocated);
    rpt.panel_relocated()
	rpt.getIdeas()
})