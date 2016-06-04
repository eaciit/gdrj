"use strict";

var DATATEMP_PIVOT = [{ "_id": { "Customer.BranchName": "Jakarta", "Product.Brand": "Mitu" }, "Value1": 1000, "Value2": 800, "Value3": 200 }, { "_id": { "Customer.BranchName": "Jakarta", "Product.Brand": "Hit" }, "Value1": 1100, "Value2": 900, "Value3": 150 }, { "_id": { "Customer.BranchName": "Malang", "Product.Brand": "Mitu" }, "Value1": 900, "Value2": 600, "Value3": 300 }, { "_id": { "Customer.BranchName": "Malang", "Product.Brand": "Hit" }, "Value1": 700, "Value2": 700, "Value3": 100 }, { "_id": { "Customer.BranchName": "Yogyakarta", "Product.Brand": "Mitu" }, "Value1": 1000, "Value2": 800, "Value3": 200 }, { "_id": { "Customer.BranchName": "Yogyakarta", "Product.Brand": "Hit" }, "Value1": 1100, "Value2": 900, "Value3": 150 }];

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.mode = ko.observable('render');
pvt.templateDataPoint = {
	aggr: 'sum',
	field: '',
	name: ''
};
pvt.templateRowColumn = {
	field: '',
	name: ''
};
pvt.data = ko.observableArray(DATATEMP_PIVOT);
pvt.columns = ko.observableArray([]);
pvt.rows = ko.observableArray([]);
pvt.dataPoints = ko.observableArray([]);
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
			content: $("\n\t\t\t\t<h3 class=\"no-margin no-padding\">Add to</h3>\n\t\t\t\t<div>\n\t\t\t\t\t<button class='btn btn-sm btn-success' data-target-module='column' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, \"column\")'>\n\t\t\t\t\t\t<i class='fa fa-columns'></i> Column\n\t\t\t\t\t</button>\n\t\t\t\t\t<button class='btn btn-sm btn-success' data-target-module='row' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, \"row\")'>\n\t\t\t\t\t\t<i class='fa fa-reorder'></i> Row\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t")
		}));
	});

	$('.tooltipster-column-row').each(function (i, e) {
		var title = $(e).closest('.pivot-section').parent().prev().text();
		$(e).tooltipster($.extend(true, config, {
			content: $("\n\t\t\t\t<h3 class=\"no-margin no-padding\">" + title + " setting</h3>\n\t\t\t\t<div>\n\t\t\t\t\t<button class='btn btn-sm btn-success' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.configure(this, \"column\")'>\n\t\t\t\t\t\t<i class='fa fa-gear'></i> Configure\n\t\t\t\t\t</button>\n\t\t\t\t\t<button class='btn btn-sm btn-success' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.removeFrom()'>\n\t\t\t\t\t\t<i class='fa fa-trash'></i> Remove\n\t\t\t\t\t</button>\n\t\t\t\t</div>\n\t\t\t")
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
	$("[data-module=\"" + target + "\"]").addClass('highlight');
};
pvt.hoverOutModule = function (o) {
	var target = $(o).attr('data-target-module');
	$("[data-module=\"" + target + "\"]").removeClass('highlight');
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
	var holder = pvt[what + "s"];
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
		return { field: d.field };
	});

	var dataPoints = ko.mapping.toJS(pvt.dataPoints).map(function (d) {
		return { aggr: d.aggr, field: d.field };
	});

	var param = { dimensions: dimensions, datapoints: dataPoints };
	return param;
};
pvt.computeDimensionDataPoint = function (which, field) {
	return ko.pureComputed({
		read: function read() {
			return pvt[which]().filter(function (d) {
				return d.field() == field;
			}).length > 0;
		},
		write: function write(value) {
			// var lastSpacePos = value.lastIndexOf(" ");
			// if (lastSpacePos > 0) { // Ignore values with no space character
			//     this.firstName(value.substring(0, lastSpacePos)); // Update "firstName"
			//     this.lastName(value.substring(lastSpacePos + 1)); // Update "lastName"
			// }
		},
		owner: undefined
	});
};
pvt.render = function (data) {
	pvt.data(data);

	var pivot = $('.pivot').empty();
	var table = app.newEl('table').addClass('table pivot ez').appendTo(pivot);
	var thead = app.newEl('thead').appendTo(table);
	var tbody = app.newEl('tbody').appendTo(table);

	var dimensions = app.koUnmap(pvt.dimensions);
	var dataPoints = app.koUnmap(pvt.dataPoints);

	// HEADER

	var tr = app.newEl('tr').appendTo(thead);

	dimensions.forEach(function (d) {
		var th = app.newEl('th').html(d.name).appendTo(thead);
	});

	dataPoints.forEach(function (d) {
		var th = app.newEl('th').html(d.name).appendTo(thead);
	});

	// DATA

	var manyDimensions = dimensions.length;
	var tds = [];
	var sum = dataPoints.map(function (d) {
		return 0;
	});

	pvt.data().forEach(function (d, i) {
		var tr = app.newEl('tr').appendTo(tbody);
		tds[i] = [];

		dimensions.forEach(function (e, j) {
			var value = d._id[e.field.toLowerCase()];
			var td = app.newEl('td').addClass('dimension').appendTo(tr).html(kendo.toString(value, "n2"));
			tds.push(td);
			tds[i][j] = td;
		});

		dataPoints.forEach(function (e, i) {
			var value = d[e.field.toLowerCase()];
			var td = app.newEl('td').appendTo(tr).html(kendo.toString(value, "n2"));

			sum[i] += value;
		});

		// dimensions.forEach((d, j) => {
		// 	let rowspan = dimensions.length - j

		// 	if (i % dimensions.length == 0) {
		// 		tds[i][j].attr('rowspan', rowspan)
		// 	} else {
		// 		if (rowspan > 1) {
		// 			// $(tds[i][j]).remove()
		// 		}
		// 	}
		// })
	});

	var rowLast = app.newEl('tr').appendTo(tbody);
	var tdSpace = app.newEl('td').html('&nbsp;').attr('colspan', dataPoints.length - 2).appendTo(rowLast);

	dataPoints.forEach(function (e, i) {
		var td = app.newEl('td').appendTo(rowLast).html(kendo.toString(sum[i], "n2"));
	});
};

pvt.init = function () {
	pvt.prepareTooltipster();
	pvt.refreshData();
};