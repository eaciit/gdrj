'use strict';

viewModel.chartCompare = {};
var ccr = viewModel.chartCompare;

ccr.data = ko.observableArray([]);
ccr.dataComparison = ko.observableArray([]);
ccr.title = ko.observable('Chart Comparison');
ccr.contentIsLoading = ko.observable(false);
ccr.categoryAxisField = ko.observable('category');
ccr.breakdownBy = ko.observable('');
ccr.limitchart = ko.observable(3);

ccr.dummyJson = [{
	skuid: "1239123",
	productname: "HIT",
	qty: [1, 2, 3, 4, 5, 6, 0, 0],
	price: [10, 20, 30, 40, 50, 60, 0, 0],
	outlet: [10, 20, 30, 40, 50, 60, 70, 80]
}, {
	skuid: "1239123",
	productname: "Mitu",
	qty: [1, 2, 3, 4, 5, 6, 7, 8],
	price: [10, 20, 30, 40, 50, 60, 70, 80],
	outlet: [10, 20, 30, 40, 50, 60, 70, 80]
}];

ccr.refresh = function () {
	ccr.dataComparison(ccr.dummyJson);
	var tempdata = [];
	var qty = 0;
	var price = 0;
	var quarter = [];
	for (var i in ccr.dataComparison()) {
		qty = _.filter(ccr.dummyJson[i].qty, function (resqty) {
			return resqty == 0;
		}).length;
		price = _.filter(ccr.dummyJson[i].price, function (resprice) {
			return resprice == 0;
		}).length;
		quarter = [];
		for (var a in ccr.dummyJson[i].qty) {
			quarter.push('Quarter ' + (parseInt(a) + 1));
		}
		tempdata.push({
			qty: qty,
			price: price,
			quarter: quarter,
			productname: ccr.dummyJson[i].productname,
			data: ccr.dummyJson[i]
		});
	}
	var sortPriceQty = _.take(_.sortBy(tempdata, function (item) {
		return [item.qty, item.price];
	}), ccr.limitchart());
	ccr.data(sortPriceQty);
	ccr.render();
};
ccr.render = function () {

	var configure = function configure(data, quarter) {
		var series = [{
			name: 'Price',
			// field: 'value1',
			data: data.price,
			width: 3,
			markers: {
				visible: true,
				size: 10,
				border: {
					width: 3
				}
			}
		}, {
			name: 'Qty',
			// field: 'value2',
			data: data.qty,
			width: 3,
			markers: {
				visible: true,
				size: 10,
				border: {
					width: 3
				}
			}
		}, {
			name: 'Outlet',
			// field: 'value3',
			data: data.outlet,
			type: 'bar',
			width: 3,
			overlay: {
				gradient: 'none'
			},
			border: {
				width: 0
			},
			markers: {
				visible: true,
				style: 'smooth',
				type: 'bar'
			}
		}];
		return {
			// dataSource: {
			// 	data: data
			// },
			series: series,
			seriesColors: ["#5499C7", "#ff8d00", "#678900"],
			seriesDefaults: {
				type: "line",
				style: "smooth"
			},
			categoryAxis: {
				baseUnit: "month",
				// field: ccr.categoryAxisField(),
				categories: quarter,
				majorGridLines: {
					color: '#fafafa'
				},
				labels: {
					font: 'Source Sans Pro 11',
					rotation: 40
					// template: (d) => `${app.capitalize(d.value).slice(0, 3)}`
				}
			},
			legend: {
				position: 'bottom'
			},
			valueAxis: {
				majorGridLines: {
					color: '#fafafa'
				}
			},
			tooltip: {
				visible: true,
				template: function template(d) {
					return d.series.name + ' on : ' + kendo.toString(d.value, 'n2');
				}
			}
		};
	};

	var chartContainer = $('.chart-container');
	chartContainer.empty();
	for (var e in ccr.data()) {
		var html = $($('#template-chart-comparison').html());
		var config = configure(ccr.data()[e].data, ccr.data()[e].quarter);

		html.appendTo(chartContainer);
		html.find('.title').html(ccr.data()[e].data.productname);
		html.find('.chart').kendoChart(config);
	}
};

rpt.toggleFilterCallback = function () {
	$('.chart-container .k-chart').each(function (i, e) {
		$(e).data('kendoChart').redraw();
	});
};

$(function () {
	ccr.refresh();
});