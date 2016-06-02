viewModel.chartComparison = new Object()
let cc = viewModel.chartComparison

cc.dataTemp = [
	{ "activity": "drilling", "actual": 100, "plan": 80 },
	{ "activity": "completion", "actual": 85, "plan": 90 },
	{ "activity": "abandonment", "actual": 90, "plan": 85 }
]
cc.data = {}
cc.ideas = ko.observableArray([])
cc.getIdeas = () => {
	app.ajaxPost('/report/getdataanalysisidea', { }, (res) => {
		if (!app.isFine(res)) {
			return;
		}

		res.data.forEach((d) => {
			if (cc.hasOwnProperty(d._id)) {
				cc.data[d._id](res.data)
			} else {
				cc.data[d._id] = ko.observableArray([])
			}
		}) 

		cc.ideas(res.data)
		cc.selectedIdeas(cc.ideas().slice(0, 2))
		cc.render()
	})
}
cc.selectedIdeas = ko.observableArray([])
cc.render = () => {
	let $container = $('.chart-container')
	$container.empty()

	cc.selectedIdeas().forEach((d) => {
		let o = $(`<div class="col-md-12 col-sm-12 no-padding hardcore">
			<div class="chart chart-${d._id}" style="height: 300px;"></div>
		</div>`)
		$container.append(o)

		let series = [{ field: 'actual' }, { field: 'plan' }]
		let data = cc.dataTemp
		crt.createChart(`.chart-${d._id}`, d.name, series, data, 'activity')
	})
}

rpt.init = () => {
	cc.getIdeas()
}
rpt.refresh = () => {
	cc.render()	
}