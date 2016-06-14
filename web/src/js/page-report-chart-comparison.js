vm.currentMenu('Chart Comparison')
vm.currentTitle('Chart Comparison')
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Chart Comparison', href: '/chartcomparison' }
])

viewModel.chartComparison = new Object()
let cc = viewModel.chartComparison

cc.dataTemp = [
	{ "activity": "drilling", "actual": 100, "plan": 80 },
	{ "activity": "completion", "actual": 85, "plan": 90 },
	{ "activity": "abandonment", "actual": 90, "plan": 85 }
]
cc.data = {}
cc.analysisIdeas = ko.observableArray([])
cc.getIdeas = () => {
	toolkit.ajaxPost('/report/getdataanalysisidea', { }, (res) => {
		if (!toolkit.isFine(res)) {
			return;
		}

		res.data.forEach((d) => {
			if (cc.hasOwnProperty(d._id)) {
				cc.data[d._id](res.data)
			} else {
				cc.data[d._id] = ko.observableArray([])
			}
		}) 

		cc.analysisIdeas(res.data)
		cc.selectedIdeas(cc.analysisIdeas().slice(0, 2))
		cc.render()
	})
}
cc.selectedIdeas = ko.observableArray([])
cc.render = () => {
	let $container = $('.chart-container')
	$container.empty()

	cc.selectedIdeas().forEach((d, i) => {
		let o = $(`<div class="col-md-12 col-sm-12 no-padding hardcore">
			<div class="chart chart-${d._id}" style="height: 300px;"></div>
		</div>`)
		$container.append(o)

		let series = [
			{ field: 'actual', color: toolkit.seriesColorsGodrej[0] },
			{ field: 'plan', color: toolkit.seriesColorsGodrej[1] }
		]
		let data = cc.dataTemp
		crt.createChart(`.chart-${d._id}`, d.name, [series[i]], data, 'activity')
	})
}

rpt.init = () => {
	cc.getIdeas()
}
rpt.refresh = () => {
	cc.render()	
}