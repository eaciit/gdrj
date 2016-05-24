vm.pageTitle('Upload Data')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Upload Data', href: '/uploaddata' }
])

viewModel.uploadData = new Object()
let ud = viewModel.uploadData

ud.inputDescription = ko.observable('')
ud.inputModel = ko.observable('')

ud.dataUploadedFiles = ko.observableArray([])
ud.masterDataBrowser = ko.observableArray([])
ud.dropDownModel = {
	data: ko.computed(() => 
		ud.masterDataBrowser().map(
			(d) => { return { text: d.TableNames, value: d.TableNames } }
		)
	),
	dataValueField: 'value',
	dataTextField: 'text',
	value: ud.inputModel,
	optionLabel: 'Select one'
}
ud.gridUploadedFiles = {
	data: ud.dataUploadedFiles,
	dataSource: {
		pageSize: 10
	},
	columns: [
		{ title: '&nbsp;', width: 40, attributes: { class: 'align-center' }, template: (d) => {
			return '<input type="checkbox" />'
		} },
		{ title: 'File Name', field: 'filename', attributes: { class: 'bold' } },
		{ title: 'Description', field: 'description' },
		{ title: 'Date', template: (d) =>
			moment(d.date).format('DD-MM-YYYY HH:mm:ss')
		},
		{ title: 'Action', width: 50, template: (d) => {
			return `
			<!--button class="btn btn-sm btn-primary">
				<i class='fa fa-play'></i>
			</button-->
			`
		} }
	],
	filterable: false,
	sortable: false,
	resizable: false
}

ud.getMasterDataBrowser = () => {
	ud.masterDataBrowser([])

	app.ajaxPost('/databrowser/getdatabrowsers', {}, (res) => {
		if (!app.isFine(res)) {
			return
		}

		ud.masterDataBrowser(res.data)
	}, (err) => {
		app.showError(err.responseText)
	}, {
		timeout: 5000
	})
}
ud.getUploadedFiles = () => {
	ud.dataUploadedFiles([])

	app.ajaxPost('/uploaddata/getuploadedfiles', {}, (res) => {
		if (!app.isFine(res)) {
			return
		}

		ud.dataUploadedFiles(res.data)
	}, {
		timeout: 5000
	})
}
ud.doUpload = () => {
	if (!app.isFormValid('.form-upload-file')) {
		return
	}

	var payload = new FormData()
	payload.append('model', ud.inputModel())
	payload.append('desc', ud.inputDescription())
	payload.append('userfile', $('[name=file]')[0].files[0])

	app.ajaxPost('/uploaddata/uploadfile', payload, (res) => {
		if (!app.isFine(res)) {
			return
		}

		ud.getUploadedFiles()
	}, (err) => {
		app.showError(err.responseText)
	}, {
		timeout: 5000
	})
}

ud.init = () => {
	ud.getMasterDataBrowser()
	ud.getUploadedFiles()
}

$(() => {
	ud.init()
})
