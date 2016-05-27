'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.fields = ko.observableArray([{ _id: 'ProductID', Name: 'Product ID' }, { _id: 'ProductName', Name: 'Product Name' }, { _id: 'SupplierID', Name: 'Supplier ID' }, { _id: 'CategoryID', Name: 'Category ID' }, { _id: 'QuantityPerUnit', Name: 'Quantity Per Unit' }, { _id: 'UnitPrice', Name: 'Unit Price' }, { _id: 'UnitsInStock', Name: 'Units In Stock' }, { _id: 'UnitsOnOrder', Name: 'Units On Order' }, { _id: 'ReorderLevel', Name: 'Reorder Level' }, { _id: 'Discontinued', Name: 'Discontinued' }, { _id: 'Category.CategoryID', Name: 'Category ID' }, { _id: 'Category.CategoryName', Name: 'Category Name' }, { _id: 'Category.Description', Name: 'Category Description' }]);
pvt.mode = ko.observable('');
pvt.columns = ko.observableArray([ko.mapping.fromJS({ _id: 'CategoryName', expand: false }), ko.mapping.fromJS({ _id: 'ProductName', expand: false })]);
pvt.rows = ko.observableArray([ko.mapping.fromJS({ _id: 'Discontinued', expand: false })]);
pvt.values = ko.observableArray([{ _id: 'sum' }]);
pvt.optionValues = ko.observableArray([{ _id: 'avg', Name: 'Avg' }, { _id: 'count', Name: 'Count' }, { _id: 'sum', Name: 'Sum' }, { _id: 'max', Name: 'Max' }, { _id: 'min', Name: 'Min' }]);
pvt.data = ko.observableArray(tempData);
pvt.currentTarget = null;

pvt.prepareTooltipster = function () {
	$('.tooltipster-late').each(function (i, e) {
		$(e).tooltipster({
			contentAsHTML: true,
			interactive: true,
			theme: 'tooltipster-whi',
			animation: 'grow',
			delay: 0,
			offsetY: -5,
			touchDevices: false,
			trigger: 'click',
			position: 'top',
			content: $('\n\t\t\t\t<h3 class="no-margin no-padding">Add to</h3>\n\t\t\t\t<div>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' data-target-module=\'column\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.addAs(this, "column")\'>\n\t\t\t\t\t\tColumn\n\t\t\t\t\t</button>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' data-target-module=\'row\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.addAs(this, "row")\'>\n\t\t\t\t\t\tRow\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t')
		});
	});
};
pvt.showFieldControl = function (o) {
	pvt.currentTarget = $(o).prev();
};
pvt.hoverInModule = function (o) {
	var target = $(o).attr('data-target-module');
	$('[data-module="' + target + '"]').addClass('highlight');
};
pvt.hoverOutModule = function (o) {
	var target = $(o).attr('data-target-module');
	$('[data-module="' + target + '"]').removeClass('highlight');
};
pvt.addAs = function (o, what) {
	var holder = pvt[what + 's'];
	var id = $(pvt.currentTarget).attr('data-id');

	var isAddedOnColumn = typeof pvt.columns().find(function (d) {
		return d._id === id;
	}) !== 'undefined';
	var isAddedOnRow = typeof pvt.rows().find(function (d) {
		return d._id === id;
	}) !== 'undefined';
	var isAddedOnValue = typeof pvt.values().find(function (d) {
		return d._id === id;
	}) !== 'undefined';

	if (!(isAddedOnColumn || isAddedOnRow || isAddedOnValue)) {
		var row = pvt.fields().find(function (d) {
			return d._id === id;
		});
		holder.push(ko.mapping.fromJS($.extend(true, row, { expand: false })));
	}
};
pvt.isAggregate = function (which) {
	return ko.computed(function () {
		var val = pvt.values().find(function (e) {
			return e._id == which;
		});
		return !app.isUndefined(val);
	}, pvt);
};
pvt.changeAggregate = function (which) {
	return function () {
		pvt.values([]); // hack, temprary reset the values

		var val = values.find(function (e) {
			return e._id == which;
		});
		if (app.isUndefined(val)) {
			var item = pvt.optionValues().find(function (d) {
				return d._id == which;
			});
			pvt.values.push(item);
		} else {
			app.arrRemoveByItem(pvt.values, val);
		}

		return true;
	};
};
pvt.removeFrom = function (id, which) {
	var holder = ko.mapping.toJS(pvt[which + 's']);
	var row = holder.find(function (d) {
		return d._id == id;
	});
	app.arrRemoveByItem(holder, row);
	ko.mapping.fromJS(holder, pvt[which + 's']);
};
pvt.removeFromColumn = function (o) {
	pvt.removeFrom($(o).attr('data-id'), 'column');
};
pvt.removeFromRow = function (o) {
	pvt.removeFrom($(o).attr('data-id'), 'row');
};
pvt.refreshData = function () {
	pvt.mode('render');

	var columns = ko.mapping.toJS(pvt.columns()).map(function (d) {
		return $.extend(true, { name: d._id, expand: false }, d);
	});
	var rows = ko.mapping.toJS(pvt.rows()).map(function (d) {
		return $.extend(true, { name: d._id, expand: false }, d);
	});
	var measures = pvt.values().map(function (d) {
		return d._id;
	});
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