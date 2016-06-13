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

			let maxData1 = 0; try {
				maxData1 = _.maxBy(dataAllPNL.filter((d) => d.value != 0), (d) => d.value).value
			} catch (err) { }

			let maxData2 = 0; try {
				maxData2 = _.maxBy(dataAllPNLNetSales.filter((d) => d.value != 0), (d) => d.value).value
			} catch (err) { }
			let maxData = _.max([maxData1, maxData2])

			let sumPNL = _.reduce(dataAllPNL, (m, x) => m + x.value, 0)
			let countPNL = dataAllPNL.length
			let avgPNL = sumPNL / countPNL

			let dataScatter = []
			let multiplier = (maxData == 0 ? 1 : maxData)

			dataAllPNL.forEach((d) => {
				dataScatter.push({
					category: app.nbspAble(`${d._id["_id_" + app.idAble(rs.breakdownBy())]} ${d._id._id_date_year}`, 'Uncategorized'),
					year: d._id._id_date_year,
					valuePNL: d.value,
					valuePNLPercentage: (d.value / multiplier) * 100,
					avgNetSales: avgPNL,
					avgNetSalesPercentage: (avgPNL / multiplier) * 100
				})
				
				console.log("---->>>>-", avgPNL, d.value, maxData)
			})

			console.log("-----", years, dataScatter, maxData)

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
		seriesColors: ["#ff8d00", "#678900"],
        series: [{
            name: `Average of ${netSalesTitle}`,
            field: 'avgNetSalesPercentage',
			width: 3, 
            tooltip: {
				visible: true,
				template: `Average of ${netSalesTitle}: #: kendo.toString(dataItem.avgNetSalesPercentage, 'n2') # % (#: kendo.toString(dataItem.avgNetSales, 'n2') #)`
			},
			markers: {
				visible: false
			}
        }, {
            name: `Percentage of ${breakdownTitle} to ${netSalesTitle}`,
            field: "valuePNLPercentage",
			width: 3, 
            opacity: 0,
            markers : {
            	type: 'cross',
				size: 12
            },
            tooltip: {
				visible: true,
				template: `Percentage of ${breakdownTitle} - #: dataItem.category # at #: dataItem.year #: #: kendo.toString(dataItem.valuePNLPercentage, 'n2') # % (#: kendo.toString(dataItem.valuePNL, 'n2') #)`
			},
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