'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.templateDataPoint = {
	aggr: 'sum',
	field: '',
	name: ''
};
pvt.templateRowColumn = {
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
	pvt.mode(what);

	if (what == 'render') {
		pvt.refresh();
	}
};

pvt.prepareTooltipster = function () {
	var config = {
		contentAsHTML: true,
		interactive: true,
		theme: 'tooltipster-whi',
		animation: 'grow',
		delay: 0,
		offsetY: -5,
		touchDevices: false,
		trigger: 'click',
		position: 'top'
	};

	$('.tooltipster-dimension').each(function (i, e) {
		$(e).tooltipster($.extend(true, config, {
			content: $('\n\t\t\t\t<h3 class="no-margin no-padding">Add to</h3>\n\t\t\t\t<div>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' data-target-module=\'column\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.addAs(this, "column")\'>\n\t\t\t\t\t\t<i class=\'fa fa-columns\'></i> Column\n\t\t\t\t\t</button>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' data-target-module=\'row\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.addAs(this, "row")\'>\n\t\t\t\t\t\t<i class=\'fa fa-reorder\'></i> Row\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t')
		}));
	});

	$('.tooltipster-column-row').each(function (i, e) {
		var title = $(e).closest('.pivot-section').parent().prev().text();
		$(e).tooltipster($.extend(true, config, {
			content: $('\n\t\t\t\t<h3 class="no-margin no-padding">' + title + ' setting</h3>\n\t\t\t\t<div>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.configure(this, "column")\'>\n\t\t\t\t\t\t<i class=\'fa fa-gear\'></i> Configure\n\t\t\t\t\t</button>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.removeFrom()\'>\n\t\t\t\t\t\t<i class=\'fa fa-trash\'></i> Remove\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t')
		}));
	});
};
pvt.showConfig = function () {
	// vm.hideFilter()
	rpt.mode('');
};
pvt.showAndRefreshPivot = function () {
	// vm.showFilter()
	rpt.mode('render');
};
pvt.showFieldControl = function (o) {
	pvt.currentTargetDimension = $(o).prev();
};
pvt.hoverInModule = function (o) {
	var target = $(o).attr('data-target-module');
	$('[data-module="' + target + '"]').addClass('highlight');
};
pvt.hoverOutModule = function (o) {
	var target = $(o).attr('data-target-module');
	$('[data-module="' + target + '"]').removeClass('highlight');
};
pvt.getData = function (callback) {
	app.ajaxPost("/report/getdatapivot", {}, function (res) {
		if (!app.isUndefined(callback)) {
			callback(res);
		}
	});
};
pvt.addColumn = function () {
	var row = ko.mapping.fromJS(app.clone(pvt.templateRowColumn));
	pvt.dimensions.push(row);
	app.prepareTooltipster($(".pivot-section-columns .input-group:last .tooltipster"));
};
pvt.addRow = function () {
	var row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint));
	pvt.rows.push(row);
	app.prepareTooltipster($(".pivot-section-row .input-group:last .tooltipster"));
};
pvt.addDataPoint = function () {
	var row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint));
	pvt.dataPoints.push(row);
	app.prepareTooltipster($(".pivot-section-data-point .input-group:last .tooltipster"));
};
pvt.addAs = function (o, what) {
	var holder = pvt[what + 's'];
	var id = $(pvt.currentTargetDimension).attr('data-id');

	var isAddedOnColumn = typeof ko.mapping.toJS(pvt.dimensions()).find(function (d) {
		return d.field === id;
	}) !== 'undefined';
	var isAddedOnRow = typeof ko.mapping.toJS(pvt.rows()).find(function (d) {
		return d.field === id;
	}) !== 'undefined';

	if (!(isAddedOnColumn || isAddedOnRow)) {
		var row = pvt.optionDimensions().find(function (d) {
			return d.field === id;
		});
		holder.push(ko.mapping.fromJS({ field: row.field, name: row.name }));
	}
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
pvt.getPivotConfig = function () {
	var dimensions = ko.mapping.toJS(pvt.dimensions).map(function (d) {
		return { type: 'column', field: d.field, name: d.name };
	}).concat(ko.mapping.toJS(pvt.rows).map(function (d) {
		return { type: 'row', field: d.field, name: d.name };
	}));

	var dataPoints = ko.mapping.toJS(pvt.dataPoints).filter(function (d) {
		return d.field != '' && d.aggr != '';
	}).map(function (d) {
		var row = ko.mapping.toJS(pvt.pivotModel).find(function (e) {
			return e.field == d.field;
		});
		var name = row == undefined ? d.field : row.name;
		return { op: d.aggr, field: d.field, name: name };
	});

	var param = { dimensions: dimensions, datapoints: dataPoints };
	return param;
};

pvt.refresh = function () {
	pvt.data(DATATEMP_PIVOT);
	pvt.render();
};

pvt.render = function () {
	var data = [];
	var schemaModelFields = {};
	var schemaCubeDimensions = {};
	var schemaCubeMeasures = {};
	var columns = [];
	var rows = [];
	var measures = [];

	data = pvt.data().map(function (d) {
		var res = {};

		app.forEach(d, function (k, v) {
			if (k == '_id') {
				app.forEach(v, function (l, m) {
					res[l.replace(/\./g, '_')] = m;
				});
			} else {
				res[k.replace(/\./g, '_')] = v;
			}
		});

		return res;
	});

	var constructSchema = function constructSchema(from, to) {
		app.koUnmap(from()).forEach(function (d) {
			var option = app.koUnmap(ra.optionDimensions).find(function (e) {
				return e.field == d.field;
			});
			var key = option.name.replace(/ /g, '_').replace(/\//g, '_');
			var field = d.field.replace(/\./g, '_');

			schemaModelFields[key] = { type: 'string', field: field };
			schemaCubeDimensions[key] = { caption: option.name };

			to.push({ name: key, expand: true });
		});
	};

	constructSchema(pvt.rows, rows);
	constructSchema(pvt.columns, columns);

	app.koUnmap(pvt.dataPoints).forEach(function (d) {
		var key = d.name.replace(/ /g, '_').replace(/\//g, '_');
		// let field = d.field.replace(/\./g, '_')
		// schemaModelFields[key] = { type: 'number', field: field }

		var prop = { field: d.field, aggregate: d.aggr };
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

	app.log(app.clone(config));

	$('.pivot').replaceWith('<div class="pivot"></div>');
	$('.pivot').kendoPivotGrid(config);
};

var DATATEMP_PIVOT = [{ "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }];

$(function () {
	pvt.columns([app.koMap({ field: 'customer.channelname', name: 'Product' }), app.koMap({ field: 'product.name', name: 'Product' })]);
	pvt.rows([app.koMap({ field: 'customer.branchname', name: 'Branch/RD' })]);
	pvt.dataPoints([app.koMap({ aggr: 'sum', field: 'value1', name: 'Gross Sales' }), app.koMap({ aggr: 'sum', field: 'value2', name: 'Discount' }), app.koMap({ aggr: 'sum', field: 'value3', name: 'Net Sales' })]);

	pvt.refresh();
});