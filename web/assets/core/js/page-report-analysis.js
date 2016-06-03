'use strict';

vm.currentTitle(o.Name);
vm.breadcrumb(vm.breadcrumb().concat([{ title: o.Name, href: o.ID }]));

vm.reportAnalysis = {};
var ra = vm.reportAnalysis;
ra.init = function () {
	pvt.dimensions(pvt.optionDimensions().filter(function (d) {
		return app.redefine(d.tag, '').indexOf(o.Name) > -1;
	}));
};

rpt.init = function () {
	ra.init();
	pvt.init();
};

rpt.refresh = function () {
	pvt.refreshData();
};