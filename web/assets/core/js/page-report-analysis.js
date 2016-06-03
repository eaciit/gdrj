"use strict";

vm.currentTitle(o.Name);
vm.breadcrumb(vm.breadcrumb().concat([{ title: o.Name, href: o.ID }]));

vm.reportAnalysis = {};
var ra = vm.reportAnalysis;

rpt.refresh = function () {
	var param = pvt.getPivotConfig();
	app.ajaxPost("/report/summarycalculatedatapivotdummy", param, function (res) {
		if (res.Data.length == 0) {
			return;
		}

		pvt.render(res.Data);
		crt.render(res.Data);
	});
};

rpt.init = function () {
	rpt.refresh();
};