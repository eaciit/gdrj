'use strict';

// let plcodes = [
// 	{ plcodes: ["PL1", "PL2", "PL3", "PL4", "PL5", "PL6"], title: 'Gross Sales' },
// 	// growth
// 	{ plcodes: ["PL7", "PL8"], title: 'Sales Discount' },
// 	// ATL
// 	// BTL
// 	{ plcode: "PL74B", title: "COGS" },
// 	{ plcode: "PL74C", title: "Gross Margin" },
// 	{ plcode: "PL94A", title: "SGNA" },
// 	{ plcode: "PL26", title: "Royalties" }
// 	{ plcode: "PL44B", title: "EBIT" },
// 	{ plcode: "PL44C", title: "EBITDA" },

// 	{ plcode: "PL74C", title: "GM" },
// 	{ plcode: "PL74B", title: "COGS" },
// 	{ plcode: "PL44B", title: "EBIT" },
// 	{ plcode: "PL44C", title: "EBITDA" },
// 	{ plcode: "PL8A", title: "Net Sales" },

// ]

vm.currentMenu('Dashboard');
vm.currentTitle("Dashboard");
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Dashboard', href: '/report/dashboard' }]);

viewModel.dashboard = {};
var dsbrd = viewModel.dashboard;

dsbrd.rows = ko.observableArray([{ pnl: 'Gross Sales', plcodes: ["PL1", "PL2", "PL3", "PL4", "PL5", "PL6"] }, { pnl: 'Growth', plcodes: [] }, // NOT YET
{ pnl: 'Sales Discount', plcodes: ["PL7", "PL8"] }, { pnl: 'ATL', plcodes: ["PL28"] }, { pnl: 'BTL', plcodes: ["PL29", "PL30", "PL31", "PL32"] }, { pnl: "COGS", plcodes: ["PL74B"] }, { pnl: "Gross Margin", plcodes: ["PL74C"] }, { pnl: "SGA", plcodes: ["PL94A"] }, { pnl: "Royalties", plcodes: ["PL26"] }, { pnl: "EBITDA", plcodes: ["PL44C"] }, { pnl: "EBIT %", plcodes: [] }, { pnl: "EBIT", plcodes: ["PL44B"] }]);

dsbrd.data = ko.observableArray([]);
dsbrd.columns = ko.observableArray([]);
dsbrd.breakdown = ko.observable('customer.channelname');
dsbrd.fiscalYear = ko.observable(2014);
dsbrd.contentIsLoading = ko.observable(false);

dsbrd.refresh = function () {
	var param = {};
	param.pls = _.flatten(dsbrd.rows().map(function (d) {
		return d.plcodes;
	}));
	param.groups = [dsbrd.breakdown()];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	var fetch = function fetch() {
		toolkit.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					return fetch;
				}, 1000 * 5);
				return;
			}

			dsbrd.contentIsLoading(false);
			dsbrd.render(res);
		}, function () {
			dsbrd.contentIsLoading(false);
		});
	};

	dsbrd.contentIsLoading(true);
	fetch();
};

dsbrd.render = function (res) {
	var rows = toolkit.clone(dsbrd.rows());
	var columns = [{ field: 'pnl', title: 'PNL', attributes: { class: 'bold' } }];

	var data = _.sortBy(res.Data.Data, function (d) {
		return toolkit.redefine(d._id['_id_' + toolkit.replace(dsbrd.breakdown(), '.', '_')], 'Other');
	});

	rows.forEach(function (d) {
		data.forEach(function (e, i) {
			var field = e._id['_id_' + toolkit.replace(dsbrd.breakdown(), '.', '_')];
			var key = 'field' + i;
			d[key] = toolkit.sum(d.plcodes, function (f) {
				return e[f];
			});

			if (d.pnl == 'EBIT %') {
				var grossSales = rows.find(function (f) {
					return f.pnl == 'Gross Sales';
				});
				var grossSalesValue = toolkit.sum(grossSales.plcodes, function (f) {
					return e[f];
				});

				var ebit = rows.find(function (f) {
					return f.pnl == 'EBIT';
				});
				var ebitValue = toolkit.sum(ebit.plcodes, function (f) {
					return e[f];
				});

				console.log(field, grossSalesValue / ebitValue, kendo.toString(grossSalesValue / ebitValue, 'n2') + ' %');
				d[key] = kendo.toString(toolkit.number(grossSalesValue / ebitValue), 'n2') + ' %';
			}

			if (toolkit.isDefined(columns.find(function (f) {
				return f.field == key;
			}))) {
				return;
			}

			columns.push({
				field: key,
				title: toolkit.redefine(field, 'Other'),
				format: '{0:n0}',
				attributes: { class: 'align-right' },
				headerAttributes: {
					style: 'text-align: right !important;',
					class: 'bold tooltipster',
					title: 'Click to sort'
				}
			});
		});
	});

	dsbrd.data(rows);
	dsbrd.columns(columns);

	if (columns.length > 5) {
		columns.forEach(function (d, i) {
			if (i == 0) {
				d.width = 200;
				d.locked = true;
				return;
			}

			d.width = 150;
		});
	}

	var fields = {};

	if (dsbrd.data().length > 0) {
		var target = dsbrd.data()[0];
		for (var key in target) {
			if (target.hasOwnProperty(key) && ['pnl', 'plcodes'].indexOf(key) == -1) {
				fields[key] = { type: 'number' };
			}
		}
	}

	var config = {
		dataSource: {
			data: dsbrd.data(),
			schema: {
				model: {
					// fields: fields
				}
			}
		},
		columns: dsbrd.columns(),
		resizabl: false,
		sortable: false,
		pageable: false,
		filterable: false
	};

	$('.grid-dashboard').replaceWith('<div class="grid-dashboard"></div>');
	$('.grid-dashboard').kendoGrid(config);
};

viewModel.dashboardRanking = {};
var rank = viewModel.dashboardRanking;

rank.breakdown = ko.observable('customer.channelname');
rank.columns = ko.observableArray([{ field: 'pnl', title: 'PNL', attributes: { class: 'bold' } }, { field: 'gmPercentage', title: 'GM %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' }, { field: 'cogsPercentage', title: 'COGS %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' }, { field: 'ebitPercentage', title: 'EBIT %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' }, { field: 'ebitdaPercentage', title: 'EBITDA %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' }, { field: 'netSales', title: 'Net Sales', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n0}' }, { field: 'ebit', title: 'EBIT', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n0}' }]);
rank.contentIsLoading = ko.observable(false);
rank.data = ko.observableArray([]);

rank.refresh = function () {
	var param = {};
	param.pls = ["PL74C", "PL74B", "PL44B", "PL44C", "PL8A"];
	param.groups = [rank.breakdown()];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	var fetch = function fetch() {
		toolkit.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					return fetch;
				}, 1000 * 5);
				return;
			}

			rank.contentIsLoading(false);
			rank.render(res);
		}, function () {
			rank.contentIsLoading(false);
		});
	};

	rank.contentIsLoading(true);
	fetch();
};

rank.render = function (res) {
	var data = _.sortBy(res.Data.Data, function (d) {
		return toolkit.redefine(d._id['_id_' + toolkit.replace(dsbrd.breakdown(), '.', '_')], 'Other');
	});

	var rows = [];
	data.forEach(function (d) {
		var row = {};
		row.pnl = d._id['_id_' + toolkit.replace(rank.breakdown(), '.', '_')];
		if ($.trim(row.pnl) == '') {
			row.pnl = 'Other';
		}
		row.gmPercentage = d.PL74C / d.PL8A;
		row.cogsPercentage = d.PL74B / d.PL8A;
		row.ebitPercentage = d.PL44B / d.PL8A;
		row.ebitdaPercentage = d.PL44C / d.PL8A;
		row.netSales = d.PL8A;
		row.ebit = d.PL44B;
		rows.push(row);
	});

	rank.data(rows);

	var config = {
		dataSource: {
			data: rank.data(),
			pageSize: 10
		},
		columns: rank.columns(),
		resizabl: false,
		sortable: true,
		pageable: true,
		filterable: false,
		dataBound: app.gridBoundTooltipster('.grid-ranking')
	};

	$('.grid-ranking').replaceWith('<div class="grid-ranking sortable"></div>');
	$('.grid-ranking').kendoGrid(config);
};

viewModel.salesDistribution = {};
var sd = viewModel.salesDistribution;
sd.contentIsLoading = ko.observable(false);

sd.breakdown = ko.observable('customer.channelname');
sd.data = ko.observableArray([]);
sd.render = function (res) {
	var data = _.sortBy(res.Data.Data, function (d) {
		return toolkit.redefine(d._id['_id_' + toolkit.replace(dsbrd.breakdown(), '.', '_')], 'Other');
	});

	var breakdown = toolkit.replace(sd.breakdown(), ".", "_");
	var total = toolkit.sum(data, function (d) {
		return d.PL8A;
	});

	var rows = data.map(function (d) {
		var row = {};
		row[breakdown] = d._id['_id_' + breakdown];
		row.group = '';
		row.percentage = d.PL8A / total * 100;
		row.value = d.PL8A;
		return row;
	});
	sd.data(rows);

	var op1 = _.groupBy(sd.data(), function (d) {
		return d[breakdown];
	});
	var op2 = _.map(op1, function (v, k) {
		return { key: k, values: v };
	});
	var maxRow = _.maxBy(op2, function (d) {
		return d.values.length;
	});
	var maxRowIndex = op2.indexOf(maxRow);
	var height = 20 * maxRow.values.length;
	var width = 200;

	var container = $('.grid-sales-dist').empty();
	var table = toolkit.newEl('table').addClass('width-full').appendTo(container).height(height);
	var tr1st = toolkit.newEl('tr').appendTo(table);
	var tr2nd = toolkit.newEl('tr').appendTo(table);

	if (op2.length > 5) {
		table.width(op2.length * width);
	}

	op2.forEach(function (d) {
		var td1st = toolkit.newEl('td').appendTo(tr1st).width(width);
		var sumPercentage = _.sumBy(d.values, function (e) {
			return e.percentage;
		});
		td1st.html(d.key + '<br />' + kendo.toString(sumPercentage, 'n2') + ' %');

		var td2nd = toolkit.newEl('td').appendTo(tr2nd);

		var innerTable = toolkit.newEl('table').appendTo(td2nd);

		if (d.values.length == 1) {
			var tr = toolkit.newEl('tr').appendTo(innerTable);
			toolkit.newEl('td').appendTo(tr).html(kendo.toString(d.values[0].value, 'n0')).height(height).addClass('single');
			return;
		}

		d.values.forEach(function (e) {
			var tr = toolkit.newEl('tr').appendTo(innerTable);
			toolkit.newEl('td').appendTo(tr).html(e[breakdown]).height(height / d.values.length);
			toolkit.newEl('td').appendTo(tr).html(kendo.toString(e.percentage, 'n2') + ' %');
			toolkit.newEl('td').appendTo(tr).html(kendo.toString(e.value, 'n0'));
		});
	});

	var trTotal = toolkit.newEl('tr').appendTo(table);
	var tdTotal = toolkit.newEl('td').addClass('align-center total').attr('colspan', op2.length).appendTo(trTotal).html(kendo.toString(total, 'n0'));
};
sd.refresh = function () {
	var param = {};
	param.pls = ["PL8A"];
	param.groups = [sd.breakdown()];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	var fetch = function fetch() {
		toolkit.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					return fetch;
				}, 1000 * 5);
				return;
			}

			sd.contentIsLoading(false);
			sd.render(res);
		}, function () {
			sd.contentIsLoading(false);
		});
	};

	sd.contentIsLoading(true);
	fetch();
};

$(function () {
	dsbrd.refresh();
	rank.refresh();
	sd.refresh();
});