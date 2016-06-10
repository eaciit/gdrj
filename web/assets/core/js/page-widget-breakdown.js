'use strict';

viewModel.breakdown = new Object();
var bkd = viewModel.breakdown;

bkd.contentIsLoading = ko.observable(false);
bkd.popupIsLoading = ko.observable(false);
bkd.title = ko.observable('P&L Analytic');
bkd.detail = ko.observableArray([]);
bkd.limit = ko.observable(10);
bkd.breakdownNote = ko.observable('');

bkd.data = ko.observableArray([]);
bkd.plmodels = ko.observableArray([]);

bkd.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.groups = [bkd.breakdownBy()];
	param.aggr = 'sum';
	param.filters = []; // rpt.getFilterValue()

	bkd.oldBreakdownBy(bkd.breakdownBy());
	bkd.contentIsLoading(true);

	app.ajaxPost("/report/getpnldata", param, function (res) {
		var date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss");
		bkd.breakdownNote('Last refreshed on: ' + date);

		bkd.data(res.Data.Data);
		bkd.plmodels(res.Data.PLModels);
		bkd.emptyGrid();
		bkd.contentIsLoading(false);
		bkd.render();
	}, function () {
		bkd.emptyGrid();
		bkd.contentIsLoading(false);
	}, {
		cache: useCache == true ? 'breakdown chart' : false
	});
};

bkd.breakdownBy = ko.observable('customer.channelname');
bkd.oldBreakdownBy = ko.observable(bkd.breakdownBy());

bkd.clickCell = function (plcode, breakdown) {
	// if (pnl == "Net Sales") {
	// 	bkd.renderDetailSalesTrans(breakdown)
	// 	return
	// }

	bkd.renderDetail(plcode, breakdown);
};
bkd.emptyGrid = function () {
	$('.breakdown-view').replaceWith('<div class="breakdown-view ez"></div>');
};

bkd.renderDetailSalesTrans = function (breakdown) {
	bkd.popupIsLoading(true);
	$('#modal-detail-ledger-summary').appendTo($('body'));
	$('#modal-detail-ledger-summary').modal('show');

	var columns = [
	// { field: '_id', title: 'ID', width: 100, locked: true },
	{ field: 'date', title: 'Date', width: 150, locked: true, template: function template(d) {
			return moment(d.date).format('DD/MM/YYYY HH:mm');
		} }, { field: "grossamount", headerTemplate: '<div class="align-right">Gross</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "discountamount", headerTemplate: '<div class="align-right">Discount</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "netamount", headerTemplate: '<div class="align-right">Net Sales</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "salesqty", headerTemplate: '<div class="align-right">Sales Qty</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "customer.branchname", title: 'Branch', width: 100 }, { field: "product.name", title: 'Product', width: 250 }, { field: "product.brand", title: 'Brand', width: 100 }];

	var config = {
		dataSource: {
			transport: {
				read: function read(options) {
					var param = options.data;
					param.tablename = "browsesalestrxs";
					param[bkd.breakdownBy()] = [breakdown];

					if (app.isUndefined(param.page)) {
						param = $.extend(true, param, {
							take: 5,
							skip: 0,
							page: 1,
							pageSize: 5
						});
					}

					$.ajax({
						type: "POST",
						url: "/databrowser/getdatabrowser",
						contentType: "application/json; charset=utf-8",
						dataType: 'json',
						data: JSON.stringify(param),
						success: function success(res) {
							bkd.popupIsLoading(false);
							setTimeout(function () {
								options.success(res.data);
							}, 200);
						},
						error: function error() {
							bkd.popupIsLoading(false);
						}
					});
				},
				pageSize: 5
			},
			schema: {
				data: function data(d) {
					return d.DataValue;
				},
				total: function total(d) {
					return d.DataCount;
				}
			},
			serverPaging: true,
			columns: [],
			pageSize: 5
		},
		sortable: true,
		pageable: true,
		scrollable: true,
		columns: columns
	};

	$('.grid-detail').replaceWith('<div class="grid-detail"></div>');
	$('.grid-detail').kendoGrid(config);
};
bkd.renderDetail = function (plcode, breakdown) {
	bkd.popupIsLoading(true);
	$('#modal-detail-ledger-summary').appendTo($('body'));
	$('#modal-detail-ledger-summary').modal('show');

	var render = function render() {
		var columns = [{ title: 'Date', width: 120, locked: true, footerTemplate: 'Total :', template: function template(d) {
				return moment(d.date.date).format('DD/MM/YYYY HH:mm');
			}, attributes: { class: 'bold' } },
		// { field: `pldatas.${plcode}.amount`, width: 120, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: (d) => d[`pldatas.${plcode}.amount`].sum, format: '{0:n2}', attributes: { class: 'align-right' } },
		{ field: 'grossamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Gross</div>", footerTemplate: function footerTemplate(d) {
				return '<div class="align-right">' + kendo.toString(d.grossamount.sum, 'n0') + '</div>';
			}, format: '{0:n2}', attributes: { class: 'align-right' } }, { field: 'discountamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Discount</div>", footerTemplate: function footerTemplate(d) {
				return '<div class="align-right">' + kendo.toString(d.discountamount.sum, 'n0') + '</div>';
			}, format: '{0:n2}', attributes: { class: 'align-right' } }, { field: 'netamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Net Sales</div>", footerTemplate: function footerTemplate(d) {
				return '<div class="align-right">' + kendo.toString(d.netamount.sum, 'n0') + '</div>';
			}, format: '{0:n2}', attributes: { class: 'align-right' } }, { field: 'cc.name', title: 'Cost Center', width: 250 }, { field: 'customer.name', title: 'Outlet', width: 250 }, { field: 'customer.branchname', title: 'Branch', width: 150 }, { field: 'customer.channelname', title: 'Channel', width: 120 }, { field: 'product.brand', title: 'Brand', width: 100 }, { field: 'product.name', title: 'Product', width: 250 }];
		var config = {
			dataSource: {
				data: bkd.detail(),
				pageSize: 5,
				aggregate: [{ field: "netamount", aggregate: "sum" }, { field: "grossamount", aggregate: "sum" }, { field: "discountamount", aggregate: "sum" }, { field: 'pldatas.' + plcode + '.amount', aggregate: 'sum' }]
			},
			columns: columns,
			pageable: true,
			resizable: false,
			sortable: true
		};

		$('.grid-detail').replaceWith('<div class="grid-detail"></div>');
		$('.grid-detail').kendoGrid(config);
	};

	var param = {};
	param.PLCode = plcode;
	param.BreakdownBy = bkd.breakdownBy();
	param.BreakdownValue = breakdown;
	param.filters = []; // rpt.getFilterValue()

	app.ajaxPost('/report/getpnldatadetail', param, function (res) {
		bkd.detail(res.Data);
		bkd.popupIsLoading(false);
		setTimeout(render, 200);
	}, function () {
		bkd.popupIsLoading(false);
	});
};
bkd.render = function () {
	if (bkd.data().length == 0) {
		$('.breakdown-view').html('No data found.');
		return;
	}

	var rows = [];
	var data = _.map(bkd.data(), function (d) {
		d._id.pl = d._id.pl + ' ' + d._id.fiscal;return d;
	});
	data = _.sortBy(bkd.data(), function (d) {
		return d._id.pl;
	});
	var plmodels = _.sortBy(bkd.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	plmodels.forEach(function (d) {
		var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0 };
		data.forEach(function (e) {
			var breakdown = e._id.pl;
			var value = e['total' + d._id];value = app.validateNumber(value);
			row[breakdown] = value;
			row.PNLTotal += value;
		});
		data.forEach(function (e) {
			var breakdown = e._id.pl;
			var value = e['total' + d._id] / row.PNLTotal * 100;value = app.validateNumber(value);
			row[breakdown + ' %'] = value;
		});
		rows.push(row);
	});

	var wrapper = app.newEl('div').addClass('pivot-pnl').appendTo($('.breakdown-view'));

	var tableHeaderWrap = app.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = app.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = app.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = app.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader1 = app.newEl('tr').appendTo(tableHeader);

	app.newEl('th').html('P&L').appendTo(trHeader1);

	app.newEl('th').html('Total').addClass('align-right').appendTo(trHeader1);

	var trContent1 = app.newEl('tr').appendTo(tableContent);

	var colWidth = 160;
	var colPercentWidth = 60;
	var totalWidth = 0;
	var pnlTotalSum = 0;

	if (bkd.breakdownBy() == "customer.branchname") {
		colWidth = 200;
	}

	data.forEach(function (d, i) {
		app.newEl('th').html(app.nbspAble(d._id.pl, 'Uncategorized')).addClass('align-right').appendTo(trContent1).width(colWidth);

		app.newEl('th').html('%').addClass('align-right cell-percentage').appendTo(trContent1).width(colPercentWidth);

		totalWidth += colWidth + colPercentWidth;
	});

	tableContent.css('min-width', totalWidth);

	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var trHeader = app.newEl('tr').appendTo(tableHeader);

		app.newEl('td').html(d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		app.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		var trContent = app.newEl('tr').appendTo(tableContent);

		data.forEach(function (e, f) {
			var key = e._id.pl;
			var value = kendo.toString(d[key], 'n0');
			var percentage = kendo.toString(d[key + ' %'], 'n2');

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = app.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			cell.on('click', function () {
				bkd.clickCell(d.PLCode, key);
			});

			app.newEl('td').html(percentage + ' %').addClass('align-right cell-percentage').appendTo(trContent);
		});
	});

	return;

	var trHeaderTotal = app.newEl('tr').addClass('footer').appendTo(tableHeader);

	app.newEl('td').html('Total').appendTo(trHeaderTotal);

	var totalAll = kendo.toString(pnlTotalSum, 'n0');
	app.newEl('td').html(totalAll).addClass('align-right').appendTo(trHeaderTotal);

	var trContentTotal = app.newEl('tr').addClass('footer').appendTo(tableContent);

	header.forEach(function (e) {
		var sum = kendo.toString(Lazy(rows).sum(function (g) {
			return app.NaNable(g[e.key]);
		}), 'n0');
		var percentage = kendo.toString(sum / rows[0][e.key] * 100, 'n0');

		app.newEl('td').html(sum).addClass('align-right').appendTo(trContentTotal);

		app.newEl('td').html(percentage).addClass('align-right').appendTo(trContentTotal);
	});
};

$(function () {
	bkd.refresh(false);
});