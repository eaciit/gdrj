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
dsbrd.optionBreakdowns = ko.observableArray([{ field: "customer.areaname", name: "City" }, { field: "customer.region", name: "Region" }, { field: "customer.zone", name: "Zone" }, { field: "product.brand", name: "Brand" }, { field: "customer.branchname", name: "Branch" }]);
dsbrd.breakdown = ko.observable(dsbrd.optionBreakdowns()[4].field);
dsbrd.fiscalYear = ko.observable(2014);
dsbrd.contentIsLoading = ko.observable(false);
dsbrd.optionStructures = ko.observableArray([{ field: "date.fiscal", name: "Fiscal Year" }, { field: "date.quartertxt", name: "Quarter" }, { field: "date.month", name: "Month" }]);
dsbrd.structure = ko.observable(dsbrd.optionStructures()[1].field);
dsbrd.structureYear = ko.observable('date.year');
dsbrd.optionBreakdownValues = ko.observableArray([]);
dsbrd.breakdownValue = ko.observableArray([]);
dsbrd.changeBreakdown = function () {
	setTimeout(function () {
		switch (dsbrd.breakdown()) {
			case "customer.areaname":
				dsbrd.breakdownValue([]);
				dsbrd.optionBreakdownValues(rpt.masterData.Area());
				break;
			case "customer.region":
				dsbrd.breakdownValue([]);
				dsbrd.optionBreakdownValues(rpt.masterData.Region());
				break;
			case "customer.zone":
				dsbrd.breakdownValue([]);
				dsbrd.optionBreakdownValues(rpt.masterData.Zone());
				break;
			case "product.brand":
				dsbrd.breakdownValue([]);
				dsbrd.optionBreakdownValues(rpt.masterData.Brand());
				break;
			case "customer.branchname":
				dsbrd.breakdownValue([]);
				dsbrd.optionBreakdownValues(rpt.masterData.Branch());
				break;
		}
	});
};

dsbrd.refresh = function () {
	var param = {};
	param.pls = _.flatten(dsbrd.rows().map(function (d) {
		return d.plcodes;
	}));
	param.groups = [dsbrd.breakdown(), dsbrd.structure()];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	if (dsbrd.breakdownValue().length > 0) {
		param.filters.push({
			Field: dsbrd.breakdown(),
			Op: '$in',
			Value: dsbrd.breakdownValue()
		});
	}

	if (dsbrd.structure() == 'date.month') {
		param.groups.push(dsbrd.structureYear());
	}

	var fetch = function fetch() {
		toolkit.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
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
	var rows = [];
	var rowsAfter = [];
	var columns = [{
		field: 'pnl',
		title: 'PNL',
		attributes: { class: 'bold' },
		headerAttributes: { style: 'font-weight: bold; vertical-align: middle;' },
		locked: true,
		width: 200
	}];

	var data = res.Data.Data;

	dsbrd.rows().forEach(function (row, rowIndex) {
		row.columnData = [];
		data.forEach(function (column, columnIndex) {
			var columnAfter = {
				breakdownTitle: toolkit.redefine(column._id['_id_' + toolkit.replace(dsbrd.breakdown(), '.', '_')]),
				structureTitle: toolkit.redefine(column._id['_id_' + toolkit.replace(dsbrd.structure(), '.', '_')]),
				structureYearTitle: toolkit.redefine(column._id['_id_' + toolkit.replace(dsbrd.structureYear(), '.', '_')]),
				original: toolkit.sum(row.plcodes, function (plcode) {
					return toolkit.number(column[plcode]);
				}),
				value: toolkit.sum(row.plcodes, function (plcode) {
					return toolkit.number(column[plcode]);
				})
			};

			row.columnData.push(columnAfter);
		});

		rowsAfter.push(row);
	});

	if (rowsAfter.length > 0) {
		(function () {
			var grossSales = rowsAfter.find(function (d) {
				return d.pnl == 'Gross Sales';
			});
			var ebitPercentage = rowsAfter.find(function (d) {
				return d.pnl == 'EBIT %';
			});
			var ebit = rowsAfter.find(function (d) {
				return d.pnl == 'EBIT';
			});

			rowsAfter[0].columnData.forEach(function (column, i) {
				var percentage = kendo.toString(toolkit.number(grossSales.columnData[i].original / ebit.columnData[i].original), 'n2');
				ebitPercentage.columnData[i].value = percentage;
			});
		})();
	}

	var columnData = [];
	data.forEach(function (d, i) {
		var columnInfo = rowsAfter[0].columnData[i];

		var column = {};
		column.field = 'columnData[' + i + '].value';
		column.breakdown = $.trim(toolkit.redefine(columnInfo.breakdownTitle, 'Other'));
		column.title = $.trim(columnInfo.structureTitle);
		column.width = 150;
		column.format = '{0:n0}';
		column.attributes = { class: 'align-right' };
		column.headerAttributes = {
			style: 'text-align: center !important; font-weight: bold; border-right: 1px solid white; '
		};

		if (dsbrd.structure() == 'date.month') {
			column.titleYear = $.trim(columnInfo.structureYearTitle);
		}

		columnData.push(column);
	});

	var op1 = _.groupBy(columnData, function (d) {
		return d.breakdown;
	});
	var op2 = _.map(op1, function (v, k) {
		v.forEach(function (h) {
			h.month = h.title;
			h.year = h.titleYear;

			if (dsbrd.structure() == 'date.month') {
				var month = moment(new Date(2015, parseInt(h.title, 10) - 1, 1)).format('MMMM');
				h.title = month;

				if (rpt.value.FiscalYears().length > 1) {
					h.title = month + ' ' + h.titleYear;
				}
			}
		});

		return {
			title: k,
			columns: v,
			headerAttributes: {
				style: 'text-align: center !important; font-weight: bold; border: 1px solid white; border-top: none; border-left: none; box-sizing: border-box; background-color: #e9eced;'
			}
		};
	});
	var columnGrouped = _.sortBy(op2, function (d) {
		return d.title;
	});

	op2.forEach(function (d) {
		d.columns = _.sortBy(d.columns, function (e) {
			if (dsbrd.structure() == 'date.month') {
				var monthString = ('0' + e.month).split('').reverse().slice(0, 2).reverse().join('');

				if (rpt.value.FiscalYears().length > 1) {
					var yearMonthString = '' + e.year + monthString;
					return yearMonthString;
				}

				return monthString;
			}

			return e.title;
		});
	});

	dsbrd.data(rowsAfter);
	dsbrd.columns(columns.concat(columnGrouped));

	var config = {
		dataSource: {
			data: dsbrd.data()
		},
		columns: dsbrd.columns(),
		resizable: false,
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
					fetch();
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
	param.groups = [sd.breakdown(), 'customer.customergroupname'];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	var fetch = function fetch() {
		toolkit.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
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
	dsbrd.changeBreakdown();
	dsbrd.refresh();
	rank.refresh();
	sd.refresh();
});