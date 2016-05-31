'use strict';

vm.currentMenu('Administration');
vm.currentTitle('Allocation Flow');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Administration', href: '#' }, { title: 'Allocation Flow', href: '/allocationflow' }]);

viewModel.allocationFlow = new Object();
var af = viewModel.allocationFlow;

af.templateModuleConfig = {
	Name: '',
	Description: '',
	Params: []
};
af.templateParam = {
	Key: '',
	Value: ''
};
af.moduleConfig = ko.mapping.fromJS(af.templateModuleConfig);
af.isNew = ko.observable(true);
af.dataModules = ko.observableArray([]);
af.dataAppliedModules = ko.observableArray([]);
af.prepareDrag = function () {
	$('.available-module').sortable({
		connectWith: '.list-group.module'
	});
	$('.applied-module').sortable({
		connectWith: '.list-group.module'
	});
};
af.addParam = function () {
	var config = ko.mapping.toJS(af.moduleConfig);
	config.Params.push(app.clone(af.templateParam));
	ko.mapping.fromJS(config, af.moduleConfig);
};
af.removeParam = function (index) {
	return function () {
		var row = af.moduleConfig.Params()[index];
		af.moduleConfig.Params.remove(row);
	};
};
af.getFormPayload = function () {
	var param = new FormData();
	param.append('Name', af.moduleConfig.Name());
	param.append('Description', af.moduleConfig.Description());

	var args = ko.mapping.toJS(af.moduleConfig.Params()).filter(function (d) {
		return d.Key != '';
	});
	param.append('Params', JSON.stringify(args));

	var files = $('[name="file"]')[0].files;
	if (files.length > 0) {
		param.append('file', files[0]);
	}

	return param;
};
af.getModules = function () {
	app.ajaxPost('/allocationflow/getmodules', {}, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		af.dataModules(res.data);
		af.prepareDrag();
	});
};
af.getAppliedModules = function () {
	app.ajaxPost('/allocationflow/getappliedmodules', {}, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		af.dataAppliedModules(res.data);
		af.prepareDrag();
	});
};
af.doUpload = function () {
	if (!app.isFormValid('.form-upload-file')) {
		return;
	}

	var param = af.getFormPayload();
	app.ajaxPost('/allocationflow/savemodules', param, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		af.getModules();
	});
};
af.showModuleForm = function () {
	app.resetForm($('.form-upload-file'));
	af.addParam();
	$('#modal-module').appendTo($('body'));
	$('#modal-module').modal('show');
};

$(function () {
	af.getModules();
	af.getAppliedModules();
	af.prepareDrag();
});