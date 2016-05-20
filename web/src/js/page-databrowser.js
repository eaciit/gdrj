vm.pageTitle("Data Browser")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Data Browser', href: '/databrowser' }
])

// ======================

viewModel.dataBrowser = new Object()
let db = viewModel.dataBrowser

db.section = ko.observable("")
db.masterDataBrowser = ko.observableArray([])
db.templateConfig = {
	dataModel: "",
	filters: [],
	fields: []
}
db.config = ko.mapping.fromJS(db.templateConfig)
db.dropDownConfigDataModel = {
	data: ko.computed(() => 
		db.masterDataBrowser().map(
			(d) => { return { text: d.TableNames, value: d._id } }
		)
	),
	dataValueField: 'value',
	dataTextField: 'text',
	value: db.config.dataModel,
	optionLabel: 'Select one',
	select: (d) => {
		console.log(d);
	}
}
db.gridConfigDataModel = {
	data: db.masterDataBrowser,
	dataSource: {
		pageSize: 10
	},
	columns: [
		{ field: "Field" },
		{ title: "Field" },
		{ field: "Field" },
	],
	pageable: true,
	sortable: true,
	filterable: false
}

db.getMasterDataBrowser = (callback) => {
	db.masterDataBrowser([])

	app.ajaxPost('/databrowser/getdatabrowsers', {}, (res) => {
		if (!app.isFine(res)) {
			return
		}

		db.masterDataBrowser(res.data)
		if (callback) {
			callback()
		}
	}, (err) => {
		app.showError(err.responseText)
	}, {
		timeout: 5000
	})
}
db.renderGridConfig = () => {

}
db.init = () => {
	db.getMasterDataBrowser(() => db.renderGridConfig())
}

$(() => {
	db.init()
})