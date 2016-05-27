'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.optionDimensions = ko.observableArray([{ _id: 'ProductID', Name: 'Product ID' }, { _id: 'ProductName', Name: 'Product Name' }, { _id: 'SupplierID', Name: 'Supplier ID' }, { _id: 'CategoryID', Name: 'Category ID' }, { _id: 'Category.CategoryID', Name: 'Category ID' }, { _id: 'Category.CategoryName', Name: 'Category Name' }, { _id: 'Category.Description', Name: 'Category Description' }]);
pvt.optionDataPoints = ko.observableArray([{ _id: 'QuantityPerUnit', Name: 'Quantity Per Unit' }, { _id: 'ReorderLevel', Name: 'Reorder Level' }, { _id: 'Discontinued', Name: 'Discontinued' }, { _id: 'UnitPrice', Name: 'Unit Price' }, { _id: 'UnitsInStock', Name: 'Units In Stock' }, { _id: 'UnitsOnOrder', Name: 'Units On Order' }]);
pvt.optionAggregates = ko.observableArray([{ _id: 'avg', Name: 'Avg' }, { _id: 'count', Name: 'Count' }, { _id: 'sum', Name: 'Sum' }, { _id: 'max', Name: 'Max' }, { _id: 'min', Name: 'Min' }]);
pvt.mode = ko.observable('');
pvt.columns = ko.observableArray([ko.mapping.fromJS({ _id: 'CategoryName', expand: false }), ko.mapping.fromJS({ _id: 'ProductName', expand: false })]);
pvt.rows = ko.observableArray([ko.mapping.fromJS({ _id: 'Discontinued', expand: false })]);
pvt.templateDataPoint = { _id: '', aggr: 'sum' };
pvt.dataPoints = ko.observableArray([ko.mapping.fromJS({ _id: 'QuantityPerUnit', aggr: 'sum' }), ko.mapping.fromJS({ _id: 'QuantityPerUnit', aggr: 'sum' })]);
pvt.data = ko.observableArray(tempData);
pvt.currentTargetDimension = null;
pvt.columnRowID = null;
pvt.columnRowWhich = '';

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
pvt.configure = function (o, what) {};
pvt.addDataPoint = function () {
	pvt.dataPoints.push(app.clone(pvt.templateDataPoint));
};
pvt.addAs = function (o, what) {
	var holder = pvt[what + 's'];
	var id = $(pvt.currentTargetDimension).attr('data-id');

	var isAddedOnColumn = typeof pvt.columns().find(function (d) {
		return d._id === id;
	}) !== 'undefined';
	var isAddedOnRow = typeof pvt.rows().find(function (d) {
		return d._id === id;
	}) !== 'undefined';

	if (!(isAddedOnColumn || isAddedOnRow)) {
		var row = pvt.optionDimensions().find(function (d) {
			return d._id === id;
		});
		holder.push(ko.mapping.fromJS($.extend(true, row, { expand: false })));
	}
};
pvt.removeFrom = function () {
	var holder = pvt[pvt.columnRowWhich + 's'];
	var row = holder().find(function (d) {
		return ko.mapping.toJS(d)._id == pvt.columnRowID;
	});
	app.arrRemoveByItem(holder, row);
};
pvt.showColumnSetting = function (o) {
	pvt.columnRowID = $(o).attr('data-id');
	pvt.columnRowWhich = 'column';
};
pvt.showRowSetting = function (o) {
	pvt.columnRowID = $(o).attr('data-id');
	pvt.columnRowWhich = 'row';
};
pvt.refreshData = function () {
	pvt.mode('render');

	var columns = ko.mapping.toJS(pvt.columns()).map(function (d) {
		return $.extend(true, { name: d._id, expand: false }, d);
	});
	var rows = ko.mapping.toJS(pvt.rows()).map(function (d) {
		return $.extend(true, { name: d._id, expand: false }, d);
	});
	var measures = app.distinct(ko.mapping.toJS(pvt.dataPoints).map(function (d) {
		return d._id;
	}));
	var data = pvt.data();
	console.log(columns, rows, measures);

	$('.pivot').replaceWith('<div class="pivot"></div>');
	$('.pivot').kendoPivotGrid({
		filterable: true,
		// columnWidth: 120,
		// height: 570,
		dataSource: {
			data: data,
			schema: {
				model: {
					fields: {
						ProductName: { type: "string" },
						UnitPrice: { type: "number" },
						UnitsInStock: { type: "number" },
						Discontinued: { type: "boolean" },
						CategoryName: { field: "Category.CategoryName" }
					}
				},
				cube: {
					dimensions: {
						ProductName: { caption: "All Products" },
						CategoryName: { caption: "All Categories" },
						Discontinued: { caption: "Discontinued" }
					},
					measures: {
						"Sum": { field: "UnitPrice", format: "{0:c}", aggregate: "sum" },
						"Average": { field: "UnitPrice", format: "{0:c}", aggregate: "average" }
					}
				}
			},
			columns: columns,
			rows: rows,
			measures: measures
		}
	});
};

pvt.init = function () {
	pvt.prepareTooltipster();
};