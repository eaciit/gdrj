'use strict';

vm.currentMenu('Administration');
vm.currentTitle('Allocation Flow');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Administration', href: '#' }, { title: 'Allocation Flow', href: '/allocationflow' }]);

viewModel.allocationFlow = new Object();
var af = viewModel.allocationFlow;

af.templateModuleConfig = {
	Name: '',
	Description: ''
};
af.moduleConfig = ko.mapping.fromJS(af.templateModuleConfig);
af.isNew = ko.observable(false);
af.modules = ko.observableArray([{ _id: "n001", Name: "Module Lorem" }, { _id: "n002", Name: "Module Ipsum" }, { _id: "n003", Name: "Module Dolor" }, { _id: "n004", Name: "Module Sit" }, { _id: "n005", Name: "Module Amet" }]);
af.prepareDrag = function () {
	$('.available-module').sortable({
		connectWith: '.list-group.module'
	});
	$('.applied-module').sortable({
		connectWith: '.list-group.module'
	});
};
af.doUpload = function () {};

$(function () {
	af.prepareDrag();
});