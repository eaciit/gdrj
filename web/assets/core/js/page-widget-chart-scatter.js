"use strict";

viewModel.scatter = new Object();
var rs = viewModel.scatter;
var dataPoints = [{ field: "value1", name: "value1", aggr: "sum" }];

rs.contentIsLoading = ko.observable(false);
rs.title = ko.observable('P&L Analytic');
rs.breakdownBy = ko.observable('customer.channelname');
rs.pplheader = ko.observable('EBIT');
rs.datascatter = ko.observableArray([]);

rs.optionDimensionSelect = ko.observableArray([]);

rs.getSalesHeaderList = function () {
	app.ajaxPost("/report/GetSalesHeaderList", {}, function (res) {
		var data = Lazy(res).map(function (k, v) {
			return { field: k._id['plmodel.plheader1'], name: k._id['plmodel.plheader1'] };
		}).toArray();
		rs.optionDimensionSelect(data);
		rs.optionDimensionSelect.remove(function (item) {
			return item.field == 'Net Sales';
		});
		rs.pplheader('EBIT');
		rs.refresh();
	});
};

rs.refresh = function () {
	setTimeout(function () {
		var dimensions = [{ "field": "plmodel.plheader1", "name": "plheader1" }, { "field": rs.breakdownBy(), "name": "Channel" }, { "field": "year", "name": "Year" }];
		var dataPoints = [{ field: "value1", name: "value1", aggr: "sum" }];
		var param = rpt.wrapParam(dimensions, dataPoints);
		param.filters.push({
			"Op": "$eq",
			"Field": "plmodel.plheader1",
			"Value": rs.pplheader()
		});
		app.ajaxPost("/report/summarycalculatedatapivot", param, function (res) {
			var dataall = Lazy(res.Data).groupBy(function (f) {
				return f['year'];
			}).map(function (k, v) {
				return { _id: v, data: k };
			}).toArray();

			param.filters = [];
			param.filters.push({
				"Op": "$eq",
				"Field": "plmodel.plheader1",
				"Value": 'Net Sales'
			});
			app.ajaxPost("/report/summarycalculatedatapivot", param, function (res2) {
				var dataall2 = Lazy(res2.Data).groupBy(function (f) {
					return f['year'];
				}).map(function (k, v) {
					return { _id: v, data: k };
				});

				rs.datascatter([]);
				var title = Lazy(rpt.optionDimensions()).findWhere({ field: rs.breakdownBy() }).title;
				for (var i in dataall) {
					var currentDataAll = Lazy(dataall).findWhere({ _id: dataall[i]._id });
					var currentDataAll2 = Lazy(dataall2).findWhere({ _id: dataall[i]._id });

					var totalDataAll = Lazy(currentDataAll.data).sum(function (e) {
						return e.value1;
					});
					var totalDataAll2 = Lazy(currentDataAll2.data).sum(function (e) {
						return e.value1;
					});

					var maxNetSales = Lazy(currentDataAll2.data).max(function (e) {
						return e.value1;
					}).value1;
					var percentage = maxNetSales / 2 / totalDataAll2;
					var v = maxNetSales * 100;
					var meanYear = (dataall[i].data.length / 2).toFixed(0) - 1;
					var titleValue = '';

					for (var a in dataall[i].data) {
						titleValue = dataall[i].data[a][title];
						if (a == meanYear) titleValue = titleValue + '\n ' + dataall[i].data[a].year;
						rs.datascatter.push({
							pplheader: percentage * 100,
							value1: dataall[i].data[a].value1 / (maxNetSales / 2) * 100,
							title: titleValue,
							header: dataall[i].data[a].plmodel_plheader1,
							year: dataall[i].data[a].year
						});
					}
					if (i == 0) {
						rs.datascatter.push({
							pplheader: null,
							value1: null,
							title: '',
							header: null
						});
					}
				}
				rs.generateReport();
			});
		});
	});
};

rs.generateReport = function () {
	$('#scatter-view').width(rs.datascatter().length * 120);
	$("#scatter-view").kendoChart({
		dataSource: {
			data: rs.datascatter()
		},
		title: {
			text: ""
		},
		legend: {
			visible: false
		},
		seriesDefaults: {
			type: "line",
			missingValues: "gap"
		},
		// stack: {
		//     type: "100%"
		// }
		series: [{
			name: "PPL",
			field: 'pplheader',
			color: "#f3ac32",
			tooltip: {
				visible: true,
				template: "#: dataItem.title # - #: kendo.toString(dataItem.pplheader, 'pplheader') #"
			}
		}, {
			name: "PPL",
			color: "red",
			field: "value1",
			opacity: 0,
			markers: {
				type: 'cross',
				size: 8
			},
			tooltip: {
				visible: true,
				template: "#: dataItem.title # - #: kendo.toString(dataItem.value1, 'n2') #"
			}
		}],
		valueAxis: {
			line: {
				visible: false
			},
			minorGridLines: {
				visible: true
			},
			label: {
				template: "#: value #%"
			}
		},
		categoryAxis: {
			field: 'title',
			majorGridLines: {
				visible: false
			}
		},
		//       labels: {
		// 	rotation: 60
		// }
		tooltip: {
			visible: true,
			template: "#= series.name #: #= value #"
		}
	});
};

$(function () {
	rpt.value.From(moment("2015-02-02").toDate());
	rpt.value.To(moment("2016-02-02").toDate());
	// rs.refresh()
	rs.getSalesHeaderList();
});