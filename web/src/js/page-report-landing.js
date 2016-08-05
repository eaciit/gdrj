viewModel.landing = {}
let lgd = viewModel.landing

lgd.colors = [
	'rgb(10, 114, 183)',
	'rgb(23, 142, 73)',
	'rgb(212, 130, 0)',
	'#b70f5d',

	'rgb(17, 134, 212)',
	'rgb(32, 162, 87)',
	'#F39C12',
	'rgb(202, 40, 115)',

	'#3498DB',
	'#28B463',
	'rgb(255, 183, 68)',
	'rgb(222, 68, 139)',

	'rgb(70, 176, 247)',
	'rgb(67, 206, 126)',
	'rgb(255, 183, 68)',
]

// {"title":"Branch Analysis","icon":"bar-chart-o","href":"/web/page/branchanalysis","submenu":[]},
// {"title":"Branch Group Analysis","icon":"bar-chart-o","href":"/web/page/branchgroupanalysis","submenu":[]},
// {"title":"Branch vs RD Analysis","icon":"bar-chart-o","href":"/web/page/rdvsbranchanalysis","submenu":[]},
// {"title":"Brand Analysis","icon":"bar-chart-o","href":"/web/page/brandanalysis","submenu":[]},
// {"title":"Contribution Analysis","icon":"bar-chart-o","href":"/web/page/contributionanalysis","submenu":[]},
// {"title":"Custom Analysis","icon":"bar-chart-o","href":"/web/page/customanalysis","submenu":[]},
// {"title":"Distribution Analysis","icon":"bar-chart-o","href":"/web/page/distributionanalysis","submenu":[]},
// {"title":"G&A Analysis","icon":"bar-chart-o","href":"/web/page/gnaanalysis","submenu":[]},
// {"title":"Growth Analysis","icon":"bar-chart-o","href":"/web/page/growthanalysis","submenu":[]},
// // {"title":"Key Account Analysis","icon":"bar-chart-o","href":"/web/page/keyaccountanalysis","submenu":[]},
// {"title":"RD Analysis","icon":"bar-chart-o","href":"/web/page/rdanalysis","submenu":[]},
// {"title":"Sales Return Analysis","icon":"bar-chart-o","href":"/web/page/salesreturnanalysis","submenu":[]}

lgd.menu = ko.observableArray([
	{ to: 'pnlperformance', title: 'P&L Performance', icon: 'fa-bar-chart' },
	{ to: 'yearcompare', title: 'YoY Rev & EBIT', icon: 'fa-bar-chart' },
	{ to: 'marketingefficiency', title: 'Marketing Efficiency', icon: 'fa-bar-chart' },
	
	{ to: 'branchanalysis', title: 'Branch Analysis', icon: 'fa-home' },
	{ to: 'branchgroupanalysis', title: 'Branch Group Analysis', icon: 'fa-home' },
	{ to: 'rdvsbranchanalysis', title: 'Branch vs RD Analysis', icon: 'fa-bar-chart' },
	{ to: 'brandanalysis', title: 'Brand Analysis', icon: 'fa-bar-chart' },

	{ to: 'contributionanalysis', title: 'Contribution Analysis', icon: 'fa-plus' },
	{ to: 'customanalysis', title: 'Custom Analysis', icon: 'fa-gear' },
	{ to: 'distributionanalysis', title: 'Distribution Analysis', icon: 'fa-bus' },
	{ to: 'gnaanalysis', title: 'SG&A Analysis', icon: 'fa-bar-chart' },

	{ to: 'growthanalysis', title: 'Growth Analysis', icon: 'fa-area-chart' },
	// { to: 'keyaccountanalysis', title: 'Key Account Analysis', icon: 'fa-area-chart' },
	{ to: 'rdanalysis', title: 'RD Analysis', icon: 'fa-bar-chart' },
	{ to: 'salesreturnanalysis', title: 'Sales Return Analysis', icon: 'fa-refresh' },
].map((d, i) => {
	d.color = lgd.colors[i % lgd.colors.length]
	return d
}))

vm.currentMenu('Home')
vm.currentTitle('Home')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: '#' },
])
