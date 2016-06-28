viewModel.scatter = new Object()
let sct = viewModel.scatter

sct.title = ko.observable('')
sct.mode = ko.observable('render')
sct.setMode = (what) => () => {
	sct.mode(what)

	if (what == 'render') {
		sct.refresh()
	}
}

sct.xField = ko.observable('')
sct.yField = ko.observable('')
sct.data = ko.observableArray([])
sct.dimensions = ko.observableArray([])
sct.dataPoints = ko.observableArray([])
sct.configure = () => {
	let data = sct.data()
	let series = [
		{ xField: sct.xField(), yField: sct.yField() }
	]

	// let xAxisText, yAxisText = '', ''
	// let xRow = sct.dataPoints().find((d) => (d.field() == sct.xField()))
	// let yRow = sct.dataPoints().find((d) => (d.field() == sct.yField()))

	// if (app.isDefined(xRow)) {
	// 	xAxisText = xRow.na
	// }

	return {
        title: {
            text: sct.title(),
        },
        legend: {
            visible: true,
            position: 'bottom'
        },
        dataSource: { data: data },
        seriesDefaults: {
			overlay: { gradient: 'none' },
			border: { width: 0 },
            type: 'scatter'
        },
        series: series,
        xAxis: {
            labels: { format: '${0}' },
            // title: { text: xAxisText },
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: 'Source Sans Pro 11',
				// template: (d) => app.capitalize(d.value)
			}
        },
        yAxis: {
			majorGridLines: { color: '#fafafa' },
            labels: { format: '{0}%' },
            // title: { text: yAxisText }
        },
        tooltip: {
            visible: true,
            template: "#= kendo.format(value.x, 'n2') #, #= kendo.format(value.y, 'n2') #"
        }
    }
}

sct.getParam = () => {
	let dimensions = ko.mapping.toJS(sct.dimensions)
	let dataPoints = ko.mapping.toJS(sct.dataPoints)
		.filter((d) => (d.field != ''))
		.map((d) => { return { 
			field: d.field, 
			name: d.name, 
			aggr: 'sum'
		} })

	return rpt.wrapParam(dimensions, dataPoints)
}

sct.refresh = () => {
	// pvt.data(DATATEMP_SCATTER)
	app.ajaxPost(viewModel.appName + "report/summarycalculatedatapivot", sct.getParam(), (res) => {
		sct.data(res.Data)
		sct.render()
	})
}
sct.render = () => {
	let config = sct.configure()
	app.log('scatter', app.clone(config))
	$('#scatter').kendoChart(config)
}

$(() => {
	return
	sct.xField('value1')
	sct.yField('value2')

	sct.dimensions([
		app.koMap({ field: 'customer.branchname', name: 'Branch/RD' }),
		app.koMap({ field: 'product.name', name: 'Product' }),
		app.koMap({ field: 'customer.channelname', name: 'Product' })
	])
	sct.dataPoints([
		app.koMap({ field: 'value1', name: o[`value1`] }),
		app.koMap({ field: 'value2', name: o[`value2`] }),
		app.koMap({ field: 'value3', name: o[`value3`] })
	])


	sct.refresh()
})