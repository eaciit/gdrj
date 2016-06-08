viewModel.scatter = new Object()
let rs = viewModel.scatter
let dataPoints = [
	{field: "value1", name: "value1", aggr: "sum"}
]

rs.contentIsLoading = ko.observable(false)
rs.title = ko.observable('P&L Analytic')
rs.breakdownBy = ko.observable('customer.channelname')
rs.pplheader = ko.observable('EBIT')
rs.datascatter = ko.observableArray([])

rs.optionDimensionSelect = ko.observableArray([])

rs.getSalesHeaderList = () => {
	app.ajaxPost(`/report/GetSalesHeaderList`, {}, (res) => {
		let data = Lazy(res)
			.map((k, v) => { 
				return {field: k._id['plmodel.plheader1'], name: k._id['plmodel.plheader1']}
			})
			.toArray()
		rs.optionDimensionSelect(data)
		rs.optionDimensionSelect.remove( (item) => { return item.field == 'Net Sales'; } )
		rs.refresh()
		rs.pplheader('EBIT')
	})
}

rs.refresh = () => {
	rs.contentIsLoading(true)
	let dimensions = [
		{ "field": "plmodel.plheader1", "name": "plheader1" },
		{ "field": rs.breakdownBy(), "name": "Channel" },
		{ "field": "year", "name": "Year" }
	]
	let dataPoints = [
		{field: "value1", name: "value1", aggr: "sum"}
	]
	let param = rpt.wrapParam(dimensions, dataPoints)
	param.filters.push({
	    "Op": "$eq",
	    "Field": "plmodel.plheader1",
	    "Value": rs.pplheader()
	})
	app.ajaxPost("/report/summarycalculatedatapivot", param, (res) => {
		let dataall = Lazy(res.Data)
			.groupBy((f) => f['year'])
			.map((k, v) => { 
				return { _id: v, data: k } 
			})
			.toArray()

		param.filters = []
		param.filters.push({
		    "Op": "$eq",
		    "Field": "plmodel.plheader1",
		    "Value": 'Net Sales'
		})
		app.ajaxPost("/report/summarycalculatedatapivot", param, (res2) => {
			let dataall2 = Lazy(res2.Data)
				.groupBy((f) => f['year'])
				.map((k, v) => {
					return { _id: v, data: k }
				})

			rs.datascatter([])
			let title = Lazy(rpt.optionDimensions()).findWhere({field: rs.breakdownBy()}).title
			for (let i in dataall){
				let currentDataAll = Lazy(dataall).findWhere({ _id: dataall[i]._id })
				let currentDataAll2 = Lazy(dataall2).findWhere({ _id: dataall[i]._id })

				let totalDataAll = Lazy(currentDataAll.data).sum((e) => e.value1)
				let totalDataAll2 = Lazy(currentDataAll2.data).sum((e) => e.value1)

				let maxNetSales = Lazy(currentDataAll2.data).max((e) => e.value1).value1
				let percentage = (totalDataAll2/totalDataAll)
				let v = maxNetSales * 120
				let meanYear = (dataall[i].data.length/2).toFixed(0)-1
				let expandpersent = (maxNetSales*(percentage/120))

				for (let a in dataall[i].data){
					rs.datascatter.push({
						pplheader: percentage,
						value1: (dataall[i].data[a].value1/expandpersent)*120,
						title: dataall[i].data[a][title],
						header: dataall[i].data[a].plmodel_plheader1,
						year: dataall[i].data[a].year
					})
				}
				if(i == 0){
					rs.datascatter.push({
						pplheader: null,
						value1: null,
						title: '',
						header: null
					})
				}
			}
			rs.generateReport(dataall[0]._id, dataall[1]._id)
		})
	})
}

rs.generateReport = (year1, year2) => {
	rs.contentIsLoading(false)
    $('#scatter-view').width(rs.datascatter().length * 100)
	$("#scatter-view").kendoChart({
		dataSource: {
            data: rs.datascatter()
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
            // stack: {
            //     type: "100%"
            // }
        },
        series: [{
            name: "PPL Header",
            field: 'pplheader',
            color: "#f3ac32",
            tooltip: {
				visible: true,
				template: "#: dataItem.title # : #: kendo.toString(dataItem.pplheader, 'pplheader') # %"
			},
			markers: {
				visible: false
			}
        }, {
            name: "Dimension",
            color: "red",
            field: "value1",
            opacity: 0,
            markers : {
            	type: 'cross',
				size: 8
            },
            tooltip: {
				visible: true,
				template: "#: dataItem.title # : #: kendo.toString(dataItem.value1, 'n2') # %"
			},
        }],
        valueAxis: {
            majorGridLines: {
		      visible: false
		    },
            label: {
            	format: "{0}%"
            }
        },
        categoryAxis: [{
            field: 'title',
            majorGridLines: {
                visible: false
            }}, {
            	categories: [year1, year2],
    			line: { visible: false }
            }
        ],
      //       labels: {
		    // 	rotation: 60
		    // }
    });
}

$(() => {
	rpt.value.From(moment("2015-02-02").toDate())
	rpt.value.To(moment("2016-02-02").toDate())
	// rs.refresh()
	rs.getSalesHeaderList()
})