'use strict';

viewModel.chartCompare = {};
var ccr = viewModel.chartCompare;

ccr.data = ko.observableArray([]);
ccr.dataComparison = ko.observableArray([]);
ccr.title = ko.observable('Chart Comparison');
ccr.contentIsLoading = ko.observable(false);
ccr.categoryAxisField = ko.observable('category');
ccr.breakdownBy = ko.observable('');
ccr.limitchart = ko.observable(4);

ccr.getDecreasedQty = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	ccr.contentIsLoading(true);
	toolkit.ajaxPost('/report/GetDecreasedQty', {}, function (res) {
		ccr.dataComparison(res);
		ccr.contentIsLoading(false);
		ccr.refresh();
	}, function () {
		ccr.contentIsLoading(false);
	}, {
		cache: useCache == true ? 'chart comparison' : false
	});
};
ccr.refresh = function () {
	// ccr.dataComparison(ccr.dummyJson)
	var tempdata = [];
	// let qty = 0
	// let price = 0
	var outlet = 0;
	var maxline = 0;
	var maxprice = 0;
	var maxqty = 0;
	var quarter = [];
	for (var i in ccr.dataComparison()) {
		if (ccr.dataComparison()[i].productName != undefined) {
			// qty = _.filter(ccr.dataComparison()[i].qty, function(resqty){ return resqty == 0}).length
			// price = _.filter(ccr.dataComparison()[i].price, function(resprice){ return resprice == 0}).length
			maxprice = _.max(ccr.dataComparison()[i].price);
			maxqty = _.max(ccr.dataComparison()[i].qty);
			if (maxprice > maxqty) maxline = maxprice;else maxline = maxqty;
			outlet = _.max(ccr.dataComparison()[i].outletList);
			quarter = [];
			for (var a in ccr.dataComparison()[i].qty) {
				quarter.push('Quarter ' + (parseInt(a) + 1));
			}
			tempdata.push({
				qty: ccr.dataComparison()[i].qtyCount,
				price: ccr.dataComparison()[i].priceCount,
				quarter: quarter,
				maxoutlet: outlet + outlet / 2,
				maxline: maxline + maxline / 4,
				productName: ccr.dataComparison()[i].productName,
				data: ccr.dataComparison()[i]
			});
		}
	}
	// let sortPriceQty = _.take(_.sortBy(tempdata, function(item) {
	//    return [item.qty, item.price]
	// }).reverse(), ccr.limitchart())
	var sortPriceQty = _.take(tempdata, ccr.limitchart());
	ccr.data(sortPriceQty);
	ccr.render();
};
ccr.render = function () {
	var configure = function configure(data, full) {
		var series = [{
			name: 'Price',
			// field: 'value1',
			data: data.price,
			width: 3,
			markers: {
				visible: true,
				size: 10,
				border: {
					width: 3
				}
			},
			axis: "priceqty"
		}, {
			name: 'Qty',
			// field: 'value2',
			data: data.qty,
			width: 3,
			markers: {
				visible: true,
				size: 10,
				border: {
					width: 3
				}
			},
			axis: "priceqty"
		}, {
			name: 'Outlet',
			// field: 'value3',
			data: data.outletList,
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
			},
			axis: "outlet"
		}];
		return {
			// dataSource: {
			// 	data: data
			// },
			series: series,
			seriesColors: ["#5499C7", "#ff8d00", "#678900"],
			seriesDefaults: {
				type: "line",
				style: "smooth"
			},
			categoryAxis: {
				baseUnit: "month",
				// field: ccr.categoryAxisField(),
				categories: full.quarter,
				majorGridLines: {
					color: '#fafafa'
				},
				labels: {
					font: 'Source Sans Pro 11',
					rotation: 40
					// template: (d) => `${toolkit.capitalize(d.value).slice(0, 3)}`
				}
			},
			legend: {
				position: 'bottom'
			},
			valueAxes: [{
				name: "priceqty",
				title: { text: "Qty & Price" },
				majorGridLines: {
					color: '#fafafa'
				},
				max: full.maxline
			}, {
				name: "outlet",
				title: { text: "Outlet" },
				majorGridLines: {
					color: '#fafafa'
				},
				max: full.maxoutlet
			}],
			tooltip: {
				visible: true,
				template: function template(d) {
					return d.series.name + ' on : ' + kendo.toString(d.value, 'n2');
				}
			}
		};
	};

	var chartContainer = $('.chart-comparison');
	chartContainer.empty();
	for (var e in ccr.data()) {
		var html = $($('#template-chart-comparison').html());
		var config = configure(ccr.data()[e].data, ccr.data()[e]);

		html.appendTo(chartContainer);
		html.find('.title').html(ccr.data()[e].data.productName);
		console.log(config);
		console.log(ccr.data()[e].data);
		html.find('.chart').kendoChart(config);
	}
	chartContainer.append($('<div />').addClass('clearfix'));
};

rpt.toggleFilterCallback = function () {
	$('.chart-comparison .k-chart').each(function (i, e) {
		$(e).data('kendoChart').redraw();
	});
};

$(function () {
	ccr.getDecreasedQty(false);
});