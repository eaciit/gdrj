'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.pivotModel = [{ field: 'ID', type: 'string', label: 'ID', as: 'dimension' }, { field: 'PC._id', type: 'string', label: 'Profit Center - ID', as: 'dimension' }, { field: 'PC.EntityID', type: 'string', label: 'Profit Center - Entity ID' }, { field: 'PC.Name', type: 'string', label: 'Profit Center - Name' }, { field: 'PC.BrandID', type: 'string', label: 'Profit Center - Brand ID' }, { field: 'PC.BrandCategoryID', type: 'string', label: 'Profit Center - Brand Category ID' }, { field: 'PC.BranchID', type: 'string', label: 'Profit Center - Branch ID' }, { field: 'PC.BranchType', type: 'int', label: 'Profit Center - Branch Type' }, { field: 'CC._id', type: 'string', label: 'Cost Center - ID', as: 'dimension' }, { field: 'CC.EntityID', type: 'string', label: 'Cost Center - Entity ID' }, { field: 'CC.Name', type: 'string', label: 'Cost Center - Name' }, { field: 'CC.CostGroup01', type: 'string', label: 'Cost Center - Cost Group 01' }, { field: 'CC.CostGroup02', type: 'string', label: 'Cost Center - Cost Group 02' }, { field: 'CC.CostGroup03', type: 'string', label: 'Cost Center - Cost Group 03' }, { field: 'CC.BranchID', type: 'string', label: 'Cost Center - Branch ID' }, { field: 'CC.BranchType', type: 'string', label: 'Cost Center - Branch Type' }, { field: 'CC.CCTypeID', type: 'string', label: 'Cost Center - Type' }, { field: 'CC.HCCGroupID', type: 'string', label: 'Cost Center - HCC Group ID' }, { field: 'CompanyCode', type: 'string', label: 'Company Code', as: 'dimension' }, { field: 'LedgerAccount', type: 'string', label: 'Ledger Account', as: 'dimension' }, { field: 'Customer._id', type: 'string', label: 'Customer - ID', as: 'dimension' }, { field: 'Customer.CustomerID', type: 'string', label: 'Customer - Customer ID' }, { field: 'Customer.Plant', type: 'string', label: 'Customer - Plant' }, { field: 'Customer.Name', type: 'string', label: 'Customer - Name' }, { field: 'Customer.KeyAccount', type: 'string', label: 'Customer - Key Account' }, { field: 'Customer.Channel', type: 'string', label: 'Customer - Channel' }, { field: 'Customer.Group', type: 'string', label: 'Customer - Group' }, { field: 'Customer.National', type: 'string', label: 'Customer - National' }, { field: 'Customer.Zone', type: 'string', label: 'Customer - Zone' }, { field: 'Customer.Region', type: 'string', label: 'Customer - Region' }, { field: 'Customer.Area', type: 'string', label: 'Customer - Area' }, { field: 'Product._id', type: 'string', label: 'Product - ID', as: 'dimension' }, { field: 'Product.Name', type: 'string', label: 'Product - Name' }, { field: 'Product.Config', type: 'string', label: 'Product - Config' }, { field: 'Product.Brand', type: 'string', label: 'Product - Brand' }, { field: 'Product.LongName', type: 'string', label: 'Product - Long Name' }, { field: 'Data.ID', type: 'string', label: 'Data - ID', as: 'dimension' }, { field: 'Data.Month', type: 'string', label: 'Data - Month' }, { field: 'Data.Quarter', type: 'int', label: 'Data - Quarter' }, { field: 'Data.Year', type: 'int', label: 'Data - Year' }, { field: 'Value1', type: 'string', label: 'Value 1', as: 'data point' }, { field: 'Value2', type: 'string', label: 'Value 2', as: 'data point' }, { field: 'Value3', type: 'string', label: 'Value 3', as: 'data point' }];

pvt.templateDataPoint = {
	aggr: 'sum',
	expand: false,
	field: '',
	label: ''
};
pvt.optionDimensions = ko.computed(function () {
	return pvt.pivotModel.filter(function (d) {
		return d.as === 'dimension';
	}).map(function (d) {
		return { field: d.field, Name: d.label };
	});
});
pvt.optionDataPoints = ko.computed(function () {
	return pvt.pivotModel.filter(function (d) {
		return d.as === 'data point';
	}).map(function (d) {
		return { field: d.field, Name: d.label };
	});
});
pvt.optionAggregates = ko.observableArray([{ aggr: 'average', Name: 'Avg' }, { aggr: 'count', Name: 'Count' }, { aggr: 'sum', Name: 'Sum' }, { aggr: 'max', Name: 'Max' }, { aggr: 'min', Name: 'Min' }]);
pvt.mode = ko.observable('');
pvt.columns = ko.observableArray([app.koMap({
	field: pvt.optionDimensions()[1].field,
	label: pvt.optionDimensions()[1].Name,
	expand: false
}), app.koMap({
	field: pvt.optionDimensions()[2].field,
	label: pvt.optionDimensions()[2].Name,
	expand: false
})]);
pvt.rows = ko.observableArray([app.koMap({
	field: pvt.optionDimensions()[3].field,
	label: pvt.optionDimensions()[3].Name,
	expand: false
})]);
pvt.dataPoints = ko.observableArray([app.koMap({
	field: pvt.optionDataPoints()[0].field,
	label: pvt.optionDataPoints()[0].Name,
	expand: false,
	aggr: pvt.optionAggregates()[2].aggr
})]);

// app.koMap({
// 	field: pvt.optionDataPoints()[0].field,
// 	label: pvt.optionDataPoints()[0].Name,
// 	expand: false,
// 	aggr: pvt.optionAggregates()[2].aggr
// }),
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
pvt.getData = function (callback) {
	app.ajaxPost("/report/getdatapivot", {}, function (res) {
		if (!app.isUndefined(callback)) {
			callback(res);
		}
	});
};
pvt.configure = function (o, what) {};
pvt.addDataPoint = function () {
	var row = ko.mapping.fromJS(app.clone(pvt.templateDataPoint));
	pvt.dataPoints.push(row);
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

	var key = function key(field) {
		return field.replace(/\./g, '_');
	};

	pvt.getData(function (data) {
		var modelFields = {};
		pvt.pivotModel.filter(function (d) {
			ko.mapping.toJS(pvt.columns).find(function (e) {
				return e.field == d.field;
			});
		}).forEach(function (d) {
			modelFields[key(d.field)] = { field: d.field, type: d.type };
		});

		var cubeDimensions = {};
		ko.mapping.toJS(pvt.columns).forEach(function (d) {
			cubeDimensions[key(d.field)] = { caption: d.label };
		});

		var cubeMeasures = {};
		ko.mapping.toJS(pvt.optionDataPoints).forEach(function (d) {
			pvt.optionAggregates().map(function (e) {
				cubeMeasures[key(d.field) + '_' + e.aggr] = {
					field: key(d.field),
					format: '{0:n2}',
					aggregate: e.aggr
				};
			});
		});

		var columns = ko.mapping.toJS(pvt.columns()).map(function (d) {
			return { name: key(d.field), expand: false };
		});
		var rows = ko.mapping.toJS(pvt.rows()).map(function (d) {
			return { name: key(d.field), expand: false };
		});
		var measures = ko.mapping.toJS(pvt.dataPoints).map(function (d) {
			return key(d.field) + '_' + d.aggr;
		});

		var config = {
			filterable: true,
			dataSource: {
				data: data,
				schema: {
					model: { fields: modelFields },
					cube: {
						dimensions: cubeDimensions,
						measures: cubeMeasures
					}
				},
				columns: columns,
				rows: rows,
				measures: measures
			}
		};

		console.log('modelFields', modelFields);
		console.log('cubeDimensions', cubeDimensions);
		console.log('cubeMeasures', cubeMeasures);
		console.log('columns', columns);
		console.log('rows', rows);
		console.log('measures', measures);
		console.log('config', config);

		$('.pivot').replaceWith('<div class="pivot"></div>');
		$('.pivot').kendoPivotGrid(config);
	});
};

pvt.init = function () {
	pvt.prepareTooltipster();
};