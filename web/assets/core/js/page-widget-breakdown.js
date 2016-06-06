'use strict';

viewModel.breakdown = new Object();
var bkd = viewModel.breakdown;

bkd.data = ko.observableArray([]);
bkd.getParam = function () {
	var orderIndex = { field: 'plmodel.orderindex', name: 'Order' };

	var breakdown = ra.optionDimensions().find(function (d) {
		return d.field == bkd.breakdownBy();
	});
	var dimensions = bkd.dimensions().concat([breakdown, orderIndex]);
	var dataPoints = bkd.dataPoints();
	return ra.wrapParam('analysis_ideas', dimensions, dataPoints, {
		which: 'all_plmod'
	});
};
bkd.refresh = function () {
	// bkd.data(DATATEMP_BREAKDOWN)
	app.ajaxPost("/report/summarycalculatedatapivot", bkd.getParam(), function (res) {
		var data = _.sortBy(res.Data, function (o, v) {
			return parseInt(o.plmodel_orderindex.replace(/PL/g, ""));
		});
		bkd.data(data);
		bkd.render();
	});
};
bkd.refreshOnChange = function () {
	// setTimeout(bkd.refresh, 100)
};
bkd.breakdownBy = ko.observable('customer.channelname');
bkd.dimensions = ko.observableArray([{ field: 'plmodel.plheader1', name: ' ' }, { field: 'plmodel.plheader2', name: ' ' }, { field: 'plmodel.plheader3', name: ' ' }]);
bkd.dataPoints = ko.observableArray([{ field: "value1", name: "value1", aggr: "sum" }]);
bkd.render = function () {
	var data = bkd.data().slice(0, 100);
	var schemaModelFields = {};
	var schemaCubeDimensions = {};
	var schemaCubeMeasures = {};
	var rows = [];
	var columns = [];
	var measures = [];
	var breakdown = ra.optionDimensions().find(function (d) {
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
		dataCellTemplate: function dataCellTemplate(d) {
			return '<div class="align-right">' + kendo.toString(d.dataItem.value, "n2") + '</div>';
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
			$('.breakdown-view .k-grid.k-widget:eq(1) .k-grid-header tr:first .k-header.k-alt span').addClass('invisible');
		}
	};

	app.log('breakdown', app.clone(config));
	$('.breakdown-view').replaceWith('<div class="breakdown-view ez"></div>');
	$('.breakdown-view').kendoPivotGrid(config);
};

$(function () {
	bkd.refresh();
});