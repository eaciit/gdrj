vm.currentTitle(o.Name)
vm.breadcrumb(vm.breadcrumb().concat([
	{ title: o.Name, href: o.ID }
]))

vm.reportAnalysis = {}
let ra = vm.reportAnalysis
ra.init = () => {
	pvt.dimensions(pvt.optionDimensions().filter(
		(d) => app.redefine(d.tag, '').indexOf(o.Name) > -1))
}


rpt.init = () => {
	ra.init()
	pvt.init()
}

rpt.refresh = () => {
	pvt.refreshData()
}
