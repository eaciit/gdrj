'use strict';

viewModel.yearCompare = {};
var yc = viewModel.yearCompare;

yc.title = ko.observable('YoY Rev & EBIT');
yc.subTitle = ko.observable('Channel');
yc.breakdownBy = ko.observable('customer.channelname');
yc.contentIsLoading = ko.observable(false);
yc.data = ko.observableArray([]);
yc.flag = ko.observable('');
yc.unit = ko.observable('v1000000000');
yc.optionUnit = ko.observableArray([{ _id: 'v1', Name: 'Actual', suffix: '' }, { _id: 'v1000', Name: 'Hundreds', suffix: 'K' }, { _id: 'v1000000', Name: 'Millions', suffix: 'M' }, { _id: 'v1000000000', Name: 'Billions', suffix: 'B' }]);

yc.groupMap = function (arr, c, d) {
	return _.map(_.groupBy(arr, c), d);
};

yc.breakdownKey = function () {
	return '_id_' + toolkit.replace(yc.breakdownBy(), '.', '_');
};

yc.refresh = function () {
	var param = {};
	param.pls = ['PL44B', 'PL8A', 'PL74C'];
	param.groups = rpt.parseGroups([yc.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(true, rpt.optionFiscalYears);

	if (yc.flag() === 'gt-breakdown') {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ['I2']
		});
	} else if (yc.flag() === 'mt-breakdown') {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ['I3']
		});
	} else if (yc.flag() === 'rd-breakdown') {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ['I1']
		});
	}

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				yc.contentIsLoading(false);
				return;
			}

			yc.contentIsLoading(false);
			yc.data(res.Data.Data);
			yc.render();
		}, function () {
			yc.contentIsLoading(false);
		});
	};

	yc.contentIsLoading(true);
	fetch();
};

yc.render = function () {
	var divider = parseInt(yc.unit().replace(/v/g, ''), 10);
	var unitSuffix = yc.optionUnit().find(function (d) {
		return d._id == yc.unit();
	}).suffix;

	var dimensionTitle = 'Dimension';
	toolkit.try(function () {
		dimensionTitle = rpt.optionDimensions().find(function (d) {
			return d.field == yc.breakdownBy();
		}).name;
	});

	var plCodeEBIT = 'PL44B';
	var plCodeNetSales = 'PL8A';
	var plGrossMargin = 'PL74C';

	var total2015_ebit = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2015-2016';
	}), function (d) {
		return d[plCodeEBIT];
	});
	var total2015_netSales = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2015-2016';
	}), function (d) {
		return d[plCodeNetSales];
	});
	var total2014_ebit = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2014-2015';
	}), function (d) {
		return d[plCodeEBIT];
	});
	var total2014_netSales = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2014-2015';
	}), function (d) {
		return d[plCodeNetSales];
	});

	var total2015_GrossMargin = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2015-2016';
	}), function (d) {
		return d[plGrossMargin];
	});
	var total2014_GrossMargin = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2014-2015';
	}), function (d) {
		return d[plGrossMargin];
	});

	var op1 = yc.groupMap(yc.data(), function (d) {
		return d._id[yc.breakdownKey()];
	}, function (v, k) {
		var o = {};
		o.dimension = k.replace(/ /g, '&nbsp;');
		o.sorter = 0;

		o.v2015_ebit_value = 0;
		o.v2015_ebit_prcnt = 0;
		o.v2015_nsal_value = 0;
		o.v2015_nsal_prcnt = 0;
		o.v2015_gs_prcnt = 0;
		o.v2015_ebit_prcnt = 0;

		o.v2014_ebit_value = 0;
		o.v2014_ebit_prcnt = 0;
		o.v2014_nsal_value = 0;
		o.v2014_nsal_prcnt = 0;
		o.v2014_gs_prcnt = 0;
		o.v2014_ebit_prcnt = 0;

		var data2015 = v.filter(function (e) {
			return e._id._id_date_fiscal === '2015-2016';
		});
		var data2014 = v.filter(function (e) {
			return e._id._id_date_fiscal === '2014-2015';
		});

		toolkit.try(function () {
			o.sorter = data2015[0][plCodeEBIT];
		});

		toolkit.try(function () {
			o.v2014_ebit_value = data2014[0][plCodeEBIT] / divider;
		});
		toolkit.try(function () {
			o.v2014_ebit_prcnt = 0;
		});
		toolkit.try(function () {
			o.v2014_nsal_value = data2014[0][plCodeNetSales] / divider;
		});
		toolkit.try(function () {
			o.v2014_nsal_prcnt = 0;
		});
		toolkit.try(function () {
			o.v2014_gs_prcnt = data2014[0][plGrossMargin] / total2014_GrossMargin * 100;
		});
		toolkit.try(function () {
			o.v2014_ebit_prcnt = data2014[0][plCodeEBIT] / total2014_ebit * 100;
		});

		toolkit.try(function () {
			o.v2015_ebit_value = data2015[0][plCodeEBIT] / divider;
		});
		toolkit.try(function () {
			var v2015 = data2015[0][plCodeEBIT];
			var v2014 = data2014[0][plCodeEBIT];
			if (v2015 <= 0 && v2014 <= 0) {
				return;
			}
			o.v2015_ebit_prcnt = toolkit.number((v2015 - v2014) / v2014) * 100;
		});
		toolkit.try(function () {
			o.v2015_nsal_value = data2015[0][plCodeNetSales] / divider;
		});
		toolkit.try(function () {
			o.v2015_gs_prcnt = data2015[0][plGrossMargin] / total2015_GrossMargin * 100;
		});
		toolkit.try(function () {
			o.v2015_ebit_prcnt = data2015[0][plCodeEBIT] / total2015_ebit * 100;
		});
		toolkit.try(function () {
			var v2015 = data2015[0][plCodeNetSales];
			var v2014 = data2014[0][plCodeNetSales];
			if (v2015 <= 0 && v2014 <= 0) {
				return;
			}
			o.v2015_nsal_prcnt = toolkit.number((v2015 - v2014) / v2014) * 100;
		});

		return o;
	});
	var op2 = _.orderBy(op1, function (d) {
		return d.sorter;
	}, 'desc');
	var dataParsed = op2;

	var total = {
		dimension: 'Total',
		v2015_ebit_value: toolkit.sum(dataParsed, function (d) {
			return d.v2015_ebit_value;
		}),
		v2015_nsal_value: toolkit.sum(dataParsed, function (d) {
			return d.v2015_nsal_value;
		}),
		v2014_ebit_value: toolkit.sum(dataParsed, function (d) {
			return d.v2014_ebit_value;
		}),
		v2014_nsal_value: toolkit.sum(dataParsed, function (d) {
			return d.v2014_nsal_value;
		})
	};
	total.v2015_ebit_prcnt = toolkit.number((total.v2015_ebit_value - total.v2014_ebit_value) / total.v2014_ebit_value) * 100;
	total.v2015_nsal_prcnt = toolkit.number((total.v2015_nsal_value - total.v2014_nsal_value) / total.v2014_nsal_value) * 100;

	// dataParsed.push(total)

	var dimensionWidth = 140;
	if (yc.breakdownBy() == 'customer.region') {
		dimensionWidth = 160;
	}

	var widthValue = 90;
	var tableWidth = 1200;
	if (yc.unit() == 'v1000000') {
		tableWidth += 120 * 1;
		widthValue += 10 * 1;
	}
	if (yc.unit() == 'v1000') {
		tableWidth += 120 * 2;
		widthValue += 10 * 2;
	}
	if (yc.unit() == 'v1') {
		tableWidth += 120 * 3;
		widthValue += 10 * 3;
	}

	var columns = [{
		title: dimensionTitle,
		template: function template(d) {
			return d.dimension;
		},
		headerAttributes: { style: 'vertical-align: middle;' },
		footerTemplate: 'Total',
		width: dimensionWidth,
		locked: true
	}, {
		title: 'FY 2015-2016',
		columns: [{
			title: 'Net Sales',
			columns: [{
				title: 'Value',
				field: 'v2015_nsal_value',
				format: '{0:n0}', // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_nsal_value, 'n0') + '</div>',
				width: widthValue
			}, {
				title: '% Growth',
				field: 'v2015_nsal_prcnt',
				format: '{0:n1} %',
				attributes: { class: 'align-right' },
				footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_nsal_prcnt, 'n1') + ' %</div>',
				width: 90
			}]
		}, {
			title: "% Gross Margin",
			field: "v2015_gs_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">100 %</div>',
			headerAttributes: { style: 'vertical-align: middle;' },
			width: 100
		}, {
			title: 'EBIT',
			columns: [{
				title: 'Value',
				field: 'v2015_ebit_value',
				format: '{0:n0}', // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_ebit_value, 'n0') + '</div>',
				width: widthValue
			}, {
				title: '% Growth',
				field: 'v2015_ebit_prcnt',
				format: '{0:n1} %',
				attributes: { class: 'align-right' },
				footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_ebit_prcnt, 'n1') + ' %</div>',
				width: 90
			}]
		}, {
			title: "% EBIT",
			field: "v2015_ebit_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">100 %</div>',
			headerAttributes: { style: 'vertical-align: middle;' },
			width: 90
		}]
	}, {
		title: 'FY 2014-2015',
		columns: [{
			title: 'Net Sales',
			columns: [{
				title: 'Value',
				field: 'v2014_nsal_value',
				format: '{0:n0}', // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_nsal_value, 'n0') + '</div>',
				width: widthValue
			}]
		}, {
			title: "% Gross Margin",
			field: "v2014_gs_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">100 %</div>',
			headerAttributes: { style: 'vertical-align: middle;' },
			width: 100
		}, {
			title: 'EBIT',
			columns: [{
				title: 'Value',
				field: 'v2014_ebit_value',
				format: '{0:n0}', // ` ${unitSuffix}`,
				attributes: { class: 'align-right' },
				footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_ebit_value, 'n0') + '</div>',
				width: widthValue
			}]
		}, {
			title: "% EBIT",
			field: "v2014_ebit_prcnt",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">100 %</div>',
			headerAttributes: { style: 'vertical-align: middle;' },
			width: 90
		}]
	}];

	console.log('----', dataParsed);

	var config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns
	};

	$('#year-comparison').replaceWith('<div class="breakdown-view ez" id="year-comparison"></div>');
	$('#year-comparison').kendoGrid(config);
};

yc.changeDimension = function (title, args) {
	yc.subTitle(title);
	yc.breakdownBy(args.split('|')[0]);
	yc.flag('');

	if (args.indexOf('|') > -1) {
		yc.flag(args.split('|')[1]);
	}

	yc.refresh();
};

vm.currentMenu('YoY Rev & EBIT');
vm.currentTitle('&nbsp;');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: yc.title(), href: '#' }]);

$(function () {
	yc.refresh();
	rpt.showExport(true);
});

/**

---------------------------------------------------------
|       |          2016         |          2015         |
---------------------------------------------------------
|       |   EBIT    | NET SALES |   EBIT    | NET SALES |
---------------------------------------------------------
|       | Value | % | Value | % | Value | % | Value | % |
---------------------------------------------------------
| Total |  124  | 6 |  124  | 6 |  124  | 6 |  124  | 6 |
---------------------------------------------------------
| MT    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
| GT    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
| RD    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
---------------------------------------------------------

*/