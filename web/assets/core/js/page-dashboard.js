'use strict';

vm.currentMenu('Dashboard');
vm.currentTitle("Dashboard");
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Dashboard', href: '/report/dashboard' }]);

viewModel.dashboard = {};
var dsbrd = viewModel.dashboard;

dsbrd.dimension = ko.observable('customer.channelname');
dsbrd.quarter = ko.observable(4);
dsbrd.contentIsLoading = ko.observable(false);

dsbrd.data = ko.observableArray([{ pnl: 'Gross Sales', q1: 1000000, q2: 1150000, q3: 1280000, q4: 1400000, type: 'number' }, { pnl: 'Growth', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'Discount', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'ATL', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'BTL', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'COGS', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'Gross Margin', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'SGA', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'Royalties', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'EBITDA', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'EBIT (%)', q1: 10, q2: 10, q3: 10, q4: 10, type: 'percentage' }, { pnl: 'EBIT', q1: 100000, q2: 115000, q3: 128000, q4: 140000, type: 'number' }]);

dsbrd.render = function () {
	var columns = [{ field: 'pnl', title: 'PNL', attributes: { class: 'bold' } }];

	toolkit.repeat(dsbrd.quarter(), function (i) {
		columns.push({
			field: 'q' + (i + 1),
			title: 'Quarter ' + (i + 1),
			// headerTemplate: `<div class="align-right bold">Quarter ${(i + 1)}</div>`,
			attributes: { class: 'align-right' },
			headerAttributes: { style: 'text-align: right !important;', class: 'bold' },
			format: '{0:n0}'
		});
	});

	var config = {
		dataSource: {
			data: dsbrd.data()
		},
		columns: columns,
		resizabl: false,
		sortable: true,
		pageable: false,
		filterable: false
	};

	$('.grid-dashboard').replaceWith('<div class="grid-dashboard"></div>');
	$('.grid-dashboard').kendoGrid(config);
};

dsbrd.refresh = function () {
	dsbrd.render();
};

viewModel.dashboardRanking = {};
var rank = viewModel.dashboardRanking;

rank.dimension = ko.observable('product.brand');
rank.columns = ko.observableArray([{ field: 'gm', name: 'GM %', type: 'percentage' }, { field: 'cogs', name: 'COGS %', type: 'percentage' }, { field: 'ebit_p', name: 'EBIT %', type: 'percentage' }, { field: 'ebitda', name: 'EBITDA %', type: 'percentage' }, { field: 'net_sales', name: 'Net Sales', type: 'number' }, { field: 'ebit', name: 'EBIT', type: 'number' }]);
rank.contentIsLoading = ko.observable(false);

rank.data = ko.observableArray([{ product_brand: 'Mitu', gm: 30, cogs: 70, ebit_p: 9.25, ebitda: 92500, net_sales: 1000000, ebit: 92500 }, { product_brand: 'Stella', gm: 29, cogs: 71, ebit_p: 9, ebitda: 99000, net_sales: 1100000, ebit: 99000 }, { product_brand: 'Hit', gm: 27, cogs: 73, ebit_p: 8, ebitda: 96000, net_sales: 1200000, ebit: 96000 }, { product_brand: 'Etc', gm: 26, cogs: 74, ebit_p: 7, ebitda: 91000, net_sales: 1300000, ebit: 91000 }]);

rank.render = function () {
	var columns = [{
		field: toolkit.replace(rank.dimension(), ".", "_"),
		title: 'PNL',
		attributes: { class: 'bold' }
	}];

	rank.columns().forEach(function (e) {
		var column = {
			field: e.field,
			title: e.name,
			// headerTemplate: `<div class="align-right bold">${e.name}</div>`,
			attributes: { class: 'align-right' },
			headerAttributes: { style: 'text-align: right !important;', class: 'bold' },
			format: '{0:n2}'
		};

		columns.push(column);
	});

	var config = {
		dataSource: {
			data: rank.data()
		},
		columns: columns,
		resizabl: false,
		sortable: true,
		pageable: false,
		filterable: false
	};

	$('.grid-ranking').replaceWith('<div class="grid-ranking"></div>');
	$('.grid-ranking').kendoGrid(config);
};

rank.refresh = function () {
	rank.render();
};

$(function () {
	dsbrd.refresh();
	rank.refresh();
});