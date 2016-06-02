vm.currentMenu('Data Manager')
vm.currentTitle('Upload Data')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Data Manager', href: '#' },
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
		{ title: 'File Name', field: 'Filename', attributes: { class: 'bold' }, template: (d) => {
			return `
				<div class='tooltipster' title='File: ${d.Filename}<br />Description: ${d.Desc}'>
					${d.Filename}
				</div>
			`
		} },
		{ headerTemplate: '<center>Model</center>', field: 'DocName', width: 90, template: (d) => {
			return `<center>
				<span class="tag bg-green">${d.DocName}</span>
			</center>`
		} },
		{ headerTemplate: '<center>Date</center>', width: 120, template: (d) =>
			moment(d.date).format('DD-MM-YYYY HH:mm:ss')
		},
		{ headerTemplate: '<center>Action</center>', width: 100, template: (d) => {
			switch (d.Status) {
				case 'ready': return `
					<button class="btn btn-xs btn-warning tooltipster" title="Ready" onclick="ud.processData(\`${d._id}\`,this)">
						<i class="fa fa-play"></i> Run process
					</button>
				`
				case 'rollback': return `
					<button class="btn btn-xs btn-warning tooltipster" title="Ready"">
						<i class="fa fa-refresh"></i> Rollback
					</button>
				`
				case 'done'     : return `<span class='tag bg-green'>Done</span>`
				case 'failed'   : return `<span class='tag bg-green'>Failed</span>`
				case 'onprocess': return `<span class='tag bg-green'>On Process</span>`
			}

			return ``
		} }
	],
	filterable: false,
	sortable: false,
	resizable: false,
	dataBound: app.gridBoundTooltipster('.grid-uploadData')
}
ud.processData = function (data) {
	app.ajaxPost('/uploaddata/processdata', { _id: data }, (res) => {
		if (!app.isFine(res)) {
			return;
		}

		ud.getUploadedFiles()
	}, function (err) {
		app.showError(err.responseText)
	}, {
		timeout: 5000
	})
};

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
