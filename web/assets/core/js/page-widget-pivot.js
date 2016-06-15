'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.title = ko.observable('Pivot');
pvt.contentIsLoading = ko.observable(false);

pvt.optionRows = ko.observableArray(rpt.optionDimensions());
pvt.optionColumns = ko.observableArray(rpt.optionDimensions());

pvt.flag = ko.observable('');
pvt.row = ko.observable('');
pvt.column = ko.observable('');
pvt.dataPoints = ko.observableArray([]);
pvt.data = ko.observableArray([]);

pvt.refresh = function () {
	var param = {};
	param.pls = [];
	param.flag = pvt.flag();
	param.groups = [pvt.row(), pvt.column()];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	pvt.contentIsLoading(true);
	app.ajaxPost("/report/getpnldatanew", param, function (res) {
		pvt.data(res.Data.Data);
		pvt.contentIsLoading(false);
		pvt.render();
	}, function () {
		pvt.contentIsLoading(false);
	});
};
pvt.render = function () {
	var data = pvt.data();
	var schemaModelFields = {};
	var schemaCubeDimensions = {};
	var schemaCubeMeasures = {};
	var columns = [];
	var rows = [];
	var measures = [];[pvt.row()].forEach(function (d, i) {
		var row = pvt.optionRows().find(function (e) {
			return e.field == d;
		});
		var field = toolkit.replace(row.field, '.', '_');
		schemaModelFields[field] = { type: 'string', field: field };
		rows.push({ name: field, expand: i == 0 });
	});[pvt.column()].forEach(function (d, i) {
		var row = pvt.optionColumns().find(function (e) {
			return e.field == d;
		});
		var field = toolkit.replace(row.field, '.', '_');
		schemaModelFields[field] = { type: 'string', field: field };
		columns.push({ name: field, expand: i == 0 });
	});

	pvt.dataPoints().forEach(function (d) {
		var field = toolkit.replace(d.field, '.', '_');
		schemaModelFields[field] = { type: 'number' };
		schemaCubeDimensions[field] = { caption: d.title };

		schemaCubeMeasures[d.title] = { field: field, format: '{0:c}', aggregate: 'sum' };
		measures.push(d.title);
	});

	var config = {
		filterable: false,
		reorderable: false,
		dataCellTemplate: function dataCellTemplate(d) {
			return '<div class="align-right">' + kendo.toString(d.dataItem.value, "n2") + '</div>';
		},
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
			columns: columns,
			rows: rows,
			measures: measures
		}
	};

	app.log('pivot', app.clone(config));
	$('.pivot').replaceWith('<div class="pivot ez"></div>');
	$('.pivot').kendoPivotGrid(config);
};