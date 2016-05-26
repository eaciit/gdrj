'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.fields = ko.observableArray([{ _id: 'fieldA', Name: 'Field A' }, { _id: 'fieldB', Name: 'Field B' }, { _id: 'fieldC', Name: 'Field C' }, { _id: 'fieldD', Name: 'Field D' }, { _id: 'fieldE', Name: 'Field E' }, { _id: 'fieldF', Name: 'Field F' }]);
pvt.mode = ko.observable('');
pvt.columns = ko.observableArray([]);
pvt.rows = ko.observableArray([]);
pvt.values = ko.observableArray([]);
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
			content: $('\n\t\t\t\t<h3 class="no-margin no-padding">Add to</h3>\n\t\t\t\t<div>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' data-target-module=\'column\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.addAs(this, "column")\'>\n\t\t\t\t\t\tColumn\n\t\t\t\t\t</button>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' data-target-module=\'row\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.addAs(this, "row")\'>\n\t\t\t\t\t\tRow\n\t\t\t\t\t</button>\n\t\t\t\t\t<button class=\'btn btn-sm btn-success\' data-target-module=\'value\' onmouseenter=\'pvt.hoverInModule(this);\' onmouseleave=\'pvt.hoverOutModule(this);\' onclick=\'pvt.addAs(this, "value")\'>\n\t\t\t\t\t\tData\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t')
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
		holder.push(row);
	}
};
pvt.refreshData = function () {
	pvt.mode('render');

	$('.pivot').kendoPivotGrid({
		filterable: true,
		sortable: true,
		// columnWidth: 200,
		// height: 580,
		dataSource: {
			// type: 'xmla',
			columns: [{ name: '[Date].[Calendar]', expand: true }, { name: '[Product].[Category]' }],
			rows: [{ name: '[Geography].[City]' }],
			measures: ['[Measures].[Reseller Freight Cost]']
		}
	});

	// $('#configurator').kendoPivotConfigurator({
	//     dataSource: pivotgrid.dataSource,
	//     filterable: true,
	//     sortable: true,
	//     height: 580
	// });
};

// transport: {
//     connection: {
//         catalog: 'Adventure Works DW 2008R2',
//         cube: 'Adventure Works'
//     },
//     read: '//demos.telerik.com/olap/msmdpump.dll'
// },
// schema: {
//     type: 'xmla'
// },
// error: function (e) {
//     alert('error: ' + kendo.stringify(e.errors[0]));
// }
pvt.init = function () {
	pvt.prepareTooltipster();
};