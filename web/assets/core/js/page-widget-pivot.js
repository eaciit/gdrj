'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.templateDataPoint = {
	aggr: 'sum',
	field: '',
	name: ''
};
pvt.templateDimension = {
	field: '',
	name: ''
};

pvt.data = ko.observableArray([]);
pvt.columns = ko.observableArray([]);
pvt.rows = ko.observableArray([]);
pvt.dataPoints = ko.observableArray([]);

pvt.enableColumns = ko.observable(true);
pvt.enableRows = ko.observable(true);
pvt.enableDataPoints = ko.observable(true);
pvt.mode = ko.observable('render');
pvt.currentTargetDimension = null;

pvt.setMode = function (what) {
	return function () {
		pvt.mode(what);

		if (what == 'render') {
			pvt.refresh();
		}
	};
};
pvt.addColumn = function () {
	var row = ko.mapping.fromJS(app.clone(pvt.templateDimension));
	pvt.columns.push(row);
	app.prepareTooltipster($(".pivot-section-columns .input-group:last .tooltipster"));
};
pvt.addRow = function () {
	var row = ko.mapping.fromJS(app.clone(pvt.templateDimension));
	pvt.rows.push(row);
	app.prepareTooltipster($(".pivot-section-row .input-group:last .tooltipster"));
};
pvt.addDataPoint = function () {
	var row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint));
	pvt.dataPoints.push(row);
	app.prepareTooltipster($(".pivot-section-data-point .input-group:last .tooltipster"));
};
pvt.removeFrom = function (o, which) {
	swal({
		title: "Are you sure?",
		text: 'Item will be deleted',
		type: "warning",
		showCancelButton: true,
		confirmButtonColor: "#DD6B55",
		confirmButtonText: "Delete",
		closeOnConfirm: true
	}, function () {
		var holder = pvt[which];

		if (which == 'dataPoints') {
			var index = $(o).attr('data-index');
			app.arrRemoveByIndex(holder, index);
		}

		var id = $(o).attr('data-id');
		var row = holder().find(function (d) {
			return ko.mapping.toJS(d).field == id;
		});
		app.arrRemoveByItem(holder, row);
	});
};
pvt.getParam = function () {
	var dimensions = ko.mapping.toJS(pvt.rows().concat(pvt.columns())).filter(function (d) {
		return d.field != '';
	});
	var dataPoints = ko.mapping.toJS(pvt.dataPoints).filter(function (d) {
		return d.field != '' && d.aggr != '';
	}).map(function (d) {
		return {
			field: d.field,
			name: d.name,
			aggr: 'sum'
		};
	});

	return ra.wrapParam('pivot', dimensions, dataPoints);
};
pvt.refresh = function () {
	// pvt.data(DATATEMP_PIVOT)
	app.ajaxPost("/report/summarycalculatedatapivot", pvt.getParam(), function (res) {
		pvt.data(res.Data);
		pvt.render();
	});
};
pvt.render = function () {
	var data = pvt.data();
	var schemaModelFields = {};
	var schemaCubeDimensions = {};
	var schemaCubeMeasures = {};
	var columns = [];
	var rows = [];
	var measures = [];

	var constructSchema = function constructSchema(from, to) {
		app.koUnmap(from()).filter(function (d) {
			return d.field != '';
		}).forEach(function (d) {
			var option = app.koUnmap(ra.optionDimensions).find(function (e) {
				return e.field == d.field;
			});
			var key = app.idAble(option.name);
			var field = app.idAble(d.field);

			schemaModelFields[key] = { type: 'string', field: field };
			schemaCubeDimensions[key] = { caption: option.name };

			to.push({ name: key, expand: true });
		});
	};

	constructSchema(pvt.rows, rows);
	constructSchema(pvt.columns, columns);

	app.koUnmap(pvt.dataPoints).filter(function (d) {
		return d.field != '' && d.aggr != '';
	}).forEach(function (d) {
		var key = app.idAble(d.name);

		var prop = { field: d.field, aggregate: d.aggr, format: '{0:c}' };
		if (prop.aggregate == 'avg') {
			prop.aggregate = 'average';
		}
		schemaCubeMeasures[key] = prop;
		measures.push(key);
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
			columns: columns,
			rows: rows,
			measures: measures
		}
	};

	app.log('pivot', app.clone(config));
	$('.pivot').replaceWith('<div class="pivot"></div>');
	$('.pivot').kendoPivotGrid(config);
};

var DATATEMP_PIVOT = [{ "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }];

$(function () {
	pvt.columns([app.koMap({ field: 'customer.channelname', name: 'Product' }), app.koMap({ field: 'product.name', name: 'Product' })]);
	pvt.rows([app.koMap({ field: 'customer.branchname', name: 'Branch/RD' })]);
	pvt.dataPoints([app.koMap({ aggr: 'sum', field: 'value1', name: o['value1'] }), app.koMap({ aggr: 'sum', field: 'value2', name: o['value2'] }), app.koMap({ aggr: 'sum', field: 'value3', name: o['value3'] })]);

	pvt.refresh();
});