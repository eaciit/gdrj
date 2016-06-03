'use strict';

vm.currentMenu('Chart Comparison');
vm.currentTitle('Chart Comparison');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Chart Comparison', href: '/chartcomparison' }]);

viewModel.chart = new Object();
var crt = viewModel.chart;

crt.config = {};
crt.config.wetengLuwe = function (title, data, series, categoryAxisField) {
	return {
		title: title,
		dataSource: { data: data },
		seriesDefaults: {
			type: 'column',
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		seriesColors: app.seriesColorsGodrej,
		categoryAxis: {
			field: categoryAxisField,
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: 'Source Sans Pro 11',
				template: function template(d) {
					return app.capitalize(d.value);
				}
			}
		},
		legend: { visible: false },
		valueAxis: {
			majorGridLines: { color: '#fafafa' }
		},
		tooltip: {
			visible: true,
			template: function template(d) {
				return app.capitalize(d.series.name) + ' on ' + app.capitalize(d.dataItem[categoryAxisField]) + ': ' + d.value;
			}
		}
	};
};

crt.createChart = function (o, title) {
	var series = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
	var data = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];
	var categoryAxis = arguments.length <= 4 || arguments[4] === undefined ? 'category' : arguments[4];
	var chartType = arguments.length <= 5 || arguments[5] === undefined ? 'columns' : arguments[5];
	var which = arguments.length <= 6 || arguments[6] === undefined ? 'wetengLuwe' : arguments[6];

	series.forEach(function (d) {
		if (app.isUndefined(d.name)) {
			d.name = d.field;
		}
	});

	var config = crt.config[which](title, data, series, categoryAxis);
	var sel = app.typeIs(o, 'string') ? $(o) : o;
	sel.kendoChart(config);
};