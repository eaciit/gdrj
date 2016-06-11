viewModel.scatter = new Object()
let rs = viewModel.scatter
let dataPoints = [
	{field: "value1", name: "value1", aggr: "sum"}
]

rs.contentIsLoading = ko.observable(false)
rs.title = ko.observable('P&L Analytic')
rs.breakdownBy = ko.observable('customer.channelname')
rs.selectedPNLNetSales = ko.observable("PL8A")
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
	param1.pls = [rs.selectedPNL()]
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

			let param2 = {}
			param2.pls = [rs.selectedPNLNetSales()]
			param2.groups = [rs.breakdownBy(), 'date.year']
			param2.aggr = 'sum'
			param2.filters = rpt.getFilterValue()

			app.ajaxPost("/report/getpnldatanew", param2, (res2) => {
				let date = moment(res2.time).format("dddd, DD MMMM YYYY HH:mm:ss")
				rs.chartComparisonNote(`Last refreshed on: ${date}`)

				let dataAllPNL = res1.Data.Data
				let dataAllPNLNetSales = res2.Data.Data

				let selectedPNL = `${rs.selectedPNL()}`
				let years = _.map(_.groupBy(dataAllPNL, (d) => d._id._id_date_year), (v, k) => k)

				console.log("+++++",dataAllPNL, rs.selectedPNL())
				let maxData1 = 0
				try {
					maxData1 = _.maxBy(_.filter(dataAllPNL, (d) => d[rs.selectedPNL()] != 0), (d) => d[rs.selectedPNL()])[rs.selectedPNL()]
				} catch (err) { }

				console.log("+++++",dataAllPNLNetSales, rs.selectedPNLNetSales())
				let maxData2 = 0
				try {
					maxData2 = _.maxBy(_.filter(dataAllPNLNetSales, (d) => d[rs.selectedPNLNetSales()] != 0), (d) => d[rs.selectedPNLNetSales()])[rs.selectedPNLNetSales()]
				} catch (err) { }
				
				let maxData = _.max([maxData1, maxData2])

				let sumPNL = _.reduce(dataAllPNL, (m, x) => m + x[selectedPNL], 0)
				let countPNL = dataAllPNL.length
				let avgPNL = sumPNL / countPNL

				let dataScatter = []

				dataAllPNL.forEach((d) => {
					dataScatter.push({
						category: app.nbspAble(`${d._id["_id_" + app.idAble(rs.selectedPNL())]} ${d._id._id_date_year}`, 'Uncategorized'),
						year: d._id.fiscal,
						scatterValue: d[selectedPNL],
						scatterPercentage: (d[selectedPNL] / (maxData == 0 ? 1 : maxData)) * 100,
						lineAvg: avgPNL,
						linePercentage: (avgPNL / (maxData == 0 ? 1 : maxData)) * 100
					})
					
					console.log("---->>>>-", avgPNL, d[selectedPNL], maxData)
				})

				console.log("-----", years, dataScatter, maxData)

				rs.contentIsLoading(false)
				rs.generateReport(dataScatter, years)
			}, () => {
				rs.contentIsLoading(false)
			}, {
				cache: (useCache == true) ? 'pivot chart' : false
			})

		}, () => {
			rs.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'pivot chart' : false
		})
	}

	fetch()
}

rs.generateReport = (data, years) => {
	let max = _.max(_.map(data, (d) => d.linePercentage)
		.concat(_.map(data, (d) => d.scatterPercentage)))

	let netSalesTite = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNLNetSales()).name
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
            name: `Percentage of ${breakdownTitle} to ${netSalesTite}`,
            field: 'linePercentage',
			width: 3, 
            tooltip: {
				visible: true,
				template: `Percentage of ${breakdownTitle} - #: dataItem.category # at #: dataItem.year #: #: kendo.toString(dataItem.linePercentage, 'n2') # % (#: kendo.toString(dataItem.lineAvg, 'n2') #)`
			},
			markers: {
				visible: false
			}
        }, {
            name: `Percentage of ${breakdownTitle}`,
            field: "scatterPercentage",
			width: 3, 
            opacity: 0,
            markers : {
            	type: 'cross',
				size: 12
            },
            tooltip: {
				visible: true,
				template: `Percentage of ${breakdownTitle} to ${netSalesTite} at #: dataItem.year #: #: kendo.toString(dataItem.scatterPercentage, 'n2') # % (#: kendo.toString(dataItem.scatterValue, 'n2') #)`
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
	rpt.value.From(moment("2015-02-02").toDate())
	rpt.value.To(moment("2016-02-02").toDate())
	rs.getSalesHeaderList()
})