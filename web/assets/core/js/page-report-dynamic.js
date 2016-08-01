'use strict';

viewModel.dynamic = new Object();
var rd = viewModel.dynamic;

rd.optionDivide = ko.observableArray([{ field: 'v1', name: 'Actual' }, { field: 'v1000', name: 'Hundreds' }, { field: 'v1000000', name: 'Millions' }, { field: 'v1000000000', name: 'Billions' }]);
rd.divideBy = ko.observable('v1000000000');
rd.divider = function () {
	return toolkit.getNumberFromString(rd.divideBy());
};
rd.contentIsLoading = ko.observable(false);
rd.breakdownBy = ko.observable('');
rd.series = ko.observableArray([]);
rd.limit = ko.observable(6);
rd.data = ko.observableArray([]);
rd.fiscalYear = ko.observable(rpt.value.FiscalYear());
rd.useLimit = ko.computed(function () {
	switch (rd.breakdownBy()) {
		case 'customer.channelname':
		case 'date.quartertxt':
		case 'date.month':
			return false;
		default:
			return true;
	}
}, rd.breakdownBy);
rd.isFilterShown = ko.observable(true);
rd.doToggleAnalysisFilter = function (which) {
	if (which) {
		$('.list-analysis').slideDown(300, function () {
			rd.isFilterShown(true);
		});
	} else {
		$('.list-analysis').slideUp(300, function () {
			rd.isFilterShown(false);
		});
	}
};
rd.toggleAnalysisFilter = function () {
	rd.doToggleAnalysisFilter(!rd.isFilterShown());
};
rd.hasOutlet = function () {
	return rd.getParameterByName('p').toLowerCase().indexOf('outlet') > -1;
};

rd.refresh = function () {
	var param = {};
	param.pls = [];
	param.groups = rpt.parseGroups([rd.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, rd.fiscalYear);
	if (rd.hasOutlet()) {
		param.flag = "hasoutlet";
	}

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				rd.data([]);
				rd.render();
				rd.contentIsLoading(false);
				return;
			}

			rd.contentIsLoading(false);
			if (rd.hasOutlet()) {
				var addoutlet = rd.addTotalOutlet(res.Data.Data, res.Data.Outlet);
				rd.data(addoutlet);
			} else {
				rd.data(res.Data.Data);
			}
			rd.render();

			// if ($('.list-analysis').is(':visible')) {
			// 	rd.doToggleAnalysisFilter(false)
			// }
		}, function () {
			rd.contentIsLoading(false);
		});
	};

	rd.contentIsLoading(true);
	fetch();
};

rd.getParameterByName = function (name, url) {
	if (!url) url = window.location.href;
	name = name.replace(/[\[\]]/g, "\\$&");
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
	    results = regex.exec(url);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2].replace(/\+/g, " "));
};

rd.addTotalOutlet = function (data, outlet) {
	for (var i in data) {
		data[i]['totaloutlet'] = 0;
		toolkit.try(function () {
			data[i]['totaloutlet'] = _.find(outlet, function (d) {
				return d._id['_id_' + toolkit.replace(rd.breakdownBy(), '.', '_')] == data[i]._id['_id_' + toolkit.replace(rd.breakdownBy(), '.', '_')];
			}).qty;
		});
	}
	return data;
};

rd.render = function () {
	var op1 = _.groupBy(rd.data(), function (d) {
		return d._id['_id_' + toolkit.replace(rd.breakdownBy(), '.', '_')];
	});
	var op2 = _.map(op1, function (v, k) {
		v = _.orderBy(v, function (e) {
			return e._id._id_date_fiscal;
		}, 'asc');

		var o = {};
		o.breakdown = k;

		rd.series().forEach(function (d) {
			if (toolkit.isString(d.callback)) {
				o[d._id] = toolkit.sum(v, function (e) {
					return e[d.callback];
				}) / rd.divider();
			} else {
				o[d._id] = d.callback(v, k);
			}
		});

		return o;
	});
	var op3 = _.orderBy(op2, function (d) {
		return d[rd.series()[0]._id];
	}, 'desc');
	if (rd.limit() != 0 && rd.useLimit()) {
		op3 = _.take(op3, rd.limit());
	}

	var width = $('#tab1').width();
	if (_.min([rd.limit(), op3.length]) > 6) {
		width = 160 * rd.limit();
	}
	if (width == $('#tab1').width()) {
		width = width - 22 + 'px';
	}

	var axes = [];

	var series = rd.series().map(function (d, i) {
		var color = toolkit.seriesColorsGodrej[i % toolkit.seriesColorsGodrej.length];

		var o = {};
		o.field = d._id;
		o.name = d.plheader;
		o.axis = 'axis' + (i + 1);
		o.color = color;
		o.tooltip = {
			visible: true,
			template: function template(e) {
				var val = kendo.toString(e.value, 'n1');
				return e.series.name + ' : ' + val;
			}
		};
		o.labels = {
			visible: true,
			format: '{0:n1}'
		};

		axes.push({
			name: 'axis' + (i + 1),
			title: { text: d.plheader },
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n1}"
			},
			color: color
		});

		return o;
	});

	console.log('-----', axes);
	console.log('-----', series);

	var categoryAxis = {
		field: 'breakdown',
		labels: {
			font: '"Source Sans Pro" 11px',
			format: "{0:n1}"
		},
		majorGridLines: { color: '#fafafa' },
		axisCrossingValues: [op3.length, 0, 0]
	};

	var config = {
		dataSource: { data: op3 },
		legend: {
			visible: true,
			position: "bottom"
		},
		seriesDefaults: {
			type: "column",
			style: "smooth",
			missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			},
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		valueAxis: axes.reverse(),
		categoryAxis: categoryAxis
	};

	config.series[2].labels.template = function (e) {
		var val = kendo.toString(e.value, 'n1');
		return '' + val;
	};
	config.series[2].tooltip.template = function (e) {
		var val = kendo.toString(e.value, 'n1');
		return e.series.name + ' : ' + val;
	};

	rd.configure(config);

	$('.report').replaceWith('<div class="report" style="width: ' + width + 'px;"></div>');
	$('.report').kendoChart(config);
};

rd.configure = function (config) {
	return app.noop;
};
rd.setPercentageOn = function (config, axis, percentage) {
	var percentageAxis = config.valueAxis.find(function (d) {
		return d.name == axis;
	});
	if (toolkit.isDefined(percentageAxis)) {
		percentageAxis.labels.format = '{0:n' + percentage + '}';
	}

	var serie = config.series.find(function (d) {
		return d.axis == axis;
	});
	if (toolkit.isDefined(serie)) {
		serie.labels.template = undefined;
		serie.labels.format = '{0:n' + percentage + '}';
		serie.tooltip.template = function (e) {
			var val = kendo.toString(e.value, 'n' + percentage);
			return e.series.name + ' : ' + val;
		};
	}
};

rd.getQueryStringValue = function (key) {
	return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
};

rd.setup = function () {
	rd.breakdownBy("customer.branchname");

	switch (rd.getQueryStringValue('p')) {
		case 'sales-return-rate':
			{
				vm.currentTitle('Sales Return Rate');
				rd.series = ko.observableArray([{
					_id: 'salesreturn',
					plheader: 'Sales Return',
					callback: function callback(v, k) {
						return toolkit.number(Math.abs(toolkit.sum(v, function (e) {
							return e.salesreturn;
						})) / rd.divider());
					}
				}, {
					_id: 'salesrevenue',
					plheader: 'Sales Revenue',
					callback: 'PL8A'
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var salesreturn = Math.abs(toolkit.sum(v, function (e) {
							return e.salesreturn;
						})) / rd.divider();
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						})) / rd.divider();
						return toolkit.number(salesreturn / netsales);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis1', 2);
					rd.setPercentageOn(config, 'axis2', 2);
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'sales-discount-by-gross-sales':
			{
				vm.currentTitle('Sales Discount by Gross Sales');
				rd.series = ko.observableArray([{
					_id: 'salesdiscount',
					plheader: 'Sales Discount',
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));

						return salesDiscount / rd.divider();
					}
				}, {
					_id: 'grosssales',
					plheader: 'Gross Sales',
					callback: 'PL0'
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));
						var grossSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL0;
						}));

						return toolkit.number(salesDiscount / grossSales);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'gross-sales-by-qty':
			{
				vm.currentTitle('Gross Sales / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'grosssales',
					plheader: 'Gross Sales',
					callback: 'PL0'
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var grossSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL0;
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(grossSales / quantity);
					}
				}]);
			}break;

		case 'discount-by-qty':
			{
				vm.currentTitle('Discount / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'salesdiscount',
					plheader: 'Sales Discount',
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));

						return salesDiscount / rd.divider();
					}
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(salesDiscount / quantity);
					}
				}]);
			}break;

		case 'net-price-by-qty':
			{
				vm.currentTitle('Net Price / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'netprice',
					plheader: 'Net Price',
					callback: function callback(v, k) {
						var amount = Math.abs(toolkit.sum(v, function (e) {
							return e.netamount;
						}));

						return amount / rd.divider();
					}
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var amount = Math.abs(toolkit.sum(v, function (e) {
							return e.netamount;
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(amount / quantity);
					}
				}]);
			}break;

		case 'btl-by-qty':
			{
				vm.currentTitle('BTL / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'btl',
					plheader: 'BTL',
					callback: function callback(v, k) {
						var btl = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], function (f) {
								return toolkit.number(e[f]);
							});
						}));

						return btl / rd.divider();
					}
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var btl = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], function (f) {
								return toolkit.number(e[f]);
							});
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(btl / quantity);
					}
				}]);
			}break;

		case 'freight-cost-by-sales':
			{
				vm.currentTitle('Freight Cost by Sales');
				rd.series = ko.observableArray([{
					_id: 'freightcost',
					plheader: 'Freight Cost',
					callback: function callback(v, k) {
						var freightCost = Math.abs(toolkit.sum(v, function (e) {
							return e.PL23;
						}));

						return freightCost / rd.divider();
					}
				}, {
					_id: 'netsales',
					plheader: 'Net Sales',
					callback: function callback(v, k) {
						var netSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return netSales / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var freightCost = Math.abs(toolkit.sum(v, function (e) {
							return e.PL23;
						}));
						var netSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return toolkit.number(freightCost / netSales);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'direct-labour-index':
			{
				vm.currentTitle('Direct Labour Index');
				rd.series = ko.observableArray([{
					_id: 'directlabour',
					plheader: 'Direct Labour',
					callback: function callback(v, k) {
						var directlabour = Math.abs(toolkit.sum(v, function (e) {
							return e.PL14;
						}));

						return directlabour / rd.divider();
					}
				}, {
					_id: 'cogs',
					plheader: 'COGS',
					callback: function callback(v, k) {
						var cogs = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));

						return cogs / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var directlabour = Math.abs(toolkit.sum(v, function (e) {
							return e.PL14;
						}));
						var cogs = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));

						return toolkit.number(directlabour / cogs);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'material-type-index':
			{
				vm.currentTitle('Material Type Index');
				rd.series = ko.observableArray([{
					_id: 'material',
					plheader: 'Material',
					callback: function callback(v, k) {
						var material1 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL9;
						}));
						var material2 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL10;
						}));
						var material3 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL13;
						}));

						return (material1 + material2 + material3) / rd.divider();
					}
				}, {
					_id: 'cogs',
					plheader: 'COGS',
					callback: function callback(v, k) {
						var cogs = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));

						return cogs / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var material1 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL9;
						}));
						var material2 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL10;
						}));
						var material3 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL13;
						}));
						var cogs = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));

						return toolkit.number((material1 + material2 + material3) / cogs);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'indirect-expense-index':
			{
				vm.currentTitle('Indirect Expense Index');
				rd.series = ko.observableArray([{
					_id: 'indirect',
					plheader: 'Indirect',
					callback: function callback(v, k) {
						var indirect1 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL15;
						}));
						var indirect2 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL16;
						}));
						var indirect3 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL17;
						}));
						var indirect4 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL18;
						}));
						var indirect5 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL19;
						}));
						var indirect6 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL20;
						}));
						var indirect7 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL21;
						}));
						var indirect8 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74;
						}));

						return (indirect1 + indirect2 + indirect3 + indirect4 + indirect5 + indirect6 + indirect7 + indirect8) / rd.divider();
					}
				}, {
					_id: 'cogs',
					plheader: 'COGS',
					callback: function callback(v, k) {
						var cogs = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));

						return cogs / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var indirect1 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL15;
						}));
						var indirect2 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL16;
						}));
						var indirect3 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL17;
						}));
						var indirect4 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL18;
						}));
						var indirect5 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL19;
						}));
						var indirect6 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL20;
						}));
						var indirect7 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL21;
						}));
						var indirect8 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74;
						}));
						var cogs = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));

						return toolkit.number((indirect1 + indirect2 + indirect3 + indirect4 + indirect5 + indirect6 + indirect7 + indirect8) / cogs);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'marketing-expense-index':
			{
				vm.currentTitle('Marketing Expense Index');
				rd.series = ko.observableArray([{
					_id: 'marketing',
					plheader: 'Marketing',
					callback: function callback(v, k) {
						var marketing1 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL28;
						}));
						var marketing2 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL29;
						}));
						var marketing3 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL30;
						}));
						var marketing4 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL31;
						}));

						return (marketing1 + marketing2 + marketing3 + marketing4) / rd.divider();
					}
				}, {
					_id: 'netsales',
					plheader: 'Net Sales',
					callback: function callback(v, k) {
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return netsales / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var marketing1 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL28;
						}));
						var marketing2 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL29;
						}));
						var marketing3 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL30;
						}));
						var marketing4 = Math.abs(toolkit.sum(v, function (e) {
							return e.PL31;
						}));
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return toolkit.number((marketing1 + marketing2 + marketing3 + marketing4) / netsales);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'sga-by-sales':
			{
				vm.currentTitle('SGA by Sales');
				rd.series = ko.observableArray([{
					_id: 'sga',
					plheader: 'SGA',
					callback: function callback(v, k) {
						var sga = Math.abs(toolkit.sum(v, function (e) {
							return e.PL94A;
						}));

						return sga / rd.divider();
					}
				}, {
					_id: 'netsales',
					plheader: 'Net Sales',
					callback: function callback(v, k) {
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return netsales / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var sga = Math.abs(toolkit.sum(v, function (e) {
							return e.PL94A;
						}));
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return toolkit.number(sga / netsales);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'cost-by-sales':
			{
				vm.currentTitle('Cost by Sales');
				rd.series = ko.observableArray([{
					_id: 'cost',
					plheader: 'Cost',
					callback: function callback(v, k) {
						var cost = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));

						return cost / rd.divider();
					}
				}, {
					_id: 'netsales',
					plheader: 'Net Sales',
					callback: function callback(v, k) {
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return netsales / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var cost = Math.abs(toolkit.sum(v, function (e) {
							return e.PL74B;
						}));
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return toolkit.number(cost / netsales);
					}
				}]);

				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		case 'sales-by-outlet':
			{
				vm.currentTitle('Sales by Outlet');
				rd.series = ko.observableArray([{
					_id: 'netSales',
					plheader: 'Net Sales',
					callback: function callback(v, k) {
						var netSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return netSales / rd.divider();
					}
				}, {
					_id: 'totaloutlet',
					plheader: 'Total Outlet',
					callback: function callback(v, k) {
						var totaloutlet = Math.abs(toolkit.sum(v, function (e) {
							return e.totaloutlet;
						}));
						return totaloutlet;
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var netSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));
						var totaloutlet = Math.abs(toolkit.sum(v, function (e) {
							return e.totaloutlet;
						}));

						return toolkit.number(netSales / totaloutlet) / rd.divider();
					}
				}]);

				rpt.optionDimensions(rpt.optionDimensions().filter(function (d) {
					return ['customer.channelname', 'customer.branchname', 'product.brand'].indexOf(d.field) > -1;
				}));
				rd.configure = function (config) {
					rd.setPercentageOn(config, 'axis1', 2);
					rd.setPercentageOn(config, 'axis2', 2);
					rd.setPercentageOn(config, 'axis3', 3);
				};
			}break;

		default:
			{
				location.href = viewModel.appName + "page/report";
			}break;
	}
};

vm.currentMenu('Analysis Ideas');
vm.currentTitle('&nbsp;');
vm.currentTitle.subscribe(function (d) {
	vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis Ideas', href: '#' }, { title: d, href: '#' }]);
});

$(function () {
	rd.setup();
	rd.refresh();
});