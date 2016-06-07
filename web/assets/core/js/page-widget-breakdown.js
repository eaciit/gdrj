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

	var param = $.extend(true, bkd.getParam(), {
		breakdownBy: app.htmlDecode(bkd.breakdownBy()),
		breakdownValue: app.htmlDecode(cellInfo.columnTuple.members[0].caption),
		plheader1: '',
		plheader2: '',
		plheader3: ''
	});

	cellInfo.rowTuple.members.forEach(function (d) {
		if (d.parentName == undefined) {
			return;
		}

		var key = d.parentName.split('_').reverse()[0];
		var value = app.htmlDecode(d.name.replace(d.parentName + '&', ''));
		param[key] = value;
	});

	if (param.breakdownValue == app.idAble(param.breakdownBy) + '&') {
		param.breakdownValue = '';
	}

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

	var columns = [{ field: 'Year', width: 60, locked: true, footerTemplate: 'Total :' }, { field: 'Amount', width: 80, locked: true, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n2')#</div>", format: '{0:n2}', attributes: { class: 'align-right' } }, { field: 'CostCenter', title: 'Cost Center', width: 250 }, { field: 'Customer', width: 250 }, { field: 'Channel', width: 150 }, { field: 'Branch', width: 120 }, { field: 'Brand', width: 100 }, { field: 'Product', width: 250 }];
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

	var config = {
		filterable: false,
		reorderable: false,
		dataSource: {
			data: data,
			schema: {
				model: {
					fields: schemaModelFields
				},
				cube: {
					dimensions: schemaCubeDimensions,
					measures: schemaCubeMeasures
				}
			},
			rows: rows,
			columns: columns,
			measures: measures
		},
		columnHeaderTemplate: function columnHeaderTemplate(d) {
			var text = d.member.caption;

			if (text == '') {
				text = '&nbsp;';
			}

			return text;
		},
		dataCellTemplate: function dataCellTemplate(d) {
			var number = kendo.toString(d.dataItem.value, "n2");
			return '<div onclick="bkd.clickCell(this)" class="align-right">' + number + '</div>';
		},
		dataBound: function dataBound() {
			$('.breakdown-view .k-grid.k-widget:first [data-path]:first').addClass('invisible');
			$('.breakdown-view .k-grid.k-widget:first span:contains(" ")').each(function (i, e) {
				if ($(e).parent().hasClass('k-grid-footer') && $.trim($(e).html()) == '') {
					$(e).css({
						color: 'white',
						display: 'block',
						height: '18px'
					});
				}
			});
			$('.breakdown-view .k-grid.k-widget:first tr .k-i-arrow-e').removeClass('invisible');
			$('.breakdown-view .k-grid.k-widget:first tr:last .k-i-arrow-e').addClass('invisible');
			$('.breakdown-view .k-grid.k-widget:first table:first').css('margin-left', '-32px');
			$('.breakdown-view .k-grid.k-widget:eq(1) .k-grid-header tr:first .k-i-arrow-s').addClass('invisible');
			$('.breakdown-view .k-grid.k-widget:eq(1) .k-grid-header tr:first .k-i-arrow-s').parent().css('color', 'transparent');
			$('.breakdown-view .k-grid.k-widget:eq(1) .k-grid-header tr:first .k-i-arrow-s').parent().next().css('color', 'transparent');
			$('.breakdown-view .k-grid.k-widget:eq(1) .k-grid-header tr:first .k-header.k-alt span').addClass('invisible');
		}
	};

	app.log('breakdown', app.clone(config));
	bkd.emptyGrid();
	$('.breakdown-view').kendoPivotGrid(config);
};

$(function () {
	bkd.refresh();
});