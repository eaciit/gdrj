"use strict";

viewModel.growth = new Object();
var grw = viewModel.growth;

grw.contentIsLoading = ko.observable(false);

grw.optionBreakdowns = ko.observableArray([{ field: "date.quartertxt", name: "Quarter" }, { field: "date.month", name: "Month" }]);
grw.breakdownBy = ko.observable('date.quartertxt');
grw.breakdownByFiscalYear = ko.observable('date.fiscal');
grw.plNetSales = ko.observable('');
grw.plEBIT = ko.observable('');
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
			rpt.plmodels(res.Data.PLModels);
			if (grw.plNetSales() == '') {
				grw.plNetSales('PL8A');
				grw.plEBIT('PL44B');
			}

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
	setTimeout(function () {
		toolkit.try(function () {
			$(d).find('.k-chart').data('kendoChart').redraw();
		});
		toolkit.try(function () {
			$(d).find('.k-grid').data('kendoGrid').refresh();
		});
	}, 100);
};

grw.renderChart = function (res) {
	var data = res.Data.Data.map(function (d) {
		var fiscal = d._id["_id_" + toolkit.replace(grw.breakdownByFiscalYear(), '.', '_')];
		var order = d._id["_id_" + toolkit.replace(grw.breakdownBy(), '.', '_')];
		var sub = d._id["_id_" + toolkit.replace(grw.breakdownBy(), '.', '_')];
		var net = Math.abs(d[grw.plNetSales()]);
		var ebit = Math.abs(d[grw.plEBIT()]);

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
			name: function () {
				var row = rpt.plmodels().find(function (d) {
					return d._id == grw.plNetSales();
				});
				if (row != undefined) {
					return row.PLHeader3;
				}

				return '&nbsp;';
			}()
		}, {
			field: 'ebit',
			name: function () {
				var row = rpt.plmodels().find(function (d) {
					return d._id == grw.plEBIT();
				});
				if (row != undefined) {
					return row.PLHeader3;
				}

				return '&nbsp;';
			}()
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
	var data = res.Data.Data;[grw.plNetSales(), grw.plEBIT()].forEach(function (g, rowIndex) {
		var row = {};
		row.pnl = '&nbsp;';
		row.columnData = [];
		row.total = toolkit.sum(data, function (each) {
			return toolkit.number(each[g]);
		});

		var pl = rpt.plmodels().find(function (r) {
			return r._id == g;
		});
		if (pl != undefined) {
			row.pnl = pl.PLHeader3;
		}

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
				var value = toolkit.sum(current, function (d) {
					return toolkit.number(d[g]);
				});

				var prevValue = 0;
				if (!(j == 0 && i == 0)) {
					prevValue = toolkit.sum(prev, function (d) {
						return toolkit.number(d[g]);
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
				columnGrowth.title = 'Growth %';
				columnGrowth.width = 70;
				columnGrowth.template = function (d) {
					return kendo.toString(d.columnData[left].growth, 'n2') + " %";
				};
				columnGrowth.headerAttributes = { class: 'align-center', style: 'font-style: italic;' };
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

viewModel.annualGrowth = new Object();
var ag = viewModel.annualGrowth;

ag.optionBreakdowns = ko.observableArray([{ "field": "customer.branchname", "name": "Branch/RD", "title": "customer_branchname" }, { "field": "product.brand", "name": "Brand", "title": "product_brand" }, { "field": "customer.channelname", "name": "Channel", "title": "customer_channelname" }, { "field": "customer.areaname", "name": "City", "title": "customer_areaname" }, { "field": "customer.region", "name": "Region", "title": "customer_region" }, { "field": "customer.zone", "name": "Zone", "title": "customer_zone" }, { "field": "customer.keyaccount", "name": "Customer Group", "title": "customer_keyaccount" }]);
ag.contentIsLoading = ko.observable(false);
ag.breakdownBy = ko.observable('customer.channelname');
ag.series1PL = ko.observable('PL8A|value');
ag.series2PL = ko.observable('PL44B|value');
ag.limit = ko.observable(6);
ag.data = ko.observableArray([]);
ag.optionSeries = ko.observableArray([{ _id: 'PL8A|value', name: 'Net Sales' }, { _id: 'PL8A|percentage', name: 'Net Sales Percent' }, { _id: 'PL44B|value', name: 'EBIT' }, { _id: 'PL44B|percentage', name: 'EBIT Percent' }]);
ag.panelNote = ko.observable('&nbsp;');

ag.refresh = function () {
	var param = {};
	param.pls = [ag.series1PL().split('|')[0], ag.series2PL().split('|')[0]];
	param.groups = rpt.parseGroups([ag.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()));

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				ag.contentIsLoading(false);
				return;
			}

			ag.contentIsLoading(false);
			ag.data(res.Data.Data);
			ag.panelNote("Growth <span class='color-red'>FY 2014-2015</span> to <span class='color-green'>FY 2014-2015</span>");
			ag.render();
		}, function () {
			ag.contentIsLoading(false);
		});
	};

	ag.contentIsLoading(true);
	fetch();
};

ag.render = function () {
	var series1PL = ag.series1PL().split('|')[0];
	var series1Type = ag.series1PL().split('|')[1];
	var series2PL = ag.series2PL().split('|')[0];
	var series2Type = ag.series2PL().split('|')[1];

	var billion = 1000000000;
	var op1 = _.groupBy(ag.data(), function (d) {
		return d._id["_id_" + toolkit.replace(ag.breakdownBy(), '.', '_')];
	});
	var op2 = _.map(op1, function (v, k) {
		v = _.orderBy(v, function (e) {
			return e._id._id_date_fiscal;
		}, 'asc');

		var o = {};
		o.breakdown = k;
		o.series1 = 0;
		o.series2 = 0;

		toolkit.try(function () {
			if (series1Type == 'percentage') {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / v[0][series1PL] * 100;
			} else {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / billion;
			}
		});

		toolkit.try(function () {
			if (series2Type == 'percentage') {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / v[0][series2PL] * 100;
			} else {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / billion;
			}
		});

		return o;
	});
	var op3 = _.orderBy(op2, function (d) {
		var hack = parseInt('10 000 000 000 000'.replace(/\ /g, ''), 10);

		if (ag.breakdownBy() == 'customer.channelname') {
			var order = ag.getChannelOrderByChannelName(d.breakdown);
			if (order > -1) {
				return hack - order;
			}
		} else if (ag.breakdownBy() == 'product.brand') {
			var _order = ag.getBrandOrderByBrand(d.breakdown);
			if (_order > -1) {
				return hack - _order;
			}
		}

		return d.series1;
	}, 'desc');
	var op4 = _.take(op3, ag.limit());

	var width = $('#tab1').width();
	if (_.min([ag.limit(), op4.length]) > 6) {
		width = 160 * ag.limit();
	}
	if (width == $('#tab1').width()) {
		width = width - 22 + "px";
	}

	var series = [{
		field: 'series1',
		name: function () {
			var row = ag.optionSeries().find(function (d) {
				return d._id == ag.series1PL();
			});
			if (row != undefined) {
				return row.name;
			}

			return '&nbsp;';
		}(),
		axis: series1Type,
		color: toolkit.seriesColorsGodrej[0]
	}, {
		field: 'series2',
		name: function () {
			var row = ag.optionSeries().find(function (d) {
				return d._id == ag.series2PL();
			});
			if (row != undefined) {
				return row.name;
			}

			return '&nbsp;';
		}(),
		axis: series2Type,
		color: toolkit.seriesColorsGodrej[2]
	}];

	var axes = [{
		name: series1Type,
		majorGridLines: { color: '#fafafa' },
		labels: {
			font: '"Source Sans Pro" 11px',
			format: "{0:n2}"
		}
	}];

	var categoryAxis = {
		field: 'breakdown',
		labels: {
			font: '"Source Sans Pro" 11px',
			format: "{0:n2}"
		},
		majorGridLines: { color: '#fafafa' }
	};

	if (series1Type != series2Type) {
		axes.push({
			name: series2Type,
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}"
			}
		});
	}

	if (axes.length > 1) {
		categoryAxis.axisCrossingValue = [0, op4.length];

		axes.forEach(function (d, i) {
			var s = toolkit.seriesColorsGodrej;
			d.color = [s[0], s[2]][i];

			var orig = _.max(op4.map(function (f) {
				return Math.abs(f["series" + (i + 1)]);
			}));
			var max = Math.pow(10, String(parseInt(orig, 10)).length - 1) * (parseInt(String(parseInt(orig, 10))[0], 10) + 1);

			d.min = max * -1;
			d.max = max;

			var seriesType = i == 0 ? series1Type : series2Type;
			if (seriesType == 'percentage') {
				d.labels.format = "{0:n1} %";
			} else {
				d.labels.format = "{0:n1} B";
			}
		});
	} else {
		var max = _.max(op4.map(function (e) {
			return _.max([e.series1, e.series2]);
		}));
		var min = _.min(op4.map(function (e) {
			return _.min([e.series1, e.series2]);
		}));
		axes[0].max = toolkit.hardCeil(max);
		// axes[0].min = toolkit.hardFloor(min)
	}

	series.forEach(function (d, i) {
		var seriesType = i == 0 ? series1Type : series2Type;

		d.tooltip = {
			visible: true,
			template: function template(e) {
				var value = kendo.toString(e.value, 'n1') + " B";

				var seriesType = i == 0 ? series1Type : series2Type;
				if (seriesType == 'percentage') {
					value = kendo.toString(e.value, 'n1') + " %";
				}

				return d.name + ": " + value + "<br />Click to show detail";
			}
		};

		d.labels = {
			visible: true
		};

		if (seriesType == 'percentage') {
			d.labels.template = function (g) {
				return g.series.name + "\n" + kendo.toString(g.value, 'n1') + " %";
			};
		} else {
			d.labels.template = function (g) {
				return g.series.name + "\n" + kendo.toString(g.value, 'n1') + " B";
			};
		}
	});

	var config = {
		dataSource: { data: op4 },
		legend: {
			visible: true,
			position: "bottom"
		},
		seriesDefaults: {
			type: "column",
			style: "smooth",
			missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			},
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		valueAxis: axes,
		categoryAxis: categoryAxis,
		seriesClick: ag.seriesClick
	};

	$('.annually-diff').replaceWith("<div class=\"annually-diff\" style=\"width: " + width + "px;\"></div>");
	$('.annually-diff').kendoChart(config);
	$('.annually-diff').data('kendoChart').bind('seriesClick', function (e) {
		if (ag.breakdownBy() == 'customer.channelname') {
			var channelMap = {
				"Modern Trade": "I3",
				"General Trade": "I2",
				"Regional Distributor": "I1",
				"Industrial": "I4",
				"Motorist": "I6",
				"Export": "EXP"
			};

			ag.selectedData([channelMap[e.category]]);
		} else {
			ag.selectedData([e.category]);
		}

		ag.modalDetailTitle("Detail of " + e.category);
		ag.showDetailAs('value');
		ag.showDetail();
	});
};

ag.popupIsLoading = ko.observable(false);
ag.modalDetailTitle = ko.observable('Detail Growth');
ag.detailPNL = ko.observableArray([{ plcode: 'PL8A', plname: 'Net Sales' }, { plcode: 'PL44B', plname: 'EBIT' }, { plcode: 'PL74B', sub: true, plname: 'Cost of Goods Sold' }, { plcode: 'PL32B', sub: true, plname: 'Selling Expenses' }, { plcode: 'PL94A', sub: true, plname: 'G&A Expenses' }]);
ag.showDetailAs = ko.observable('value');
ag.optionShowDetailAs = ko.observableArray([{ _id: 'percentage', name: 'Percentage' }, { _id: 'value', name: 'Value' }]);
ag.selectedData = ko.observableArray([]);

ag.showDetail = function () {
	ag.doRefreshDetail(true);
};

ag.refreshDetail = function () {
	ag.doRefreshDetail(false);
};

ag.doRefreshDetail = function () {
	var withModal = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = ag.detailPNL().map(function (d) {
		return d.plcode;
	});
	param.groups = rpt.parseGroups([ag.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()));
	param.filters.push({
		Field: ag.breakdownBy(),
		Op: '$in',
		Value: ag.selectedData()
	});

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				ag.popupIsLoading(false);
				if (withModal) {
					$('#modal-detail-annual-diff').modal('hide');
				}
				return;
			}

			ag.popupIsLoading(false);
			if (withModal) {
				toolkit.runAfter(function () {
					ag.renderDetail(res.Data.Data);
				}, 300);
			} else {
				ag.renderDetail(res.Data.Data);
			}
		}, function () {
			ag.popupIsLoading(false);
			if (withModal) {
				$('#modal-detail-annual-diff').modal('hide');
			}
		});
	};

	ag.popupIsLoading(true);
	if (withModal) {
		$('#modal-detail-annual-diff').modal('show');
	}

	$('.chart-detail-annual-diff').empty();
	fetch();
};

ag.renderDetail = function (data) {
	var billion = 1000000000;

	var values = [];
	var op1 = _.groupBy(data, function (d) {
		return d._id["_id_" + toolkit.replace(ag.breakdownBy(), '.', '_')];
	});
	var op2 = _.map(op1, function (v, k) {
		var op3 = _.orderBy(v, function (d) {
			return d._id._id_date_fiscal;
		}, 'asc');
		var o = {};
		o.breakdown = k;

		ag.detailPNL().forEach(function (d) {
			o[d.plcode] = 0;

			toolkit.try(function () {
				if (ag.showDetailAs() == 'value') {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / billion;
				} else {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / op3[0][d.plcode] * 100;
				}

				o[d.plcode] = toolkit.number(o[d.plcode]);
				values.push(o[d.plcode]);
			});
		});

		return o;
	});

	var series = ag.detailPNL()
	// .filter((d) => d.sub == true)
	.map(function (d) {
		return {
			name: d.plname,
			field: d.plcode,
			tooltip: {
				visible: true,
				template: function template(e) {
					var suffix = ag.showDetailAs() == 'value' ? 'B' : '%';
					return e.series.name + ": " + kendo.toString(e.value, 'n1') + " " + suffix;
				}
			},
			labels: {
				visible: true,
				template: function template(e) {
					var suffix = ag.showDetailAs() == 'value' ? 'B' : '%';
					return e.series.name + "\n" + kendo.toString(e.value, 'n1') + " " + suffix;
				}
			},
			color: function color(e) {
				return e.value < 0 ? '#e7505a' : '#74B841';
			}
		};
	});

	var max = toolkit.increaseXPercent(toolkit.hardCeil(_.max(values)), 10);
	var min = toolkit.increaseXPercent(toolkit.hardFloor(_.min(values)), 5);

	var config = {
		dataSource: { data: op2 },
		legend: {
			visible: false,
			position: "bottom"
		},
		seriesDefaults: {
			type: "column",
			style: "smooth",
			missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			},
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		valueAxis: {
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}"
			},
			min: min,
			max: max
		},
		categoryAxis: {
			field: 'breakdown',
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}",
				padding: {
					bottom: 40
				}
			},
			majorGridLines: { color: '#fafafa' }
		}
	};

	console.log('---- data', data);
	console.log('---- op2', op2);
	console.log('---- config', config);

	$('.chart-detail-annual-diff').replaceWith("<div class=\"chart-detail-annual-diff\" style=\"height: 300px;\"></div>");
	$('.chart-detail-annual-diff').kendoChart(config);
};

ag.getChannelOrderByChannelName = function (channelname) {
	// MT, GT, RD, INDUSTRIAL, MOTORIST, EXPORT
	switch (channelname.toLowerCase()) {
		case 'modern trade':case 'mt':
			return 0;break;
		case 'general trade':case 'gt':
			return 1;break;
		case 'regional distributor':case 'rd':
			return 2;break;
		case 'industrial trade':case 'industrial':case 'it':
			return 3;break;
		case 'motorist':
			return 4;break;
		case 'export':
			return 5;break;
	}

	return -1;
};

ag.getBrandOrderByBrand = function (brandname) {
	// HIT, STELLA, MITU, other
	switch (brandname.toLowerCase()) {
		case 'hit':
			return 0;break;
		case 'stella':
			return 1;break;
		case 'mitu':
			return 2;break;
	}

	return -1;
};

viewModel.quarterGrowth = new Object();
var qg = viewModel.quarterGrowth;

qg.contentIsLoading = ko.observable(false);
qg.breakdownBy = ko.observable('customer.channelname');
qg.series1PL = ko.observable('PL8A|value');
qg.series2PL = ko.observable('PL44B|value');
qg.limit = ko.observable(6);
qg.data = ko.observableArray([]);
qg.optionQuarters = ko.observableArray(["2014-2015 Q1", "2014-2015 Q2", "2014-2015 Q3", "2014-2015 Q4", "2015-2016 Q1", "2015-2016 Q2", "2015-2016 Q3", "2015-2016 Q4"]);
qg.quarter1 = ko.observable('2014-2015 Q1');
qg.quarter2 = ko.observable('2014-2015 Q2');
qg.panelNote = ko.observable('&nbsp;');

qg.refresh = function () {
	var param = {};
	param.pls = [qg.series1PL().split('|')[0], qg.series2PL().split('|')[0]];
	param.groups = rpt.parseGroups([qg.breakdownBy(), 'date.quartertxt']);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()));

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				qg.contentIsLoading(false);
				return;
			}

			qg.contentIsLoading(false);
			qg.data(res.Data.Data);
			qg.panelNote("Growth <span class='color-red'>" + qg.quarter1() + "</span> to <span class='color-green'>" + qg.quarter2() + "</span>");
			qg.render();
		}, function () {
			qg.contentIsLoading(false);
		});
	};

	qg.contentIsLoading(true);
	fetch();
};

qg.render = function () {
	var series1PL = qg.series1PL().split('|')[0];
	var series1Type = qg.series1PL().split('|')[1];
	var series2PL = qg.series2PL().split('|')[0];
	var series2Type = qg.series2PL().split('|')[1];

	var billion = 1000000000;
	var quarters = [qg.quarter1(), qg.quarter2()];
	var op0 = _.filter(qg.data(), function (d) {
		return quarters.indexOf(d._id._id_date_quartertxt) > -1;
	});
	var op1 = _.groupBy(op0, function (d) {
		return d._id["_id_" + toolkit.replace(qg.breakdownBy(), '.', '_')];
	});
	var op2 = _.map(op1, function (v, k) {
		v = _.orderBy(v, function (e) {
			return quarters.indexOf(e._id._id_date_quartertxt);
		}, 'asc');

		console.log('----v', v);

		var o = {};
		o.breakdown = k;
		o.series1 = 0;
		o.series2 = 0;

		toolkit.try(function () {
			if (series1Type == 'percentage') {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / v[0][series1PL] * 100;
			} else {
				o.series1 = (v[1][series1PL] - v[0][series1PL]) / billion;
			}
		});

		toolkit.try(function () {
			if (series2Type == 'percentage') {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / v[0][series2PL] * 100;
			} else {
				o.series2 = (v[1][series2PL] - v[0][series2PL]) / billion;
			}
		});

		return o;
	});
	var op3 = _.orderBy(op2, function (d) {
		var hack = parseInt('10 000 000 000 000'.replace(/\ /g, ''), 10);

		if (qg.breakdownBy() == 'customer.channelname') {
			var order = ag.getChannelOrderByChannelName(d.breakdown);
			if (order > -1) {
				return hack - order;
			}
		} else if (qg.breakdownBy() == 'product.brand') {
			var _order2 = ag.getBrandOrderByBrand(d.breakdown);
			if (_order2 > -1) {
				return hack - _order2;
			}
		}

		return d.series1;
	}, 'desc');
	var op4 = _.take(op3, qg.limit());

	var width = $('#tab1').width();
	if (_.min([qg.limit(), op4.length]) > 6) {
		width = 160 * qg.limit();
	}
	if (width == $('#tab1').width()) {
		width = width - 22 + "px";
	}

	var series = [{
		field: 'series1',
		name: function () {
			var row = ag.optionSeries().find(function (d) {
				return d._id == qg.series1PL();
			});
			if (row != undefined) {
				return row.name;
			}

			return '&nbsp;';
		}(),
		axis: series1Type,
		color: toolkit.seriesColorsGodrej[0]
	}, {
		field: 'series2',
		name: function () {
			var row = ag.optionSeries().find(function (d) {
				return d._id == qg.series2PL();
			});
			if (row != undefined) {
				return row.name;
			}

			return '&nbsp;';
		}(),
		axis: series2Type,
		color: toolkit.seriesColorsGodrej[2]
	}];

	var axes = [{
		name: series1Type,
		majorGridLines: { color: '#fafafa' },
		labels: {
			font: '"Source Sans Pro" 11px',
			format: "{0:n2}"
		}
	}];

	var categoryAxis = {
		field: 'breakdown',
		labels: {
			font: '"Source Sans Pro" 11px',
			format: "{0:n2}"
		},
		majorGridLines: { color: '#fafafa' }
	};

	if (series1Type != series2Type) {
		axes.push({
			name: series2Type,
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}"
			}
		});
	}

	if (axes.length > 1) {
		categoryAxis.axisCrossingValue = [0, op4.length];

		axes.forEach(function (d, i) {
			var s = toolkit.seriesColorsGodrej;
			d.color = [s[0], s[2]][i];

			var orig = _.max(op4.map(function (f) {
				return Math.abs(f["series" + (i + 1)]);
			}));
			var max = Math.pow(10, String(parseInt(orig, 10)).length - 1) * (parseInt(String(parseInt(orig, 10))[0], 10) + 1);

			d.min = max * -1;
			d.max = max;

			var seriesType = i == 0 ? series1Type : series2Type;
			if (seriesType == 'percentage') {
				d.labels.format = "{0:n1} %";
			} else {
				d.labels.format = "{0:n1} B";
			}
		});
	} else {
		var max = _.max(op4.map(function (e) {
			return _.max([e.series1, e.series2]);
		}));
		var min = _.min(op4.map(function (e) {
			return _.min([e.series1, e.series2]);
		}));
		axes[0].max = toolkit.hardCeil(max);
		// axes[0].min = toolkit.hardFloor(min)
	}

	series.forEach(function (d, i) {
		var seriesType = i == 0 ? series1Type : series2Type;

		d.tooltip = {
			visible: true,
			template: function template(e) {
				var value = kendo.toString(e.value, 'n1') + " B";

				var seriesType = i == 0 ? series1Type : series2Type;
				if (seriesType == 'percentage') {
					value = kendo.toString(e.value, 'n1') + " %";
				}

				return d.name + ": " + value + "<br />Click to show detail";
			}
		};

		d.labels = {
			visible: true
		};

		if (seriesType == 'percentage') {
			d.labels.template = function (g) {
				return g.series.name + "\n" + kendo.toString(g.value, 'n1') + " %";
			};
		} else {
			d.labels.template = function (g) {
				return g.series.name + "\n" + kendo.toString(g.value, 'n1') + " B";
			};
		}
	});

	var config = {
		dataSource: { data: op4 },
		legend: {
			visible: true,
			position: "bottom"
		},
		seriesDefaults: {
			type: "column",
			style: "smooth",
			missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			},
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		valueAxis: axes,
		categoryAxis: categoryAxis,
		seriesClick: qg.seriesClick
	};

	$('.quarterly-diff').replaceWith("<div class=\"quarterly-diff\" style=\"width: " + width + "px;\"></div>");
	$('.quarterly-diff').kendoChart(config);
	$('.quarterly-diff').data('kendoChart').bind('seriesClick', function (e) {
		if (qg.breakdownBy() == 'customer.channelname') {
			var channelMap = {
				"Modern Trade": "I3",
				"General Trade": "I2",
				"Regional Distributor": "I1",
				"Industrial": "I4",
				"Motorist": "I6",
				"Export": "EXP"
			};

			qg.selectedData([channelMap[e.category]]);
		} else {
			qg.selectedData([e.category]);
		}

		qg.modalDetailTitle("Detail of " + e.category);
		qg.showDetailAs('value');
		qg.showDetail();
	});
};

qg.popupIsLoading = ko.observable(false);
qg.modalDetailTitle = ko.observable('Detail Growth');
qg.showDetailAs = ko.observable('value');
qg.selectedData = ko.observableArray([]);

qg.showDetail = function () {
	qg.doRefreshDetail(true);
};

qg.refreshDetail = function () {
	qg.doRefreshDetail(false);
};

qg.doRefreshDetail = function () {
	var withModal = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = ag.detailPNL().map(function (d) {
		return d.plcode;
	});
	param.groups = rpt.parseGroups([qg.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(true, ko.observableArray(rpt.optionFiscalYears()));
	param.filters.push({
		Field: qg.breakdownBy(),
		Op: '$in',
		Value: qg.selectedData()
	});

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				qg.popupIsLoading(false);
				if (withModal) {
					$('#modal-detail-quarter-diff').modal('hide');
				}
				return;
			}

			qg.popupIsLoading(false);
			if (withModal) {
				toolkit.runAfter(function () {
					qg.renderDetail(res.Data.Data);
				}, 300);
			} else {
				qg.renderDetail(res.Data.Data);
			}
		}, function () {
			qg.popupIsLoading(false);
			if (withModal) {
				$('#modal-detail-quarter-diff').modal('hide');
			}
		});
	};

	qg.popupIsLoading(true);
	if (withModal) {
		$('#modal-detail-quarter-diff').modal('show');
	}

	$('.chart-detail-quarter-diff').empty();
	fetch();
};

qg.renderDetail = function (data) {
	var billion = 1000000000;

	var values = [];
	var op1 = _.groupBy(data, function (d) {
		return d._id["_id_" + toolkit.replace(qg.breakdownBy(), '.', '_')];
	});
	var op2 = _.map(op1, function (v, k) {
		var op3 = _.orderBy(v, function (d) {
			return d._id._id_date_fiscal;
		}, 'asc');
		var o = {};
		o.breakdown = k;

		ag.detailPNL().forEach(function (d) {
			o[d.plcode] = 0;

			toolkit.try(function () {
				if (qg.showDetailAs() == 'value') {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / billion;
				} else {
					o[d.plcode] = (op3[1][d.plcode] - op3[0][d.plcode]) / op3[0][d.plcode] * 100;
				}

				o[d.plcode] = toolkit.number(o[d.plcode]);
				values.push(o[d.plcode]);
			});
		});

		return o;
	});

	var series = ag.detailPNL()
	// .filter((d) => d.sub == true)
	.map(function (d) {
		return {
			name: d.plname,
			field: d.plcode,
			tooltip: {
				visible: true,
				template: function template(e) {
					var suffix = qg.showDetailAs() == 'value' ? 'B' : '%';
					return e.series.name + ": " + kendo.toString(e.value, 'n1') + " " + suffix;
				}
			},
			labels: {
				visible: true,
				template: function template(e) {
					var suffix = qg.showDetailAs() == 'value' ? 'B' : '%';
					return e.series.name + "\n" + kendo.toString(e.value, 'n1') + " " + suffix;
				}
			},
			color: function color(e) {
				return e.value < 0 ? '#e7505a' : '#74B841';
			}
		};
	});

	var max = toolkit.increaseXPercent(toolkit.hardCeil(_.max(values)), 10);
	var min = toolkit.increaseXPercent(toolkit.hardFloor(_.min(values)), 5);

	var config = {
		dataSource: { data: op2 },
		legend: {
			visible: false,
			position: "bottom"
		},
		seriesDefaults: {
			type: "column",
			style: "smooth",
			missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			},
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		valueAxis: {
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}"
			},
			min: min,
			max: max
		},
		categoryAxis: {
			field: 'breakdown',
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}",
				padding: {
					bottom: 40
				}
			},
			majorGridLines: { color: '#fafafa' }
		}
	};

	console.log('---- data', data);
	console.log('---- op2', op2);
	console.log('---- config', config);

	$('.chart-detail-quarter-diff').replaceWith("<div class=\"chart-detail-quarter-diff\" style=\"height: 300px;\"></div>");
	$('.chart-detail-quarter-diff').kendoChart(config);
};

vm.currentMenu('Analysis');
vm.currentTitle('&nbsp;');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: 'Growth Analysis', href: '#' }]);

$(function () {
	$('#modal-detail-annual-diff').appendTo($('body'));
	$('#modal-detail-quarter-diff').appendTo($('body'));
	grw.refresh();
	ag.refresh();
	qg.refresh();
});