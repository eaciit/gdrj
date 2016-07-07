
viewModel.salesReturn = {}
let sr = viewModel.salesReturn
sr.contentIsLoading = ko.observable(false)
sr.plGrossSales = ko.observable('PL0')
sr.plSalesReturn = ko.observable('salesreturn')
sr.breakdown = ko.observable('customer.channelname')
sr.fiscalYear = ko.observable(rpt.value.FiscalYear())
sr.title = ko.observable('Sales Return by Channels')

sr.changeTo = (d, e) => {
	sr.title(e)
	sr.breakdown(d)
	sr.refresh()
}

sr.refresh = () => {
	let param = {}
	param.pls = []
	param.groups = rpt.parseGroups([sr.breakdown()])
	param.aggr = 'sum'
	param.filters = rpt.getFilterValue(false, sr.fiscalYear)

	let fetch = () => {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, (res) => {
			if (res.Status == "NOK") {
				setTimeout(() => { fetch() }, 1000 * 5)
				return
			}

			if (rpt.isEmptyData(res)) {
				sr.contentIsLoading(false)
				return
			}
	
			sr.contentIsLoading(false)
			sr.render(res)
		}, () => {
			sr.contentIsLoading(false)
		})
	}

	sr.contentIsLoading(true)
	fetch()
}

sr.render = (res) => {
	let key = `_id_${toolkit.replace(sr.breakdown(), '.', '_')}`
	let data = _.orderBy(res.Data.Data, (d) => d[sr.plGrossSales()], 'desc')
	let rowGrossSales  = { name: 'Gross Sales' }
	let rowSalesReturn = { name: 'Sales Return' }
	let rowPercentage  = { name: 'Percentage' }

	let columns = []
	columns.push({
		title: '&nbsp;',
		field: 'name',
		width: 150,
		locked: true,
		attributes: { style: 'font-weight: bold;' }
	})

	data.forEach((d) => {
		let holder = toolkit.replace(d._id[key].toLowerCase(), ['.', '/', "'", '"', "\\", "-"], '_')

		rowGrossSales[holder] = d[sr.plGrossSales()]
		rowSalesReturn[holder] = d[sr.plSalesReturn()]
		rowPercentage[holder] = Math.abs(toolkit.number(d[sr.plSalesReturn()] / d[sr.plGrossSales()]) * 100)

		let column = {}
		columns.push(column)
		column.title = d._id[key]
		column.field = holder
		column.width = 170
		column.attributes = { class: 'align-right' }
		column.headerAttributes = { style: 'text-align: center !important; font-weight: bold;' } 
		column.template = (d) => {
			if (d.name == 'Percentage') {
				return `${kendo.toString(d[holder], 'n2')} %`
			}

			return kendo.toString(d[holder], 'n0')
		}
	})

	let dataParsed = [rowGrossSales, rowSalesReturn, rowPercentage]
	console.log("dataParsed", dataParsed)

	let config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns,
		resizable: false,
		sortable: false, 
		pageable: false,
		filterable: false,
		dataBound: () => {
			let sel = '.grid-dashboard .k-grid-content-locked tr, .grid-dashboard .k-grid-content tr'

			$(sel).on('mouseenter', function () {
				let index = $(this).index()
				console.log(this, index)
		        let elh = $(`.grid-dashboard .k-grid-content-locked tr:eq(${index})`).addClass('hover')
		        let elc = $(`.grid-dashboard .k-grid-content tr:eq(${index})`).addClass('hover')
			})
			$(sel).on('mouseleave', function () {
				$('.grid-dashboard tr.hover').removeClass('hover')
			})
		}
	}


	$('.grid').replaceWith('<div class="grid"></div>')
	$('.grid').kendoGrid(config)
}


vm.currentMenu('Analysis')
vm.currentTitle('&nbsp;')
vm.breadcrumb([
	{ title: 'Godrej', href: viewModel.appName + 'page/landing' },
	{ title: 'Home', href: viewModel.appName + 'page/landing' },
	{ title: 'Sales Return Analysis', href: '#' }
])


$(() => {
	rpt.tabbedContent()

	sr.refresh()
})