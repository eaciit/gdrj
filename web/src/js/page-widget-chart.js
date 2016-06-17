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
crt.fiscalYear = ko.observable(rpt.value.FiscalYear())
crt.modecustom = ko.observable(false)
crt.dataplmodel = ko.observableArray([])
crt.valueplmodel = ko.observableArray(["PL8A", "PL94C"])

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
crt.configure = (series, colorseries, maxchart = 0) => {
	let dataSort = crt.data()
	if (crt.categoryAxisField() == "date.quartertxt") {
		dataSort = _.orderBy(crt.data(), [crt.categoryAxisField()], ['desc'])
	} else if (crt.categoryAxisField() == "date.month") {
		dataSort = _.orderBy(crt.data(), (d) => parseInt(d[toolkit.replace(crt.categoryAxisField(), '.', '_')], 10), ['desc'])
	} else if (crt.sortField() != '') {
		dataSort = _.orderBy(crt.data(), [crt.sortField()], ['desc'])
	}

	if (crt.typeChart() == 'stack') {
		let maxyo = 0
		let datayo = _.map(dataSort, (k, e) => {
			let data = {}
			$.each( k, ( key, value ) => {
				if (value != 0)
					data[key] = value
				if (value > maxyo)
					maxyo = value
			})
			return data
		})
		dataSort = datayo
	}
	let config = {
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
					if ($.trim(d.value) == '') {
						return 'Other'
					}

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
			visible: false,
			majorGridLines: {
				color: '#fafafa'
			},
			labels: { 
				visible: false,
			},
			minorGridLines: {
				skip: 3
			},
			max: maxchart
		},
		tooltip: {
			visible: true,
			template: (d) => $.trim(`${app.capitalize(d.series.name)} on ${app.capitalize(d.category)}: ${kendo.toString(d.value, 'n2')}`)
		}
	}
	if (crt.typeChart() == 'stack') {
		delete config.valueAxis.max
	}
	return config
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
			let max = _.maxBy(crt.data(), (f) => { return f[series[i].field] })
			config = crt.configure([series[i]], [app.seriesColorsGodrej[i]], (max[series[i].field] + (max[series[i].field]/2)))
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
crt.getPlModel = (datapl) => {
	let data = _.filter(datapl, (d) => { return d.PLHeader2 == d.PLHeader1 && d.PLHeader3 == d.PLHeader1 })
	crt.dataplmodel(data)
	if (crt.data().length == 0){
		crt.valueplmodel(["PL8A", "PL94C"])
		pvt.valueplmodel(["PL8A", "PL94C"])
	}
}
crt.renderCustomChart = (data) => {
	let series = [], dataresult = []
	let breakdown = toolkit.replace(crt.categoryAxisField(), ".", "_"), keydata, dataseries
	let rows = data.map((d) => {
		let row = {}
		row[breakdown] = d._id[`_id_${breakdown}`]
		$.each(d, function( key, value ) {
			keydata = _.find(crt.dataplmodel(), (s) => { return s._id == key })
			if (keydata != undefined) {
				row[key] = value
				dataseries = _.find(series, (s) => { return s.field == key })
				if (dataseries == undefined){
					series.push({
						field: key, title: keydata.PLHeader1, name: keydata.PLHeader1
					})
				}
			}
		})
		return row
	})
	let op1 = _.groupBy(rows, (d) => d[breakdown])
	let op2 = _.map(op1, (v, k) => {
		let row = { }
		row[breakdown] = k
		let sample = v[0]

		for (let key in sample) {
			if (sample.hasOwnProperty(key) && key != breakdown) {
				row[key] = toolkit.sum(v, (d) => d[key])
				row[key] = Math.abs(row[key])
			}
		}

		return row
	})
	crt.series(series)
	crt.data(op2)
}
crt.refresh = () => {
	rpt.refreshView('reportwidget')
	let param = {}
	param.pls = []
	param.flag = o.ID
	param.groups = [crt.categoryAxisField(), "date.fiscal"]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, crt.fiscalYear)

	if (rpt.modecustom() == true){
		param.pls = crt.valueplmodel()
		param.flag = ""
	}

	crt.contentIsLoading(true)
	
	let fetch = () => {
		app.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			crt.getPlModel(res.Data.PLModels)
			crt.data(res.Data.Data)
			crt.contentIsLoading(false)
			if (rpt.modecustom() == true){
				crt.renderCustomChart(res.Data.Data)
			}

			crt.render()
		}, () => {
			crt.contentIsLoading(false)
		})
	}
	fetch()
}
