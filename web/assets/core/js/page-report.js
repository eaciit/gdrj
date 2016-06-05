'use strict';

// let menuLink = vm.menu()
// 	.find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

vm.currentMenu('Report');
vm.currentTitle('Report');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Report', href: '/web/report/all' }]);

viewModel.report = new Object();
var rpt = viewModel.report;

rpt.filter = [{ _id: 'common', group: 'Base Filter', sub: [{ _id: 'Branch', from: 'Branch', title: 'Branch' }, { _id: 'Brand', from: 'Brand', title: 'Brand' }, { _id: 'RegionC', from: 'Region', title: 'Region' }, { _id: 'Channel', from: 'Channel', title: 'Channel' }, { _id: 'From', from: 'From' }, { _id: 'To', from: 'To' }] }, { _id: 'geo', group: 'Geographical', sub: [{ _id: 'Zone', from: 'Zone', title: 'Zone' }, { _id: 'Region', from: 'Region', title: 'Region' }, { _id: 'Area', from: 'Area', title: 'Area' }] }, { _id: 'customer', group: 'Customer', sub: [{ _id: 'ChannelC', from: 'Channel', title: 'Channel' }, { _id: 'KeyAccount', from: 'KeyAccount', title: 'Accounts' }, { _id: 'Customer', from: 'Customer', title: 'Outlet' }] }, { _id: 'product', group: 'Product', sub: [{ _id: 'HBrandCategory', from: 'HBrandCategory', title: 'Group' }, { _id: 'BrandP', from: 'Brand', title: 'Brand' }, { _id: 'Product', from: 'Product', title: 'SKU' }] }, { _id: 'profit_center', group: 'Profit Center', sub: [{ _id: 'Entity', from: 'Entity', title: 'Entity' }, { _id: 'Type', from: 'Type', title: 'Type' }, { _id: 'BranchPC', from: 'Branch', title: 'Branch' }, { _id: 'HQ', from: 'HQ', title: 'HQ' }] }, { _id: 'cost_center', group: 'Cost Center', sub: [{ _id: 'Group1', from: 'Group1', title: 'Group 1' }, { _id: 'Group2', from: 'Group2', title: 'Group 2' }, { _id: 'HCostCenterGroup', from: 'HCostCenterGroup', title: 'Function' }] }, { _id: 'ledger', group: 'Ledger', sub: [{ _id: 'LedgerAccount', from: 'LedgerAccount', title: 'GL Code' }] }];

rpt.mode = ko.observable('render');
rpt.valueMasterData = {};
rpt.masterData = {
	geographi: ko.observableArray([])
};
rpt.enableHolder = {};
rpt.eventChange = {};
rpt.value = {
	HQ: ko.observable(false),
	From: ko.observable(moment().year(2016).month(1).date(1).toDate()),
	To: ko.observable(moment().year(2016).month(11).date(1).toDate())
};
rpt.masterData.Type = ko.observableArray([{ value: 'Mfg', text: 'Mfg' }, { value: 'Branch', text: 'Branch' }]);
rpt.masterData.HQ = ko.observableArray([{ value: true, text: 'True' }, { value: false, text: 'False' }]);
rpt.filter.forEach(function (d) {
	d.sub.forEach(function (e) {
		if (rpt.masterData.hasOwnProperty(e._id)) {
			return;
		}

		if (!rpt.value.hasOwnProperty(e._id)) {
			rpt.value[e._id] = ko.observableArray([]);
		}
		rpt.valueMasterData[e._id] = ko.observableArray([]);
		rpt.masterData[e._id] = ko.observableArray([]);
		rpt.enableHolder[e._id] = ko.observable(true);
		rpt.eventChange[e._id] = function () {
			var self = this;
			var value = self.value();

			setTimeout(function () {
				var vZone = rpt.valueMasterData['Zone']();
				var vRegion = rpt.valueMasterData['Region']();
				var vArea = rpt.valueMasterData['Area']();

				if (e._id == 'Zone') {
					var raw = Lazy(rpt.masterData.geographi()).filter(function (f) {
						return vZone.length == 0 ? true : vZone.indexOf(f.Zone) > -1;
					}).toArray();

					rpt.masterData.Region(rpt.groupGeoBy(raw, 'Region'));
					rpt.masterData.Area(rpt.groupGeoBy(raw, 'Area'));
				} else if (e._id == 'Region') {
					var _raw = Lazy(rpt.masterData.geographi()).filter(function (f) {
						return vZone.length == 0 ? true : vZone.indexOf(f.Zone) > -1;
					}).filter(function (f) {
						return vRegion.length == 0 ? true : vRegion.indexOf(f.Region) > -1;
					}).toArray();

					rpt.masterData.Area(rpt.groupGeoBy(_raw, 'Area'));
					rpt.enableHolder['Zone'](vRegion.length == 0);
				} else if (e._id == 'Area') {
					var _raw2 = Lazy(rpt.masterData.geographi()).filter(function (f) {
						return vZone.length == 0 ? true : vZone.indexOf(f.Zone) > -1;
					}).filter(function (f) {
						return vRegion.length == 0 ? true : vRegion.indexOf(f.Region) > -1;
					}).toArray();

					rpt.enableHolder['Region'](vArea.length == 0);
					rpt.enableHolder['Zone'](vRegion.length == 0);
				}

				// change value event goes here
				app.log(e._id, value);
			}, 100);
		};
	});
});

rpt.groupGeoBy = function (raw, category) {
	var groupKey = category == 'Area' ? '_id' : category;
	var data = Lazy(raw).groupBy(function (f) {
		return f[groupKey];
	}).map(function (k, v) {
		return { _id: v, Name: app.capitalize(v, true) };
	}).toArray();

	return data;
};

rpt.filterMultiSelect = function (d) {
	var config = {
		filter: 'contains',
		placeholder: 'Choose items ...',
		change: rpt.eventChange[d._id],
		value: rpt.value[d._id]
	};

	if (['HQ', 'Type'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: 'value',
			dataTextField: 'text',
			value: rpt.value[d._id]
		});
	} else if (['Customer'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			autoBind: false,
			minLength: 1,
			placeholder: 'Type min 1 chars',
			dataValueField: '_id',
			dataTextField: 'Name',
			template: function template(d) {
				return d._id + ' - ' + d.Name;
			},
			enabled: rpt.enableHolder[d._id],
			dataSource: {
				serverFiltering: true,
				transport: {
					read: {
						url: '/report/getdata' + d.from.toLowerCase()
					},
					parameterMap: function parameterMap(data, type) {
						var keyword = data.filter.filters[0].value;
						return { keyword: keyword };
					}
				},
				schema: {
					data: 'data'
				}
			},
			value: rpt.value[d._id]
		});
	} else if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity', 'Channel', 'HBrandCategory', 'Product', 'Type', 'KeyAccount', 'LedgerAccount'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id],
			template: function template(d) {
				if (d._id == 'KeyAccount') {
					return app.capitalize(d.KeyAccount, true);
				}

				return d._id + ' - ' + app.capitalize(d.Name, true);
			},
			value: rpt.value[d._id]
		});

		if (d.from == 'Product') {
			config = $.extend(true, config, {
				minLength: 1,
				placeholder: 'Type min 1 chars'
			});
		}

		app.ajaxPost('/report/getdata' + d.from.toLowerCase(), {}, function (res) {
			if (!res.success) {
				return;
			}

			rpt.masterData[d._id](res.data);
		});
	} else if (['Region', 'Area', 'Zone'].indexOf(d.from) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id],
			value: rpt.value[d._id]
		});

		if (d.from == 'Region') {
			app.ajaxPost('/report/getdatahgeographi', {}, function (res) {
				if (!res.success) {
					return;
				}

				rpt.masterData.geographi(res.data);

				['Region', 'Area', 'Zone'].forEach(function (e) {
					var res = rpt.groupGeoBy(rpt.masterData.geographi(), e);
					rpt.masterData[e](res);
				});

				rpt.masterData.RegionC(rpt.masterData.Region());
			});
		}
	} else {
		config.data = rpt.masterData[d._id]().map(function (f) {
			if (!f.hasOwnProperty('Name')) {
				return f;
			}

			return { _id: f._id, Name: app.capitalize(f.Name, true) };
		});
	}

	return config;
};
rpt.titleFor = function (data) {
	return 'asdfasdfasdfa';
};
rpt.prepareDrag = function () {
	$('.pivot-section').sortable({
		connectWith: '.pivot-section'
	});
};

rpt.expandToggleContent = function () {
	var btnExpand = $('.btn-expand');
	var panel = $('.panel-content-expandable');
	var panelLeft = $('.panel-content-left');
	var panelRight = $('.panel-content-right');

	if (panel.hasClass('col-md-12')) {
		panel.removeClass('col-md-12 no-padding').addClass('col-md-6');
		panelLeft.addClass('no-padding-left');
		panelRight.addClass('no-padding-right');
	} else {
		panel.removeClass('col-md-6').addClass('col-md-12 no-padding');
		panelLeft.removeClass('no-padding-left');
		panelRight.removeClass('no-padding-right');
	}

	btnExpand.find('.fa').toggleClass('fa-compress');

	var pivot = $('.k-pivot').data('kendoPivotGrid');
	if (app.isDefined(pivot)) {
		$('.k-pivot').data('kendoPivotGrid').refresh();
	}

	var chart = $('.k-chart').data('kendoChart');
	if (app.isDefined(chart)) {
		$('.k-chart').data('kendoChart').refresh();
	}

	$('.k-chart').each(function (i, e) {
		$(e).data('kendoChart').redraw();
	});
};
rpt.getFilterValue = function () {
	var res = [{ 'Field': 'customer.branchid', 'Op': '$in', 'Value': rpt.value.Branch() }, { 'Field': 'product.brand', 'Op': '$in', 'Value': rpt.value.Brand() }, { 'Field': 'customer.region', 'Op': '$in', 'Value': rpt.value.Region() }, { 'Field': 'customer.channel', 'Op': '$in', 'Value': rpt.value.Channel() }, { 'Field': 'year', 'Op': '$gte', 'Value': rpt.value.From() }, { 'Field': 'year', 'Op': '$lte', 'Value': rpt.value.To() }];

	return res;
};

rpt.init = function () {
	return app.noop;
};
rpt.refresh = function () {
	return app.noop;
};

rpt.analysisIdeas = ko.observableArray([]);
rpt.getIdeas = function () {
	app.ajaxPost('/report/getdataanalysisidea', {}, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		rpt.analysisIdeas(_.sortBy(res.data, function (d) {
			return d.order;
		}));
	});
};

$(function () {
	var $contentPivot = $('.panel-content-pivot');
	var $contentMap = $('.panel-content-map');
	var $btnInfo = $('.btn-info');

	rpt.getIdeas();
	rpt.prepareDrag();
	rpt.init();
});