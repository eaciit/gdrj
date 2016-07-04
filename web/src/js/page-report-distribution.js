viewModel.distribution = {}
let dsbt = viewModel.distribution

dsbt.changeTo = (d) => {
	if (d == 'Revenue vs EBIT Distribution') {
		toolkit.try(() => {
			$('#tab1 .k-grid').data('kendoGrid').refresh()
		})
	}
}





viewModel.revenueEbit = {}
let rve = viewModel.revenueEbit
rve.contentIsLoading = ko.observable(false)






viewModel.salesDistribution = {}
let sd = viewModel.salesDistribution
sd.contentIsLoading = ko.observable(false)
sd.isFirstTime = ko.observable(true)
sd.breakdown = ko.observable('customer.reportchannel')
sd.breakdownSub = ko.observable('customer.reportsubchannel')
sd.data = ko.observableArray([])
sd.fiscalYear = ko.observable(rpt.value.FiscalYear())
sd.selectedPL = ko.observable('PL8A')
sd.getPLModels = () => {
	app.ajaxPost(viewModel.appName + "report/getplmodel", {}, (res) => {
		sd.selectedPL('')
		rpt.plmodels(_.orderBy(res, (d) => d.OrderIndex))
		sd.selectedPL('PL8A')
	})
}
sd.render = (res) => {
	let isFirstTime = sd.isFirstTime()
	sd.isFirstTime(false)

	let data = res.Data.Data

	let breakdown = toolkit.replace(sd.breakdown(), ".", "_")
	let total = toolkit.sum(data, (d) => d[sd.selectedPL()])

	sd.data(data)

	let rows = data.map((d) => {
		let row = {}

		let breakdownAbbr = d._id[`_id_${breakdown}`]
		row[breakdown] = breakdownAbbr
		switch (breakdownAbbr) {
			case "MT": row[breakdown] = "Modern Trade"; break
			case "GT": row[breakdown] = "General Trade"; break
			case "IT": row[breakdown] = "Industrial"; break
			case "RD": row[breakdown] = "Regional Distributor"; break
			case "EXPORT": row[breakdown] = "Export"; break
			case "Motoris": row[breakdown] = "Motorist"; break
			default: row[breakdown] = breakdownAbbr
		}

		row.group = d._id[`_id_${toolkit.replace(sd.breakdownSub(), '.', '_')}`]
		row.percentage = toolkit.number(d[sd.selectedPL()] / total) * 100
		row.value = d[sd.selectedPL()]
		return row
	})

	sd.data(rows)
	// sd.data(_.sortBy(rows, (d) => {
	// 	let subGroup = `00${toolkit.number(toolkit.getNumberFromString(d.group))}`.split('').reverse().splice(0, 2).reverse().join('')
	// 	let group = d[breakdown]

	// 	switch (d[breakdown]) {
	// 		case "MT": group = "A"; break
	// 		case "GT": group = "B"; break
	// 		case "IT": group = "C"; break
	// 	}

	// 	return [group, subGroup].join(' ')
	// }))

	let op0 = _.filter(sd.data(), (d) => d.percentage != 0 || d.value != 0)
	let op1 = _.groupBy(op0, (d) => d[breakdown])
	let op2 = _.map(op1, (v, k) => { return { key: k, values: v } })
	let op3 = _.orderBy(op2, (d) => toolkit.sum(d.values, (e) => e.percentage), 'desc')

	// // hack IT, too much data
	// let it = op3.find((d) => d.key == "IT")
	// if (it != undefined) {
	// 	if (it.values.length > 0) {
	// 		let totalIT = toolkit.sum(it.values, (e) => e.value)
	// 		let fake = {}
	// 		fake.customer_reportchannel = it.values[0].customer_reportchannel
	// 		fake.group = it.group
	// 		fake.percentage = toolkit.number(totalIT / total) * 100
	// 		fake.value = totalIT

	// 		it.valuesBackup = it.values.slice(0)
	// 		it.values = [fake]
	// 	}
	// }

	let maxRow = _.maxBy(op3, (d) => d.values.length)
	let maxRowIndex = op3.indexOf(maxRow)
	let height = 20 * maxRow.values.length
	let width = 280

	let container = $('.grid-sales-dist').empty()
	let table = toolkit.newEl('table')
		.addClass('width-full')
		.appendTo(container)
		.height(height)
	let tr1st = toolkit.newEl('tr').appendTo(table).addClass('head')
	let tr2nd = toolkit.newEl('tr').appendTo(table)

	table.css('width', op3.length * width)

	let index = 0
	op3.forEach((d) => {
		let td1st = toolkit.newEl('td')
			.appendTo(tr1st)
			.width(width)
			.addClass('sortsales')
			.attr('sort', sd.sortVal[index])
			.css('cursor', 'pointer')

		let sumPercentage = _.sumBy(d.values, (e) => e.percentage)
		let sumColumn = _.sumBy(d.values, (e) => e.value)
		td1st.html(`<i class="fa"></i>
			${d.key}<br />
			${kendo.toString(sumPercentage, 'n2')} %<br />
			${kendo.toString(sumColumn, 'n2')}`)

		let td2nd = toolkit.newEl('td')
			.appendTo(tr2nd)
			.css('vertical-align', 'top')

		let innerTable = toolkit.newEl('table').appendTo(td2nd)
		let innerTbody = toolkit.newEl('tbody')
			.appendTo(innerTable)

		if (d.values.length == 1) {
			let tr = toolkit.newEl('tr').appendTo(innerTbody)
			toolkit.newEl('td')
				.appendTo(tr)
				.html(kendo.toString(d.values[0].value, 'n0'))
				.addClass('single')

			// index++
			// return
		}

		let op1 = _.groupBy(d.values, (o) => { return o.group })
		let channelgroup = _.map(op1, (v, k) => {
			if (k == '') k = '' 
			return { key: k, values: v } 
		})

		let totalyo = 0, percentageyo = 0, indexyo = 0
		channelgroup.forEach((e) => {
			totalyo = toolkit.sum(e.values, (b) => b.value)
			percentageyo = toolkit.number(totalyo/sumColumn*100)
			channelgroup[indexyo]['totalyo'] = totalyo
			channelgroup[indexyo]['percentageyo'] = percentageyo
			indexyo++
		})
		if (sd.sortVal[index] == ''){
			channelgroup = _.orderBy(channelgroup, ['key'], ['asc'])
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-up')
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-down')
		} else if (sd.sortVal[index] == 'asc'){
			channelgroup = _.orderBy(channelgroup, ['totalyo'], ['asc'])
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-up')
			$(`.sortsales:eq(${index})>i`).addClass('fa-chevron-down')
		} else if (sd.sortVal[index] == 'desc'){
			channelgroup = _.orderBy(channelgroup, ['totalyo'], ['desc'])
			$(`.sortsales:eq(${index})>i`).addClass('fa-chevron-up')
			$(`.sortsales:eq(${index})>i`).removeClass('fa-chevron-down')
		}

		// let op2 = _.orderBy(channelgroup, (e) => e.totalyo, 'desc')
		if (d.values.length > 1) {
			channelgroup.forEach((e) => {
				let tr = toolkit.newEl('tr').appendTo(innerTable)
				toolkit.newEl('td').css('width', '150px')
					.appendTo(tr)
					.html(e.key)
				toolkit.newEl('td').css('width', '40px')
					.appendTo(tr)
					.html(`${kendo.toString(e.percentageyo, 'n2')}&nbsp;%`)
				toolkit.newEl('td').css('width', '120px')
					.appendTo(tr)
					.html(kendo.toString(e.totalyo, 'n0'))
			})
		}

		index++
	})

	let trTotalTop = toolkit.newEl('tr').prependTo(table)
	toolkit.newEl('td').addClass('align-center total').attr('colspan', op3.length).appendTo(trTotalTop).html(kendo.toString(total, 'n0'))

	let trTotalBottom = toolkit.newEl('tr').appendTo(table)
	toolkit.newEl('td').addClass('align-center total').attr('colspan', op3.length).appendTo(trTotalBottom).html(kendo.toString(total, 'n0'))
	$(".grid-sales-dist>table tbody>tr:eq(1) td").each(function(index) {
		// $(this).find('table').height($(".grid-sales-dist>table tbody>tr:eq(1)").height())
	})
}
sd.sortVal = ['desc', 'desc', 'desc', 'desc', 'desc', 'desc']
sd.sortData = () => {
	sd.render(sd.oldData())
}
sd.oldData = ko.observable({})
sd.refresh = () => {
	let param = {}
	param.pls = [sd.selectedPL()]
	param.groups = rpt.parseGroups([sd.breakdown(), sd.breakdownSub()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, sd.fiscalYear)

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				sd.contentIsLoading(false)
				return
			}
	
			sd.oldData(res)
			sd.contentIsLoading(false)
			sd.render(res)
		}, () => {
			sd.contentIsLoading(false)
		})
	}

	sd.contentIsLoading(true)
	fetch()
}
sd.initSort = () => {
	$(".grid-sales-dist").on('click', '.sortsales', function(){
		let sort = $(this).attr('sort'), index = $(this).index(), res = ''
		if (sort == undefined || sort == '')
			res = 'asc'
		else if (sort == 'asc')
			res = 'desc'
		else
			res = ''

		sd.sortVal[index] = res
		sd.sortData()
	})
}

$(() => {
	rpt.tabbedContent()
	rpt.refreshView('dashboard')

	sd.refresh()
	sd.initSort()
	sd.getPLModels()
})