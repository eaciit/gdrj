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
crt.categoryAxisField = ko.observable('customer.channelname');
crt.title = ko.observable('');
crt.data = ko.observableArray([]);
crt.series = ko.observableArray([]);
crt.contentIsLoading = ko.observable(false);
crt.sortField = ko.observable('');
crt.typeChart = ko.observable('');
crt.chartdata = ko.observableArray([]);
crt.fiscalYear = ko.observable(rpt.value.FiscalYear());
crt.modecustom = ko.observable(false);
crt.dataplmodel = ko.observableArray([]);
crt.valueplmodel = ko.observableArray(["PL8A", "PL94C"]);

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
crt.configure = function (series, colorseries) {
	var dataSort = crt.data();
	if (crt.categoryAxisField() == "date.quartertxt") {
		dataSort = _.orderBy(crt.data(), [crt.categoryAxisField()], ['desc']);
	} else if (crt.categoryAxisField() == "date.month") {
		dataSort = _.orderBy(crt.data(), function (d) {
			return parseInt(d[toolkit.replace(crt.categoryAxisField(), '.', '_')], 10);
		}, ['desc']);
	} else if (crt.sortField() != '') {
		dataSort = _.orderBy(crt.data(), [crt.sortField()], ['desc']);
	}

	if (crt.typeChart() == 'stack') {
		var datayo = _.map(dataSort, function (k, e) {
			var data = {};
			$.each(k, function (key, value) {
				if (value != 0) data[key] = value;
			});
			return data;
		});
		dataSort = datayo;
	}
	return {
		title: crt.title(),
		dataSource: { data: dataSort },
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
		seriesColors: colorseries,
		categoryAxis: {
			field: app.idAble(crt.categoryAxisField()),
			majorGridLines: { color: '#fafafa' },
			labels: {
				// rotation: 20,
				font: 'Source Sans Pro 11',
				template: function template(d) {
					if ($.trim(d.value) == '') {
						return 'Other';
					}

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
			majorGridLines: {
				color: '#fafafa'
			},
			labels: {
				visible: false
			},
			minorGridLines: {
				skip: 3
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
	var data = _.sortBy(crt.data(), function (d) {
		return toolkit.redefine(d[toolkit.replace(crt.categoryAxisField(), '.', '_')], 'Other');
	});
	crt.data(data);

	var series = ko.mapping.toJS(crt.series).filter(function (d) {
		return d.field != '';
	}).map(function (d) {
		if (app.isUndefined(d.name)) {
			d.name = d.field;
		}

		return d;
	});

	var config = void 0,
	    seriesarr = [],
	    tempcol = 0;
	if (crt.typeChart() == '') {
		crt.chartdata(series);
		for (var i in series) {
			config = crt.configure([series[i]], [app.seriesColorsGodrej[i]]);
			$('#chart' + i).replaceWith('<div id="chart' + i + '" style="height: 180px;"></div>');

			if (crt.data().length > 8) {
				$('#chart' + i).width(crt.data().length * 130);
				$('#chart' + i).parent().css('overflow-x', 'scroll');
			}

			$('#chart' + i).kendoChart(config);
		}
	} else if (crt.typeChart() == 'stack') {
		(function () {
			seriesarr = _.groupBy(series, function (e) {
				return e.stack;
			});
			var i = 0;
			$.each(seriesarr, function (key, value) {
				crt.chartdata.push(value);
			});
			$.each(seriesarr, function (key, value) {
				if (value.length == 1) delete value[0]['stack'];
				config = crt.configure(value, app.seriesColorsGodrej);
				$('#chart' + i).replaceWith('<div id="chart' + i + '" style="height: 180px;"></div>');

				if (crt.data().length > 8) {
					$('#chart' + i).width(crt.data().length * 130);
					$('#chart' + i).parent().css('overflow-x', 'scroll');
				}

				$('#chart' + i).kendoChart(config);
				tempcol = value.length;
				i++;
			});
		})();
	}
};
crt.getPlModel = function (datapl) {
	var data = _.filter(datapl, function (d) {
		return d.PLHeader2 == d.PLHeader1 && d.PLHeader3 == d.PLHeader1;
	});
	crt.dataplmodel(data);
	if (crt.data().length == 0) {
		crt.valueplmodel(["PL8A", "PL94C"]);
		pvt.valueplmodel(["PL8A", "PL94C"]);
	}
};
crt.renderCustomChart = function (data) {
	var series = [],
	    dataresult = [];
	var breakdown = toolkit.replace(crt.categoryAxisField(), ".", "_"),
	    keydata = void 0,
	    dataseries = void 0;
	var rows = data.map(function (d) {
		var row = {};
		row[breakdown] = d._id['_id_' + breakdown];
		$.each(d, function (key, value) {
			keydata = _.find(crt.dataplmodel(), function (s) {
				return s._id == key;
			});
			if (keydata != undefined) {
				row[key] = value;
				dataseries = _.find(series, function (s) {
					return s.field == key;
				});
				if (dataseries == undefined) {
					series.push({
						field: key, title: keydata.PLHeader1, name: keydata.PLHeader1
					});
				}
			}
		});
		return row;
	});
	var op1 = _.groupBy(rows, function (d) {
		return d[breakdown];
	});
	var op2 = _.map(op1, function (v, k) {
		var row = {};
		row[breakdown] = k;
		var sample = v[0];

		var _loop = function _loop(key) {
			if (sample.hasOwnProperty(key) && key != breakdown) {
				row[key] = toolkit.sum(v, function (d) {
					return d[key];
				});
				row[key] = Math.abs(row[key]);
			}
		};

		for (var key in sample) {
			_loop(key);
		}

		return row;
	});
	crt.series(series);
	crt.data(op2);
};
crt.refresh = function () {
	rpt.refreshView('reportwidget');
	var param = {};
	param.pls = [];
	param.flag = o.ID;
	param.groups = [crt.categoryAxisField(), "date.fiscal"];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, crt.fiscalYear);

	if (rpt.modecustom() == true) {
		param.pls = crt.valueplmodel();
		param.flag = "";
	}

	crt.contentIsLoading(true);

	var fetch = function fetch() {
		app.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			crt.getPlModel(res.Data.PLModels);
			crt.data(res.Data.Data);
			crt.contentIsLoading(false);
			if (rpt.modecustom() == true) {
				crt.renderCustomChart(res.Data.Data);
			}

			crt.render();
		}, function () {
			crt.contentIsLoading(false);
		});
	};
	fetch();
};