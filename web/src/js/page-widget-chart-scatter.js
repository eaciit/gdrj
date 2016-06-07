viewModel.scatter = new Object()
let rs = viewModel.scatter
let dataPoints = [
	{field: "value1", name: "value1", aggr: "sum"}
]

rs.contentIsLoading = ko.observable(false)
rs.title = ko.observable('P&L Analytic')
rs.breakdownBy = ko.observable('customer.channelname')
rs.pplheader = ko.observable('Net Sales')

rs.optionDimensionSelect = ko.observableArray([
	{ field: 'Net Sales', name: 'Net Sales' },
    { field: 'EBIT', name: 'EBIT' },
	{ field: 'Cost of Goods Sold', name: 'Cost of Goods Sold' },
])

rs.refresh = () => {
	let dimensions = [
		{ "field": "plmodel.plheader1", "name": "plheader1" },
		{ "field": rs.breakdownBy(), "name": "Channel" }  // ====== THE BREAKDOWN
	]
	let dataPoints = [
		{field: "value1", name: "value1", aggr: "sum"}
	]
	let param = rpt.wrapParam("asdasdas", dimensions, dataPoints)
	param.filters.push({
	    "Op": "$eq",
	    "Field": "plmodel.plheader1",
	    "Value": rs.pplheader()
	})
	console.log(param)
	app.ajaxPost("/report/summarycalculatedatapivot", param, (res) => {
		if (!app.isFine(res)) {
			return;
		}
		console.log(res)
	})
}

rs.generateReport = (data1, data2) => {
	$(".scatter-view").kendoChart({
        title: {
            text: ""
        },
        legend: {
            visible: false
        },
        seriesDefaults: {
            type: "line",
            missingValues: "gap",
            // stack: {
            //     type: "100%"
            // }
        },
        series: [{
            name: "Gold Medals",
            data: [40, 40, 40, 40, 40, 40, 40, null, 40, 40, 40, 40, 40, 40, 40],
            color: "#f3ac32"
        }, {
            name: "Aye",
            data: [19, 25, 21, 26, 28, 31, 35, null, 60, 31, 34, 32, 24, 40, 38],
            color: "red",
            // line: {
            // 	opacity: 0,
            // 	width: 0
            // },
            visible: false,
            markers : {
            	type: 'cross',
				size: 8
            }
        }],
        valueAxis: {
            line: {
                visible: false
            },
            minorGridLines: {
                visible: true
            },
            label: {
            	template: "#: value #%"
            }
        },
        categoryAxis: {
            categories: ['', '', '', '2015', '', '', '', '', '', '', '', '2016', '', '', '' ],
            majorGridLines: {
                visible: false
            }
        },
        tooltip: {
            visible: true,
            template: "#= series.name #: #= value #"
        }
    });
}

$(() => {
	rs.refresh()
})