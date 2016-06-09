viewModel.scatter = new Object()
let rs = viewModel.scatter
let dataPoints = [
	{field: "value1", name: "value1", aggr: "sum"}
]

rs.contentIsLoading = ko.observable(false)
rs.title = ko.observable('P&L Analytic')
rs.breakdownBy = ko.observable('customer.channelname')
rs.selectedPNLNetSales = ko.observable("PL3")
rs.selectedPNL = ko.observable("PL5")
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
	param1.groups = [bkd.breakdownBy(), 'date.year']
	param1.aggr = 'sum'
	param1.filters = [] // rpt.getFilterValue()
	
	app.ajaxPost("/report/getpnldata", param1, (res1) => {
		let date = moment(res1.time).format("dddd, DD MMMM YYYY HH:mm:ss")
		bkd.breakdownNote(`Last refreshed on: ${date}`)

		let param2 = {}
		param2.pls = [rs.selectedPNLNetSales()]
		param2.groups = [bkd.breakdownBy(), 'date.year']
		param2.aggr = 'sum'
		param2.filters = [] // rpt.getFilterValue()

		app.ajaxPost("/report/getpnldata", param2, (res2) => {
			let date = moment(res2.time).format("dddd, DD MMMM YYYY HH:mm:ss")
			bkd.breakdownNote(`Last refreshed on: ${date}`)

			let dataAllPNL = res1.Data.Data
			let dataAllPNLNetSales = res2.Data.Data

			let years = _.map(_.groupBy(dataAllPNL, (d) => d._id.date_year), (v, k) => k)

			let maxData = _.max(dataAllPNL.concat(dataAllPNLNetSales), (d) => d[rs.selectedPNL()])[rs.selectedPNL()]
			let sumPNL = _.reduce(dataAllPNL, (m, x) => m + x[rs.selectedPNL()], 0)
			let countPNL = dataAllPNL.length
			let avgPNL = sumPNL / countPNL

			let dataScatter = []

			dataAllPNL.forEach((d) => {
				dataScatter.push({
					category: app.nbspAble(d._id[app.idAble(rs.breakdownBy())], 'Uncategorized'),
					year: d._id.date_year,
					scatterValue: d[rs.selectedPNL()],
					scatterPercentage: d[rs.selectedPNL()] / maxData,
					lineAvg: avgPNL,
					linePercentage: avgPNL / maxData
				})
			})

			rs.contentIsLoading(false)
			rs.generateReport(dataScatter, years)
		}, () => {
			bkd.contentIsLoading(false)
		}, {
			cache: (useCache == true) ? 'pivot chart' : false
		})

	}, () => {
		bkd.contentIsLoading(false)
	}, {
		cache: (useCache == true) ? 'pivot chart' : false
	})
}

rs.generateReport = (data, years) => {
	let max = _.max(_.map(data, (d) => d.linePercentage)
		.concat(_.map(data, (d) => d.scatterPercentage)))

	let netSalesTite = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNLNetSales()).name
	let breakdownTitle = rs.optionDimensionSelect().find((d) => d.field == rs.selectedPNL()).name

	$('#scatter-view').replaceWith('<div id="scatter-view" style="height: 350px;"></div>')
    $('#scatter-view').width(data.length * 100)
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
				template: `Percentage of ${breakdownTitle} - #: dataItem.category # at #: dataItem.year #: #: kendo.toString(dataItem.linePercentage, 'n2') # %`
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
				template: `Percentage of ${breakdownTitle} to ${netSalesTite} at #: dataItem.year #: #: kendo.toString(dataItem.scatterPercentage, 'n2') # %`
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