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

rpt.filter = [{ _id: 'common', group: 'Base Filter', sub: [{ _id: 'Branch', title: 'Branch' }, { _id: 'Brand', title: 'Brand' }, { _id: 'Region', title: 'Region' }, { _id: 'Channel', title: 'Channel' }, { _id: 'From' }, { _id: 'To' }] }, { _id: 'geo', group: 'Geographical', sub: [{ _id: 'Region', title: 'Region' }, { _id: 'Area', title: 'Area' }, { _id: 'Zone', title: 'Zone' }] }, { _id: 'customer', group: 'Customer', sub: [{ _id: 'Channel', title: 'Channel' }, { _id: 'KeyAccount', title: 'Accounts' }, { _id: 'Customer', title: 'Outlet' }] }, { _id: 'product', group: 'Product', sub: [{ _id: 'Group', title: 'Group' }, { _id: 'HBrandCategory', title: 'Brand' }, { _id: 'Product', title: 'SKU' }] }, { _id: 'profit_center', group: 'Profit Center', sub: [{ _id: 'Entity', title: 'Entity' }, { _id: 'Type', title: 'Type' }, { _id: 'Branch', title: 'Branch' }, { _id: 'HQ', title: 'HQ' }] }, { _id: 'cost_center', group: 'Cost Center', sub: [{ _id: 'Group1', title: 'Group 1' }, { _id: 'Group2', title: 'Group 2' }, { _id: 'HCostCenterGroup', title: 'Function' }] }, { _id: 'ledger', group: 'Ledger', sub: [{ _id: 'LedgerAccount', title: 'GL Code' }] }];

rpt.masterData = {};
rpt.masterData.Type = ko.observableArray([{ value: 'Mfg', text: 'Mfg' }, { value: 'Branch', text: 'Branch' }]);
rpt.masterData.HQ = ko.observableArray([{ value: true, text: 'True' }, { value: false, text: 'False' }]);
rpt.filter.forEach(function (d) {
	d.sub.forEach(function (e) {
		if (rpt.masterData.hasOwnProperty(e._id)) {
			return;
		}

		rpt.masterData[e._id] = ko.observableArray([]);
	});
});

rpt.filterMultiSelect = function (d) {
	var config = {
		filter: 'contains',
		placeholder: 'Choose items ...'
	};

	if (['HQ', 'Type'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: 'value',
			dataTextField: 'text'
		});
	} else if (['SKU', 'Outlet', 'Customer'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			autoBind: false,
			dataSource: {
				serverFiltering: true,
				transport: {
					read: {
						url: '/report/getdata' + d._id.toLowerCase()
					}
				},
				schema: {
					data: 'data'
				}
			},
			minLength: 1,
			placeholder: 'Type min 1 chars, then choose items ...'
		});
	} else if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity', 'Channel', 'HBrandCategory', 'Product', 'Type', 'KeyAccount', 'LedgerAccount'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name'
		});

		app.ajaxPost('/report/getdata' + d._id.toLowerCase(), {}, function (res) {
			if (!res.success) {
				return;
			}

			var key = 'Name';
			if (d._id == 'KeyAccount') key = 'Title';
			var data = res.data.map(function (e) {
				return { _id: e._id, Name: e._id + ' - ' + app.capitalize(e[key], true) };
			});
			rpt.masterData[d._id](data);
		});
	} else if (['Region', 'Area', 'Zone'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: rpt.masterData[d._id],
			dataValueField: '_id',
			dataTextField: 'Name'
		});

		app.ajaxPost('/report/getdatahgeographi', {}, function (res) {
			if (!res.success) {
				return;
			}

			var keys = { Area: 'ID', Region: 'Region', Zone: 'Zone' };
			var groupKey = d._id == 'Area' ? '_id' : d._id;
			var data = Lazy(res.data).groupBy(function (d) {
				return d[groupKey];
			}).map(function (k, v) {
				return { _id: v, Name: app.capitalize(v, true) };
			}).toArray();
			rpt.masterData[d._id](data);
		});
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