'use strict';

viewModel.chart = new Object();
var crt = viewModel.chart;

crt.setMode = function (what) {
	return function () {
		crt.mode(what);

		if (what == 'render') {
			crt.refresh();
		}
	};
};
crt.mode = ko.observable('render');
crt.configure = function (series) {
	return {
		title: crt.title(),
		dataSource: { data: crt.data() },
		seriesDefaults: {
			type: crt.chartType(),
			overlay: { gradient: 'none' },
			border: { width: 0 },
			labels: {
				visible: true,
				position: 'outsideEnd',
				format: '{0:n2}'
			}
		},
		series: series,
		seriesColors: app.seriesColorsGodrej,
		categoryAxis: {
			field: app.idAble(crt.categoryAxisField()),
			majorGridLines: { color: '#fafafa' },
			labels: {
				// rotation: 20,
				font: 'Source Sans Pro 11',
				padding: {
					top: 30
				},
				template: function template(d) {
					var max = 20;
					var text = $.trim(app.capitalize(d.value)).replace(' 0', '');

					if (text.length > max) {
						return text.slice(0, max - 3) + '...';
					}

					return text;
				}
			}
		},
		legend: {
			visible: true,
			position: 'bottom'
		},
		valueAxis: {
			majorGridLines: { color: '#fafafa' },
			labels: { format: '{0:n2}' }
		},
		tooltip: {
			visible: true,
			template: function template(d) {
				return $.trim(app.capitalize(d.series.name) + ' on ' + app.capitalize(d.category) + ': ' + kendo.toString(d.value, 'n2'));
			}
		}
	};
};
crt.categoryAxisField = ko.observable('category');
crt.chartType = ko.observable('column');
crt.title = ko.observable('');
crt.data = ko.observableArray([]);
crt.series = ko.observableArray([]);

crt.render = function () {
	var series = ko.mapping.toJS(crt.series).filter(function (d) {
		return d.field != '';
	}).map(function (d) {
		if (app.isUndefined(d.name)) {
			d.name = d.field;
		}

		return d;
	});

	var config = crt.configure(series);
	app.log('chart', app.clone(config));

	$('#chart').replaceWith('<div id="chart" style="height: 300px;"></div>');

	if (crt.data().length > 8) {
		$('#chart').width(crt.data().length * 130);
		$('#chart').parent().css('overflow-x', 'scroll');
	}

	$('#chart').kendoChart(config);
};
crt.getParam = function () {
	var row = rpt.optionDimensions().find(function (d) {
		return d.field == crt.categoryAxisField();
	});
	var dataPoints = ko.mapping.toJS(crt.series).filter(function (d) {
		return d.field != '';
	}).map(function (d) {
		return {
			field: d.field,
			name: d.name,
			aggr: 'sum'
		};
	});

	return rpt.wrapParam('chart', [row], dataPoints);
};
crt.refresh = function () {
	// crt.data(DATATEMP_CHART)
	crt.series([app.koMap({ field: 'value1', name: o['value1'] }), app.koMap({ field: 'value2', name: o['value2'] }), app.koMap({ field: 'value3', name: o['value3'] })]);
	app.ajaxPost("/report/summarycalculatedatapivot", crt.getParam(), function (res) {
		crt.data(res.Data);
		crt.render();
	});
};
crt.refreshOnChange = function () {
	// setTimeout(crt.refresh, 100)
};

$(function () {
	crt.categoryAxisField('customer.branchname');
	crt.refresh();
});