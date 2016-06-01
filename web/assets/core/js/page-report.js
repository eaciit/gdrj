'use strict';

// let menuLink = vm.menu()
// 	.find((d) => d.href == ('/' + document.URL.split('/').slice(3).join('/')))

// vm.currentMenu(menuLink.title)
// vm.currentTitle(menuLink.title)
// vm.breadcrumb([
// 	{ title: 'Godrej', href: '#' },
// 	{ title: menuLink.title, href: menuLink.href }
// ])

var menuLink = vm.menu().find(function (d) {
	return d.title == "Report";
}).submenu.find(function (d) {
	return d.href == '/' + document.URL.split('/').slice(3).join('/');
});

vm.currentMenu('Report');
vm.currentTitle(menuLink.title);
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: menuLink.title, href: menuLink.href }]);

viewModel.report = new Object();
var rpt = viewModel.report;

rpt.filter = [{ _id: 'common', group: 'Base Filter', sub: [{ _id: 'Branch', title: 'Branch' }, { _id: 'Brand', title: 'Brand' }, { _id: 'Region', title: 'Region' }, { _id: 'Channel', title: 'Channel' }, { _id: 'From' }, { _id: 'To' }] }, { _id: 'geo', group: 'Geographical', sub: [{ _id: 'Zone', title: 'Zone' }, { _id: 'Region', title: 'Region' }, { _id: 'Area', title: 'Area' }] }, { _id: 'customer', group: 'Customer', sub: [{ _id: 'Channel', title: 'Channel' }, { _id: 'KeyAccount', title: 'Accounts' }, { _id: 'Customer', title: 'Outlet' }] }, { _id: 'product', group: 'Product', sub: [{ _id: 'HBrandCategory', title: 'Group' }, { _id: 'Brand', title: 'Brand' }, { _id: 'Product', title: 'SKU' }] }, { _id: 'profit_center', group: 'Profit Center', sub: [{ _id: 'Entity', title: 'Entity' }, { _id: 'Type', title: 'Type' }, { _id: 'Branch', title: 'Branch' }, { _id: 'HQ', title: 'HQ' }] }, { _id: 'cost_center', group: 'Cost Center', sub: [{ _id: 'Group1', title: 'Group 1' }, { _id: 'Group2', title: 'Group 2' }, { _id: 'HCostCenterGroup', title: 'Function' }] }, { _id: 'ledger', group: 'Ledger', sub: [{ _id: 'LedgerAccount', title: 'GL Code' }] }];

rpt.valueMasterData = {};
rpt.masterData = {
	geographi: ko.observableArray([])
};
rpt.enableHolder = {};
rpt.eventChange = {};
rpt.masterData.Type = ko.observableArray([{ value: 'Mfg', text: 'Mfg' }, { value: 'Branch', text: 'Branch' }]);
rpt.masterData.HQ = ko.observableArray([{ value: true, text: 'True' }, { value: false, text: 'False' }]);
rpt.filter.forEach(function (d) {
	d.sub.forEach(function (e) {
		if (rpt.masterData.hasOwnProperty(e._id)) {
			return;
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

					rpt.groupGeoBy(raw, 'Region');
					rpt.groupGeoBy(raw, 'Area');
				} else if (e._id == 'Region') {
					var _raw = Lazy(rpt.masterData.geographi()).filter(function (f) {
						return vZone.length == 0 ? true : vZone.indexOf(f.Zone) > -1;
					}).filter(function (f) {
						return vRegion.length == 0 ? true : vRegion.indexOf(f.Region) > -1;
					}).toArray();

					rpt.groupGeoBy(_raw, 'Area');
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

				console.log("=====", e._id, value);
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

	console.log("=data", data);

	rpt.masterData[category](data);
};

rpt.filterMultiSelect = function (d) {
	var config = {
		filter: 'contains',
		placeholder: 'Choose items ...',
		change: rpt.eventChange[d._id],
		value: rpt.valueMasterData[d._id]
	};

	if (['HQ', 'Type'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: 'value',
			dataTextField: 'text'
		});
	} else if (['Customer'].indexOf(d._id) > -1) {
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
						url: '/report/getdata' + d._id.toLowerCase()
					},
					parameterMap: function parameterMap(data, type) {
						var keyword = data.filter.filters[0].value;
						return { keyword: keyword };
					}
				},
				schema: {
					data: 'data'
				}
			}
		});
	} else if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity', 'Channel', 'HBrandCategory', 'Product', 'Type', 'KeyAccount', 'LedgerAccount'].indexOf(d._id) > -1) {
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
			}
		});

		app.ajaxPost('/report/getdata' + d._id.toLowerCase(), {}, function (res) {
			if (!res.success) {
				return;
			}

			rpt.masterData[d._id](res.data);
		});
	} else if (['Region', 'Area', 'Zone'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name',
			enabled: rpt.enableHolder[d._id]
		});

		if (d._id == 'Region') {
			app.ajaxPost('/report/getdatahgeographi', {}, function (res) {
				if (!res.success) {
					return;
				}

				rpt.masterData.geographi(res.data);

				['Region', 'Area', 'Zone'].forEach(function (e) {
					rpt.groupGeoBy(rpt.masterData.geographi(), e);
				});
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

	// console.log('filter', d, config)

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
rpt.refreshData = function () {
	pvt.refreshData();
};

$(function () {
	vm.showFilterCallback = function () {
		$('.panel-content-pivot').removeClass('col-md-8');
		$('.panel-content-pivot').addClass('col-md-6');

		$('.panel-content-map').removeClass('col-md-4');
		$('.panel-content-map').addClass('col-md-6');

		pvt.showAndRefreshPivot();
	};
	vm.hideFilterCallback = function () {
		$('.panel-content-pivot').removeClass('col-md-6');
		$('.panel-content-pivot').addClass('col-md-8');

		$('.panel-content-map').removeClass('col-md-6');
		$('.panel-content-map').addClass('col-md-4');
	};

	rpt.prepareDrag();
	pvt.init();
});