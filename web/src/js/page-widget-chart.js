viewModel.chart = new Object()
var crt = viewModel.chart

crt.setMode = (what) => () => {
	crt.mode(what)

	if (what == 'render') {
		crt.refresh()
	}
}
crt.flag = ko.observable('')
crt.categoryAxisField = ko.observable('category')
crt.title = ko.observable('')
crt.data = ko.observableArray([])
crt.series = ko.observableArray([])
crt.contentIsLoading = ko.observable(false)

crt.configure = (series) => {
	return {
		title: crt.title(),
		dataSource: { data: crt.data() },
		seriesDefaults: {
			type: 'column',
			overlay: { gradient: 'none' },
			border: { width: 0 },
			labels: {
				visible: true,
				position: 'outsideEnd',
				format: '{0:n2}'
			},
		},
		series: series,
		seriesColors: app.seriesColorsGodrej,
		categoryAxis: {
			field: app.idAble(crt.categoryAxisField()),
			majorGridLines: { color: '#fafafa' },
			labels: {
				// rotation: 20,
				font: 'Source Sans Pro 11',
				padding: {
					top: 30
				},
				template: (d) => {
					let max = 20
					let text = $.trim(app.capitalize(d.value)).replace(' 0', '');

					if (text.length > max) {
						return `${text.slice(0, max - 3)}...`
					}

					return text
				}
			}
		},
		legend: { 
			visible: true,
			position: 'bottom'
		},
		valueAxis: {
			majorGridLines: { color: '#fafafa' },
			labels: { format: '{0:n2}' }
		},
		tooltip: {
			visible: true,
			template: (d) => $.trim(`${app.capitalize(d.series.name)} on ${app.capitalize(d.category)}: ${kendo.toString(d.value, 'n2')}`)
		}
	}
}

crt.render = () => {
	let series = ko.mapping.toJS(crt.series)
		.filter((d) => (d.field != ''))
		.map((d) => {
			if (app.isUndefined(d.name)) {
				d.name = d.field
			}

			return d
		})

	let config = crt.configure(series)
	app.log('chart', app.clone(config))


	$('#chart').replaceWith(`<div id="chart" style="height: 300px;"></div>`)

	if (crt.data().length > 8) {
		$('#chart').width(crt.data().length * 130)
		$('#chart').parent().css('overflow-x', 'scroll')
	}

	$('#chart').kendoChart(config)
}
crt.refresh = () => {
	let param = {}
	param.pls = []
	param.flag = crt.flag()
	param.groups = [crt.categoryAxisField()]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue()

	crt.contentIsLoading(true)
	app.ajaxPost("/report/getpnldatanew", param, (res) => {
		crt.data(res.Data.Data)
		crt.contentIsLoading(false)
		crt.render()
	}, () => {
		crt.contentIsLoading(false)
	})
}

$(() => {
	crt.categoryAxisField('customer.branchname')
	crt.refresh()
})
