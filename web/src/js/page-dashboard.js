vm.currentMenu('Dashboard')
vm.currentTitle("Dashboard")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Dashboard', href: '/report/dashboard' }
])

viewModel.dashboard = {}
let dsbrd = viewModel.dashboard

dsbrd.dimension = ko.observable('customer.channelname')
dsbrd.quarter = ko.observable(4)
dsbrd.contentIsLoading = ko.observable(false)

dsbrd.data = ko.observableArray([
	{ pnl: 'Gross Sales', q1: 1000000, q2: 1150000, q3: 1280000, q4: 1400000, type: 'number' },
	{ pnl: 'Growth', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'Discount', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'ATL', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'BTL', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'COGS', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'Gross Margin', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'SGA', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'Royalties', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'EBITDA', q1: 0, q2: 15, q3: 11, q4: 9, type: 'percentage' },
	{ pnl: 'EBIT (%)', q1: 10, q2: 10, q3: 10, q4: 10, type: 'percentage' },
	{ pnl: 'EBIT', q1: 100000, q2: 115000, q3: 128000, q4: 140000, type: 'number' },
])

dsbrd.render = () => {
	let target = $('.grid-dashboard').empty()
	let table = toolkit.newEl('table').addClass('table ez').appendTo(target)
	let trFirst = toolkit.newEl('tr').appendTo(table)

	toolkit.newEl('td').html('&nbsp;').appendTo(trFirst)
	toolkit.repeat(dsbrd.quarter(), (i) => {
		toolkit.newEl('td').addClass('align-right bold').html(`Quarter ${(i + 1)}`).appendTo(trFirst)
	})

	dsbrd.data().forEach((d) => {
		let tr = toolkit.newEl('tr').appendTo(table)
		toolkit.newEl('td').html(d.pnl).addClass('bold').appendTo(tr)

		toolkit.repeat(dsbrd.quarter(), (i) => {
			let value = toolkit.redefine(d[`q${(i + 1)}`], 0)
			if (value == 0) { 
				value = '-'
			} else if (d.type == 'percentage') {
				value = `${value} %`
			}

			toolkit.newEl('td').html(value).addClass('align-right').appendTo(tr)
		})
	})
}

dsbrd.refresh = () => {
	dsbrd.render()
}





viewModel.dashboardRanking = {}
let rank = viewModel.dashboardRanking

rank.sort = ko.observable('asc')
rank.optionSort = ko.observableArray([
	{ field: 'asc', name: 'Low margin to high' },
	{ field: 'desc', name: 'High margin to low' }
])
rank.dimension = ko.observable('product.brand')
rank.columns = ko.observableArray([
	{ field: 'gm', name: 'GM %', type: 'percentage' },
	{ field: 'cogs', name: 'COGS %', type: 'percentage' },
	{ field: 'ebit_p', name: 'EBIT %', type: 'percentage' },
	{ field: 'ebitda', name: 'EBITDA %', type: 'percentage' },
	{ field: 'net_sales', name: 'Net Sales', type: 'number' },
	{ field: 'ebit', name: 'EBIT', type: 'number' },
])
rank.contentIsLoading = ko.observable(false)

rank.data = ko.observableArray([
	{ product_brand: 'Mitu', gm: 30, cogs: 70, ebit_p: 9.25, ebitda: 92500, net_sales: 1000000, ebit: 92500 },
	{ product_brand: 'Stella', gm: 29, cogs: 71, ebit_p: 9, ebitda: 99000, net_sales: 1100000, ebit: 99000 },
	{ product_brand: 'Hit', gm: 27, cogs: 73, ebit_p: 8, ebitda: 96000, net_sales: 1200000, ebit: 96000 },
	{ product_brand: 'Etc', gm: 26, cogs: 74, ebit_p: 7, ebitda: 91000, net_sales: 1300000, ebit: 91000 },
])

rank.render = () => {
	let target = $('.grid-ranking').empty()
	let table = toolkit.newEl('table').addClass('table ez').appendTo(target)
	let trFirst = toolkit.newEl('tr').appendTo(table)

	toolkit.newEl('td').html('&nbsp;').appendTo(trFirst)
	rank.columns().forEach((d) => {
		toolkit.newEl('td').addClass('align-right bold').html(d.name).appendTo(trFirst)
	})
	
	rank.data().forEach((d) => {
		let tr = toolkit.newEl('tr').appendTo(table)
		toolkit.newEl('td').html(d[toolkit.replace(rank.dimension(), ".", "_")]).addClass('bold').appendTo(tr)

		rank.columns().forEach((e) => {
			let value = toolkit.redefine(d[e.field], 0)
			if (e.type == 'percentage') {
				value = `${value} %`
			}

			toolkit.newEl('td').html(value).addClass('align-right').appendTo(tr)
		})
	})
}

rank.refresh = () => {
	rank.render()
}

$(() => {
	dsbrd.refresh()
	rank.refresh()
})
