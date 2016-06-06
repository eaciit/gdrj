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

		if (holder().length == 1) {
			return;
		}

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

	return rpt.wrapParam('pivot', dimensions, dataPoints);
};
pvt.refresh = function () {
	// pvt.data(DATATEMP_PIVOT)
	app.ajaxPost("/report/summarycalculatedatapivot", pvt.getParam(), function (res) {
		var orderKey = app.idAble(ko.mapping.toJS(pvt.rows()[0]).field);
		var data = _.sortBy(res.Data, function (o, v) {
			return o[orderKey];
		});
		pvt.data(data);
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
		app.koUnmap(pvt[from]()).filter(function (d) {
			return d.field != '';
		}).forEach(function (d, i) {
			var option = app.koUnmap(rpt.optionDimensions).find(function (e) {
				return e.field == d.field;
			});
			var key = app.idAble(option.name);
			var field = app.idAble(d.field);

			schemaModelFields[field] = { type: 'string' };
			schemaCubeDimensions[field] = { caption: key };

			var row = { name: field };
			if (i == 0) {
				row.expand = true;
			}

			to.push(row);
		});
	};

	constructSchema('rows', rows);
	constructSchema('columns', columns);

	app.koUnmap(pvt.dataPoints).filter(function (d) {
		return d.field != '' && d.aggr != '';
	}).forEach(function (d) {
		var key = app.idAble(d.name);
		var field = app.idAble(d.field);

		var prop = { field: field, aggregate: d.aggr, format: '{0:n2}' };
		if (prop.aggregate == 'avg') {
			prop.aggregate = 'average';
		}

		schemaModelFields[field] = { type: 'number' };
		schemaCubeMeasures[key] = prop;
		measures.push(key);
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

$(function () {
	pvt.columns([app.koMap({ field: 'customer.channelname', name: 'Product' })]);

	// app.koMap({ field: 'product.name', name: 'Product' })
	pvt.rows([app.koMap({ field: 'customer.branchname', name: 'Branch/RD' })]);
	pvt.dataPoints([app.koMap({ aggr: 'sum', field: 'value1', name: o['value1'] }), app.koMap({ aggr: 'sum', field: 'value2', name: o['value2'] }), app.koMap({ aggr: 'sum', field: 'value3', name: o['value3'] })]);

	pvt.refresh();
});