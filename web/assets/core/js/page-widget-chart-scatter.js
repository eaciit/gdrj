"use strict";

viewModel.scatter = new Object();
var rs = viewModel.scatter;
var dataPoints = [{ field: "value1", name: "value1", aggr: "sum" }];

rs.contentIsLoading = ko.observable(false);
rs.title = ko.observable('P&L Analytic');
rs.breakdownBy = ko.observable('customer.channelname');
rs.selectedPNLNetSales = ko.observable("PL8A"); // PL1
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
	param1.pls = [rs.selectedPNL(), rs.selectedPNLNetSales()];
	param1.groups = [rs.breakdownBy(), 'date.year'];
	param1.aggr = 'sum';
	param1.filters = rpt.getFilterValue();

	var fetch = function fetch() {
		app.ajaxPost("/report/getpnldatanew", param1, function (res1) {
			if (res1.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			var date = moment(res1.time).format("dddd, DD MMMM YYYY HH:mm:ss");
			rs.chartComparisonNote("Last refreshed on: " + date);

			var dataAllPNL = res1.Data.Data.filter(function (d) {
				return d.hasOwnProperty(rs.selectedPNL());
			}).map(function (d) {
				return { _id: d._id, value: d[rs.selectedPNL()] };
			});
			var dataAllPNLNetSales = res1.Data.Data.filter(function (d) {
				return d.hasOwnProperty(rs.selectedPNLNetSales());
			}).map(function (d) {
				return { _id: d._id, value: d[rs.selectedPNLNetSales()] };
			});

			var years = _.map(_.groupBy(dataAllPNL, function (d) {
				return d._id._id_date_year;
			}), function (v, k) {
				return k;
			});

			var sumNetSales = _.reduce(dataAllPNLNetSales, function (m, x) {
				return m + x.value;
			}, 0);
			var sumPNL = _.reduce(dataAllPNL, function (m, x) {
				return m + x.value;
			}, 0);
			var countPNL = dataAllPNL.length;
			var avgPNL = sumPNL / countPNL;

			var dataScatter = [];
			var multiplier = sumNetSales == 0 ? 1 : sumNetSales;

			dataAllPNL.forEach(function (d) {
				dataScatter.push({
					category: app.nbspAble(d._id["_id_" + app.idAble(rs.breakdownBy())] + " " + d._id._id_date_year, 'Uncategorized'),
					year: d._id._id_date_year,
					valuePNL: d.value,
					valuePNLPercentage: d.value / multiplier * 100,
					avgPNL: avgPNL,
					avgPNLPercentage: avgPNL / multiplier * 100,
					sumPNL: sumPNL,
					sumPNLPercentage: sumPNL / multiplier * 100
				});
			});

			rs.contentIsLoading(false);
			rs.generateReport(dataScatter, years);
		}, function () {
			rs.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'pivot chart' : false
		});
	};

	fetch();
};

rs.generateReport = function (data, years) {
	data = _.sortBy(data, function (d) {
		return d.year + " " + d.category;
	});

	var max = _.max(_.map(data, function (d) {
		return d.avgNetSalesPercentage;
	}).concat(_.map(data, function (d) {
		return d.valuePNLPercentage;
	})));

	var netSalesTitle = rs.optionDimensionSelect().find(function (d) {
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
		seriesColors: ["#ff8d00", "#678900", '#3498DB'],
		series: [{
			name: "Sum of " + breakdownTitle + " to " + netSalesTitle,
			field: 'sumPNLPercentage',
			width: 3,
			tooltip: {
				visible: true,
				template: "Sum of " + breakdownTitle + ": #: kendo.toString(dataItem.sumPNLPercentage, 'n2') # % (#: kendo.toString(dataItem.sumPNL, 'n2') #)"
			},
			markers: {
				visible: false
			}
		}, {
			name: "Average of " + breakdownTitle + " to " + netSalesTitle,
			field: 'avgPNLPercentage',
			width: 3,
			tooltip: {
				visible: true,
				template: "Average of " + breakdownTitle + ": #: kendo.toString(dataItem.avgPNLPercentage, 'n2') # % (#: kendo.toString(dataItem.avgPNL, 'n2') #)"
			},
			markers: {
				visible: false
			}
		}, {
			name: breakdownTitle + " to " + netSalesTitle,
			field: "valuePNLPercentage",
			width: 3,
			opacity: 0,
			markers: {
				type: 'cross',
				size: 12
			},
			tooltip: {
				visible: true,
				template: breakdownTitle + " #: dataItem.category # at #: dataItem.year # to " + netSalesTitle + ": #: kendo.toString(dataItem.valuePNLPercentage, 'n2') # % (#: kendo.toString(dataItem.valuePNL, 'n2') #)"
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
	rs.getSalesHeaderList();
});