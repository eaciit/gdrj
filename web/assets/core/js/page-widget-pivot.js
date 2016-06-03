'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.pivotModel = [{ field: '_id', type: 'string', name: 'ID' }, { field: 'PC._id', type: 'string', name: 'Profit Center - ID' }, { field: 'PC.EntityID', type: 'string', name: 'Profit Center - Entity ID' }, { field: 'PC.Name', type: 'string', name: 'Profit Center - Name' }, { field: 'PC.BrandID', type: 'string', name: 'Profit Center - Brand ID' }, { field: 'PC.BrandCategoryID', type: 'string', name: 'Profit Center - Brand Category ID' }, { field: 'PC.BranchID', type: 'string', name: 'Profit Center - Branch ID' }, { field: 'PC.BranchType', type: 'int', name: 'Profit Center - Branch Type' }, { field: 'CC._id', type: 'string', name: 'Cost Center - ID' }, { field: 'CC.EntityID', type: 'string', name: 'Cost Center - Entity ID' }, { field: 'CC.Name', type: 'string', name: 'Cost Center - Name' }, { field: 'CC.CostGroup01', type: 'string', name: 'Cost Center - Cost Group 01' }, { field: 'CC.CostGroup02', type: 'string', name: 'Cost Center - Cost Group 02' }, { field: 'CC.CostGroup03', type: 'string', name: 'Cost Center - Cost Group 03' }, { field: 'CC.BranchID', type: 'string', name: 'Cost Center - Branch ID' }, { field: 'CC.BranchType', type: 'string', name: 'Cost Center - Branch Type' }, { field: 'CC.CCTypeID', type: 'string', name: 'Cost Center - Type' }, { field: 'CC.HCCGroupID', type: 'string', name: 'Cost Center - HCC Group ID' }, { field: 'CompanyCode', type: 'string', name: 'Company Code' }, { field: 'LedgerAccount', type: 'string', name: 'Ledger Account' }, { field: 'Customer._id', type: 'string', name: 'Customer - ID' }, { field: 'Customer.BranchID', type: 'string', name: 'Customer - Branch ID' }, { field: 'Customer.BranchName', type: 'string', name: 'Customer - branch Name' }, { field: 'Customer.Name', type: 'string', name: 'Customer - Name' }, { field: 'Customer.KeyAccount', type: 'string', name: 'Customer - Key Account' }, { field: 'Customer.ChannelID', type: 'string', name: 'Customer - Channel ID' }, { field: 'Customer.ChannelName', type: 'string', name: 'Customer - Channel Name' }, { field: 'Customer.CustomerGroup', type: 'string', name: 'Customer - Customer Group' }, { field: 'Customer.CustomerGroupName', type: 'string', name: 'Customer - Customer Group Name' }, { field: 'Customer.National', type: 'string', name: 'Customer - National' }, { field: 'Customer.Zone', type: 'string', name: 'Customer - Zone' }, { field: 'Customer.Region', type: 'string', name: 'Customer - Region' }, { field: 'Customer.Area', type: 'string', name: 'Customer - Area' }, { field: 'Product._id', type: 'string', name: 'Product - ID' }, { field: 'Product.Name', type: 'string', name: 'Product - Name' }, { field: 'Product.ProdCategory', type: 'string', name: 'Product - Category' }, { field: 'Product.Brand', type: 'string', name: 'Product - Brand' }, { field: 'Product.BrandCategoryID', type: 'string', name: 'Product - Brand Category ID' }, { field: 'Product.PCID', type: 'string', name: 'Product - PCID' }, { field: 'Product.ProdSubCategory', type: 'string', name: 'Product - Sub Category' }, { field: 'Product.ProdSubBrand', type: 'string', name: 'Product - Sub Brand' }, { field: 'Product.ProdVariant', type: 'string', name: 'Product - Variant' }, { field: 'Product.ProdDesignType', type: 'string', name: 'Product - Design Type' }, { field: 'Date.ID', type: 'string', name: 'Date - ID' }, { field: 'Date.Date', type: 'string', name: 'Date - Date' }, { field: 'Date.Month', type: 'string', name: 'Date - Month' }, { field: 'Date.Quarter', type: 'int', name: 'Date - Quarter' }, { field: 'Date.YearTxt', type: 'string', name: 'Date - YearTxt' }, { field: 'Date.QuarterTxt', type: 'string', name: 'Date - QuarterTxt' }, { field: 'Date.Year', type: 'int', name: 'Date - Year' }, { field: 'PLGroup1', type: 'string', name: 'PL Group 1' }, { field: 'PLGroup2', type: 'string', name: 'PL Group 2' }, { field: 'PLGroup3', type: 'string', name: 'PL Group 3' }, { field: 'PLGroup4', type: 'string', name: 'PL Group 4' }, { field: 'Value1', type: 'double', name: 'Value 1', as: 'dataPoints' }, { field: 'Value2', type: 'double', name: 'Value 2', as: 'dataPoints' }, { field: 'Value3', type: 'double', name: 'Value 3', as: 'dataPoints' }, { field: 'PCID', type: 'string', name: 'Profit Center ID' }, { field: 'CCID', type: 'string', name: 'Cost Center ID' }, { field: 'SKUID', type: 'string', name: 'SKU ID' }, { field: 'PLCode', type: 'string', name: 'PL Code' }, { field: 'Month', type: 'string', name: 'Month' }, { field: 'Year', type: 'string', name: 'Year' }];

pvt.enableDimensions = ko.observable(true);
pvt.enableRows = ko.observable(true);
pvt.enableDataPoints = ko.observable(true);
pvt.templateDataPoint = {
	aggr: 'sum',
	expand: false,
	field: '',
	name: ''
};
pvt.templateRowColumn = {
	field: '',
	name: '',
	expand: false
};
pvt.optionDimensions = ko.observableArray([{ field: 'PC.BranchID', name: 'Branch/RD' }, { field: 'Customer.ChannelID', name: 'Channel' }, { field: 'Customer.Area', name: 'Geography' }, { field: 'Product._id', name: 'Product' }, { field: 'Date.Date', name: 'Time' }, { field: '', name: 'Cost Type' }, // <<<<< ====================== need to be filled
{ field: 'CC.HCCGroupID', name: 'Function' }]);
pvt.optionRows = ko.observableArray([{ field: 'Customer._id', name: 'Outlet' }, { field: 'Product._id', name: 'SKU' }, { field: 'PC._id', name: 'PC' }, { field: 'CC._id', name: 'CC' }, { field: 'LedgerAccount', name: 'G/L' }]);
pvt.optionDataPoints = ko.observableArray([{ field: 'Value1', name: 'Value 1' }, { field: 'Value2', name: 'Value 2' }, { field: 'Value3', name: 'Value 3' }]);
pvt.optionAggregates = ko.observableArray([{ aggr: 'sum', name: 'Sum' }, { aggr: 'avg', name: 'Avg' },
// { aggr: 'count', name: 'Count' },
{ aggr: 'max', name: 'Max' }, { aggr: 'min', name: 'Min' }]);
pvt.dimensions = ko.observableArray([app.koMap({
	field: pvt.optionDimensions()[1].field,
	name: pvt.optionDimensions()[1].name,
	expand: false
}), app.koMap({
	field: pvt.optionDimensions()[2].field,
	name: pvt.optionDimensions()[2].name,
	expand: false
})]);
pvt.rows = ko.observableArray([app.koMap({
	field: pvt.optionRows()[3].field,
	name: pvt.optionRows()[3].name,
	expand: false
})]);
pvt.dataPoints = ko.observableArray([app.koMap({
	field: pvt.optionDataPoints()[0].field,
	name: pvt.optionDataPoints()[0].name,
	expand: false,
	aggr: pvt.optionAggregates()[0].aggr
})]);

// app.koMap({
// 	field: pvt.optionDataPoints()[0].field,
// 	name: pvt.optionDataPoints()[0].name,
// 	expand: false,
// 	aggr: pvt.optionAggregates()[2].aggr
// }),
pvt.data = ko.observableArray([/*tempData*/]);
pvt.currentTargetDimension = null;

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
		holder.push(ko.mapping.fromJS({ field: row.field, name: row.name, expand: false }));
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
pvt.refreshData = function () {
	var dimensions = ko.mapping.toJS(pvt.dimensions).map(function (d) {
		return { type: 'column', field: d.field, alias: d.name };
	}).concat(ko.mapping.toJS(pvt.rows).map(function (d) {
		return { type: 'row', field: d.field, alias: d.name };
	}));

	var dataPoints = ko.mapping.toJS(pvt.dataPoints).filter(function (d) {
		return d.field != '' && d.aggr != '';
	}).map(function (d) {
		var row = ko.mapping.toJS(pvt.pivotModel).find(function (e) {
			return e.field == d.field;
		});
		var name = row == undefined ? d.field : row.name;
		return { op: d.aggr, field: d.field, alias: name };
	});

	var param = { dimensions: dimensions, datapoints: dataPoints };
	app.ajaxPost("/report/summarycalculatedatapivot", param, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		if (res.data.length == 0) {
			return;
		}

		var config = {
			filterable: false,
			reorderable: false,
			dataSource: {
				data: res.data.data,
				schema: {
					model: {
						fields: res.data.metadata.SchemaModelFields
					},
					cube: {
						dimensions: res.data.metadata.SchemaCubeDimension,
						measures: res.data.metadata.SchemaCubeMeasures
					}
				},
				columns: res.data.metadata.Columns,
				rows: res.data.metadata.Rows,
				measures: res.data.metadata.Measures
			}
		};

		app.log(config);

		$('.pivot').replaceWith('<div class="pivot"></div>');
		$('.pivot').kendoPivotGrid(config);
	});
};

pvt.init = function () {
	pvt.prepareTooltipster();
	pvt.refreshData();
};