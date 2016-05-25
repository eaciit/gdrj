let currentReportMenu = vm.menu().find((d) => d.title === 'Report')
	.submenu.find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

vm.pageTitle('Report')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Report', href: '#' },
	{ title: currentReportMenu.title, href: currentReportMenu.href }
])
vm.pageTitle(currentReportMenu.title)

viewModel.report = new Object()
let rpt = viewModel.report

rpt.masterData = {}
// common
rpt.masterData.Branch = ko.observableArray([])
rpt.masterData.Brand = ko.observableArray([])
rpt.masterData.SKU = ko.observableArray([])
rpt.masterData.Outlet = ko.observableArray([])

// geo
rpt.masterData.Region = ko.observableArray([])
rpt.masterData.Area = ko.observableArray([])

// customer 
rpt.masterData.Group = ko.observableArray([])
rpt.masterData.KeyAccount = ko.observableArray([])
rpt.masterData.Channel = ko.observableArray([])

// cost
rpt.masterData.CC = ko.observableArray([])
rpt.masterData.HCostCenterGroup = ko.observableArray([])

// ledger
rpt.masterData.Group1 = ko.observableArray([])
rpt.masterData.Group2 = ko.observableArray([])
rpt.masterData.GLAccount = ko.observableArray([])

rpt.filter = [
	{ _id: 'common', group: 'Common', sub: [
		{ _id: 'Branch', title: 'Branch' },
		{ _id: 'Brand', title: 'Brand' },
		{ _id: 'SKU', title: 'SKU' },
		{ _id: 'Outlet', title: 'Outlet' }
	] },
	{ _id: 'geo', group: 'Geo', sub: [
		{ _id: 'Region', title: 'Region' },
		{ _id: 'Area', title: 'Area' }
	] },
	{ _id: 'customer', group: 'Customer', sub: [
		{ _id: 'Group', title: 'Group' },
		{ _id: 'KeyAccount', title: 'Key Account' },
		{ _id: 'Channel', title: 'Channel' }
	] },
	{ _id: 'cost_center', group: 'Cost Center', sub: [
		{ _id: 'CC', title: 'CC' },
		{ _id: 'HCostCenterGroup', title: 'Function' }
	] },
	{ _id: 'ledger', group: 'Ledger', sub: [
		{ _id: 'Group1', title: 'Group 1' },
		{ _id: 'Group2', title: 'Group 2' },
		{ _id: 'GLAccount', title: 'GL Account' }
	] },
]

rpt.filterMultiSelect = (d) => {
	let config = {
		data: rpt.masterData[d._id],
		placeholder: 'Choose items ...'
	}

	if (['Branch', 'Brand', 'HCostCenterGroup'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: ko.computed(() => {
				return rpt.masterData[d._id]().map((d) => {
					return { _id: d._id, Name: `${d._id} - ${d.Name}` }
				})
			}, rpt),
			dataValueField: '_id',
			dataTextField: 'Name'
		})
		
		app.ajaxPost(`/report/getdata${d._id.toLowerCase()}`, {}, (res) => {
			rpt.masterData[d._id](res)
		})
	} else if (['SKU', 'Outlet'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			autoBind: false,
			dataSource: {
				serverFiltering: true,
                transport: {
                    read: {
                        url: `/report/getdata${d._id.toLowerCase()}`,
                    }
                }
			},
			minLength: 3,
			placeholder: 'Type min 3 chars, then choose items ...'
		})
	}

	console.log(d, config)

	return config
}

rpt.refreshData = () => {
	$('.grid').kendoGrid({
		columns: [
			{ title: "ID" }
		],
		dataSource: {
			data: []
		}
	})
}

$(() => {
	rpt.refreshData()
})