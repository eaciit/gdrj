viewModel.scatter = new Object()
let rs = viewModel.scatter
let dataPoints = [
	{field: "value1", name: "value1", aggr: "sum"}
]

rs.contentIsLoading = ko.observable(false)
rs.title = ko.observable('P&L Analytic')
rs.breakdownBy = ko.observable('customer.channelname')
rs.selectedPNLNetSales = ko.observable("PL8A") // PL1
rs.selectedPNL = ko.observable("PL74C")
rs.chartComparisonNote = ko.observable('')
rs.optionDimensionSelect = ko.observableArray([])

rs.getSalesHeaderList = () => {
	app.ajaxPost("/report/getplmodel", {}, (res) => {
		let data = res.map((d) => app.o({ field: d._id, name: d.PLHeader3 }))
			.filter((d) => d.PLHeader3 !== rs.selectedPNLNetSales())
		rs.optionDimensionSelect(data)

		let prev = rs.selectedPNL()
		rs.selectedPNL('')
		setTimeout(() => {
			rs.selectedPNL(prev)
			rs.refresh(false)
		}, 300)
	})
}

rs.refresh = (useCache = false) => {
	rs.contentIsLoading(true)

	let param1 = {}
	param1.pls = [rs.selectedPNL(), rs.selectedPNLNetSales()]
	param1.groups = [rs.breakdownBy(), 'date.year']
	param1.aggr = 'sum'
	param1.filters = rpt.getFilterValue()
	
	let fetch = () => {
		app.ajaxPost("/report/getpnldatanew", param1, (res1) => {
			if (res1.Status == "NOK") {
				setTimeout(() => {
					fetch()
				}, 1000 * 5)
				return
			}

			let date = moment(res1.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			rs.chartComparisonNote(`Last refreshed on: ${date}`)

			let dataAllPNL = res1.Data.Data
				.filter((d) => d.hasOwnProperty(rs.selectedPNL()))
				.map((d) => { return { _id: d._id, value: d[rs.selectedPNL()] } })
			let dataAllPNLNetSales = res1.Data.Data
				.filter((d) => d.hasOwnProperty(rs.selectedPNLNetSales()))
				.map((d) => { return { _id: d._id, value: d[rs.selectedPNLNetSales()] } })

			let years = _.map(_.groupBy(dataAllPNL, (d) => d._id._id_date_year), (v, k) => k)

			var sumNetSales = _.reduce(dataAllPNLNetSales, (m, x) => m + x.value, 0);
			let sumPNL = _.reduce(dataAllPNL, (m, x) => m + x.value, 0)
			let countPNL = dataAllPNL.length
			let avgPNL = sumPNL / countPNL

			let dataScatter = []
			let multiplier = (sumNetSales == 0 ? 1 : sumNetSales)

			dataAllPNL.forEach((d) => {
				dataScatter.push({
					category: app.nbspAble(`${d._id["_id_" + app.idAble(rs.breakdownBy())]} ${d._id._id_date_year}`, 'Uncategorized'),
					year: d._id._id_date_year,
					valuePNL: d.value,
					valuePNLPercentage: d.value / multiplier * 100,
					avgPNL: avgPNL,
					avgPNLPercentage: avgPNL / multiplier * 100,
					sumPNL: sumPNL,
					sumPNLPercentage: sumPNL / multiplier * 100
				})
			})

			rs.contentIsLoading(false)
			rs.generateReport(dataScatter, years)
		}, () => {
			rs.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'pivot chart' : false
		})
	}

	fetch()
}

rs.generateReport = (data, years) => {
	data = _.sortBy(data, (d) => `${d.year} ${d.category}`)

	let max = _.max(_.map(data, (d) => d.avgNetSalesPercentage)
		.concat(_.map(data, (d) => d.valuePNLPercentage)))

	let netSalesTitle = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNLNetSales()).name
	let breakdownTitle = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNL()).name

	$('#scatter-view').replaceWith('<div id="scatter-view" style="height: 350px;"></div>')
	if ((data.length * 100) > $('#scatter-view').parent().width())
    	$('#scatter-view').width(data.length * 100)
    else
	    $('#scatter-view').css('width', '100%')
	$("#scatter-view").kendoChart({
		dataSource: {
            data: data
        },
        title: {
            text: ""
        },
        legend: {
            visible: true,
            position: "bottom"
        },
        seriesDefaults: {
            type: "line",
            missingValues: "gap",
        },
		seriesColors: ["#ff8d00", "#678900", '#3498DB'],
		series: [{
			name: `Sum of ${breakdownTitle} to ${netSalesTitle}`,
			field: 'sumPNLPercentage',
			width: 3,
			tooltip: {
				visible: true,
				template: `Sum of ${breakdownTitle}: #: kendo.toString(dataItem.sumPNLPercentage, 'n2') # % (#: kendo.toString(dataItem.sumPNL, 'n2') #)`
			},
			markers: {
				visible: false
			}
		}, {
			name: `Average of ${breakdownTitle} to ${netSalesTitle}`,
			field: 'avgPNLPercentage',
			dashType: "dash",
			width: 3,
			tooltip: {
				visible: true,
				template: `Average of ${breakdownTitle}: #: kendo.toString(dataItem.avgPNLPercentage, 'n2') # % (#: kendo.toString(dataItem.avgPNL, 'n2') #)`
			},
			markers: {
				visible: false
			}
		}, {
			name: `${breakdownTitle} to ${netSalesTitle}`,
			field: "valuePNLPercentage",
			width: 3,
			opacity: 0,
			markers: {
				type: 'cross',
				size: 12
			},
			tooltip: {
				visible: true,
				template: `${breakdownTitle} #: dataItem.category # to ${netSalesTitle}: #: kendo.toString(dataItem.valuePNLPercentage, 'n2') # % (#: kendo.toString(dataItem.valuePNL, 'n2') #)`
			}
		}],
        valueAxis: {
			majorGridLines: {
				color: '#fafafa'
			},
            label: {
            	format: "{0}%"
            },
        },
        categoryAxis: [{
            field: 'category',
            labels: {
            	rotation: 20
            },
			majorGridLines: {
				color: '#fafafa'
			}
		}, {
        	categories: years,
			line: {
				visible: false
			}
        }],
    })
}

$(() => {
	rs.getSalesHeaderList()
})