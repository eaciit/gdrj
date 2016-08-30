'use strict';

viewModel.volPriceAnalysis = {};
var vpa = viewModel.volPriceAnalysis;

vpa.title = ko.observable('Volume and Price Analysis');
vpa.breakdownBy = ko.observable('product.brandcategoryid');
vpa.brand = ko.observable('');
vpa.contentIsLoading = ko.observable(false);
vpa.data = ko.observableArray([]);
vpa.flag = ko.observable('');
vpa.unit = ko.observable('v1000000000');
vpa.optionUnit = ko.observableArray([{ _id: 'v1', Name: 'Actual', suffix: '' }, { _id: 'v1000', Name: 'Hundreds', suffix: 'K' }, { _id: 'v1000000', Name: 'Millions', suffix: 'M' }, { _id: 'v1000000000', Name: 'Billions', suffix: 'B' }]);

vpa.optionFilterProductBrand = ko.observableArray([{ _id: "All", Name: "All" }]);
vpa.optionFilterProductBrandCategory = ko.observableArray([]);

vpa.optionFilterCustGroup = ko.observableArray([]);
vpa.filterCustGroup = ko.observableArray([]);
// vpa.currCustGroup = ko.observableArray([])

vpa.getDivider = function () {
	return parseInt(vpa.unit().replace(/v/g, ''), 10);
};

vpa.groupMap = function (arr, c, d) {
	return _.map(_.groupBy(arr, c), d);
};

vpa.breakdownKey = function () {
	return '_id_' + toolkit.replace(vpa.breakdownBy(), '.', '_');
};

vpa.refresh = function () {
	var param = {};
	// param.pls = ['PL44B', 'PL8A', 'PL74C']
	param.groups = rpt.parseGroups([vpa.breakdownBy()]);
	param.aggr = 'sum';
	param.flag = 'volpriceanalysis';
	param.filters = rpt.getFilterValue(true, rpt.optionFiscalYears);

	param.filters.push({
		Field: "customer.channelname",
		Op: "$in",
		Value: rpt.masterData.Channel().map(function (d) {
			return d._id;
		}).filter(function (d) {
			return d != "EXP";
		}).filter(function (d) {
			return d != "I1";
		})
	});

	if (vpa.brand().length > 0 && vpa.brand() != "ALL") {
		param.filters.push({
			Field: 'product.brand',
			Op: '$eq',
			Value: vpa.brand()
		});
	}

	var outlets = $('select.outlet-filter').data('kendoMultiSelect').value();
	if (outlets.length > 0) {
		param.filters.push({
			Field: 'customer.customerid',
			Op: '$in',
			Value: outlets
		});
	}

	if (vpa.filterCustGroup().length > 0) {
		param.filters.push({
			Field: 'customer.customergroup',
			Op: '$in',
			Value: vpa.filterCustGroup()
		});
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
				vpa.contentIsLoading(false);
				return;
			}

			vpa.contentIsLoading(false);
			vpa.data(res.Data.Data);
			vpa.render();
		}, function () {
			vpa.contentIsLoading(false);
		});
	};

	vpa.contentIsLoading(true);
	fetch();
};

vpa.render = function () {
	var dimensionTitle = 'Dimension';
	toolkit.try(function () {
		dimensionTitle = rpt.optionDimensions().find(function (d) {
			return d.field == vpa.breakdownBy();
		}).name;
	});

	var plGrossSales = 'PL8A';
	var codeSalesQty = 'salesqty';

	var total2015_netSales = toolkit.sum(vpa.data().filter(function (d) {
		return d._id._id_date_fiscal === '2015-2016';
	}), function (d) {
		return d[plGrossSales];
	});
	var total2014_netSales = toolkit.sum(vpa.data().filter(function (d) {
		return d._id._id_date_fiscal === '2014-2015';
	}), function (d) {
		return d[plGrossSales];
	});

	var total2015_qty = toolkit.sum(vpa.data().filter(function (d) {
		return d._id._id_date_fiscal === '2015-2016';
	}), function (d) {
		return d[codeSalesQty];
	});
	var total2014_qty = toolkit.sum(vpa.data().filter(function (d) {
		return d._id._id_date_fiscal === '2014-2015';
	}), function (d) {
		return d[codeSalesQty];
	});

	var calcGrowth = function calcGrowth(data2015, data2014, plcode) {
		var v2015 = data2015[0][plcode];
		var v2014 = data2014[0][plcode];
		if (v2015 <= 0 && v2014 <= 0) {
			return 0;
		}

		console.log('----', plcode, v2015, v2014);

		return toolkit.number((v2015 - v2014) / v2014) * 100;
	};

	var op1 = vpa.groupMap(vpa.data(), function (d) {
		return d._id[vpa.breakdownKey()];
	}, function (v, k) {
		var o = {};
		o.dimension = k.replace(/ /g, '&nbsp;');
		o.sorter = 0;

		if (o.dimension != 'total') {
			(function () {
				var tdim = o.dimension;
				var yoi = _.find(vpa.optionFilterProductBrandCategory(), function (e) {
					return e._id == tdim;
				});

				if (!yoi) o.dimension = tdim;else o.dimension = yoi.Name;

				if (tdim == '') {
					o.dimension = 'OTHER';
				}
			})();
		}
		//var a = _.find(vpa.optionFilterProductBrandCategory(), function(e){ return e._id=='315'}).Name
		// console.log(o.dimension)
		var data2015 = v.filter(function (e) {
			return e._id._id_date_fiscal === '2015-2016';
		});
		var data2014 = v.filter(function (e) {
			return e._id._id_date_fiscal === '2014-2015';
		});

		toolkit.try(function () {
			o.sorter = data2015[0][plGrossSales];
		});
		//2015 Qty	Price	Gross Sales	Vol. Var	Price Var.
		o.v2015_nsal_value = 0;
		toolkit.try(function () {
			o.v2015_nsal_value = data2015[0][plGrossSales];
		});

		o.v2015_nsal_qty = 0;
		toolkit.try(function () {
			o.v2015_nsal_qty = data2015[0][codeSalesQty];
		});

		o.v2015_price_value = 0;
		toolkit.try(function () {
			o.v2015_price_value = data2015[0][plGrossSales] / data2015[0][codeSalesQty];
		});

		o.v2015_vol_var = 0;
		o.v2015_price_var = 0;

		//2014
		o.v2014_nsal_value = 0;
		toolkit.try(function () {
			o.v2014_nsal_value = data2014[0][plGrossSales];
		});

		o.v2014_nsal_qty = 0;
		toolkit.try(function () {
			o.v2014_nsal_qty = data2014[0][codeSalesQty];
		});

		o.v2014_price_value = 0;
		toolkit.try(function () {
			o.v2014_price_value = data2014[0][plGrossSales] / data2014[0][codeSalesQty];
		});

		o.v2014_vol_var = 0;
		o.v2014_price_var = 0;

		var deltaprice = 0;
		toolkit.try(function () {
			deltaprice = o.v2015_price_value - o.v2014_price_value;
		});

		var deltavolume = 0;
		toolkit.try(function () {
			deltavolume = o.v2015_nsal_qty - o.v2014_nsal_qty;
		});

		toolkit.try(function () {
			o.v2015_vol_var = deltavolume * o.v2015_price_value;
		});
		toolkit.try(function () {
			o.v2015_price_var = deltaprice * o.v2015_nsal_qty;
		});

		toolkit.try(function () {
			o.v2014_vol_var = deltavolume * o.v2014_price_value;
		});
		toolkit.try(function () {
			o.v2014_price_var = deltaprice * o.v2014_nsal_qty;
		});

		o.vol_var = 0;
		o.price_var = 0;
		toolkit.try(function () {
			o.v_vol_var = deltavolume * o.v2014_price_value;
		});
		toolkit.try(function () {
			o.v_price_var = deltaprice * o.v2015_nsal_qty;
		});

		o.TotalSalesDiff = 0;
		toolkit.try(function () {
			o.TotalSalesDiff = o.v2015_nsal_value - o.v2014_nsal_value;
		});

		o.vol_var_percent = 0;
		o.price_var_percent = 0;
		toolkit.try(function () {
			o.vol_var_percent = o.v_vol_var * 100 / o.TotalSalesDiff;
		});
		toolkit.try(function () {
			o.price_var_percent = o.v_price_var * 100 / o.TotalSalesDiff;
		});

		return o;
	});

	var op2 = _.orderBy(op1, function (d) {
		return rpt.orderByChannel(d.dimension, d.sorter);
	}, 'desc');
	var dataParsed = op2;

	var total = {};
	total.dimension = 'Total';

	total.v2015_nsal_value = total2015_netSales;
	total.v2015_nsal_qty = total2015_qty;
	total.v2015_price_value = '-';
	total.v2015_vol_var = '-';
	total.v2015_price_var = '-';

	total.v2014_nsal_value = total2014_netSales;
	total.v2014_nsal_qty = total2014_qty;
	total.v2014_price_value = '-';
	total.v2014_vol_var = '-';
	total.v2014_price_var = '-';

	console.log('total', total);

	var dimensionWidth = 170;
	if (vpa.breakdownBy() == 'customer.region') {
		dimensionWidth = 160;
	}

	var widthValue = 105;
	var widthQty = 90;
	var tableWidth = 1200;
	var widthPrcnt = 90;

	var columns = [{
		title: 'Brand Category ( ' + vpa.brand() + ' )',
		headerTemplate: 'Brand Category <br /> ( ' + vpa.brand() + ' )',
		template: function template(d) {
			return d.dimension;
		},
		headerAttributes: { style: 'vertical-align: middle;' },
		footerTemplate: 'Total',
		width: dimensionWidth,
		locked: true
	}, {
		title: 'Sales Growth',
		headerTemplate: 'Sales<br />Growth',
		headerAttributes: { style: 'vertical-align: middle !important;' },
		field: 'TotalSalesDiff',
		format: '{0:n0}',
		attributes: { class: 'align-right' },
		footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_vol_var, 'n0') + '</div>',
		width: widthValue
	}, {
		title: 'Volume Growth',
		headerTemplate: 'Volume<br />Growth',
		headerAttributes: { style: 'vertical-align: middle !important;' },
		field: 'v_vol_var',
		format: '{0:n0}',
		attributes: { class: 'align-right' },
		footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_vol_var, 'n0') + '</div>',
		width: widthValue
	}, {
		title: 'Volume Contribution',
		headerTemplate: 'Volume<br />Contribution',
		headerAttributes: { style: 'vertical-align: middle !important;' },
		field: 'vol_var_percent',
		format: '{0:n2} %',
		attributes: { class: 'align-right' },
		// footerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
		footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_vol_var, 'n2') + '</div>',
		width: widthPrcnt
	}, {
		title: 'Price Growth',
		headerTemplate: 'Price<br />Growth',
		headerAttributes: { style: 'vertical-align: middle !important;' },
		field: 'v_price_var',
		format: '{0:n0}',
		attributes: { class: 'align-right' },
		footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_price_var, 'n0') + '</div>',
		width: widthValue
	}, {
		title: 'Price Contribution',
		headerTemplate: 'Price<br /> Contribution',
		headerAttributes: { style: 'vertical-align: middle !important;' },
		field: 'price_var_percent',
		format: '{0:n2} %',
		attributes: { class: 'align-right' },
		// footerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
		footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_vol_var, 'n2') + '</div>',
		width: widthPrcnt
	}, {
		title: 'FY 2015-2016',
		// headerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
		columns: [{
			title: 'Net Sales',
			headerTemplate: 'Net Sales',
			field: 'v2015_nsal_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_nsal_value, 'n0') + '</div>',
			width: widthValue
		}, {
			title: 'Sales Qty',
			headerTemplate: 'Sales Qty',
			field: 'v2015_nsal_qty',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_nsal_qty, 'n0') + '</div>',
			width: widthQty
		}, {
			title: 'Unit Price',
			headerTemplate: 'Unit Price',
			field: 'v2015_price_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2015_price_value, 'n0') + '</div>',
			width: widthQty
		}
		// ,{
		// 	headerTemplate: 'Volume<br />Variance',
		// 	headerAttributes: { style: 'vertical-align: middle !important;' },
		// 	field: 'v2015_vol_var',
		// 	format: `{0:n0}`,
		// 	attributes: { class: 'align-right' },
		// 	footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_vol_var, 'n0')}</div>`,
		// 	width: widthValue,
		// }, {
		// 	headerTemplate: 'Price<br />Variance',
		// 	field: 'v2015_price_var',
		// 	format: `{0:n0}`,
		// 	attributes: { class: 'align-right' },
		// 	footerTemplate: `<div class="align-right">${kendo.toString(total.v2015_price_var, 'n0')}</div>`,
		// 	width: widthValue,
		// }
		]
	}, {
		title: 'FY 2014-2015',
		// headerAttributes: { style: 'border-right: 2px solid rgba(0, 0, 0, 0.64);' },
		columns: [{
			title: 'Net Sales',
			headerTemplate: 'Net Sales',
			field: 'v2014_nsal_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_nsal_value, 'n0') + '</div>',
			width: widthValue
		}, {
			title: 'Sales Qty',
			headerTemplate: 'Sales Qty',
			field: 'v2014_nsal_qty',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_nsal_qty, 'n0') + '</div>',
			width: widthQty
		}, {
			title: 'Unit Price',
			headerTemplate: 'Unit Price',
			field: 'v2014_price_value',
			format: '{0:n0}',
			attributes: { class: 'align-right' },
			footerTemplate: '<div class="align-right">' + kendo.toString(total.v2014_price_value, 'n0') + '</div>',
			width: widthQty
		}
		// ,{
		// 	headerTemplate: 'Volume<br />Variance',
		// 	headerAttributes: { style: 'vertical-align: middle !important;' },
		// 	field: 'v2014_vol_var',
		// 	format: `{0:n0}`,
		// 	attributes: { class: 'align-right' },
		// 	footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_vol_var, 'n0')}</div>`,
		// 	width: widthValue,
		// }, {
		// 	headerTemplate: 'Price<br />Variance',
		// 	field: 'v2014_price_var',
		// 	format: `{0:n0}`,
		// 	attributes: { class: 'align-right' },
		// 	footerTemplate: `<div class="align-right">${kendo.toString(total.v2014_price_var, 'n0')}</div>`,
		// 	width: widthValue,
		// }
		]
	}];

	var config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns,
		dataBound: function dataBound() {
			var sel = '#volume-price-analysis .k-grid-content-locked tr, #volume-price-analysis .k-grid-content tr';

			$(sel).on('mouseenter', function () {
				var index = $(this).index();
				var elh = $('#volume-price-analysis .k-grid-content-locked tr:eq(' + index + ')').addClass('hover');
				var elc = $('#volume-price-analysis .k-grid-content tr:eq(' + index + ')').addClass('hover');
			});
			$(sel).on('mouseleave', function () {
				$('#volume-price-analysis tr.hover').removeClass('hover');
			});
		}
	};

	$('#volume-price-analysis').replaceWith('<div class="breakdown-view ez" id="volume-price-analysis"></div>');
	$('#volume-price-analysis').kendoGrid(config);
};

vpa.changeDimension = function (title, args) {
	vpa.subTitle(title);
	vpa.breakdownBy(args.split('|')[0]);
	vpa.flag('');

	if (args.indexOf('|') > -1) {
		vpa.flag(args.split('|')[1]);
	}

	vpa.refresh();
};

vm.currentMenu('Analysis');
vm.currentTitle('Volume Price Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'Volume Price Analysis', href: '#' }]);

vpa.fillProductBrandData = function (callback) {
	toolkit.ajaxPost(viewModel.appName + "report/getdatabrand", {}, function (res) {

		// vpa.optionFilterProductBrand([])
		// vpa.optionFilterProductBrand.push({ _id: "All", Name: "All" })

		vpa.optionFilterProductBrand(res.data.map(function (d) {
			var o = {};
			o._id = d._id;
			o.Name = d.Name;

			return o;
		}));

		vpa.optionFilterProductBrand.unshift({ _id: "ALL", Name: "ALL" });

		vpa.brand('HIT');
		if (typeof callback === 'function') {
			callback();
		}
	});
};

vpa.fillProductBrandCategory = function () {
	toolkit.ajaxPost(viewModel.appName + "report/getdatahbrandcategory", {}, function (res) {
		vpa.optionFilterProductBrandCategory(res.data.map(function (d) {
			var o = {};
			o._id = d._id;
			o.Name = d._id + ' - ' + d.Name;

			return o;
		}));
	});
};

vpa.initCustomerFilter = function () {
	$('select.outlet-filter').kendoMultiSelect({
		dataSource: {
			type: "json",
			serverFiltering: true,
			transport: {
				read: function read(options) {
					var url = viewModel.appName + "report/getdatacustomer";
					var param = { Keyword: '', Custgroup: [] };
					toolkit.try(function () {
						param.Keyword = options.data.filter.filters[0].value;
						console.log(options.data.filter.filters[0].value, options);
					});
					toolkit.try(function () {
						param.Custgroup = vpa.filterCustGroup();
					});
					toolkit.ajaxPost(url, param, function (res) {
						options.success(res.data);
					});
				}
			}
		},
		dataValueField: '_id',
		dataTextField: 'Name',
		placeholder: 'Select Outlet',
		filter: "startswith",
		min: 3
	});
};

vpa.fillCustGroup = function () {
	toolkit.ajaxPost(viewModel.appName + "report/getdatacustomergroup", {}, function (res) {
		vpa.optionFilterCustGroup(res.data.map(function (d) {
			var o = {};
			o._id = d._id;
			o.Name = d._id + ' - ' + d.Name;

			return o;
		}));
	});
};

vpa.changeCustGroup = function () {
	// console.log(this.value())

	// vpa.currCustGroup.push(this.value())
	// $('select.outlet-filter').data('kendoMultiSelect').dataSource.read();
};

vpa.filterCustGroup.subscribe(function () {
	$('select.outlet-filter').data('kendoMultiSelect').dataSource.read();
});
//.getKendoMultiSelect().value(["1", "2"])

// vpa.changeCustGroup = function () {
// 	var param = {
// 		custgrops: vpa.filterCustGroup()
// 	}
// 	ajax(url, param, function (res) {
// 		$('select.outlet-filter').data('kendoMultiSelect').setDataSource(new kendo.data.DataSource({
// 			data: res.data
// 		}))


// 	})
// }

$(function () {
	vpa.fillProductBrandData(function () {
		vpa.refresh();
	});
	vpa.fillCustGroup();
	vpa.fillProductBrandCategory();
	vpa.initCustomerFilter();

	rpt.showExport(true);

	$('#c-0 .form-group:eq(1)').remove();
	$('#c-2 .form-group:eq(1)').remove();
});

/**

---------------------------------------------------------
|       |          2016         |          2015         |
---------------------------------------------------------
|       |   EBIT    | NET SALES |   EBIT    | NET SALES |
---------------------------------------------------------
|       | Value | % | Value | % | Value | % | Value | % |
---------------------------------------------------------
| Total |  124  | 6 |  124  | 6 |  124  | 6 |  124  | 6 |
---------------------------------------------------------
| MT    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
| GT    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
| RD    |  24   | 2 |  24   | 2 |  24   | 2 |  24   | 2 |
---------------------------------------------------------

*/