vm.currentTitle(o.Name)
vm.breadcrumb(vm.breadcrumb().concat([
	{ title: o.Name, href: o.ID }
]))

vm.reportAnalysis = {}
let ra = vm.reportAnalysis

rpt.refresh = () => {
	let param = pvt.getPivotConfig()
	app.ajaxPost("/report/summarycalculatedatapivotdummy", param, (res) => {
		if (res.Data.length == 0) {
			return
		}

		pvt.render(res.Data)
		crt.render(res.Data)
	})
}

rpt.init = () => {
	rpt.refresh()
}
