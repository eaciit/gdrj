'use strict';

viewModel.chartCompare = {};
var ccr = viewModel.chartCompare;

ccr.data = ko.observableArray([]);
ccr.title = ko.observable('Chart Comparison');
ccr.contentIsLoading = ko.observable(false);
ccr.categoryAxisField = ko.observable('category');
ccr.breakdownBy = ko.observable('');

ccr.refresh = function () {
	ccr.data(DATATEMP_CHART_CR);
	ccr.render();
};
ccr.render = function () {
	var series = [{
		name: 'Price',
		field: 'value1',
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
		field: 'value2',
		width: 3,
		markers: {
			visible: true,
			size: 10,
			border: {
				width: 3
			}
		}
	}, {
		name: 'Sales',
		field: 'value3',
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

	var configure = function configure(data) {
		return {
			dataSource: {
				data: data
			},
			series: series,
			seriesColors: ["#5499C7", "#ff8d00", "#678900"],
			seriesDefaults: {
				type: "line",
				style: "smooth"
			},
			categoryAxis: {
				baseUnit: "month",
				field: ccr.categoryAxisField(),
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
					return d.series.name + ' on ' + d.category + ': ' + kendo.toString(d.value, 'n2');
				}
			}
		};
	};

	var chartContainer = $('.chart-container');
	chartContainer.empty();

	app.forEach(ccr.data(), function (k, v) {
		var html = $($('#template-chart-comparison').html());
		var config = configure(v);

		html.appendTo(chartContainer);
		html.find('.title').html(k);
		html.find('.chart').kendoChart(config);
	});
};

rpt.toggleFilterCallback = function () {
	$('.chart-container .k-chart').each(function (i, e) {
		$(e).data('kendoChart').redraw();
	});
};

$(function () {
	ccr.refresh();
});