// let menuLink = vm.menu()
// 	.find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

// vm.currentMenu(menuLink.title)
// vm.currentTitle(menuLink.title)
// vm.breadcrumb([
// 	{ title: 'Godrej', href: '#' },
// 	{ title: menuLink.title, href: menuLink.href }
// ])

let menuLink = vm.menu()
    .find((d) => d.title == "Report").submenu
	.find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

vm.currentMenu('Report')
vm.currentTitle(menuLink.title)
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: menuLink.title, href: menuLink.href }
])

viewModel.report = new Object()
let rpt = viewModel.report

rpt.filter = [
	{ _id: 'common', group: 'Base Filter', sub: [
		{ _id: 'Branch', title: 'Branch' },
		{ _id: 'Brand', title: 'Brand' },
		{ _id: 'Region', title: 'Region' },
		{ _id: 'Channel', title: 'Channel' },
		{ _id: 'From' },
		{ _id: 'To' },
	] },
	{ _id: 'geo', group: 'Geographical', sub: [
		{ _id: 'Region', title: 'Region' },
		{ _id: 'Area', title: 'Area' },
		{ _id: 'Zone', title: 'Zone' }
	] },
	{ _id: 'customer', group: 'Customer', sub: [
		{ _id: 'Channel', title: 'Channel' },
		{ _id: 'KeyAccount', title: 'Accounts' },
		{ _id: 'Customer', title: 'Outlet' }
	] },
	{ _id: 'product', group: 'Product', sub: [
		{ _id: 'Group', title: 'Group' },
		{ _id: 'HBrandCategory', title: 'Brand' },
		{ _id: 'Product', title: 'SKU' }
	] },
	{ _id: 'profit_center', group: 'Profit Center', sub: [
		{ _id: 'Entity', title: 'Entity' },
		{ _id: 'Type', title: 'Type' },
		{ _id: 'Branch', title: 'Branch' },
		{ _id: 'HQ', title: 'HQ' }
	] },
	{ _id: 'cost_center', group: 'Cost Center', sub: [
		{ _id: 'Group1', title: 'Group 1' },
		{ _id: 'Group2', title: 'Group 2' },
		{ _id: 'HCostCenterGroup', title: 'Function' }
	] },
	{ _id: 'ledger', group: 'Ledger', sub: [
		{ _id: 'LedgerAccount', title: 'GL Code' }
	] },
]

rpt.masterData = {}
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

		rpt.masterData[e._id] = ko.observableArray([])
	})
})

rpt.filterMultiSelect = (d) => {
	let config = {
		filter: 'contains',
		placeholder: 'Choose items ...'
	}

	if (['HQ', 'Type'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: 'value',
			dataTextField: 'text'
		})
	} else if (['Customer'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			autoBind: false,
			dataSource: {
				serverFiltering: true,
                transport: {
                    read: {
                        url: `/report/getdata${d._id.toLowerCase()}`,
                    },
                    parameterMap: function(data, type) {
                    	let keyword = data.filter.filters[0].value
						return { keyword: keyword, limit: 100 }
					}
                },
                schema: {
					data: 'data'
				}
			},
			minLength: 1,
			placeholder: 'Type min 3 chars',
			dataValueField: '_id',
			dataTextField: 'Name'
		})
	} else if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity', 'Channel', 'HBrandCategory', 'Product', 'Type', 'KeyAccount', 'LedgerAccount'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name'
		})

		app.ajaxPost(`/report/getdata${d._id.toLowerCase()}`, {}, (res) => {
			if (!res.success) {
				return
			}

			let key = 'Name'
			let data = res.data.map((e) => {
				let name = `${e._id} - ${app.capitalize(e[key], true)}`
				if (d._id == 'KeyAccount') {
					name = app.capitalize(e[key], true)
				}

				return { _id: e._id, Name: name }
			})
			rpt.masterData[d._id](data)
		})
	} else if (['Region', 'Area', 'Zone'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name'
		})

		app.ajaxPost(`/report/getdatahgeographi`, {}, (res) => {
			if (!res.success) {
				return
			}

			let keys = { Area: 'ID', Region: 'Region', Zone: 'Zone' }
			let groupKey = (d._id == 'Area') ? '_id' : d._id
			let data = Lazy(res.data)
				.groupBy((d) => d[groupKey])
				.map((k, v) => { return { _id: v, Name: app.capitalize(v, true) } })
				.toArray()
			rpt.masterData[d._id](data)
		})
	} else {
		config.data = rpt.masterData[d._id]().map((f) => {
			if (!f.hasOwnProperty('Name')) {
				return f
			}

			return { _id: f._id, Name: app.capitalize(f.Name, true) }
		})
	}

	// console.log('filter', d, config)

	return config
}
rpt.titleFor = (data) => {
	return 'asdfasdfasdfa'
}
rpt.prepareDrag = () => {
	$('.pivot-section').sortable({
	    connectWith: '.pivot-section'
	})
}
rpt.refreshData = () => {
	pvt.refreshData()
}

$(() => {
	vm.showFilterCallback = () => {
		$('.panel-content-pivot').removeClass('col-md-8')
		$('.panel-content-pivot').addClass('col-md-6')

		$('.panel-content-map').removeClass('col-md-4')
		$('.panel-content-map').addClass('col-md-6')

		pvt.showAndRefreshPivot()
	}
	vm.hideFilterCallback = () => {
		$('.panel-content-pivot').removeClass('col-md-6')
		$('.panel-content-pivot').addClass('col-md-8')

		$('.panel-content-map').removeClass('col-md-6')
		$('.panel-content-map').addClass('col-md-4')
	}

	rpt.prepareDrag()
	pvt.init()
})