'use strict';

viewModel.landing = {};
var lgd = viewModel.landing;

lgd.colors = ['rgb(10, 114, 183)', 'rgb(23, 142, 73)', 'rgb(212, 130, 0)', '#b70f5d', 'rgb(17, 134, 212)', 'rgb(32, 162, 87)', '#F39C12', 'rgb(202, 40, 115)', '#3498DB', '#28B463', 'rgb(255, 183, 68)', 'rgb(222, 68, 139)', 'rgb(70, 176, 247)', 'rgb(67, 206, 126)', 'rgb(255, 183, 68)'];

lgd.menu = ko.observableArray([{ to: 'pnlperformance', title: 'P&L Performance', icon: 'fa-bar-chart' }, { to: 'yearcompare', title: 'YoY Rev & EBIT', icon: 'fa-bar-chart' }, { to: 'marketingefficiency', title: 'Marketing Efficiency', icon: 'fa-bar-chart' }, { to: 'branchanalysis', title: 'Branch Analysis', icon: 'fa-home' }, { to: 'branchgroupanalysis', title: 'Branch Group Analysis', icon: 'fa-home' }, { to: 'rdvsbranchanalysis', title: 'Branch vs RD Analysis', icon: 'fa-bar-chart' }, { to: 'brandanalysis', title: 'Brand Analysis', icon: 'fa-bar-chart' }, { to: 'cogsanalysis', title: 'COGS Analysis', icon: 'fa-plus' }, { to: 'contributionanalysis', title: 'Contribution Analysis', icon: 'fa-plus' }, { to: 'customanalysis', title: 'Custom Analysis', icon: 'fa-gear' }, { to: 'distributionanalysis', title: 'Distribution Analysis', icon: 'fa-bus' }, { to: 'gnaanalysis', title: 'SG&A Analysis', icon: 'fa-bar-chart' }, { to: 'growthanalysis', title: 'Growth Analysis', icon: 'fa-area-chart' },
// { to: 'keyaccountanalysis', title: 'Key Account Analysis', icon: 'fa-area-chart' },
{ to: 'rdanalysis', title: 'RD Analysis', icon: 'fa-bar-chart' }, { to: 'salesreturnanalysis', title: 'Sales Return Analysis', icon: 'fa-refresh' }].map(function (d, i) {
	d.color = lgd.colors[i % lgd.colors.length];
	return d;
}));

vm.currentMenu('Home');
vm.currentTitle('Home');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: '#' }]);