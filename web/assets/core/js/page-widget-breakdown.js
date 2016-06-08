'use strict';

viewModel.breakdown = new Object();
var bkd = viewModel.breakdown;

app.log("ANGKA DI PIVOT CLICKABLE, JIKA SALES MAKA AMBIL DARI LEDGER TRANSACTION, SELAINNYA DARI LEDGER SUMMARY");

bkd.contentIsLoading = ko.observable(false);
bkd.title = ko.observable('Grid Analysis Ideas');
bkd.data = ko.observableArray([]);
bkd.detail = ko.observableArray([]);
bkd.getParam = function () {
	var orderIndex = { field: 'plmodel.orderindex', name: 'Order' };

	var breakdown = rpt.optionDimensions().find(function (d) {
		return d.field == bkd.breakdownBy();
	});
	var dimensions = bkd.dimensions().concat([breakdown, orderIndex]);
	var dataPoints = bkd.dataPoints();
	return rpt.wrapParam(dimensions, dataPoints);
};
bkd.refresh = function () {
	var param = $.extend(true, bkd.getParam(), {
		breakdownBy: bkd.breakdownBy()
	});
	// bkd.data(DATATEMP_BREAKDOWN)
	bkd.contentIsLoading(true);
	app.ajaxPost("/report/summarycalculatedatapivot", param, function (res) {
		var data = _.sortBy(res.Data, function (o, v) {
			return parseInt(o.plmodel_orderindex.replace(/PL/g, ""));
		});
		bkd.data(data);
		bkd.emptyGrid();
		bkd.contentIsLoading(false);
		bkd.render();
		window.data = res.Data;
	}, function () {
		bkd.emptyGrid();
		bkd.contentIsLoading(false);
	});
};
bkd.refreshOnChange = function () {
	// setTimeout(bkd.refresh, 100)
};
bkd.breakdownBy = ko.observable('customer.channelname');
bkd.dimensions = ko.observableArray([{ field: 'plmodel.plheader1', name: ' ' }, { field: 'plmodel.plheader2', name: ' ' }, { field: 'plmodel.plheader3', name: ' ' }]);
bkd.dataPoints = ko.observableArray([{ field: "value1", name: "value1", aggr: "sum" }]);
bkd.clickCell = function (o) {
	var x = $(o).closest("td").index();
	var y = $(o).closest("tr").index();
	// let cat = $(`.breakdown-view .k-grid-header-wrap table tr:eq(1) th:eq(${x}) span`).html()
	// let plheader1 = $(`.breakdown-view .k-grid.k-widget:eq(0) tr:eq(${y}) td:not(.k-first):first > span`).html()

	var pivot = $('.breakdown-view').data('kendoPivotGrid');
	var cellInfo = pivot.cellInfo(x, y);
	var param = bkd.getParam();
	param.plheader1 = '';
	param.plheader2 = '';
	param.plheader3 = '';
	param.filters.push({
		Field: bkd.breakdownBy(),
		Op: "$eq",
		Value: app.htmlDecode(cellInfo.columnTuple.members[0].caption)
	});

	cellInfo.rowTuple.members.forEach(function (d) {
		if (d.parentName == undefined) {
			return;
		}

		var key = d.parentName.split('_').reverse()[0];
		var value = app.htmlDecode(d.name.replace(d.parentName + '&', ''));
		param[key] = value;
	});

	app.ajaxPost('/report/GetLedgerSummaryDetail', param, function (res) {
		var detail = res.Data.map(function (d) {
			return {
				ID: d.ID,
				CostCenter: d.CC.Name,
				Customer: d.Customer.Name,
				Channel: d.Customer.ChannelName,
				Branch: d.Customer.BranchName,
				Brand: d.Product.Brand,
				Product: d.Product.Name,
				Year: d.Year,
				Amount: d.Value1
			};
		});

		bkd.detail(detail);
		bkd.renderDetail();
	});
};
bkd.renderDetail = function () {
	$('#modal-detail-ledger-summary').appendTo($('body'));
	$('#modal-detail-ledger-summary').modal('show');

	var columns = [{ field: 'Year', width: 60, locked: true, footerTemplate: 'Total :' }, { field: 'Amount', width: 80, locked: true, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n0')#</div>", format: '{0:nc0}', attributes: { class: 'align-right' } }, { field: 'CostCenter', title: 'Cost Center', width: 250 }, { field: 'Customer', width: 250 }, { field: 'Channel', width: 150 }, { field: 'Branch', width: 120 }, { field: 'Brand', width: 100 }, { field: 'Product', width: 250 }];
	var config = {
		dataSource: {
			data: bkd.detail(),
			pageSize: 5,
			aggregate: [{ field: "Amount", aggregate: "sum" }]
		},
		columns: columns,
		pageable: true,
		resizable: false,
		sortable: true
	};

	setTimeout(function () {
		$('.grid-detail').replaceWith('<div class="grid-detail"></div>');
		$('.grid-detail').kendoGrid(config);
	}, 300);
};
bkd.emptyGrid = function () {
	$('.breakdown-view').replaceWith('<div class="breakdown-view ez"></div>');
};
bkd.render = function () {
	var data = bkd.data();
	var schemaModelFields = {};
	var schemaCubeDimensions = {};
	var schemaCubeMeasures = {};
	var rows = [];
	var columns = [];
	var measures = [];
	var breakdown = rpt.optionDimensions().find(function (d) {
		return d.field == bkd.breakdownBy();
	});

	app.koUnmap(bkd.dimensions).concat([breakdown]).forEach(function (d, i) {
		var field = app.idAble(d.field);
		schemaModelFields[field] = { type: 'string' };
		schemaCubeDimensions[field] = { caption: d.name };

		if (field.indexOf('plheader') > -1) {
			rows.push({ name: field, expand: rows.length == 0 });
		} else {
			columns.push({ name: field, expand: true });
		}

		rows = rows.slice(0, 2);
	});

	app.koUnmap(bkd.dataPoints).forEach(function (d) {
		var measurement = 'Amount';
		var field = app.idAble(d.field);
		schemaModelFields[field] = { type: 'number' };
		schemaCubeMeasures[measurement] = { field: field, aggregate: 'sum', format: '{0:n2}' };
		measures.push(measurement);
	});

	bkd.emptyGrid();
	var wrapper = app.newEl('div').addClass('pivot-pnl').appendTo($('.breakdown-view'));
	var tableHeader = app.newEl('table').appendTo(wrapper).css({
		float: 'left',
		width: '200px'
	});

	var tableContent = app.newEl('table').appendTo(wrapper);

	var header = Lazy(data).groupBy(function (d) {
		return d[app.idAble(bkd.breakdownBy())];
	}).map(function (v, k) {
		return k;
	}).sortBy(function (k) {
		return k;
	}).toArray();

	var trTopHeader = app.newEl('tr').appendTo(tableHeader);

	var tdTopHead = app.newEl('th').appendTo(trTopHeader).html("P&L");

	var trTopBody = app.newEl('tr').appendTo(tableContent);

	header.forEach(function (d) {
		var tdTopBody = app.newEl('th').css('width', 150).css('text-align', 'right').html(d == '' ? 'No Name' : d).appendTo(trTopBody);
	});

	app.newEl('th').css('width', 150).css('text-align', 'right').html('Total').appendTo(trTopBody);

	var values = [];
	var i = 0;

	Lazy(data).groupBy(function (v) {
		return v.plmodel_plheader1;
	}).map(function (v, k) {
		return app.o({ key: k, data: v });
	}).each(function (d) {
		values[i] = [];
		var total = 0;

		var trHeader = app.newEl('tr').appendTo(tableHeader);

		var tdHead = app.newEl('td').appendTo(trHeader).html(d.key);

		var trBody = app.newEl('tr').appendTo(tableContent);

		var rowHeader1 = Lazy(d.data).groupBy(function (k) {
			return k[app.idAble(bkd.breakdownBy())];
		}).map(function (v, k) {
			return app.o({ key: k, data: v });
		}).toArray();

		var j = 0;
		header.forEach(function (d) {
			var val = Lazy(rowHeader1).filter(function (e) {
				return e.key == d;
			}).sum(function (e) {
				return Lazy(e.data).sum(function (e) {
					return e.value1;
				});
			});
			values[i][j] = val;
			total += val;

			if (j > 0) {

				var _tdEachCell = app.newEl('td').appendTo(trBody).html(kendo.toString(val, 'n0')).css('text-align', 'right').width(80);
			}

			var tdEachCell = app.newEl('td').appendTo(trBody).html(kendo.toString(val, 'n0')).css('text-align', 'right').width(80);

			j++;
		});

		app.newEl('td').appendTo(trBody).html(kendo.toString(total, 'n0')).css('text-align', 'right').width(80);

		i++;
	});

	console.log("=====", values);
};

$(function () {
	bkd.refresh();
});