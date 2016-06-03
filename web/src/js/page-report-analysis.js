vm.currentTitle(o.Name)
vm.breadcrumb(vm.breadcrumb().concat([
	{ title: o.Name, href: o.ID }
]))

vm.reportAnalysis = {}
let ra = vm.reportAnalysis

rpt.init = () => {
	pvt.init()
}

rpt.refresh = () => {
	pvt.refreshData()
}
