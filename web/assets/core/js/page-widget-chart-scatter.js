"use strict";

viewModel.scatter = new Object();
var rs = viewModel.scatter;
var dataPoints = [{ field: "value1", name: "value1", aggr: "sum" }];

rs.contentIsLoading = ko.observable(false);
rs.title = ko.observable('P&L Analytic');
rs.breakdownBy = ko.observable('customer.channelname');
rs.selectedPNLNetSales = ko.observable("PL3");
rs.selectedPNL = ko.observable("PL74C");
rs.chartComparisonNote = ko.observable('');
rs.optionDimensionSelect = ko.observableArray([]);

rs.getSalesHeaderList = function () {
	app.ajaxPost("/report/getplmodel", {}, function (res) {
		var data = res.map(function (d) {
			return app.o({ field: d._id, name: d.PLHeader3 });
		}).filter(function (d) {
			return d.PLHeader3 !== rs.selectedPNLNetSales();
		});
		rs.optionDimensionSelect(data);

		var prev = rs.selectedPNL();
		rs.selectedPNL('');
		setTimeout(function () {
			rs.selectedPNL(prev);
			rs.refresh(false);
		}, 300);
	});
};

rs.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	rs.contentIsLoading(true);

	var param1 = {};
	param1.pls = [rs.selectedPNL()];
	param1.groups = [rs.breakdownBy(), 'date.year'];
	param1.aggr = 'sum';
	param1.filters = []; // rpt.getFilterValue()

	app.ajaxPost("/report/getpnldata", param1, function (res1) {
		var date = moment(res1.time).format("dddd, DD MMMM YYYY HH:mm:ss");
		rs.chartComparisonNote("Last refreshed on: " + date);

		var param2 = {};
		param2.pls = [rs.selectedPNLNetSales()];
		param2.groups = [rs.breakdownBy(), 'date.year'];
		param2.aggr = 'sum';
		param2.filters = []; // rpt.getFilterValue()

		app.ajaxPost("/report/getpnldata", param2, function (res2) {
			var date = moment(res2.time).format("dddd, DD MMMM YYYY HH:mm:ss");
			rs.chartComparisonNote("Last refreshed on: " + date);

			var dataAllPNL = res1.Data.Data;
			var dataAllPNLNetSales = res2.Data.Data;

			var selectedPNL = "total" + rs.selectedPNL();
			var years = _.map(_.groupBy(dataAllPNL, function (d) {
				return d._id.fiscal;
			}), function (v, k) {
				return k;
			});

			var maxData = _.maxBy(_.filter(dataAllPNL.concat(dataAllPNLNetSales), function (d) {
				return d[selectedPNL] != 0;
			}), function (d) {
				return d[selectedPNL];
			})[selectedPNL];
			var sumPNL = _.reduce(dataAllPNL, function (m, x) {
				return m + x[selectedPNL];
			}, 0);
			var countPNL = dataAllPNL.length;
			var avgPNL = sumPNL / countPNL;

			var dataScatter = [];

			dataAllPNL.forEach(function (d) {
				dataScatter.push({
					category: app.nbspAble(d._id.pl + " " + d._id.fiscal, 'Uncategorized'),
					year: d._id.fiscal,
					scatterValue: d[selectedPNL],
					scatterPercentage: d[selectedPNL] / (maxData == 0 ? 1 : maxData) * 100,
					lineAvg: avgPNL,
					linePercentage: avgPNL / (maxData == 0 ? 1 : maxData) * 100
				});

				console.log("---->>>>-", avgPNL, d[selectedPNL], maxData);
			});

			console.log("-----", years, dataScatter, maxData);

			rs.contentIsLoading(false);
			rs.generateReport(dataScatter, years);
		}, function () {
			rs.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'pivot chart' : false
		});
	}, function () {
		rs.contentIsLoading(false);
	}, {
		cache: useCache == true ? 'pivot chart' : false
	});
};

rs.generateReport = function (data, years) {
	var max = _.max(_.map(data, function (d) {
		return d.linePercentage;
	}).concat(_.map(data, function (d) {
		return d.scatterPercentage;
	})));

	var netSalesTite = rs.optionDimensionSelect().find(function (d) {
		return d.field == rs.selectedPNLNetSales();
	}).name;
	var breakdownTitle = rs.optionDimensionSelect().find(function (d) {
		return d.field == rs.selectedPNL();
	}).name;

	$('#scatter-view').replaceWith('<div id="scatter-view" style="height: 350px;"></div>');
	if (data.length * 100 > $('#scatter-view').parent().width()) $('#scatter-view').width(data.length * 100);else $('#scatter-view').css('width', '100%');
	$("#scatter-view").kendoChart({
		dataSource: {
			data: data
		},
		title: {
			text: ""
		},
		legend: {
			visible: true,
			position: "bottom"
		},
		seriesDefaults: {
			type: "line",
			missingValues: "gap"
		},
		seriesColors: ["#ff8d00", "#678900"],
		series: [{
			name: "Percentage of " + breakdownTitle + " to " + netSalesTite,
			field: 'linePercentage',
			width: 3,
			tooltip: {
				visible: true,
				template: "Percentage of " + breakdownTitle + " - #: dataItem.category # at #: dataItem.year #: #: kendo.toString(dataItem.linePercentage, 'n2') # % (#: kendo.toString(dataItem.lineAvg, 'n2') #)"
			},
			markers: {
				visible: false
			}
		}, {
			name: "Percentage of " + breakdownTitle,
			field: "scatterPercentage",
			width: 3,
			opacity: 0,
			markers: {
				type: 'cross',
				size: 12
			},
			tooltip: {
				visible: true,
				template: "Percentage of " + breakdownTitle + " to " + netSalesTite + " at #: dataItem.year #: #: kendo.toString(dataItem.scatterPercentage, 'n2') # % (#: kendo.toString(dataItem.scatterValue, 'n2') #)"
			}
		}],
		valueAxis: {
			majorGridLines: {
				color: '#fafafa'
			},
			label: {
				format: "{0}%"
			}
		},
		categoryAxis: [{
			field: 'category',
			labels: {
				rotation: 20
			},
			majorGridLines: {
				color: '#fafafa'
			}
		}, {
			categories: years,
			line: {
				visible: false
			}
		}]
	});
};

$(function () {
	rpt.value.From(moment("2015-02-02").toDate());
	rpt.value.To(moment("2016-02-02").toDate());
	rs.getSalesHeaderList();
});