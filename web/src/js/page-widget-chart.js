viewModel.chart = new Object()
var crt = viewModel.chart

crt.config = {}
crt.config.wetengLuwe = (title, data, series, categoryAxisField) => {
	return {
		title: title,
		dataSource: { data: data },
		seriesDefaults: {
			type: 'column',
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		seriesColors: app.seriesColorsGodrej,
		categoryAxis: {
			field: categoryAxisField,
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: 'Source Sans Pro 11',
				template: (d) => app.capitalize(d.value)
			}
		},
		legend: { visible: false },
		valueAxis: {
			majorGridLines: { color: '#fafafa' }
		},
		tooltip: {
			visible: true,
			template: (d) => `${app.capitalize(d.series.name)} on ${app.capitalize(d.dataItem[categoryAxisField])}: ${d.value}`
		}
	}
}

crt.createChart = (o, title, series= [], data= [], categoryAxis= 'category', chartType= 'columns', which= 'wetengLuwe') => {
	series.forEach((d) => {
		if (app.isUndefined(d.name)) {
			d.name = d.field
		}
	})

	let config = crt.config[which](title, data, series, categoryAxis)
	let sel = (app.typeIs(o, 'string') ? $(o) : o)
	sel.kendoChart(config)
}