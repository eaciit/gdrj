'use strict';

viewModel.breakdown = new Object();
var bkd = viewModel.breakdown;

bkd.keyOrder = ko.observable('plmodel.orderindex'); //plorder
bkd.keyPLHeader1 = ko.observable('plmodel.plheader1'); //plgroup1
bkd.contentIsLoading = ko.observable(false);
bkd.title = ko.observable('P&L Analytic');
bkd.data = ko.observableArray([]);
bkd.detail = ko.observableArray([]);
bkd.limit = ko.observable(10);
bkd.getParam = function () {
	var orderIndex = { field: bkd.keyOrder(), name: 'Order' };

	var breakdown = rpt.optionDimensions().find(function (d) {
		return d.field == bkd.breakdownBy();
	});
	var dimensions = bkd.dimensions().concat([breakdown, orderIndex]);
	var dataPoints = bkd.dataPoints();
	return rpt.wrapParam(dimensions, dataPoints);
};
bkd.refresh = function () {
	var param = $.extend(true, bkd.getParam(), {
		breakdownBy: bkd.breakdownBy(),
		limit: bkd.limit()
	});
	bkd.oldBreakdownBy(bkd.breakdownBy());
	// bkd.data(DATATEMP_BREAKDOWN)
	bkd.contentIsLoading(true);
	app.ajaxPost("/report/summarycalculatedatapivot", param, function (res) {
		var data = _.sortBy(res.Data, function (o, v) {
			return parseInt(o[app.idAble(bkd.keyOrder())].replace(/PL/g, ""));
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
bkd.oldBreakdownBy = ko.observable(bkd.breakdownBy());

bkd.dimensions = ko.observableArray([{ field: bkd.keyPLHeader1(), name: ' ' }]);

// { field: 'plmodel.plheader2', name: ' ' },
// { field: 'plmodel.plheader3', name: ' ' }
bkd.dataPoints = ko.observableArray([{ field: "value1", name: "value1", aggr: "sum" }]);
bkd.clickCell = function (pnl, breakdown) {
	var pivot = $('.breakdown-view').data('kendoPivotGrid');
	var param = bkd.getParam();
	param.plheader1 = pnl;
	param.filters.push({
		Field: bkd.oldBreakdownBy(),
		Op: "$eq",
		Value: breakdown
	});
	param.note = 'pnl lvl 1';
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

	var columns = [{ field: 'Year', width: 60, locked: true, footerTemplate: 'Total :' }, { field: 'Amount', width: 80, locked: true, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: function footerTemplate(d) {
			return kendo.toString(d.Amount.sum, 'n0');
		}, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: 'CostCenter', title: 'Cost Center', width: 250 }, { field: 'Customer', width: 250 }, { field: 'Channel', width: 150 }, { field: 'Branch', width: 120 }, { field: 'Brand', width: 100 }, { field: 'Product', width: 250 }];
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
	var header = [];
	var rows = [];
	var total = 0;

	Lazy(data).groupBy(function (d) {
		return d[app.idAble(bkd.keyPLHeader1())];
	}).each(function (v, pnl) {
		var i = 0;
		var row = {
			pnl: pnl,
			pnlTotal: 0,
			pnlOrder: v[0][app.idAble(bkd.keyOrder())]
		};

		var data = Lazy(v).groupBy(function (e) {
			return e[app.idAble(bkd.breakdownBy())];
		}).each(function (w, dimension) {
			var key = 'value' + i;
			var value = Lazy(w).sum(function (x) {
				return x.value1;
			});
			row[key] = value;
			header['value' + i] = dimension;
			row.pnlTotal += value;
			total += value;
			i++;

			if (header.filter(function (d) {
				return d.key == key;
			}).length == 0) {
				header.push({
					key: key,
					title: dimension
				});
			}
		});
		rows.push(row);
	});

	header = Lazy(header).sortBy(function (d) {
		return d.title;
	}).toArray();

	rows = Lazy(rows).sortBy(function (d) {
		return d.pnlOrder;
	}).toArray();

	rows.forEach(function (d, i) {
		header.forEach(function (j) {
			var percent = app.NaNable(d[j.key]) / d.pnlTotal * 100;
			d[j.key.replace(/value/g, 'percent')] = percent;
		});
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

	var colWidth = 150;
	var colPercentWidth = 40;
	var totalWidth = 0;

	header.forEach(function (d, i) {
		app.newEl('th').html(app.nbspAble(d.title, 'Unnamed')).addClass('align-right').appendTo(trContent1).width(colWidth);

		app.newEl('th').html('%').addClass('align-right').appendTo(trContent1).width(colPercentWidth);

		totalWidth += colWidth + colPercentWidth;
	});

	tableContent.css('min-width', totalWidth);

	var pnlTotalSum = 0;

	rows.forEach(function (d, i) {
		pnlTotalSum += d.pnlTotal;

		var trHeader = app.newEl('tr').appendTo(tableHeader);

		app.newEl('td').html(d.pnl).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.pnlTotal, 'n0');
		app.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		var trContent = app.newEl('tr').appendTo(tableContent);

		header.forEach(function (e, f) {
			var value = kendo.toString(d[e.key], 'n0');
			var percentage = kendo.toString(d[e.key.replace(/value/g, 'percent')], 'n0');

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = app.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			cell.on('click', function () {
				bkd.clickCell(d.pnl, e.title);
			});

			app.newEl('td').html(percentage).addClass('align-right').appendTo(trContent);
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

	console.log("----", header);
	console.log("----", rows);
};

$(function () {
	bkd.refresh();
});