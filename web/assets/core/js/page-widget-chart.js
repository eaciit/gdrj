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
crt.categoryAxisField = ko.observable('category');
crt.title = ko.observable('');
crt.data = ko.observableArray([]);
crt.series = ko.observableArray([]);
crt.contentIsLoading = ko.observable(false);

crt.convertCurrency = function (labelValue) {
	var res = Math.abs(Number(labelValue)) >= 1.0e+9 ? Math.abs(Number(labelValue)) / 1.0e+9 + " B" : Math.abs(Number(labelValue)) >= 1.0e+6 ? Math.abs(Number(labelValue)) / 1.0e+6 + " M" : Math.abs(Number(labelValue)) >= 1.0e+3 ? Math.abs(Number(labelValue)) / 1.0e+3 + " K" : kendo.toString(labelValue, "n2");
	var indexres = res.indexOf('.'),
	    indexcurrency = res.indexOf(' '),
	    type = "";
	if (indexres == -1) indexres = 0;
	if (indexcurrency == -1 || indexcurrency == 0) {
		indexcurrency = 0;
		type = res;
	} else {
		type = kendo.toString(parseInt(res.substring(0, indexres)), "n0") + res.substring(indexcurrency, res.length);
	}
	return type;
};
crt.convertCurrency2 = function (labelValue) {
	var res = Math.abs(Number(labelValue)) >= 1.0e+9 ? kendo.toString(Math.abs(Number(labelValue)) / 1.0e+9, 'n0') + " B" : Math.abs(Number(labelValue)) >= 1.0e+6 ? kendo.toString(Math.abs(Number(labelValue)) / 1.0e+6, 'n0') + " M" : Math.abs(Number(labelValue)) >= 1.0e+3 ? kendo.toString(Math.abs(Number(labelValue)) / 1.0e+3, 'n0') + " K" : labelValue.toString();
	return res;
};
crt.configure = function (series) {
	return {
		title: crt.title(),
		dataSource: { data: crt.data() },
		seriesDefaults: {
			type: 'column',
			overlay: { gradient: 'none' },
			border: { width: 0 },
			labels: {
				visible: true,
				position: 'outsideEnd',
				// format: '{0:n2}',
				template: "#: crt.convertCurrency(value) #"
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
			labels: {
				// format: '{0:n2}',
				visible: true,
				template: "#= crt.convertCurrency2(value) #"
			}
		},
		tooltip: {
			visible: true,
			template: function template(d) {
				return $.trim(app.capitalize(d.series.name) + ' on ' + app.capitalize(d.category) + ': ' + kendo.toString(d.value, 'n2'));
			}
		}
	};
};

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
crt.refresh = function () {
	var param = {};
	param.pls = [];
	param.flag = o.ID;
	param.groups = [crt.categoryAxisField()];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	crt.contentIsLoading(true);

	var fetch = function fetch() {
		app.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			crt.data(res.Data.Data);
			crt.contentIsLoading(false);
			crt.render();
		}, function () {
			crt.contentIsLoading(false);
		});
	};
	fetch();
};