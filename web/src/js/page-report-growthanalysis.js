vm.currentMenu('Growth Analysis')
vm.currentTitle("Growth Analysis")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Growth Analysis', href: '/report/growthanalysis' }
])

viewModel.growth = {}
let growth = viewModel.growth

growth.fiscalYears = ko.observableArray(rpt.value.FiscalYears())
growth.contentIsLoading = ko.observable(false)

growth.refresh = () => {
	
}