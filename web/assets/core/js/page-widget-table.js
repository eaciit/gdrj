'use strict';

viewModel.table = new Object();
var tbl = viewModel.table;

tbl.data = ko.observableArray([]);
tbl.currentTargetDimension = null;

tbl.dimensions = ko.observableArray([]);
tbl.dataPoints = ko.observableArray([]);
tbl.enableDimensions = ko.observable(true);
tbl.enableDataPoints = ko.observable(true);

tbl.setMode = function (what) {
	tbl.mode(what);

	if (what == 'render') {
		tbl.refresh();
	}
};
tbl.mode = ko.observable('render');
tbl.computeDimensionDataPoint = function (which, field) {
	return ko.pureComputed({
		read: function read() {
			return tbl[which]().filter(function (d) {
				return d.field() == field;
			}).length > 0;
		},
		write: function write(value) {
			var row = tbl[which]().find(function (d) {
				return d.field() == field;
			});
			if (app.isDefined(row)) {
				tbl[which].remove(row);
			} else {
				row = app.koMap(app.koUnmap(ra.optionDimensions).find(function (d) {
					return d.field == field;
				}));
				tbl[which].push(row);
			}
		},
		owner: undefined
	});
};
tbl.refresh = function () {
	tbl.data(DATATEMP_TABLE);
	tbl.render();
};
tbl.render = function () {
	var tableWrapper = $('.table').empty();
	var table = app.newEl('table').addClass('table ez').appendTo(tableWrapper);
	var thead = app.newEl('thead').appendTo(table);
	var tbody = app.newEl('tbody').appendTo(table);

	var dimensions = app.koUnmap(tbl.dimensions);
	var dataPoints = app.koUnmap(tbl.dataPoints);

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

	tbl.data().forEach(function (d, i) {
		var tr = app.newEl('tr').appendTo(tbody);
		tds[i] = [];

		dimensions.forEach(function (e, j) {
			var value = d._id[e.field];
			var td = app.newEl('td').addClass('dimension').appendTo(tr).html(kendo.toString(value, "n2"));
			tds.push(td);
			tds[i][j] = td;
		});

		dataPoints.forEach(function (e, i) {
			var value = d[e.field];
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

	var rowLast = app.newEl('tr').appendTo(tbody).addClass('total');
	var tdSpace = app.newEl('td').html('&nbsp;').addClass('Total').attr('colspan', dimensions.length).appendTo(rowLast);

	dataPoints.forEach(function (e, i) {
		var td = app.newEl('td').appendTo(rowLast).html(kendo.toString(sum[i], "n2"));
	});
};

var DATATEMP_TABLE = [{ "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }];

$(function () {
	tbl.dimensions([app.koMap({ field: 'customer.branchname', name: 'Branch/RD' }), app.koMap({ field: 'product.name', name: 'Product' }), app.koMap({ field: 'customer.channelname', name: 'Product' })]);
	tbl.dataPoints([app.koMap({ field: 'value1', name: 'Gross Sales' }), app.koMap({ field: 'value2', name: 'Discount' }), app.koMap({ field: 'value3', name: 'Net Sales' })]);
	tbl.refresh();
});