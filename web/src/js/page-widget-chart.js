viewModel.chart = new Object()
var crt = viewModel.chart

crt.setMode = (what) => () => {
	crt.mode(what)

	if (what == 'render') {
		crt.refresh()
	}
}
crt.categoryAxisField = ko.observable('customer.channelname')
crt.title = ko.observable('')
crt.data = ko.observableArray([])
crt.series = ko.observableArray([])
crt.contentIsLoading = ko.observable(false)
crt.sortField = ko.observable('')
crt.typeChart = ko.observable('')
crt.chartdata = ko.observableArray([])

crt.convertCurrency = (labelValue) => {
	let res =  Math.abs(Number(labelValue)) >= 1.0e+9 ? Math.abs(Number(labelValue)) / 1.0e+9 + " B"
		: Math.abs(Number(labelValue)) >= 1.0e+6 ? Math.abs(Number(labelValue)) / 1.0e+6 + " M"
		: Math.abs(Number(labelValue)) >= 1.0e+3 ? Math.abs(Number(labelValue)) / 1.0e+3 + " K"
		: kendo.toString(labelValue, "n2")
	let indexres = res.indexOf('.'), indexcurrency = res.indexOf(' '), type = ""
	if (indexres == -1)
		indexres = 0
	if (indexcurrency == -1 || indexcurrency == 0){
		indexcurrency = 0
		type = res
	} else {
		type = kendo.toString(parseInt(res.substring(0, indexres)), "n0") + res.substring(indexcurrency, res.length)
	}
	return type
}
crt.convertCurrency2 = (labelValue) => {
	let res =  Math.abs(Number(labelValue)) >= 1.0e+9 ? kendo.toString(Math.abs(Number(labelValue)) / 1.0e+9, 'n0') + " B"
		: Math.abs(Number(labelValue)) >= 1.0e+6 ? kendo.toString(Math.abs(Number(labelValue)) / 1.0e+6, 'n0') + " M"
		: Math.abs(Number(labelValue)) >= 1.0e+3 ? kendo.toString(Math.abs(Number(labelValue)) / 1.0e+3, 'n0') + " K"
		: labelValue.toString()
	return res
}
crt.configure = (series, colorseries) => {
	let dataSort = crt.data()
	if (crt.categoryAxisField() == "date.quartertxt") {
		dataSort = _.orderBy(crt.data(), [crt.categoryAxisField()], ['desc'])
	} else if (crt.sortField() != '') {
		dataSort = _.orderBy(crt.data(), [crt.sortField()], ['desc'])
	}

	return {
		title: crt.title(),
		dataSource: { data: dataSort },
		seriesDefaults: {
			type: 'column',
			overlay: { gradient: 'none' },
			border: { width: 0 },
			labels: {
				visible: true,
				position: 'outsideEnd',
				// format: '{0:n2}',
				template: "#: crt.convertCurrency(value) #"
			},
		},
		series: series,
		seriesColors: colorseries,
		categoryAxis: {
			field: app.idAble(crt.categoryAxisField()),
			majorGridLines: { color: '#fafafa' },
			labels: {
				// rotation: 20,
				font: 'Source Sans Pro 11',
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
			// majorGridLines: { color: '#fafafa' },
			labels: { 
				// format: '{0:n2}',
				visible: false,
				// template: "#= crt.convertCurrency2(value) #"
			},
			minorGridLines: {
				skip: 3
			}
		},
		tooltip: {
			visible: true,
			template: (d) => $.trim(`${app.capitalize(d.series.name)} on ${app.capitalize(d.category)}: ${kendo.toString(d.value, 'n2')}`)
		}
	}
}

crt.render = () => {
	let data = _.sortBy(crt.data(), (d) => toolkit.redefine(d[toolkit.replace(crt.categoryAxisField(), '.', '_')], 'Other'))
	crt.data(data)
			
	let series = ko.mapping.toJS(crt.series)
		.filter((d) => (d.field != ''))
		.map((d) => {
			if (app.isUndefined(d.name)) {
				d.name = d.field
			}

			return d
		})

	let config, seriesarr = [], tempcol = 0 
	if (crt.typeChart() == '') {
		crt.chartdata(series)
		for (var i in series) {
			config = crt.configure([series[i]], [app.seriesColorsGodrej[i]])
			$('#chart'+i).replaceWith(`<div id="chart${i}" style="height: 180px;"></div>`)

			if (crt.data().length > 8) {
				$('#chart'+i).width(crt.data().length * 130)
				$('#chart'+i).parent().css('overflow-x', 'scroll')
			}

			$('#chart'+i).kendoChart(config)
		}
	} else if (crt.typeChart() == 'stack') {
		seriesarr = _.groupBy(series, (e) => { return e.stack })
		let i = 0
		$.each( seriesarr, ( key, value ) => {
			crt.chartdata.push(value)
		})
		$.each( seriesarr, ( key, value ) => {
			if (value.length == 1)
				delete value[0]['stack']
			config = crt.configure(value, app.seriesColorsGodrej)
			$('#chart'+i).replaceWith(`<div id="chart${i}" style="height: 180px;"></div>`)

			if (crt.data().length > 8) {
				$('#chart'+i).width(crt.data().length * 130)
				$('#chart'+i).parent().css('overflow-x', 'scroll')
			}

			$('#chart'+i).kendoChart(config)
			tempcol = value.length
			i++
		})
	}
}
crt.refresh = () => {
	rpt.refreshView('reportwidget')
	let param = {}
	param.pls = []
	param.flag = o.ID
	param.groups = [crt.categoryAxisField()]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue()

	crt.contentIsLoading(true)
	
	let fetch = () => {
		app.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			crt.data(res.Data.Data)
			crt.contentIsLoading(false)
			crt.render()
		}, () => {
			crt.contentIsLoading(false)
		})
	}
	fetch()
}
