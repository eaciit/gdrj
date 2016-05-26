'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var currentReportMenu = vm.menu().find(function (d) {
	return d.href == '/' + document.URL.split('/').slice(3).join('/');
});

vm.currentMenu(currentReportMenu.title);
vm.currentTitle(currentReportMenu.title);
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: currentReportMenu.title, href: currentReportMenu.href }]);

viewModel.report = new Object();
var rpt = viewModel.report;

rpt.masterData = {};
rpt.masterData.Branch = ko.observableArray([]);
rpt.masterData.Brand = ko.observableArray([]);
rpt.masterData.Region = ko.observableArray([]);
rpt.masterData.Channel = ko.observableArray([]);
rpt.masterData.From = ko.observableArray([]);
rpt.masterData.Area = ko.observableArray([]);
rpt.masterData.Zone = ko.observableArray([]);
rpt.masterData.Accounts = ko.observableArray([]);
rpt.masterData.Outlet = ko.observableArray([]);
rpt.masterData.Group = ko.observableArray([]);
rpt.masterData.SKU = ko.observableArray([]);
rpt.masterData.Entity = ko.observableArray([]);
rpt.masterData.Type = ko.observableArray([]);
rpt.masterData.HQ = ko.observableArray([]);
rpt.masterData.Group1 = ko.observableArray([]);
rpt.masterData.Group2 = ko.observableArray([]);
rpt.masterData.HCostCenterGroup = ko.observableArray([]);
rpt.masterData.GLCode = ko.observableArray([]);
rpt.commonBranch = ko.observableArray([]), rpt.value = {};
rpt.value.commonBranch = ko.observableArray([]);
rpt.value.commonBrand = ko.observableArray([]);
rpt.value.commonRegion = ko.observableArray([]);
rpt.value.commonChannel = ko.observableArray([]);
rpt.value.commonFrom = ko.observableArray([]);

rpt.value.geoRegion = ko.observableArray([]);
rpt.value.geoArea = ko.observableArray([]);
rpt.value.geoZone = ko.observableArray([]);

rpt.value.customerChannel = ko.observableArray([]);
rpt.value.customerAccounts = ko.observableArray([]);
rpt.value.customerOutlet = ko.observableArray([]);

rpt.value.customerChannel = ko.observableArray([]);
rpt.value.customerAccounts = ko.observableArray([]);
rpt.value.customerOutlet = ko.observableArray([]);

rpt.value.productGroup = ko.observableArray([]);
rpt.value.productBrand = ko.observableArray([]);
rpt.value.productSKU = ko.observableArray([]);

rpt.value.profit_centerEntity = ko.observableArray([]);
rpt.value.profit_centerType = ko.observableArray([]);
rpt.value.profit_centerBranch = ko.observableArray([]);
rpt.value.profit_centerHQ = ko.observableArray([]);

rpt.value.cost_centerGroup1 = ko.observableArray([]);
rpt.value.cost_centerGroup2 = ko.observableArray([]);
rpt.value.cost_centerHCostCenterGroup = ko.observableArray([]);

rpt.value.ledgerGLCode = ko.observableArray([]);

rpt.filter = [{ _id: 'common', group: 'Base Filter', sub: [{ _id: 'Branch', title: 'Branch', value: 'commonBranch' }, { _id: 'Brand', title: 'Brand', value: 'commonBrand' }, { _id: 'Region', title: 'Region', value: 'commonRegion' }, { _id: 'Channel', title: 'Channel', value: 'commonChannel' }, { _id: 'From', title: 'From', value: 'commonFrom' }] }, { _id: 'geo', group: 'Geographical', sub: [{ _id: 'Region', title: 'Region', value: 'geoRegion' }, { _id: 'Area', title: 'Area', value: 'geoArea' }, { _id: 'Zone', title: 'Zone', value: 'geoZone' }] }, { _id: 'customer', group: 'Customer', sub: [{ _id: 'Channel', title: 'Channel', value: 'customerChannel' }, { _id: 'Accounts', title: 'Accounts', value: 'customerAccounts' }, { _id: 'Outlet', title: 'Outlet', value: 'customerOutlet' }] }, { _id: 'product', group: 'Product', sub: [{ _id: 'Group', title: 'Group', value: 'productGroup' }, { _id: 'Brand', title: 'Brand', value: 'productBrand' }, _defineProperty({ _id: 'SKU', title: 'SKU', value: '' }, 'value', 'productSKU')] }, { _id: 'profit_center', group: 'Profit Center', sub: [{ _id: 'Entity', title: 'Entity', value: 'profit_centerEntity' }, { _id: 'Type', title: 'Type', value: 'profit_centerType' }, { _id: 'Branch', title: 'Branch', value: 'profit_centerBranch' }, { _id: 'HQ', title: 'HQ', value: 'profit_centerHQ' }] }, { _id: 'cost_center', group: 'Cost Center', sub: [{ _id: 'Group1', title: 'Group 1', value: 'cost_centerGroup1' }, { _id: 'Group2', title: 'Group 2', value: 'cost_centerGroup2' }, { _id: 'HCostCenterGroup', title: 'Function', value: 'cost_centerHCostCenterGroup' }] }, { _id: 'ledger', group: 'Ledger', sub: [{ _id: 'GLCode', title: 'GL Code', value: 'ledgerGLCode' }] }];

rpt.filterMultiSelect = function (d) {
	var config = {
		value: rpt.value[d.value],
		data: rpt.masterData[d._id],
		placeholder: 'Choose items ...'
	};

	if (['Branch', 'Brand', 'HCostCenterGroup', 'Entity'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			data: ko.computed(function () {
				return rpt.masterData[d._id]().map(function (d) {
					return { _id: d._id, Name: d._id + ' - ' + d.Name };
				});
			}, rpt),

			dataValueField: '_id',
			dataTextField: 'Name'
		});

		app.ajaxPost('/report/getdata' + d._id.toLowerCase(), {}, function (res) {
			rpt.masterData[d._id](res);
		});
	} else if (['SKU', 'Outlet'].indexOf(d._id) > -1) {
		config = $.extend(true, config, {
			autoBind: false,
			dataSource: {
				serverFiltering: true,
				transport: {
					read: {
						url: '/report/getdata' + d._id.toLowerCase()
					}
				}
			},
			minLength: 3,
			placeholder: 'Type min 3 chars, then choose items ...'
		});
	}

	console.log(d, config);

	return config;
};

rpt.refreshData = function () {
	$('.grid').append($('<p />').text('Still under development.'));
	return;
	$('.grid').kendoGrid({
		columns: [{ title: "ID" }],
		dataSource: {
			data: []
		}
	});
};

$(function () {
	rpt.refreshData();
});