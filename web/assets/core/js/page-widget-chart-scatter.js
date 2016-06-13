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

			var maxData1 = 0;try {
				maxData1 = _.maxBy(dataAllPNL.filter(function (d) {
					return d.value != 0;
				}), function (d) {
					return d.value;
				}).value;
			} catch (err) {}

			var maxData2 = 0;try {
				maxData2 = _.maxBy(dataAllPNLNetSales.filter(function (d) {
					return d.value != 0;
				}), function (d) {
					return d.value;
				}).value;
			} catch (err) {}
			var maxData = _.max([maxData1, maxData2]);

			var sumPNL = _.reduce(dataAllPNL, function (m, x) {
				return m + x.value;
			}, 0);
			var countPNL = dataAllPNL.length;
			var avgPNL = sumPNL / countPNL;

			var dataScatter = [];
			var multiplier = maxData == 0 ? 1 : maxData;

			dataAllPNL.forEach(function (d) {
				dataScatter.push({
					category: app.nbspAble(d._id["_id_" + app.idAble(rs.breakdownBy())] + " " + d._id._id_date_year, 'Uncategorized'),
					year: d._id._id_date_year,
					valuePNL: d.value,
					valuePNLPercentage: d.value / multiplier * 100,
					avgNetSales: avgPNL,
					avgNetSalesPercentage: avgPNL / multiplier * 100
				});

				console.log("---->>>>-", avgPNL, d.value, maxData);
			});

			console.log("-----", years, dataScatter, maxData);

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
		seriesColors: ["#ff8d00", "#678900"],
		series: [{
			name: "Average of " + netSalesTitle,
			field: 'avgNetSalesPercentage',
			width: 3,
			tooltip: {
				visible: true,
				template: "Average of " + netSalesTitle + ": #: kendo.toString(dataItem.avgNetSalesPercentage, 'n2') # % (#: kendo.toString(dataItem.avgNetSales, 'n2') #)"
			},
			markers: {
				visible: false
			}
		}, {
			name: "Percentage of " + breakdownTitle + " to " + netSalesTitle,
			field: "valuePNLPercentage",
			width: 3,
			opacity: 0,
			markers: {
				type: 'cross',
				size: 12
			},
			tooltip: {
				visible: true,
				template: "Percentage of " + breakdownTitle + " - #: dataItem.category # at #: dataItem.year #: #: kendo.toString(dataItem.valuePNLPercentage, 'n2') # % (#: kendo.toString(dataItem.valuePNL, 'n2') #)"
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