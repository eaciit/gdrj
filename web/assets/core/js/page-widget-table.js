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
	return function () {
		tbl.mode(what);

		if (what == 'render') {
			tbl.refresh();
		}
	};
};
tbl.mode = ko.observable('render');
tbl.computeDimensionDataPoint = function (which, field) {
	return ko.pureComputed({
		read: function read() {
			console.log(which, field, tbl[which]());
			return tbl[which]().filter(function (d) {
				return d.field() == field;
			}).length > 0;
		},
		write: function write(value) {
			console.log(which, tbl, field, tbl[which]);
			var row = tbl[which]().find(function (d) {
				return d.field() == field;
			});
			if (app.isDefined(row)) {
				tbl[which].remove(row);
			} else {
				var option = which == 'dataPoint' ? 'optionDataPoints' : 'optionDimensions';
				row = app.koMap(app.koUnmap(ra[option]).find(function (d) {
					return d.field == field;
				}));
				tbl[which].push(row);
			}
		},
		owner: undefined
	});
};
tbl.refresh = function () {
	// pvt.data(DATATEMP_TABLE)
	app.ajaxPost("/report/summarycalculatedatapivot", tbl.getParam(), function (res) {
		tbl.data(res.Data);
		tbl.render();
	});
};
tbl.render = function () {
	var dimensions = app.koUnmap(tbl.dimensions).filter(function (d) {
		return d.field != '';
	}).map(function (d) {
		return { field: d.field.replace(/\./g, '_'), title: d.name };
	});
	var dataPoints = ko.mapping.toJS(tbl.dataPoints).filter(function (d) {
		return d.field != '' && d.field != '';
	}).map(function (d) {
		return { field: d.field.replace(/\./g, '_'), title: d.name };
	});

	var columns = dimensions.concat(dataPoints);

	columns.forEach(function (d, i) {
		d.format = '{0:n2}';
	});

	$('.table').kendoGrid({
		dataSource: {
			data: tbl.data(),
			pageSize: 12
		},
		pageable: true,
		columns: columns
	});
	// let tableWrapper = $('.table').empty()
	// let table = app.newEl('table').addClass('table ez').appendTo(tableWrapper)
	// let thead = app.newEl('thead').appendTo(table)
	// let tbody = app.newEl('tbody').appendTo(table)

	// if ((tbl.dimensions().length + tbl.dataPoints().length) > 6) {
	// 	table.css('min-width', '600px')
	// 	table.parent().css('overflow-x', 'scroll')
	// } else {
	// 	table.css('min-width', 'inherit')
	// 	table.parent().css('overflow-x', 'inherit')
	// }

	// let dimensions = app.koUnmap(tbl.dimensions)
	// 	.filter((d) => (d.field != ''))
	// let dataPoints = app.koUnmap(tbl.dataPoints)
	// 	.filter((d) => (d.field != '') && (d.aggr != ''))

	// // HEADER

	// let tr = app.newEl('tr').appendTo(thead)

	// dimensions.forEach((d) => {
	// 	let th = app.newEl('th').html(d.name).appendTo(thead)
	// })

	// dataPoints.forEach((d) => {
	// 	let th = app.newEl('th').html(d.name).appendTo(thead)
	// })

	// // DATA

	// let manyDimensions = dimensions.length
	// let tds = []
	// let sum = dataPoints.map((d) => 0)

	// tbl.data().forEach((d, i) => {
	// 	let tr = app.newEl('tr').appendTo(tbody)
	// 	tds[i] = []

	// 	dimensions.forEach((e, j) => {
	// 		let value = d._id[e.field]
	// 		let td = app.newEl('td').addClass('dimension').appendTo(tr).html(kendo.toString(value, "n2"))
	// 		tds.push(td)
	// 		tds[i][j] = td
	// 	})

	// 	dataPoints.forEach((e, i) => {
	// 		let value = d[e.field]
	// 		let td = app.newEl('td').appendTo(tr).html(kendo.toString(value, "n2"))

	// 		sum[i] += value
	// 	})

	// 	// dimensions.forEach((d, j) => {
	// 	// 	let rowspan = dimensions.length - j

	// 	// 	if (i % dimensions.length == 0) {
	// 	// 		tds[i][j].attr('rowspan', rowspan)
	// 	// 	} else {
	// 	// 		if (rowspan > 1) {
	// 	// 			// $(tds[i][j]).remove()
	// 	// 		}
	// 	// 	}
	// 	// })
	// })

	// let rowLast = app.newEl('tr').appendTo(tbody).addClass('total')
	// let tdSpace = app.newEl('td').html('&nbsp;')
	// 	.addClass('Total')
	// 	.attr('colspan', dimensions.length).appendTo(rowLast)

	// dataPoints.forEach((e, i) => {
	// 	let td = app.newEl('td').appendTo(rowLast).html(kendo.toString(sum[i], "n2"))
	// })
};

tbl.getParam = function () {
	var dimensions = ko.mapping.toJS(tbl.dimensions).filter(function (d) {
		return d.field != '';
	});
	var dataPoints = ko.mapping.toJS(tbl.dataPoints).filter(function (d) {
		return d.field != '' && d.field != '';
	}).map(function (d) {
		return { field: d.field, name: d.name, aggr: 'sum' };
	});

	return {
		dimensions: dimensions,
		dataPoints: dataPoints,
		filters: rpt.getFilterValue(),
		which: o.ID
	};
};

var DATATEMP_TABLE = [{ "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }];

$(function () {
	tbl.dimensions([app.koMap({ field: 'customer.branchname', name: 'Branch/RD' }), app.koMap({ field: 'product.name', name: 'Product' }), app.koMap({ field: 'customer.channelname', name: 'Product' })]);
	tbl.dataPoints([app.koMap({ field: 'value1', name: o['value1'] }), app.koMap({ field: 'value2', name: o['value2'] }), app.koMap({ field: 'value3', name: o['value3'] })]);
	tbl.refresh();
});