'use strict';

vm.currentMenu('Dashboard');
vm.currentTitle("Dashboard");
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Dashboard', href: '/report/dashboard' }]);

viewModel.dashboard = {};
var dsbrd = viewModel.dashboard;

dsbrd.title = ko.observable('&nbsp;');
dsbrd.dimension = ko.observable('');
dsbrd.quarter = ko.observable(4);
dsbrd.contentIsLoading = ko.observable(false);

dsbrd.data = ko.observableArray([{ pnl: 'Gross Sales', q1: 1000000, q2: 1150000, q3: 1280000, q4: 1400000, type: 'number' }, { pnl: 'Growth', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'Discount', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'ATL', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'BTL', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'COGS', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'Gross Margin', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'SGA', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'Royalties', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'EBITDA', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' }, { pnl: 'EBIT (%)', q1: 10, q2: 10, q3: 10, q4: 10, type: 'percentage' }, { pnl: 'EBIT', q1: 100000, q2: 115000, q3: 128000, q4: 140000, type: 'number' }]);
dsbrd.render = function () {
	var target = $('.grid-dashboard');
	var table = toolkit.newEl('table').addClass('table ez').appendTo(target);
	var trFirst = toolkit.newEl('tr').appendTo(table);

	toolkit.newEl('td').html('&nbsp;').appendTo(trFirst);
	toolkit.repeat(dsbrd.quarter(), function (i) {
		toolkit.newEl('td').addClass('align-right bold').html('Quarter ' + (i + 1)).appendTo(trFirst);
	});

	dsbrd.data().forEach(function (d) {
		var tr = toolkit.newEl('tr').appendTo(table);
		toolkit.newEl('td').html(d.pnl).addClass('bold').appendTo(tr);

		toolkit.repeat(dsbrd.quarter(), function (i) {
			var value = toolkit.redefine(d['q' + (i + 1)], 0);
			if (value == 0) {
				value = '-';
			} else if (d.type == 'percentage') {
				value = value + ' %';
			}

			toolkit.newEl('td').html(value).addClass('align-right').appendTo(tr);
		});
	});
};

dsbrd.refresh = function () {
	dsbrd.render();
};

$(function () {
	dsbrd.refresh();
});