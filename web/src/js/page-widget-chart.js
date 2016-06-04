let DATATEMP_PIVOT = [
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 900, "value2": 600, "value3": 300 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 900, "value2": 600, "value3": 300 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 700, "value2": 700, "value3": 100 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 700, "value2": 700, "value3": 100 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 1100, "value2": 900, "value3": 150 }
]

viewModel.chart = new Object()
var crt = viewModel.chart

crt.setMode = (what) => () => {
	crt.mode(what)

	if (what == 'render') {
		crt.refresh()
	}
}
crt.mode = ko.observable('render')
crt.configure = (series) => {
	let data = Lazy(crt.data())
		.groupBy((d) => d._id[crt.categoryAxisField()])
		.map((k, v) => {
			console.log(v, k)
			let res = { category: v }
			res.value1 = Lazy(k).sum((d) => d.value1)
			res.value2 = Lazy(k).sum((d) => d.value2)
			res.value3 = Lazy(k).sum((d) => d.value3)
			return res
		}).toArray()

	return {
		title: crt.title(),
		dataSource: { data: data },
		seriesDefaults: {
			type: crt.chartType(),
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
			field: 'category',
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: 'Source Sans Pro 11',
				template: (d) => app.capitalize(d.value)
			}
		},
		legend: { 
			visible: true,
			position: 'bottom'
		},
		valueAxis: {
			majorGridLines: { color: '#fafafa' }
		},
		tooltip: {
			visible: true,
			template: (d) => `${app.capitalize(d.series.name)} on ${app.capitalize(d.dataItem.category)}: ${kendo.toString(d.value, 'n2')}`
		}
	}
}
crt.categoryAxisField = ko.observable('category')
crt.chartType = ko.observable('column')
crt.title = ko.observable('')
crt.data = ko.observableArray([])
crt.series = ko.observableArray([])

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
	$('#chart').kendoChart(config)
}

let DATATEMP_TABLE = [
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 900, "value2": 600, "value3": 300 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 900, "value2": 600, "value3": 300 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 700, "value2": 700, "value3": 100 },
	{"_id": {"customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 700, "value2": 700, "value3": 100 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist"}, "value1": 1000, "value2": 800, "value3": 200 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade"}, "value1": 1100, "value2": 900, "value3": 150 },
	{"_id": {"customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist"}, "value1": 1100, "value2": 900, "value3": 150 }
]

crt.getParam = () => {
	let row = ra.optionDimensions().find((d) => (d.field == crt.categoryAxisField()))
	let dataPoints = ko.mapping.toJS(crt.series)
		.filter((d) => (d.field != ''))
		.map((d) => { return { 
			field: d.field, 
			name: d.name, 
			aggr: 'sum'
		} })

	return {
		dimensions: [row],
		dataPoints: dataPoints
	}
}
crt.refresh = () => {
	// crt.data(DATATEMP_PIVOT)
	crt.series([
		app.koMap({ field: 'value1', name: 'Gross Sales' }),
		app.koMap({ field: 'value2', name: 'Discount' }),
		app.koMap({ field: 'value3', name: 'Net Sales' })
	])
	app.ajaxPost("/report/summarycalculatedatapivot", crt.getParam(), (res) => {
		crt.data(res.Data)
		crt.render()
	})
}
crt.refreshOnChange = () => {
	setTimeout(crt.refresh, 100)
}

$(() => {
	crt.categoryAxisField('customer.branchname')
	crt.refresh()
})
