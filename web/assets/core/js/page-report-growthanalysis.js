"use strict";

viewModel.growth = new Object();
var grw = viewModel.growth;

grw.contentIsLoading = ko.observable(false);

grw.optionBreakdowns = ko.observableArray([{ field: "date.quartertxt", name: "Quarter" }, { field: "date.month", name: "Month" }]);
grw.breakdownBy = ko.observable('date.quartertxt');
grw.breakdownByFiscalYear = ko.observable('date.fiscal');
grw.rows = ko.observableArray([{ pnl: "Net Sales", plcodes: ["PL8A"] }, //  ["PL9"] }, //
{ pnl: "EBIT", plcodes: ["PL44B"] }]);
grw.columns = ko.observableArray([]);

grw.data = ko.observableArray([]);
grw.fiscalYears = ko.observableArray(rpt.optionFiscalYears());
// grw.level = ko.observable(3)

grw.emptyGrid = function () {
	$('.grid').replaceWith("<div class=\"grid\"></div>");
	$('.chart').replaceWith("<div class=\"chart\"></div>");
};

grw.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.groups = rpt.parseGroups([grw.breakdownByFiscalYear(), grw.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(true, grw.fiscalYears);

	grw.contentIsLoading(true);

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				grw.contentIsLoading(false);
				return;
			}

			// grw.data(grw.buildStructure(res.Data.Data))
			// rpt.plmodels(res.Data.PLModels)
			grw.emptyGrid();
			grw.contentIsLoading(false);
			grw.renderGrid(res);
			grw.renderChart(res);
		}, function () {
			grw.emptyGrid();
			grw.contentIsLoading(false);
		});
	};

	fetch();
};

grw.reloadLayout = function (d) {
	toolkit.try(function () {
		$(d).find('.k-chart').data('kendoChart').redraw();
	});
	toolkit.try(function () {
		$(d).find('.k-grid').data('kendoGrid').refresh();
	});
};

grw.renderChart = function (res) {
	var data = res.Data.Data.map(function (d) {
		var fiscal = d._id["_id_" + toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')];
		var order = d._id["_id_" + toolkit.replace(grw.breakdownBy(), '.', '_')];
		var sub = d._id["_id_" + toolkit.replace(grw.breakdownBy(), '.', '_')];
		var net = Math.abs(toolkit.sum(grw.rows()[0].plcodes, function (plcode) {
			return d[plcode];
		}));
		var ebit = Math.abs(toolkit.sum(grw.rows()[1].plcodes, function (plcode) {
			return d[plcode];
		}));

		if (grw.breakdownBy() == 'date.month') {
			var m = parseInt(sub, 10) - 1 + 3;
			var y = parseInt(fiscal.split('-')[0], 10);
			var mP = moment(new Date(y, m, 1)).format("MMMM");
			var yP = moment(new Date(y, m, 1)).format("YYYY");
			sub = mP + "\n" + yP;
		}

		return {
			fiscal: fiscal,
			sub: sub,
			order: order,
			net: net,
			ebit: ebit
		};
	});

	data = _.orderBy(data, function (d) {
		if (grw.breakdownBy() == 'date.quartertxt') {
			return d.order;
		} else {
			return d.fiscal + " " + (parseInt(d.order) + 10);
		}
	}, 'asc');

	var config = {
		dataSource: { data: data },
		legend: {
			visible: true,
			position: "bottom"
		},
		seriesDefaults: {
			type: "line",
			style: "smooth",
			missingValues: "gap",
			labels: {
				visible: true,
				position: 'top',
				format: '{0:n0}'
			},
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			}
		},
		seriesColors: toolkit.seriesColorsGodrej,
		series: [{
			field: 'net',
			name: grw.rows()[0].pnl
		}, {
			field: 'ebit',
			name: grw.rows()[1].pnl
		}],
		valueAxis: {
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}"
			}
		},
		categoryAxis: {
			field: 'sub',
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}"
			},
			majorGridLines: { color: '#fafafa' }
		}
	};

	$('.chart').replaceWith("<div class=\"chart\"></div>");
	if (grw.breakdownBy() == 'date.month') {
		$('.chart').width(data.length * 100);
	}
	$('.chart').kendoChart(config);
};

grw.renderGrid = function (res) {
	var rows = [];
	var rowsAfter = [];
	var columnsPlaceholder = [{
		field: 'pnl',
		title: 'PNL',
		attributes: { class: 'bold' },
		headerAttributes: { style: 'font-weight: bold; vertical-align: middle;' },
		width: 120
	}, {
		field: 'total',
		title: 'Total',
		format: '{0:n0}',
		attributes: { class: 'bold align-right bold' },
		headerAttributes: { style: 'font-weight: bold; vertical-align: middle; text-align: right;' },
		width: 120
	}];

	var columnGrouped = [];
	var data = res.Data.Data;

	grw.rows().forEach(function (row, rowIndex) {
		row.columnData = [];
		row.total = toolkit.sum(data, function (each) {
			return toolkit.number(toolkit.sum(row.plcodes, function (d) {
				return each[d];
			}));
		});

		var prev = null;

		var op1 = _.groupBy(data, function (d) {
			return d._id["_id_" + toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')];
		});
		var op9 = _.map(op1, function (v, k) {
			return { key: k, values: v };
		});
		op9.forEach(function (r, j) {
			var k = r.key;
			var v = r.values;
			var op2 = _.groupBy(v, function (d) {
				return d._id["_id_" + toolkit.replace(grw.breakdownBy(), '.', '_')];
			});
			var op3 = _.map(op2, function (w, l) {
				var o = {};

				o.order = l;
				o.key = l;
				o.data = w;

				if (grw.breakdownBy() == 'date.month') {
					o.order = parseInt(o.key, 10);
				}

				return o;
			});
			var op4 = _.orderBy(op3, function (d) {
				return d.order;
			}, 'asc');

			var columnGroup = {};
			columnGroup.title = k;
			columnGroup.headerAttributes = { class: "align-center color-" + j };
			columnGroup.columns = [];

			if (rowIndex == 0) {
				columnGrouped.push(columnGroup);
			}

			op4.forEach(function (d, i) {
				var current = d.data;
				var value = toolkit.sum(row.plcodes, function (plcode) {
					return toolkit.sum(current, function (d) {
						return toolkit.number(d[plcode]);
					});
				});

				var prevValue = 0;
				if (!(j == 0 && i == 0)) {
					prevValue = toolkit.sum(row.plcodes, function (plcode) {
						return toolkit.sum(prev, function (d) {
							return toolkit.number(d[plcode]);
						});
					});
				}

				prev = current;

				var title = d.key;
				if (grw.breakdownBy() == 'date.quartertxt') {
					title = "Quarter " + toolkit.getNumberFromString(d.key.split(' ')[1]);
				} else {
					var m = parseInt(d.key, 10) - 1 + 3;
					var y = parseInt(k.split('-')[0], 10);

					title = moment(new Date(y, m, 1)).format('MMMM YYYY');
				}

				row.columnData.push({
					title: d.key,
					value: value,
					growth: toolkit.number((value - prevValue) / prevValue * 100)
				});

				var left = i + op4.length * j;

				var columnEach = {};
				columnEach.title = title;
				columnEach.headerAttributes = { class: 'align-center' };
				columnEach.columns = [];

				columnGroup.columns.push(columnEach);

				var columnValue = {};
				columnValue.title = 'Value';
				columnValue.field = "columnData[" + left + "].value";
				columnValue.width = 120;
				columnValue.format = '{0:n0}';
				columnValue.attributes = { class: 'align-right' };
				columnValue.headerAttributes = { class: "align-center" }; // color-${j}` }
				columnEach.columns.push(columnValue);

				var columnGrowth = {};
				columnGrowth.title = '%';
				columnGrowth.width = 70;
				columnGrowth.template = function (d) {
					return kendo.toString(d.columnData[left].growth, 'n2') + " %";
				};
				columnGrowth.headerAttributes = { class: 'align-center' };
				columnGrowth.attributes = { class: 'align-right' };
				columnEach.columns.push(columnGrowth);
			});
		});

		rowsAfter.push(row);
	});

	if (columnGrouped.length > 0) {
		columnsPlaceholder[0].locked = true;
		columnsPlaceholder[1].locked = true;
	}

	columnGrouped = _.orderBy(columnGrouped, function (d) {
		return d.title;
	}, 'asc');

	grw.data(rowsAfter);
	grw.columns(columnsPlaceholder.concat(columnGrouped));

	var config = {
		dataSource: {
			data: grw.data()
		},
		columns: grw.columns(),
		resizable: false,
		sortable: false,
		pageable: false,
		filterable: false,
		dataBound: function dataBound() {
			var sel = '.grid-dashboard .k-grid-content-locked tr, .grid-dashboard .k-grid-content tr';

			$(sel).on('mouseenter', function () {
				var index = $(this).index();
				console.log(this, index);
				var elh = $(".grid-dashboard .k-grid-content-locked tr:eq(" + index + ")").addClass('hover');
				var elc = $(".grid-dashboard .k-grid-content tr:eq(" + index + ")").addClass('hover');
			});
			$(sel).on('mouseleave', function () {
				$('.grid-dashboard tr.hover').removeClass('hover');
			});
		}
	};

	$('.grid').kendoGrid(config);
};

vm.currentMenu('Analysis');
vm.currentTitle('&nbsp;');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: 'Growth Analysis', href: '#' }]);

$(function () {
	grw.refresh();
});