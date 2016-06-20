'use strict';

viewModel.pivot = new Object();
var pvt = viewModel.pivot;

pvt.title = ko.observable('Pivot');
pvt.contentIsLoading = ko.observable(false);

pvt.optionRows = ko.observableArray(rpt.optionDimensions());
pvt.optionColumns = ko.observableArray(rpt.optionDimensions());

pvt.row = ko.observable('');
pvt.column = ko.observable('');
pvt.dataPoints = ko.observableArray([]);
pvt.data = ko.observableArray([]);
pvt.fiscalYear = ko.observable(rpt.value.FiscalYear());
pvt.valueplmodel = ko.observableArray(["PL8A", "PL94C"]);

pvt.renderCustomChart = function (data) {
	var series = [],
	    dataresult = [];
	var breakdown = toolkit.replace(pvt.column(), ".", "_"),
	    breakdownrow = toolkit.replace(pvt.row(), ".", "_"),
	    keydata = void 0,
	    dataseries = void 0;
	var rows = data.map(function (d) {
		var row = {};
		row[breakdown] = d._id['_id_' + breakdown];
		row[breakdownrow] = d._id['_id_' + breakdownrow];
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
	pvt.dataPoints(series);
	pvt.data(rows);
};
pvt.refresh = function () {
	var param = {};
	param.pls = [];
	param.flag = o.ID;
	param.groups = rpt.parseGroups([pvt.row(), pvt.column(), "date.fiscal"]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, pvt.fiscalYear);

	if (rpt.modecustom() == true) {
		param.pls = pvt.valueplmodel();
		param.flag = "";
	}

	pvt.contentIsLoading(true);

	var fetch = function fetch() {
		app.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			pvt.data(res.Data.Data);
			pvt.contentIsLoading(false);

			if (rpt.modecustom() == true) {
				pvt.renderCustomChart(res.Data.Data);
			}
			pvt.render();
		}, function () {
			pvt.contentIsLoading(false);
		});
	};
	fetch();
};
pvt.render = function () {
	var schemaModelFields = {};
	var schemaCubeDimensions = {};
	var schemaCubeMeasures = {};
	var columns = [];
	var rows = [];
	var measures = [];

	var data = _.sortBy(pvt.data(), function (d) {
		return toolkit.redefine(d[toolkit.replace(pvt.column(), '.', '_')], '');
	});[pvt.row()].forEach(function (d, i) {
		var row = pvt.optionRows().find(function (e) {
			return e.field == d;
		});
		var field = toolkit.replace(row.field, '.', '_');
		schemaModelFields[field] = { type: 'string', field: field };
		rows.push({ name: field, expand: i == 0 });
	});[pvt.column()].forEach(function (d, i) {
		var row = pvt.optionColumns().find(function (e) {
			return e.field == d;
		});
		var field = toolkit.replace(row.field, '.', '_');
		schemaModelFields[field] = { type: 'string', field: field };
		columns.push({ name: field, expand: i == 0 });
	});

	pvt.dataPoints().forEach(function (d) {
		var field = toolkit.replace(d.field, '.', '_');
		schemaModelFields[field] = { type: 'number' };
		schemaCubeDimensions[field] = { caption: d.title };

		schemaCubeMeasures[d.title] = { field: field, format: '{0:c}', aggregate: 'sum' };
		measures.push(d.title);
	});

	var config = {
		filterable: false,
		reorderable: false,
		dataCellTemplate: function dataCellTemplate(d) {
			return '<div class="align-right">' + kendo.toString(d.dataItem.value, "n2") + '</div>';
		},
		dataSource: {
			data: data,
			schema: {
				model: {
					fields: schemaModelFields
				},
				cube: {
					dimensions: schemaCubeDimensions,
					measures: schemaCubeMeasures
				}
			},
			columns: columns,
			rows: rows,
			measures: measures
		}
	};

	// app.log('pivot', app.clone(config))
	$('.pivot').replaceWith('<div class="pivot ez"></div>');
	$('.pivot').kendoPivotGrid(config);
};