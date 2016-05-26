let currentReportMenu = vm.menu().find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

vm.currentMenu(currentReportMenu.title)
vm.currentTitle(currentReportMenu.title)
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: currentReportMenu.title, href:currentReportMenu.href }
])

viewModel.report = new Object()
let rpt = viewModel.report

rpt.masterData = {}
rpt.masterData.Branch = ko.observableArray([])
rpt.masterData.Brand = ko.observableArray([])
rpt.masterData.Region = ko.observableArray([])
rpt.masterData.Channel = ko.observableArray([])
rpt.masterData.From = ko.observableArray([])
rpt.masterData.Area = ko.observableArray([])
rpt.masterData.Zone = ko.observableArray([])
rpt.masterData.Accounts = ko.observableArray([])
rpt.masterData.Outlet = ko.observableArray([])
rpt.masterData.Group = ko.observableArray([])
rpt.masterData.SKU = ko.observableArray([])
rpt.masterData.Entity = ko.observableArray([])
rpt.masterData.Type = ko.observableArray([])
rpt.masterData.HQ = ko.observableArray([])
rpt.masterData.Group1 = ko.observableArray([])
rpt.masterData.Group2 = ko.observableArray([])
rpt.masterData.HCostCenterGroup = ko.observableArray([])
rpt.masterData.GLCode = ko.observableArray([])
rpt.commonBranch = ko.observableArray([]),

rpt.value ={}
rpt.value.Branch = ko.observableArray([])
rpt.value.Brand = ko.observableArray([])
rpt.value.Region = ko.observableArray([])
rpt.value.Channel = ko.observableArray([])
rpt.value.From = ko.observableArray([])
rpt.value.Area = ko.observableArray([])
rpt.value.Zone = ko.observableArray([])
rpt.value.Accounts = ko.observableArray([])
rpt.value.Outlet = ko.observableArray([])
rpt.value.Group = ko.observableArray([])
rpt.value.SKU = ko.observableArray([])
rpt.value.Entity = ko.observableArray([])
rpt.value.Type = ko.observableArray([])
rpt.value.HQ = ko.observableArray([])
rpt.value.Group1 = ko.observableArray([])
rpt.value.Group2 = ko.observableArray([])
rpt.value.HCostCenterGroup = ko.observableArray([])
rpt.value.GLCode = ko.observableArray([])

rpt.filter = [
	{ _id: 'common', group: 'Base Filter', sub: [
		{ _id: 'Branch', title: 'Branch' },
		{ _id: 'Brand', title: 'Brand' },
		{ _id: 'Region', title: 'Region' },
		{ _id: 'Channel', title: 'Channel' },
		{ _id: 'From', title: 'From' },
	] },
	{ _id: 'geo', group: 'Geographical', sub: [
		{ _id: 'Region', title: 'Region' },
		{ _id: 'Area', title: 'Area' },
		{ _id: 'Zone', title: 'Zone' }
	] },
	{ _id: 'customer', group: 'Customer', sub: [
		{ _id: 'Channel', title: 'Channel' },
		{ _id: 'Accounts', title: 'Accounts' },
		{ _id: 'Outlet', title: 'Outlet' }
	] },
	{ _id: 'product', group: 'Product', sub: [
		{ _id: 'Group', title: 'Group' },
		{ _id: 'Brand', title: 'Brand' },
		{ _id: 'SKU', title: 'SKU' }
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
		{ _id: 'GLCode', title: 'GL Code' }
	] },
]

rpt.filterMultiSelect = (d) => {
	let config = {
		value:rpt.value[d._id],
		data: rpt.masterData[d._id],
		placeholder: 'Choose items ...'
	}

	if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity'].indexOf(d._id) > -1) {
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
	$('.grid').append($('<p />').text('Still under development.'))
	return
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