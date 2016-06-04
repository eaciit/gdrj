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
sct.configure = function () {
	var data = sct.data();
	var series = [{ xField: sct.xField(), yField: sct.yField() }];

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
			max: 1000,
			labels: { format: '${0}' },
			majorGridLines: { color: '#fafafa' }
		}, 'labels', {
			font: 'Source Sans Pro 11'
		}),
		// template: (d) => app.capitalize(d.value)
		yAxis: {
			majorGridLines: { color: '#fafafa' },
			min: 80,
			labels: { format: '{0}%' }
		}
	};
};

// tooltip: {
//     visible: true,
//     template: "#= '<b>$' + value.x + ' / ' + dataItem.family + ' ' + dataItem.model + ': ' + value.y + '%</b>' #"
// }
var DATATEMP_SCATTER = [{ "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }];

sct.refresh = function () {
	sct.render();
};
sct.render = function () {
	sct.configure(DATATEMP_SCATTER);
	sct.refresh();
};