'use strict';

vm.pageTitle('Upload Data');
vm.breadcrumb([{
	title: 'Godrej',
	href: '#'
}, {
	title: 'Upload Data',
	href: '/uploaddata'
}]);

viewModel.uploadData = new Object();
var ud = viewModel.uploadData;

ud.inputDescription = ko.observable('');
ud.inputModel = ko.observable('');

ud.dataUploadedFiles = ko.observableArray([]);
ud.masterDataBrowser = ko.observableArray([]);
ud.dropDownModel = {
	data: ko.computed(function() {
		return ud.masterDataBrowser().map(function(d) {
			return {
				text: d.TableNames,
				value: d.TableNames
			};
		});
	}),
	dataValueField: 'value',
	dataTextField: 'text',
	value: ud.inputModel,
	optionLabel: 'Select one'
};
ud.gridUploadedFiles = {
	data: ud.dataUploadedFiles,
	dataSource: {
		pageSize: 10
	},
	columns: [{
		title: '&nbsp;',
		width: 40,
		attributes: {
			class: 'align-center'
		},
		template: function template(d) {
			return '<input type="checkbox" />';
		}
	}, {
		title: 'File Name',
		field: 'filename',
		attributes: {
			class: 'bold'
		}
	}, {
		title: 'Description',
		field: 'description'
	}, {
		title: 'Date',
		template: function template(d) {
			return moment(d.date).format('DD-MM-YYYY HH:mm:ss');
		}
	}, {
		title: 'Action',
		width: 50,
		template: function template(d) {
			 return '<button onclick="ud.processData(\''+d.filename+'\')" class="btn btn-sm btn-primary"/><i class=\'fa fa-play\'></i></button>';
		}
	}],
	filterable: false,
	sortable: false,
	resizable: false
};
ud.processData = function(filename) {
	app.ajaxPost('/uploaddata/processdata', {filename:filename}, function(res) {
		 if (!app.isFine(res)) {
			return;
		 }
		
	});
}
ud.getMasterDataBrowser = function() {
	ud.masterDataBrowser([]);

	app.ajaxPost('/databrowser/getdatabrowsers', {}, function(res) {
		if (!app.isFine(res)) {
			return;
		}

		ud.masterDataBrowser(res.data);
	}, function(err) {
		app.showError(err.responseText);
	}, {
		timeout: 5000
	});
};
ud.getUploadedFiles = function() {
	ud.dataUploadedFiles([]);

	app.ajaxPost('/uploaddata/getuploadedfiles', {}, function(res) {
		if (!app.isFine(res)) {
			return;
		}

		ud.dataUploadedFiles(res.data);
	}, {
		timeout: 5000
	});
};
ud.doUpload = function() {
	if (!app.isFormValid('.form-upload-file')) {
		return;
	}

	var payload = new FormData();
	payload.append('model', ud.inputModel());
	payload.append('desc', ud.inputDescription());
	payload.append('userfile', $('[name=file]')[0].files[0]);

	app.ajaxPost('/uploaddata/uploadfile', payload, function(res) {
		if (!app.isFine(res)) {
			return;
		}

		ud.getUploadedFiles();
	}, function(err) {
		app.showError(err.responseText);
	}, {
		timeout: 5000
	});
};

ud.init = function() {
	ud.getMasterDataBrowser();
	ud.getUploadedFiles();
};

$(function() {
	ud.init();
});