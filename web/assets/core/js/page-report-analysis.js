"use strict";

vm.currentTitle(o.Name);
vm.breadcrumb(vm.breadcrumb().concat([{ title: o.Name, href: o.ID }]));

vm.reportAnalysis = {};
var ra = vm.reportAnalysis;

rpt.init = function () {
	pvt.init();
};

rpt.refresh = function () {
	pvt.refreshData();
};