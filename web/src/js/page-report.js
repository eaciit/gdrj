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
		{ _id: 'Zone', title: 'Zone' },
		{ _id: 'Region', title: 'Region' },
		{ _id: 'Area', title: 'Area' }
	] },
	{ _id: 'customer', group: 'Customer', sub: [
		{ _id: 'Channel', title: 'Channel' },
		{ _id: 'KeyAccount', title: 'Accounts' },
		{ _id: 'Customer', title: 'Outlet' }
	] },
	{ _id: 'product', group: 'Product', sub: [
		{ _id: 'HBrandCategory', title: 'Group' },
		{ _id: 'Brand', title: 'Brand' },
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

rpt.valueMasterData = {}
rpt.masterData = {
	geographi: ko.observableArray([])
}
rpt.enableHolder = {}
rpt.eventChange = {}
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

					rpt.groupGeoBy(raw, 'Region')
					rpt.groupGeoBy(raw, 'Area')
				} else if (e._id == 'Region') {
					let raw = Lazy(rpt.masterData.geographi())
						.filter((f) => (vZone.length == 0) ? true : (vZone.indexOf(f.Zone) > -1))
						.filter((f) => (vRegion.length == 0) ? true : (vRegion.indexOf(f.Region) > -1))
						.toArray()

					rpt.groupGeoBy(raw, 'Area')
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

				console.log("=====", e._id, value)
			}, 100)
		}
	})
})

rpt.groupGeoBy = (raw, category) => {
	let groupKey = (category == 'Area') ? '_id' : category
	let data = Lazy(raw)
		.groupBy((f) => f[groupKey])
		.map((k, v) => { return { _id: v, Name: app.capitalize(v, true) } })
		.toArray()

	console.log("=data", data)

	rpt.masterData[category](data)
}

rpt.filterMultiSelect = (d) => {
	let config = {
		filter: 'contains',
		placeholder: 'Choose items ...',
		change: rpt.eventChange[d._id],
		value: rpt.valueMasterData[d._id]
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
                        url: `/report/getdata${d._id.toLowerCase()}`,
                    },
                    parameterMap: function(data, type) {
                    	let keyword = data.filter.filters[0].value
						return { keyword: keyword }
					}
                },
                schema: {
					data: 'data'
				}
			}
		})
	} else if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity', 'Channel', 'HBrandCategory', 'Product', 'Type', 'KeyAccount', 'LedgerAccount'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id],
			template: (d) => {
				if (d._id == 'KeyAccount') {
					return app.capitalize(d.KeyAccount, true)
				}

				return `${d._id} - ${app.capitalize(d.Name, true)}`
			}
		})

		app.ajaxPost(`/report/getdata${d._id.toLowerCase()}`, {}, (res) => {
			if (!res.success) {
				return
			}

			rpt.masterData[d._id](res.data)
		})
	} else if (['Region', 'Area', 'Zone'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id],
		})

		if (d._id == 'Region') {
			app.ajaxPost(`/report/getdatahgeographi`, {}, (res) => {
				if (!res.success) {
					return
				}

				rpt.masterData.geographi(res.data);

				['Region', 'Area', 'Zone'].forEach((e) => {
					rpt.groupGeoBy(rpt.masterData.geographi(), e)
				})
			})
		}
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