'use strict';

vm.currentMenu('Growth Analysis');
vm.currentTitle("&nbsp;");
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Growth Analysis', href: '/report/growthanalysis' }]);

viewModel.growth = {};
var growth = viewModel.growth;

growth.fiscalYears = ko.observableArray(rpt.value.FiscalYears());
growth.contentIsLoading = ko.observable(false);

growth.refresh = function () {};

growth.render = function () {};