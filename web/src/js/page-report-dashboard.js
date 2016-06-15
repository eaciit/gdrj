// let plcodes = [
// 	{ plcodes: ["PL1", "PL2", "PL3", "PL4", "PL5", "PL6"], title: 'Gross Sales' },
// 	// growth
// 	{ plcodes: ["PL7", "PL8"], title: 'Sales Discount' },
// 	// ATL
// 	// BTL
// 	{ plcode: "PL74B", title: "COGS" },
// 	{ plcode: "PL74C", title: "Gross Margin" },
// 	{ plcode: "PL94A", title: "SGNA" },
// 	{ plcode: "PL26", title: "Royalties" }
// 	{ plcode: "PL44B", title: "EBIT" },
// 	{ plcode: "PL44C", title: "EBITDA" },





// 	{ plcode: "PL74C", title: "GM" },
// 	{ plcode: "PL74B", title: "COGS" },
// 	{ plcode: "PL44B", title: "EBIT" },
// 	{ plcode: "PL44C", title: "EBITDA" },
// 	{ plcode: "PL8A", title: "Net Sales" },

// ]





vm.currentMenu('Dashboard')
vm.currentTitle("Dashboard")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Dashboard', href: '/report/dashboard' }
])

viewModel.dashboard = {}
let dsbrd = viewModel.dashboard

dsbrd.data = ko.observableArray([])
dsbrd.columns = ko.observableArray([])
dsbrd.dimension = ko.observable('customer.channelname')
dsbrd.fiscalYear = ko.observable(2014)
dsbrd.contentIsLoading = ko.observable(false)

dsbrd.refresh = () => {
	let parse = (res) => {
		let rows = [
			{ pnl: 'Gross Sales', plcodes: ["PL1", "PL2", "PL3", "PL4", "PL5", "PL6"] },
			{ pnl: 'Growth', plcodes: [] }, // NOT YET
			{ pnl: 'Sales Discount', plcodes: ["PL7", "PL8"] },
			{ pnl: 'ATL', plcodes: [] }, // NOT YET
			{ pnl: 'BTL', plcodes: [] }, // NOT YET
			{ pnl: "COGS", plcodes: ["PL74B"] },
			{ pnl: "Gross Margin", plcodes: ["PL74C"] },
			{ pnl: "SGA", plcodes: ["PL94A"] },
			{ pnl: "Royalties", plcodes: ["PL26"] },
			{ pnl: "EBITDA", plcodes: ["PL44C"] },
			{ pnl: "EBIT %", plcodes: [] },
			{ pnl: "EBIT", plcodes: ["PL44B"] },
		]

		let columns = [
			{ field: 'pnl', title: 'PNL', attributes: { class: 'bold' } },
		]

		let data = _.sortBy(res.Data.Data, (d) => toolkit.redefine(d._id[`_id_${toolkit.replace(dsbrd.dimension(), '.', '_')}`], 'Other'))

		rows.forEach((d) => {
			data.forEach((e, i) => {
				let field = e._id[`_id_${toolkit.replace(dsbrd.dimension(), '.', '_')}`]
				let key = `field${i}`
				d[key] = toolkit.sum(d.plcodes, (f) => e[f])

				if (d.pnl == 'EBIT %') {
					let grossSales = rows.find((f) => f.pnl == 'Gross Sales')
					let grossSalesValue = toolkit.sum(grossSales.plcodes, (f) =>  e[f])

					let ebit = rows.find((f) => f.pnl == 'EBIT')
					let ebitValue = toolkit.sum(ebit.plcodes, (f) =>  e[f])

					console.log(field, grossSalesValue / ebitValue, `${kendo.toString(grossSalesValue / ebitValue, 'n2')} %`)
					d[key] = `${kendo.toString(toolkit.number(grossSalesValue / ebitValue), 'n2')} %`
				}

				if (toolkit.isDefined(columns.find((f) => f.field == key))) {
					return
				}

				columns.push({
					field: key,
					title: toolkit.redefine(field, 'Other'),
					format: '{0:n0}',
					attributes: { class: 'align-right' },
					headerAttributes: { 
						style: 'text-align: right !important;',
						class: 'bold tooltipster',
						title: 'Click to sort'
					}
				})
			})
		})

		dsbrd.data(rows)
		dsbrd.columns(columns)

		if (columns.length > 5) {
			columns.forEach((d, i) => {
				if (i == 0) {
					d.width = 200
					d.locked = true
					return
				}

				d.width = 150
			})
		}
	}

	let param = {}
	param.pls = ["PL1", "PL2", "PL3", "PL4", "PL5", "PL6", "PL7", "PL8", "PL74B", "PL74C", "PL94A", "PL26", "PL44B", "PL44C"]
	param.groups = [dsbrd.dimension()]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue()
	param.filters.push({
		Field: 'date.fiscal',
		Op: '$eq',
		Value: `${dsbrd.fiscalYear()}-${dsbrd.fiscalYear()+1}`
	})

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => fetch, 1000 * 5)
				return
			}

			parse(res)		
			dsbrd.contentIsLoading(false)
			dsbrd.render()
		}, () => {
			dsbrd.contentIsLoading(false)
		})
	}

	dsbrd.contentIsLoading(true)
	fetch()
}

dsbrd.render = () => {
	var fields = {}

    if (dsbrd.data().length > 0) {
    	let target = dsbrd.data()[0]
    	for (let key in target) {
    		if (target.hasOwnProperty(key) && ['pnl', 'plcodes'].indexOf(key) == -1) {
    			fields[key] = { type: 'number' }
    		}
    	}
    }

	let config = {
		dataSource: {
			data: dsbrd.data(),
			schema: {
		        model: {
		            // fields: fields
		        }
		    }
		},
		columns: dsbrd.columns(),
		resizabl: false,
		sortable: true, 
		pageable: false,
		filterable: false
	}

	$('.grid-dashboard').replaceWith('<div class="grid-dashboard"></div>')
	$('.grid-dashboard').kendoGrid(config)
}






viewModel.dashboardRanking = {}
let rank = viewModel.dashboardRanking

rank.dimension = ko.observable('customer.channelname')
rank.columns = ko.observableArray([
	{ field: 'pnl', title: 'PNL', attributes: { class: 'bold' } },
	{ field: 'gmPercentage', title: 'GM %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' },
	{ field: 'cogsPercentage', title: 'COGS %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' },
	{ field: 'ebitPercentage', title: 'EBIT %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' },
	{ field: 'ebitdaPercentage', title: 'EBITDA %', type: 'percentage', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n2}' },
	{ field: 'netSales', title: 'Net Sales', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n0}' },
	{ field: 'ebit', title: 'EBIT', type: 'number', attributes: { class: 'align-right' }, headerAttributes: { style: 'text-align: right !important;', class: 'bold tooltipster', title: 'Click to sort' }, format: '{0:n0}' },
])
rank.contentIsLoading = ko.observable(false)
rank.data = ko.observableArray([])

rank.refresh = () => {
	let parse = (res) => {
		let rows = []
		res.Data.Data.forEach((d) => {
			let row = {}
			row.pnl = d._id[`_id_${toolkit.replace(rank.dimension(), '.', '_')}`]
			if ($.trim(row.pnl) == '') {
				row.pnl = 'Other'
			}
			row.gmPercentage = d.PL74C / d.PL8A
			row.cogsPercentage = d.PL74B / d.PL8A
			row.ebitPercentage = d.PL44B / d.PL8A
			row.ebitdaPercentage = d.PL44C / d.PL8A
			row.netSales = d.PL8A
			row.ebit = d.PL44B
			rows.push(row)
		})

		rank.data(rows)
	}

	let param = {}
	param.pls = ["PL74C", "PL74B", "PL44B", "PL44C", "PL8A"]
	param.groups = [rank.dimension()]
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue()

	let fetch = () => {
		toolkit.ajaxPost("/report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => fetch, 1000 * 5)
				return
			}

			parse(res)		
			rank.contentIsLoading(false)
			rank.render()
		}, () => {
			rank.contentIsLoading(false)
		})
	}

	rank.contentIsLoading(true)
	fetch()
}

rank.render = () => {
	let config = {
		dataSource: {
			data: rank.data(),
			pageSize: 10,
		},
		columns: rank.columns(),
		resizabl: false,
		sortable: true, 
		pageable: true,
		filterable: false,
		dataBound: app.gridBoundTooltipster('.grid-ranking')
	}

	$('.grid-ranking').replaceWith('<div class="grid-ranking sortable"></div>')
	$('.grid-ranking').kendoGrid(config)
}





viewModel.salesDistribution = {}
let sd = viewModel.salesDistribution

sd.breakdown = ko.observable('customer.channelname')
sd.data = ko.observableArray([
	{ customer_channelname: "modern trade", group: "hyper", percentage: 8, value: 240000 },
	{ customer_channelname: "modern trade", group: "super", percentage: 12, value: 360000 },
	{ customer_channelname: "modern trade", group: "mini", percentage: 10, value: 300000 },
	{ customer_channelname: "general trade", group: "type 1", percentage: 3, value: 90000 },
	{ customer_channelname: "general trade", group: "type 2", percentage: 4, value: 120000 },
	{ customer_channelname: "general trade", group: "type 3", percentage: 5, value: 150000 },
	{ customer_channelname: "general trade", group: "type 4", percentage: 4, value: 120000 },
	{ customer_channelname: "general trade", group: "type 5", percentage: 2, value: 60000 },
	{ customer_channelname: "general trade", group: "type 6", percentage: 6, value: 180000 },
	{ customer_channelname: "general trade", group: "type 7", percentage: 5, value: 150000 },
	{ customer_channelname: "general trade", group: "type 8", percentage: 5, value: 150000 },
	{ customer_channelname: "general trade", group: "type 9", percentage: 6, value: 180000 },
	{ customer_channelname: "retail distribution", group: "", percentage: 30, value: 900000 }
])
sd.render = () => {
	let dimension = toolkit.replace(sd.breakdown(), ".", "_")
	let total = toolkit.sum(sd.data(), (d) => d.value)
	let op1 = _.groupBy(sd.data(), (d) => d[dimension])
	let op2 = _.map(op1, (v, k) => { return { key: k, values: v } })
	let maxRow = _.maxBy(op2, (d) => d.values.length)
	let maxRowIndex = op2.indexOf(maxRow)
	let height = 20 * maxRow.values.length
	let width = 200

	let container = $('.grid-sales-dist')
	let table = toolkit.newEl('table').appendTo(container).height(height)
	let tr1st = toolkit.newEl('tr').appendTo(table)
	let tr2nd = toolkit.newEl('tr').appendTo(table)

	op2.forEach((d) => {
		let td1st = toolkit.newEl('td').appendTo(tr1st).width(width)
		let sumPercentage = _.sumBy(d.values, (e) => e.percentage)
		td1st.html(`${d.key}<br />${sumPercentage} %`)

		let td2nd = toolkit.newEl('td').appendTo(tr2nd)

		let innerTable = toolkit.newEl('table').appendTo(td2nd)

		if (d.values.length == 1) {
			let tr = toolkit.newEl('tr').appendTo(innerTable)
			toolkit.newEl('td').appendTo(tr).html(kendo.toString(d.values[0].value, 'n0')).height(height).addClass('single')
			return
		}

		d.values.forEach((e) => {
			let tr = toolkit.newEl('tr').appendTo(innerTable)
			toolkit.newEl('td').appendTo(tr).html(e[dimension]).height(height / d.values.length)
			toolkit.newEl('td').appendTo(tr).html(`${e.percentage} %`)
			toolkit.newEl('td').appendTo(tr).html(kendo.toString(e.value, 'n0'))
		})
	})

	let trTotal = toolkit.newEl('tr').appendTo(table)
	let tdTotal = toolkit.newEl('td').addClass('align-center total').attr('colspan', op2.length).appendTo(trTotal).html(kendo.toString(total, 'n0'))
}
sd.refresh = () => {
	sd.render()
}

$(() => {
	dsbrd.refresh()
	rank.refresh()
	sd.refresh()
})
