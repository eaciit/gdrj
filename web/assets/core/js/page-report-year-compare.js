'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

yc.getDivider = function () {
	return parseInt(yc.unit().replace(/v/g, ''), 10);
};

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

	if (['customer.branchname', 'customer.branchgroup'].indexOf(yc.breakdownBy()) > -1) {
		var noExport = {
			Field: 'customer.channelname',
			Op: '$in',
			Value: rpt.masterData.Channel().map(function (d) {
				return d._id;
			}).filter(function (d) {
				return d != "EXP";
			})
		};
		param.filters = [noExport].concat(param.filters);
	}

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
	var _ref;

	var dimensionTitle = 'Dimension';
	toolkit.try(function () {
		dimensionTitle = rpt.optionDimensions().find(function (d) {
			return d.field == yc.breakdownBy();
		}).name;
	});

	var plCodeEBIT = 'PL44B';
	var plCodeNetSales = 'PL8A';
	var plGrossMargin = 'PL74C';

	var total2015_netSales = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2015-2016';
	}), function (d) {
		return d[plCodeNetSales];
	});
	var total2014_netSales = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2014-2015';
	}), function (d) {
		return d[plCodeNetSales];
	});

	var total2015_ebit = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2015-2016';
	}), function (d) {
		return d[plCodeEBIT];
	});
	var total2014_ebit = toolkit.sum(yc.data().filter(function (d) {
		return d._id._id_date_fiscal === '2014-2015';
	}), function (d) {
		return d[plCodeEBIT];
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

	var calcGrowth = function calcGrowth(data2015, data2014, plcode) {
		var v2015 = data2015[0][plcode];
		var v2014 = data2014[0][plcode];
		if (v2015 <= 0 && v2014 <= 0) {
			return 0;
		}

		console.log('----', plcode, v2015, v2014);

		return toolkit.number((v2015 - v2014) / v2014) * 100;
	};

	var op1 = yc.groupMap(yc.data(), function (d) {
		return d._id[yc.breakdownKey()];
	}, function (v, k) {
		var o = {};
		o.dimension = k.replace(/ /g, '&nbsp;');
		o.sorter = 0;

		var data2015 = v.filter(function (e) {
			return e._id._id_date_fiscal === '2015-2016';
		});
		var data2014 = v.filter(function (e) {
			return e._id._id_date_fiscal === '2014-2015';
		});

		toolkit.try(function () {
			o.sorter = data2015[0][plCodeNetSales];
		});

		o.v2015_nsal_value = 0;
		o.v2015_nsal_growth = 0;
		toolkit.try(function () {
			o.v2015_nsal_value = data2015[0][plCodeNetSales] / yc.getDivider();
		});
		toolkit.try(function () {
			o.v2015_nsal_growth = calcGrowth(data2015, data2014, plCodeNetSales);
		});

		o.v2015_ebit_value = 0;
		o.v2015_ebit_growth = 0;
		toolkit.try(function () {
			o.v2015_ebit_value = data2015[0][plCodeEBIT] / yc.getDivider();
		});
		toolkit.try(function () {
			o.v2015_ebit_growth = calcGrowth(data2015, data2014, plCodeEBIT);
		});

		o.v2015_gs_value = 0;
		o.v2015_gs_growth = 0;
		toolkit.try(function () {
			o.v2015_gs_value = data2015[0][plGrossMargin] / yc.getDivider();
		});
		toolkit.try(function () {
			o.v2015_gs_growth = calcGrowth(data2015, data2014, plGrossMargin);
		});

		o.v2015_gs_ctb_value = 0;
		toolkit.try(function () {
			o.v2015_gs_ctb_value = data2015[0][plGrossMargin] / data2015[0][plCodeNetSales] * 100;
		});
		o.v2014_gs_ctb_value = 0;
		toolkit.try(function () {
			o.v2014_gs_ctb_value = data2014[0][plGrossMargin] / data2014[0][plCodeNetSales] * 100;
		});

		o.v2015_gs_ctb_growth = 0;
		toolkit.try(function () {
			var prcnt = (o.v2015_gs_ctb_value - o.v2014_gs_ctb_value) / o.v2014_gs_ctb_value * 100;
			o.v2015_gs_ctb_growth = prcnt;
		});

		o.v2015_ebit_ctb_value = 0;
		toolkit.try(function () {
			o.v2015_ebit_ctb_value = data2015[0][plCodeEBIT] / data2015[0][plCodeNetSales] * 100;
		});
		o.v2014_ebit_ctb_value = 0;
		toolkit.try(function () {
			o.v2014_ebit_ctb_value = data2014[0][plCodeEBIT] / data2014[0][plCodeNetSales] * 100;
		});

		o.v2015_ebit_ctb_growth = 0;
		toolkit.try(function () {
			var prcnt = (o.v2015_ebit_ctb_value - o.v2014_ebit_ctb_value) / o.v2014_ebit_ctb_value * 100;
			o.v2015_ebit_ctb_growth = prcnt;
		});

		o.v2014_nsal_value = 0;
		toolkit.try(function () {
			o.v2014_nsal_value = data2014[0][plCodeNetSales] / yc.getDivider();
		});

		o.v2014_ebit_value = 0;
		toolkit.try(function () {
			o.v2014_ebit_value = data2014[0][plCodeEBIT] / yc.getDivider();
		});

		o.v2014_gs_value = 0;
		toolkit.try(function () {
			o.v2014_gs_value = data2014[0][plGrossMargin] / yc.getDivider();
		});

		return o;
	});
	var op2 = _.orderBy(op1, function (d) {
		return rpt.orderByChannel(d.dimension, d.sorter);
	}, 'desc');
	var dataParsed = op2;

	var total = {};
	total.dimension = 'Total';

	total.v2015_nsal_value = toolkit.sum(dataParsed, function (d) {
		return d.v2015_nsal_value;
	});
	total.v2015_ebit_value = toolkit.sum(dataParsed, function (d) {
		return d.v2015_ebit_value;
	});
	total.v2015_gs_value = toolkit.sum(dataParsed, function (d) {
		return d.v2015_gs_value;
	});
	total.v2015_gs_ctb_value = toolkit.safeDiv(total.v2015_gs_value, total.v2015_nsal_value) * 100;
	total.v2015_ebit_ctb_value = toolkit.safeDiv(total.v2015_ebit_value, total.v2015_nsal_value) * 100;

	total.v2014_nsal_value = toolkit.sum(dataParsed, function (d) {
		return d.v2014_nsal_value;
	});
	total.v2014_ebit_value = toolkit.sum(dataParsed, function (d) {
		return d.v2014_ebit_value;
	});
	total.v2014_gs_value = toolkit.sum(dataParsed, function (d) {
		return d.v2014_gs_value;
	});
	total.v2014_gs_ctb_value = toolkit.safeDiv(total.v2014_gs_value, total.v2014_nsal_value) * 100;
	total.v2014_ebit_ctb_value = toolkit.safeDiv(total.v2014_ebit_value, total.v2014_nsal_value) * 100;

	total.v2015_nsal_growth = toolkit.number((total.v2015_nsal_value - total.v2014_nsal_value) / total.v2014_nsal_value) * 100;
	total.v2015_ebit_growth = toolkit.number((total.v2015_ebit_value - total.v2014_ebit_value) / total.v2014_ebit_value) * 100;
	total.v2015_gs_growth = toolkit.number((total.v2015_gs_value - total.v2014_gs_value) / total.v2014_gs_value) * 100;
	total.v2015_gs_ctb_growth = toolkit.number((total.v2015_gs_ctb_value - total.v2014_gs_ctb_value) / total.v2014_gs_ctb_value) * 100;
	total.v2015_ebit_ctb_growth = toolkit.number((total.v2015_ebit_ctb_value - total.v2014_ebit_ctb_value) / total.v2014_ebit_ctb_value) * 100;

	console.log('total', total);

	var dimensionWidth = 140;
	if (yc.breakdownBy() == 'customer.region') {
		dimensionWidth = 160;
	}

	var widthValue = 90;
	var widthPrcnt = 90;
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
		headerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
		columns: [{
			headerTemplate: 'Net Sales<br />Value',
			field: 'v2015_nsal_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_nsal_value, 'n0') + '</div>',
			width: widthValue
		}, {
			headerTemplate: 'Net Sales<br />Growth',
			field: 'v2015_nsal_growth',
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_nsal_growth, 'n2') + ' %</div>',
			width: widthPrcnt
		}, {
			headerTemplate: 'GM<br />Value',
			field: 'v2015_gs_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_gs_value, 'n0') + '</div>',
			width: widthValue
		}, {
			headerTemplate: 'GM %',
			headerAttributes: { style: 'vertical-align: middle !important;' },
			field: 'v2015_gs_ctb_value',
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_gs_ctb_value, 'n2') + ' %</div>',
			width: widthPrcnt
		}, {
			headerTemplate: 'GM<br />Growth',
			field: 'v2015_gs_growth',
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_gs_growth, 'n2') + ' %</div>',
			width: widthPrcnt
		}, {
			headerTemplate: 'EBIT<br />Value',
			field: 'v2015_ebit_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_ebit_value, 'n0') + '</div>',
			width: widthValue
		}, {
			headerTemplate: 'EBIT %',
			headerAttributes: { style: 'vertical-align: middle !important;' },
			field: 'v2015_ebit_ctb_value',
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_ebit_ctb_value, 'n2') + ' %</div>',
			width: widthPrcnt
		}, {
			headerTemplate: 'EBIT<br />Growth',
			field: 'v2015_ebit_growth',
			format: '{0:n2} %',
			attributes: { class: 'align-right', style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
			headerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
			footerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_ebit_growth, 'n2') + ' %</div>',
			width: widthPrcnt
		}]
	}, {
		title: 'FY 2014-2015',
		columns: [{
			headerTemplate: 'Net Sales<br />Value',
			field: 'v2014_nsal_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_nsal_value, 'n0') + '</div>',
			width: widthValue
		}, {
			headerTemplate: 'GM<br />Value',
			field: 'v2014_gs_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_gs_value, 'n0') + '</div>',
			width: widthValue
		}, {
			title: 'GM %',
			headerAttributes: { style: 'vertical-align: middle !important;' },
			field: 'v2014_gs_ctb_value',
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_gs_ctb_value, 'n2') + ' %</div>',
			width: widthPrcnt
		}, {
			headerTemplate: 'EBIT<br />Value',
			field: 'v2014_ebit_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_ebit_value, 'n0') + '</div>',
			width: widthValue
		}, (_ref = {
			title: "EBIT %",
			headerAttributes: { style: 'vertical-align: middle !important;' },
			field: "v2014_ebit_ctb_value",
			format: '{0:n2} %',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_ebit_ctb_value, 'n2') + ' %</div>'
		}, _defineProperty(_ref, 'headerAttributes', { style: 'vertical-align: middle;' }), _defineProperty(_ref, 'width', widthPrcnt), _ref)]
	}];

	var config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns,
		dataBound: function dataBound() {
			var sel = '#year-comparison .k-grid-content-locked tr, #year-comparison .k-grid-content tr';

			$(sel).on('mouseenter', function () {
				var index = $(this).index();
				var elh = $('#year-comparison .k-grid-content-locked tr:eq(' + index + ')').addClass('hover');
				var elc = $('#year-comparison .k-grid-content tr:eq(' + index + ')').addClass('hover');
			});
			$(sel).on('mouseleave', function () {
				$('#year-comparison tr.hover').removeClass('hover');
			});
		}
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
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: yc.title(), href: '#' }]);

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