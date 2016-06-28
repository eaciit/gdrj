// let menuLink = vm.menu()
// 	.find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

vm.currentMenu('Report')
vm.currentTitle('Report')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Report', href: '#' }
])

viewModel.report = new Object()
let rpt = viewModel.report

rpt.filter = [
	{ _id: 'common', group: 'Base Filter', sub: [
		{ _id: 'Branch', from: 'Branch', title: 'Branch' },
		{ _id: 'Brand', from: 'Brand', title: 'Brand' },
		{ _id: 'Channel', from: 'Channel', title: 'Channel' },
		{ _id: 'RegionC', from: 'Region', title: 'Region' },
		// { _id: 'From', from: 'From' },
		// { _id: 'To', from: 'To' },
	] },
	{ _id: 'geo', group: 'Geographical', sub: [
		{ _id: 'Zone', from: 'Zone', title: 'Zone' },
		{ _id: 'Region', from: 'Region', title: 'Region' },
		{ _id: 'Area', from: 'Area', title: 'Area' }
	] },
	{ _id: 'customer', group: 'Customer', sub: [
		{ _id: 'ChannelC', from: 'Channel', title: 'Channel' },
		{ _id: 'KeyAccount', from: 'KeyAccount', title: 'Key Account' },
		{ _id: 'CustomerGroup', from: 'CustomerGroup', title: 'Group' },
		{ _id: 'Customer', from: 'Customer', title: 'Outlet' }
	] },
	{ _id: 'product', group: 'Product', sub: [
		{ _id: 'HBrandCategory', from: 'HBrandCategory', title: 'Group' },
		{ _id: 'BrandP', from: 'Brand', title: 'Brand' },
		{ _id: 'Product', from: 'Product', title: 'SKU' }
	] },
	// { _id: 'profit_center', group: 'Profit Center', sub: [
	// 	{ _id: 'Entity', from: 'Entity', title: 'Entity' },
	// 	{ _id: 'Type', from: 'Type', title: 'Type' },
	// 	{ _id: 'BranchPC', from: 'Branch', title: 'Branch' },
	// 	{ _id: 'HQ', from: 'HQ', title: 'HQ' }
	// ] },
	// { _id: 'cost_center', group: 'Cost Center', sub: [
	// 	{ _id: 'Group1', from: 'Group1', title: 'Group 1' },
	// 	{ _id: 'Group2', from: 'Group2', title: 'Group 2' },
	// 	{ _id: 'HCostCenterGroup', from: 'HCostCenterGroup', title: 'Function' }
	// ] },
	// { _id: 'ledger', group: 'Ledger', sub: [
	// 	{ _id: 'LedgerAccount', from: 'LedgerAccount', title: 'GL Code' }
	// ] },
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

rpt.getFilterValue = (multiFiscalYear = false, fiscalField = rpt.value.FiscalYear) => {
	let res = [
		{ 'Field': 'customer.branchname', 'Op': '$in', 'Value': rpt.value.Branch() },
		{ 'Field': 'product.brand', 'Op': '$in', 'Value': rpt.value.Brand().concat(rpt.value.BrandP()) },
		{ 'Field': 'customer.channelname', 'Op': '$in', 'Value': rpt.value.Channel().concat(rpt.value.ChannelC()) },
		{ 'Field': 'customer.region', 'Op': '$in', 'Value': rpt.value.Region().concat(rpt.value.RegionC()) },
		// { 'Field': 'date.year', 'Op': '$gte', 'Value': rpt.value.From() },
		// { 'Field': 'date.year', 'Op': '$lte', 'Value': rpt.value.To() },
		
		{ 'Field': 'customer.zone', 'Op': '$in', 'Value': rpt.value.Zone() },
		// ---> Region OK
		{ 'Field': 'customer.areaname', 'Op': '$in', 'Value': rpt.value.Area() },

		// ---> Channel OK
		{ 'Field': 'customer.keyaccount', 'Op': '$in', 'Value': rpt.value.KeyAccount() },
		{ 'Field': 'customer.customergroup', 'Op': '$in', 'Value': rpt.value.CustomerGroup() },
		{ 'Field': 'customer.name', 'Op': '$in', 'Value': rpt.value.Customer() },

		{ 'Field': 'product.brandcategoryid', 'Op': '$in', Value: rpt.value.HBrandCategory() },
		// ---> Brand OK
		{ 'Field': 'product.name', 'Op': '$in', 'Value': rpt.value.Product() },
	]

	if (fiscalField !== false) {
		if (multiFiscalYear) {
			res.push({ 
				'Field': 'date.fiscal', 
				'Op': '$in', 
				'Value': fiscalField()
			})
		} else {
			res.push({ 
				'Field': 'date.fiscal', 
				'Op': '$eq', 
				'Value': fiscalField()
			})
		}
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
	{ field: "customer.areaname", name: "City", title: "customer_areaname" },
    { field: 'customer.region', name: 'Region', title: 'customer_region' },
	{ field: "customer.zone", name: "Zone", title: "customer_zone" },
    // { field: 'date.fiscal', name: 'Fiscal Year', title: 'date_fiscal' },
    { field: 'customer.keyaccount', name: 'Customer Group', title: 'customer_keyaccount' },
    // { field: 'date.quartertxt', name: 'Quarter', title: 'date_quartertxt' },
    // { field: 'date.month', name: 'Month', title: 'date_month' },
])
// rpt.optionDataPoints = ko.observableArray([
//     { field: 'value1', name: o['value1'] },
//     { field: 'value2', name: o['value2'] },
//     { field: 'value3', name: o['value3'] }
// ])
rpt.optionAggregates = ko.observableArray([
	{ aggr: 'sum', name: 'Sum' },
	{ aggr: 'avg', name: 'Avg' },
	{ aggr: 'max', name: 'Max' },
	{ aggr: 'min', name: 'Min' }
])
rpt.parseGroups = (what) => {
	return what

	if (what.indexOf('customer.branchname') > -1) {
		what.push('customer.branchid')
	}
	// if (what.indexOf('customer.channelname') > -1) {
	// 	what.push('customer.channelid')
	// }
	// if (what.indexOf('customer.customergroupname') > -1) {
	// 	what.push('customer.customergroup')
	// }

	return what
}
rpt.mode = ko.observable('render')
rpt.refreshView = ko.observable('')
rpt.modecustom = ko.observable(false)
rpt.idanalysisreport = ko.observable()
rpt.valueMasterData = {}
rpt.masterData = {
	geographi: ko.observableArray([]),
	subchannel: ko.observableArray([])
}
rpt.enableHolder = {}
rpt.eventChange = {}
rpt.value = {
	HQ: ko.observable(false),
	From: ko.observable(new Date(2014, 0, 1)),
	To: ko.observable(new Date(2016, 11, 31)),
	FiscalYear: ko.observable(rpt.optionFiscalYears()[1]),
	FiscalYears: ko.observableArray([rpt.optionFiscalYears()[1]])
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

rpt.getOtherMasterData = () => {
	toolkit.ajaxPost(viewModel.appName + `report/getdatasubchannel`, {}, (res) => {
		if (!res.success) {
			return
		}

		rpt.masterData.subchannel(res.data)
	})
}

rpt.groupGeoBy = (raw, category) => {
	let groupKey = (category == 'Area') ? '_id' : category
	let data = Lazy(raw)
		.groupBy((f) => f[groupKey])
		.map((k, v) => { return { _id: v, Name: v } })
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
			dataValueField: 'Name',
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
	} else if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity', 'Channel', 'HBrandCategory', 'Product', 'Type', 'KeyAccount', 'CustomerGroup', 'LedgerAccount'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id],
			value: rpt.value[d._id]
		})

		if (['Branch', 'Brand'].indexOf(d.from) > -1) {
			config.dataValueField = 'Name'
		} else if (d.from == 'Product') {
			config = $.extend(true, config, {
				dataValueField: 'Name',
				minLength: 1,
				placeholder: 'Type min 1 chars'
			})
		} else if (['Channel', 'KeyAccount'].indexOf(d.from) > -1) {
			config.dataValueField = '_id'
		}

		toolkit.ajaxPost(viewModel.appName + `report/getdata${d.from.toLowerCase()}`, {}, (res) => {
			if (!res.success) {
				return
			}

			rpt.masterData[d._id](_.sortBy(res.data, (d) => d.Name))

			if (['KeyAccount', 'Brand', 'Branch'].indexOf(d.from) > -1) {
				rpt.masterData[d._id].push({ _id: "OTHER", Name: "OTHER" })
			}
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
			toolkit.ajaxPost(viewModel.appName + `report/getdatahgeographi`, {}, (res) => {
				if (!res.success) {
					return
				}

				rpt.masterData.geographi(_.sortBy(res.data, (d) => d.Name));

				['Region', 'Area', 'Zone'].forEach((e) => {
					let res = rpt.groupGeoBy(rpt.masterData.geographi(), e)
					rpt.masterData[e](_.sortBy(res, (d) => d.Name))
					rpt.masterData[e].push({ _id: "OTHER", Name: "OTHER" })
				})

				rpt.masterData.RegionC(rpt.masterData.Region())
			})
		}
	} else {
		config.data = rpt.masterData[d._id]()
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
		$(`.breakdown-filter`).removeAttr('style')
	} else {
		panelFilter.show()
		panelContent.attr('class', 'col-md-9 col-sm-9 ez panel-content')
		$(`.breakdown-filter`).css('width', '60%')
	}

	$('.k-grid').each((i, d) => {
		try { $(d).data('kendoGrid').refresh() } catch (err) {}
	})

	$('.k-pivot').each((i, d) => {
		$(d).data('kendoPivotGrid').refresh()
	})

	$('.k-chart').each((i, d) => {
		$(d).data('kendoChart').redraw()
	})
	rpt.panel_relocated()
}

// rpt.getIdeas = () => {
// 	toolkit.ajaxPost(viewModel.appName + 'report/getdataanalysisidea', { }, (res) => {
// 		if (!toolkit.isFine(res)) {
// 			return
// 		}
		
// 		rpt.idanalysisreport('')
// 		rpt.analysisIdeas(_.sortBy(res.data, (d) => d.order))
// 		let idreport = _.find(rpt.analysisIdeas(), function(a) { return a._id == o.ID })
// 		if (idreport != undefined) {
// 			rpt.idanalysisreport(idreport.name)
// 			vm.currentTitle("Report " + rpt.idanalysisreport())
// 		}
// 	})
// }

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
			bkd.changeBreakdown()
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

rpt.tabbedContent = () => {
	$('.app-title h2').html('&nbsp;')
	$('.tab-content').parent().find('a[data-toggle="tab"]').on('shown.bs.tab', (e) => {
	    var $tabContent = $(".tab-content " + $(e.target).attr("href"))

	    setTimeout(() => {
		    $tabContent.find('.k-chart').each((i, e) => {
		    	try {
		    		$(e).data('kendoChart').redraw()
		    	} catch (err) {
		    		console.log(err)
		    	}
		    })
		    $tabContent.find('.k-grid').each((i, e) => {
		    	try {
		    		$(e).data('kendoGrid').refresh()
		    	} catch (err) {
		    		console.log(err)
		    	}
		    })
	    }, 200)
	});
}




rpt.plmodels = ko.observableArray([])
rpt.idarrayhide = ko.observableArray(['PL44A'])

rpt.prepareEvents = () => {
	$('.breakdown-view').parent().on('mouseover', 'tr', function () {
		let rowID = $(this).attr('data-row')

        let elh = $(`.breakdown-view .table-header tr[data-row="${rowID}"]`).addClass('hover')
        let elc = $(`.breakdown-view .table-content tr[data-row="${rowID}"]`).addClass('hover')
	})
	$('.breakdown-view').parent().on('mouseleave', 'tr', function () {
		$('.breakdown-view tr.hover').removeClass('hover')
	})
}

rpt.showExpandAll = (a) => {
	if (a == true) {
		$(`tr.dd`).find('i').removeClass('fa-chevron-right')
		$(`tr.dd`).find('i').addClass('fa-chevron-down')
		$(`tr[idparent]`).css('display', '')
		$(`tr[idcontparent]`).css('display', '')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
	} else {
		$(`tr.dd`).find('i').removeClass('fa-chevron-down')
		$(`tr.dd`).find('i').addClass('fa-chevron-right')
		$(`tr[idparent]`).css('display', 'none')
		$(`tr[idcontparent]`).css('display', 'none')
		$(`tr[statusvaltemp=hide]`).css('display', 'none')
	}
}

rpt.zeroValue = ko.observable(false)
rpt.showZeroValue = (a) => {
	rpt.zeroValue(a)
	if (a == true) {
		$(".table-header tbody>tr").each(function( i ) {
			if (i > 0){
				$(this).attr('statusvaltemp', 'show')
				$(`tr[idpl=${$(this).attr('idheaderpl')}]`).attr('statusvaltemp', 'show')
				if (!$(this).attr('idparent')){
					$(this).show()
					$(`tr[idpl=${$(this).attr('idheaderpl')}]`).show()
				}
			}
		})
	} else {
		$(".table-header tbody>tr").each(function( i ) {
			if (i > 0){
				$(this).attr('statusvaltemp', $(this).attr('statusval'))
				$(`tr[idpl=${$(this).attr('idheaderpl')}]`).attr('statusvaltemp', $(this).attr('statusval'))
			}
		})
	}

	rpt.showExpandAll(false)
	if (a == false) {
		let countchild = 0, hidechild = 0
		$(".table-header tbody>tr.dd").each(function( i ) {
			if (i > 0){
				countchild = $(`.table-header tr[idparent=${$(this).attr('idheaderpl')}]`).length
				hidechild = $(`.table-header tr[idparent=${$(this).attr('idheaderpl')}][statusvaltemp=hide]`).length
				if (countchild > 0) {
					if (countchild == hidechild){
						$(this).find('td:eq(0)>i').removeClass().css('margin-right', '0px')
						if ($(this).attr('idparent') == undefined)
							$(this).find('td:eq(0)').css('padding-left', '20px')
					}
				}
			}
		})
	}
}

rpt.arrChangeParent = ko.observableArray([
	{ idfrom: 'PL6A', idto: '', after: 'PL0'},
	{ idfrom: 'PL1', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL2', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL3', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL4', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL5', idto: 'PL8A', after: 'PL8A'},
	{ idfrom: 'PL6', idto: 'PL8A', after: 'PL8A'}
])

// rpt.arrFormulaPL = ko.observableArray([
// 	{ id: "PL0", formula: ["PL1","PL2","PL3","PL4","PL5","PL6"], cal: "sum"},
// 	{ id: "PL6A", formula: ["PL7","PL8","PL7A"], cal: "sum"},
// ])
// rpt.arrFormulaPL = ko.observableArray([
// 	{ id: "PL1", formula: ["PL7"], cal: "sum"},
// 	{ id: "PL2", formula: ["PL8"], cal: "sum"},
// ])

rpt.arrFormulaPL = ko.observableArray([
	{ id: "PL2", formula: ["PL2", "PL8"], cal: "sum"},
	{ id: "PL1", formula: ["PL8A", "PL2", "PL6"], cal: "min"},
])

rpt.changeParent = (elemheader, elemcontent, PLCode) => {
	let change = _.find(rpt.arrChangeParent(), (a) => {
		return a.idfrom == PLCode
	})
	if (change != undefined){
		if (change.idto != ''){
			elemheader.attr('idparent', change.idto)
			elemcontent.attr('idcontparent', change.idto)
		} else {
			elemheader.removeAttr('idparent')
			elemheader.find('td:eq(0)').css('padding-left','8px')
			elemcontent.removeAttr('idcontparent')
		}
		return change.after
	} else {
		return ""
	}
}

rpt.fixRowValue = (data) => {
	data.forEach((e,a) => {
		rpt.arrFormulaPL().forEach((d) => {
			// let total = toolkit.sum(d.formula, (f) => e[f])
			let total = 0
			d.formula.forEach((f, l) => {
				if (l == 0) {
					total = e[f]
				} else {
					if (d.cal == 'sum') {
						total += e[f]
					} else {
						total -= e[f]
					}
				}
			})

			data[a][d.id] = total
		})
	})
	// console.log(data)

}

rpt.buildGridLevels = (rows) => {
	let grouppl1 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader1}), (k , v) => { return { data: k, key:v}})
	let grouppl2 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader2}), (k , v) => { return { data: k, key:v}})
	let grouppl3 = _.map(_.groupBy(rpt.plmodels(), (d) => {return d.PLHeader3}), (k , v) => { return { data: k, key:v}})

	let $trElem, $columnElem
	let resg1, resg2, resg3, PLyo, PLyo2, child = 0, parenttr = 0, textPL
	$(".table-header tbody>tr").each(function( i ) {
		if (i > 0){
			$trElem = $(this)
			resg1 = _.find(grouppl1, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg2 = _.find(grouppl2, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })
			resg3 = _.find(grouppl3, function(o) { return o.key == $trElem.find(`td:eq(0)`).text() })

			let idplyo = _.find(rpt.idarrayhide(), (a) => { return a == $trElem.attr("idheaderpl") })
			if (idplyo != undefined){
				$trElem.remove()
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).remove()
			}
			if (resg1 == undefined && idplyo2 == undefined){
				if (resg2 != undefined){ 
					textPL = _.find(resg2.data, function(o) { return o._id == $trElem.attr("idheaderpl") })
					PLyo = _.find(rows, function(o) { return o.PNL == textPL.PLHeader1 })
					PLyo2 = _.find(rows, function(o) { return o.PLCode == textPL._id })
					$trElem.find('td:eq(0)').css('padding-left','40px')
					$trElem.attr('idparent', PLyo.PLCode)
					child = $(`tr[idparent=${PLyo.PLCode}]`).length
					$columnElem = $(`.table-content tr.column${PLyo2.PLCode}`)
					$columnElem.attr('idcontparent', PLyo.PLCode)
					let PLCodeChange = rpt.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
					if (PLCodeChange != "")
						PLyo.PLCode = PLCodeChange
					if (child > 1){
						let $parenttr = $(`tr[idheaderpl=${PLyo.PLCode}]`)
						let $parenttrcontent = $(`tr[idpl=${PLyo.PLCode}]`)
						// $trElem.insertAfter($(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
						// $columnElem.insertAfter($(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
						$trElem.insertAfter($parenttr)
						$columnElem.insertAfter($parenttrcontent)
					}
					else{
						$trElem.insertAfter($(`tr.header${PLyo.PLCode}`))
						$columnElem.insertAfter($(`tr.column${PLyo.PLCode}`))
					}
				} else if (resg2 == undefined){
					if (resg3 != undefined){
						PLyo = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader2 })
						PLyo2 = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader3 })
						$trElem.find('td:eq(0)').css('padding-left','70px')
						if (PLyo == undefined){
							PLyo = _.find(rows, function(o) { return o.PNL == resg3.data[0].PLHeader1 })
							if(PLyo != undefined)
								$trElem.find('td:eq(0)').css('padding-left','40px')
						}
						$trElem.attr('idparent', PLyo.PLCode)
						child = $(`tr[idparent=${PLyo.PLCode}]`).length
						$columnElem = $(`.table-content tr.column${PLyo2.PLCode}`)
						$columnElem.attr('idcontparent', PLyo.PLCode)
						let PLCodeChange = rpt.changeParent($trElem, $columnElem, $columnElem.attr('idpl'))
						if (PLCodeChange != "")
							PLyo.PLCode = PLCodeChange
						if (child > 1){
							let $parenttr = $(`tr[idheaderpl=${PLyo.PLCode}]`)
							let $parenttrcontent = $(`tr[idpl=${PLyo.PLCode}]`)
							// $trElem.insertAfter($(`tr[idparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							// $columnElem.insertAfter($(`tr[idcontparent=${PLyo.PLCode}]:eq(${(child-1)})`))
							$trElem.insertAfter($parenttr)
							$columnElem.insertAfter($parenttrcontent)
						}
						else{
							$trElem.insertAfter($(`tr.header${PLyo.PLCode}`))
							$columnElem.insertAfter($(`tr.column${PLyo.PLCode}`))
						}
					}
				}
			}

			let idplyo2 = _.find(rpt.idarrayhide(), (a) => { return a == $trElem.attr("idparent") })
			if (idplyo2 != undefined){
				$trElem.removeAttr('idparent')
				$trElem.addClass('bold')
				$trElem.css('display','inline-grid')
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).removeAttr("idcontparent")
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusval', 'show')
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).attr('statusvaltemp', 'show')
				$(`.table-content tr.column${$trElem.attr("idheaderpl")}`).css('display','inline-grid')
			}
		}
	})

	let countChild = ''
	$(".table-header tbody>tr").each(function( i ) {
		$trElem = $(this)
		parenttr = $(`tr[idparent=${$trElem.attr('idheaderpl')}]`).length
		if (parenttr>0){
			$trElem.addClass('dd')
			$trElem.find(`td:eq(0)>i`)
				.addClass('fa fa-chevron-right')
				.css('margin-right', '5px')
			$(`tr[idparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${$trElem.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idparent=${$trElem.attr('idheaderpl')}]`).each((a,e) => {
				if ($(e).attr('statusval') == 'show'){
					$(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
					$(`tr[idpl=${$trElem.attr('idheaderpl')}]`).attr('statusval', 'show')
					if ($(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).attr('idparent') == undefined) {
						$(`tr[idpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
						$(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`).css('display', '')
					}
				}
			})
		} else {
			countChild = $trElem.attr('idparent')
			if (countChild == '' || countChild == undefined)
				$trElem.find(`td:eq(0)`).css('padding-left', '20px')
		}
	})

	rpt.showZeroValue(false)
	$(".pivot-pnl .table-header tr:not([idparent]):not([idcontparent])").addClass('bold')
	rpt.refreshHeight()
}

rpt.hideAllChild = (PLCode) => {
	$(`.table-header tbody>tr[idparent=${PLCode}]`).each(function( i ) {
		let $trElem = $(this)
		let child = $(`tr[idparent=${$trElem.attr('idheaderpl')}]`).length
		if (child > 0) {
			let $c = $(`tr[idheaderpl=${$trElem.attr('idheaderpl')}]`)
			$($c).find('i').removeClass('fa-chevron-down')
			$($c).find('i').addClass('fa-chevron-right')
			$(`tr[idparent=${$c.attr('idheaderpl')}]`).css('display', 'none')
			$(`tr[idcontparent=${$c.attr('idheaderpl')}]`).css('display', 'none')
			rpt.hideAllChild($c.attr('idheaderpl'));
		}
	})
}

rpt.refreshHeight = (PLCode) => {
	$(`.table-header tbody>tr[idparent=${PLCode}]`).each(function( i ) {
		let $trElem = $(this)
		$(`tr[idcontparent=${$trElem.attr('idheaderpl')}]`).css('height', $trElem.height())
	})
}

rpt.showExport = ko.observable(false)
rpt.export = (target, title, mode) => {
	target = toolkit.$(target)

	if (mode == 'kendo') {
		// var workbook = new kendo.ooxml.Workbook({
		//   sheets: [
		//     {
		//       // Column settings (width)
		//       columns: [
		//         { autoWidth: true },
		//         { autoWidth: true }
		//       ],
		//       // Title of the sheet
		//       title: "Customers",
		//       // Rows of the sheet
		//       rows: [
		//         // First row (header)
		//         {
		//           cells: [
		//             // First cell
		//             { value: "Company Name" },
		//             // Second cell
		//             { value: "Contact" }
		//           ]
		//         },
		//         // Second row (data)
		//         {
		//           cells: [
		//             { value: "Around the Horn" },
		//             { value: "Thomas Hardy" }
		//           ]
		//         },
		//         // Third row (data)
		//         {
		//           cells: [
		//             { value: "B's Beverages" },
		//             { value: "Victoria Ashworth" }
		//           ]
		//         }
		//       ]
		//     }
		//   ]
		// });
		// kendo.saveAs({
		//     dataURI: workbook.toDataURL(),
		//     fileName: "Test.xlsx"
		// });


		return
	} else if (mode == 'normal') {
		$('#fake-table').remove()

		let body = $('body')
		let fakeTable = $('<table />')
			.attr('id', 'fake-table')
			.appendTo(body)

		if (target.attr('name') != 'table') {
			target = target.find('table:eq(0)')
		}

		target.clone(true).appendTo(fakeTable)

		let downloader = $('<a />').attr('href', '#')
			.attr('download', `${title}.xls`)
			.attr('onclick', `return ExcellentExport.excel(this, 'fake-table', 'sheet1')`)
			.html('export')
			.appendTo(body)
		
		fakeTable.find('td').css('height', 'inherit')
		downloader[0].click()
		
		setTimeout(() => { 
			fakeTable.remove()
			downloader.remove()
		}, 400)
	} else if (mode == 'header-content') {
		$('#fake-table').remove()

		let body = $('body')
		let fakeTable = $('<table />')
			.attr('id', 'fake-table')
			.appendTo(body)

		let tableHeader = target.find('.table-header')
		if (tableHeader.attr('name') != 'table') {
			tableHeader = tableHeader.find('table')
		}

		let tableContent = target.find('.table-content')
		if (tableContent.attr('name') != 'table') {
			tableContent = tableContent.find('table')
		}

		tableHeader.find('tr').each((i, e) => {
			if (i == 0) {
				let rowspan = parseInt($(e).find('td,th').attr('data-rowspan'), 10)
				if (isNaN(rowspan)) rowspan = 1

				for (let j = 0; j < rowspan; j++) {
					$(e).clone(true).appendTo(fakeTable)
				}
				return
			}

			$(e).clone(true).appendTo(fakeTable)
		})

		tableContent.find('tr').each((i, e) => {
			let rowTarget = fakeTable.find(`tr:eq(${i})`)
			$(e).find('td,th').each((j, f) => {
				$(f).clone(true).appendTo(rowTarget)
			})
		})

		let downloader = $('<a />').attr('href', '#')
			.attr('download', `${title}.xls`)
			.attr('onclick', `return ExcellentExport.excel(this, 'fake-table', 'sheet1')`)
			.html('export')
			.appendTo(body)
		
		fakeTable.find('tr:hidden').show()
		fakeTable.find('td,th').css('height', 'inherit')
		fakeTable.find('td .fa-chevron-right').remove()

		downloader[0].click()
		
		// setTimeout(() => { 
		// 	fakeTable.remove()
		// 	downloader.remove()
		// }, 400)
	}
}

$(() => {
	$(window).scroll(rpt.panel_relocated);
    rpt.panel_relocated()
	// rpt.getIdeas()
	rpt.getOtherMasterData()
})