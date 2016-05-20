vm.pageTitle("Upload Data")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Upload Data', href: '/uploaddata' }
])

viewModel.uploadData = new Object()
let ud = viewModel.uploadData

ud.inputDescription = ko.observable('')
ud.inputModel = ko.observable('')

ud.masterDataBrowser = ko.observableArray([])
ud.dropDownModel = {
	data: ko.computed(() => 
		ud.masterDataBrowser().map(
			(d) => { return { text: d.TableNames, value: d._id } }
		)
	),
	dataValueField: 'value',
	dataTextField: 'text',
	value: ud.inputModel,
	optionLabel: 'Select one'
}

ud.getMasterDataBrowser = (callback) => {
	ud.masterDataBrowser([])

	app.ajaxPost('/databrowser/getdatabrowsers', {}, (res) => {
		if (!app.isFine(res)) {
			return
		}

		ud.masterDataBrowser(res.data)
		if (callback) {
			callback()
		}
	}, (err) => {
		app.showError(err.responseText)
	}, {
		timeout: 5000
	})
}
ud.init = () => {
	ud.getMasterDataBrowser()
}

$(() => {
	ud.init()
})