'use strict';

viewModel.landing = {};
var lgd = viewModel.landing;

lgd.menu = ko.observableArray([{ to: 'dashboard', title: 'P&L Performance', icon: 'fa-bar-chart', color: 'rgb(10, 114, 183)' }, { to: 'distribution-analysis', title: 'Distribution Analysis', icon: 'fa-bus', color: 'rgb(17, 134, 212)' }, { to: 'contribution-analysis', title: 'Contribution Analysis', icon: 'fa-plus', color: '#3498DB' }, { to: 'growth-analysis', title: 'Growth Analysis', nope: true, icon: 'fa-area-chart', color: 'rgb(23, 142, 73)' }, { to: 'key-account-analysis', title: 'Key Account Analysis', icon: 'fa-key', color: 'rgb(32, 162, 87)' }, { to: 'sales-return-analysis', title: 'Sales Return Analysis', nope: true, icon: 'fa-refresh', color: '#28B463' }, { to: 'rd-analysis', title: 'RD Analysis', nope: true, icon: 'fa-bar-chart', color: 'rgb(212, 130, 0)' }, { to: 'branch-analysis', title: 'Branch Analysis', icon: 'fa-home', color: 'rgb(234, 144, 0)' }, { to: 'ad-hoc-analysis', title: 'Ad Hoc Analysis', icon: 'fa-gear', color: '#F39C12' }]);

vm.currentMenu('Home');
vm.currentTitle('Landing Page');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Landing Page', href: '#' }]);