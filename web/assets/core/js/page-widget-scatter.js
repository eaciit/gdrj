'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

viewModel.scatter = new Object();
var sct = viewModel.scatter;

sct.title = ko.observable('');
sct.mode = ko.observable('render');
sct.setMode = function (what) {
	return function () {
		sct.mode(what);

		if (what == 'render') {
			sct.refresh();
		}
	};
};

sct.xField = ko.observable('');
sct.yField = ko.observable('');
sct.data = ko.observableArray([]);
sct.dimensions = ko.observableArray([]);
sct.dataPoints = ko.observableArray([]);
sct.configure = function () {
	var data = sct.data();
	var series = [{ xField: sct.xField(), yField: sct.yField() }];

	// let xAxisText, yAxisText = '', ''
	// let xRow = sct.dataPoints().find((d) => (d.field() == sct.xField()))
	// let yRow = sct.dataPoints().find((d) => (d.field() == sct.yField()))

	// if (app.isDefined(xRow)) {
	// 	xAxisText = xRow.na
	// }

	return {
		title: {
			text: sct.title()
		},
		legend: {
			visible: true,
			position: 'bottom'
		},
		dataSource: { data: data },
		seriesDefaults: {
			overlay: { gradient: 'none' },
			border: { width: 0 },
			type: 'scatter'
		},
		series: series,
		xAxis: _defineProperty({
			labels: { format: '${0}' },
			// title: { text: xAxisText },
			majorGridLines: { color: '#fafafa' }
		}, 'labels', {
			font: 'Source Sans Pro 11'
		}),
		// template: (d) => app.capitalize(d.value)
		yAxis: {
			majorGridLines: { color: '#fafafa' },
			labels: { format: '{0}%' }
		},
		// title: { text: yAxisText }
		tooltip: {
			visible: true,
			template: "#= kendo.format(value.x, 'n2') #, #= kendo.format(value.y, 'n2') #"
		}
	};
};

sct.getParam = function () {
	var dimensions = ko.mapping.toJS(sct.dimensions);
	var dataPoints = ko.mapping.toJS(sct.dataPoints).filter(function (d) {
		return d.field != '';
	}).map(function (d) {
		return {
			field: d.field,
			name: d.name,
			aggr: 'sum'
		};
	});

	return ra.wrapParam('scatter', dimensions, dataPoints);
};

sct.refresh = function () {
	// pvt.data(DATATEMP_SCATTER)
	app.ajaxPost("/report/summarycalculatedatapivot", sct.getParam(), function (res) {
		sct.data(res.Data);
		sct.render();
	});
};
sct.render = function () {
	var config = sct.configure();
	app.log('scatter', app.clone(config));
	$('#scatter').kendoChart(config);
};

$(function () {
	return;
	sct.xField('value1');
	sct.yField('value2');

	sct.dimensions([app.koMap({ field: 'customer.branchname', name: 'Branch/RD' }), app.koMap({ field: 'product.name', name: 'Product' }), app.koMap({ field: 'customer.channelname', name: 'Product' })]);
	sct.dataPoints([app.koMap({ field: 'value1', name: o['value1'] }), app.koMap({ field: 'value2', name: o['value2'] }), app.koMap({ field: 'value3', name: o['value3'] })]);

	sct.refresh();
});