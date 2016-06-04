'use strict';

vm.currentTitle(o.Name);
vm.breadcrumb(vm.breadcrumb().concat([{ title: o.Name, href: o.ID }]));

vm.reportAnalysis = {};
var ra = vm.reportAnalysis;

rpt.refresh = function () {
	var param = pvt.getPivotConfig();
	app.ajaxPost("/report/summarycalculatedatapivot", param, function (res) {
		if (res.Data.length == 0) {
			return;
		}

		pvt.render(res.Data);
	});

	// app.ajaxPost("/report/summarycalculatedatachart", param, (res) => {
	// 	if (res.Data.Data.length == 0) {
	// 		return
	// 	}

	// 	// crt.render('', res.Data.MetaData.Series, res.Data.Data, res.Data.MetaData.CategoryAxis)
	// })
};

rpt.init = function () {
	pvt.dimensions([app.koMap({ field: 'CC.BranchID', name: 'Branch' }), app.koMap({ field: 'Product.Brand', name: 'Brand' })]);

	pvt.dataPoints([app.koMap({ aggr: 'sum', field: 'Value1', name: 'Gross Sales' }), app.koMap({ aggr: 'sum', field: 'Value2', name: 'Discount' }), app.koMap({ aggr: 'sum', field: 'Value3', name: 'Net Sales' })]);

	switch (o.ID) {
		case 'freight_cost_by_sales':
			{
				pvt.enableDimensions(false);
				break;
			}
	}

	rpt.refresh();
};