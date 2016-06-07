viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

app.log("ANGKA DI PIVOT CLICKABLE, JIKA SALES MAKA AMBIL DARI LEDGER TRANSACTION, SELAINNYA DARI LEDGER SUMMARY")

bkd.title = ko.observable('Grid Analysis Ideas')
bkd.data = ko.observableArray([])
bkd.detail = ko.observableArray([])
bkd.getParam = () => {
	let orderIndex = { field: 'plmodel.orderindex', name: 'Order' }

	let breakdown = rpt.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))
	let dimensions = bkd.dimensions().concat([breakdown, orderIndex])
	let dataPoints = bkd.dataPoints()
	return rpt.wrapParam('analysis_ideas', dimensions, dataPoints, { 
		which: 'all_plmod'
	})
}
bkd.refresh = () => {
	// bkd.data(DATATEMP_BREAKDOWN)
	app.ajaxPost("/report/summarycalculatedatapivot", bkd.getParam(), (res) => {
		let data = _.sortBy(res.Data, (o, v) => 
			parseInt(o.plmodel_orderindex.replace(/PL/g, "")))
		bkd.data(data)
		bkd.render()
	})
}
bkd.refreshOnChange = () => {
	// setTimeout(bkd.refresh, 100)
}
bkd.breakdownBy = ko.observable('customer.channelname')
bkd.dimensions = ko.observableArray([
	{ field: 'plmodel.plheader1', name: ' ' },
	{ field: 'plmodel.plheader2', name: ' ' },
	{ field: 'plmodel.plheader3', name: ' ' }
])
bkd.dataPoints = ko.observableArray([
	{ field: "value1", name: "value1", aggr: "sum" }
])
bkd.clickCell = (o) => {
	let x = $(o).closest("td").index()
	let y = $(o).closest("tr").index()
	let cat = $(`.breakdown-view .k-grid-header-wrap table tr:eq(1) th:eq(${x}) span`).html()
	let plheader1 = $(`.breakdown-view .k-grid.k-widget:eq(0) tr:eq(${y}) td:not(.k-first):first > span`).html()

	let tr = $(`.breakdown-view .k-grid.k-widget:eq(0) tr:eq(${y})`)

	let pivot = $(`.breakdown-view`).data('kendoPivotGrid')
	let cellInfo = pivot.cellInfo(x, y)

	let param = $.extend(true, bkd.getParam(), { 
		breakdownBy: app.htmlDecode(bkd.breakdownBy()),
		breakdownValue: app.htmlDecode(cat),
		plheader1: '',
		plheader2: '',
		plheader3: '',
	})

	cellInfo.rowTuple.members.forEach((d) => {
		if (d.parentName == undefined) {
			return
		}

		let key = d.parentName.split('_').reverse()[0]
		let value = app.htmlDecode(d.name.replace(`${d.parentName}&`, ''))
		param[key] = value
	})

	app.log("------", param)

	if (param.breakdownValue == `${app.idAble(param.breakdownBy)}&`) {
		param.breakdownValue = ''
	}

	app.ajaxPost('/report/GetLedgerSummaryDetail', param, (res) => {
		let detail = res.Data.map((d) => { return {
			ID: d.ID,
			CostCenter: d.CC.Name,
			Customer: d.Customer.Name,
			Channel: d.Customer.ChannelName,
			Branch: d.Customer.BranchName,
			Brand: d.Product.Brand,
			Product: d.Product.Name,
			Year: d.Year,
			Amount: d.Value1
		} })

		bkd.detail(detail)
		bkd.renderDetail()
	})
}
bkd.renderDetail = () => {
	$('#modal-detail-ledger-summary').appendTo($('body'))
	$('#modal-detail-ledger-summary').modal('show')

	let columns = [
		{ field: 'Year', width: 60, locked: true, footerTemplate: 'Total :' },
		{ field: 'Amount', width: 80, locked: true, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: "<div class='align-right'>#=kendo.toString(sum, 'n2')#</div>", format: '{0:n2}', attributes: { class: 'align-right' } },
		{ field: 'CostCenter', title: 'Cost Center', width: 250 },
		{ field: 'Customer', width: 250 },
		{ field: 'Channel', width: 150 },
		{ field: 'Branch', width: 120 },
		{ field: 'Brand', width: 100 },
		{ field: 'Product', width: 250 },
	]
	let config = {
		dataSource: {
			data: bkd.detail(),
			pageSize: 5,
			aggregate: [
				{ field: "Amount", aggregate: "sum" }
			]
		},
		columns: columns,
		pageable: true,
		resizable: false,
		sortable: true
	}

	setTimeout(() => {
		$('.grid-detail').replaceWith('<div class="grid-detail"></div>')
		$('.grid-detail').kendoGrid(config)
	}, 300)
}
bkd.render = () => {
	let data = bkd.data().slice(0, 100)
	let schemaModelFields = {}
	let schemaCubeDimensions = {}
	let schemaCubeMeasures = {}
	let rows = []
	let columns = []
	let measures = []
	let breakdown = rpt.optionDimensions().find((d) => (d.field == bkd.breakdownBy()))

	app.koUnmap(bkd.dimensions).concat([breakdown]).forEach((d, i) => {
		let field = app.idAble(d.field)
		schemaModelFields[field] = { type: 'string' }
		schemaCubeDimensions[field] = { caption: d.name }

		if (field.indexOf('plheader') > -1) {
			rows.push({ name: field, expand: (rows.length == 0) })
		} else {
			columns.push({ name: field, expand: true })
		}

		rows = rows.slice(0, 2)
	})

	app.koUnmap(bkd.dataPoints).forEach((d) => {
		let measurement = 'Amount'
		let field = app.idAble(d.field)
		schemaModelFields[field] = { type: 'number' }
		schemaCubeMeasures[measurement] = { field: field, aggregate: 'sum', format: '{0:n2}' }
		measures.push(measurement)
	})

    let config = {
	    filterable: false,
	    reorderable: false,
	    dataSource: {
	        data: data,
	        schema: {
	            model: {
	                fields: schemaModelFields
	            },
	            cube: {
	                dimensions: schemaCubeDimensions,
	                measures: schemaCubeMeasures,
	            }
	        },
	        rows: rows,
	        columns: columns,
	        measures: measures
	    },
        dataCellTemplate: function (d, e) {
        	let number = kendo.toString(d.dataItem.value, "n2")
        	return `<div onclick="bkd.clickCell(this)" class="align-right">${number}</div>`
        },
    	dataBound: () => {
    		$('.breakdown-view .k-grid.k-widget:first [data-path]:first')
    			.addClass('invisible')
    		$('.breakdown-view .k-grid.k-widget:first span:contains(" ")')
				.each((i, e) => {
    				if ($(e).parent().hasClass('k-grid-footer') && $.trim($(e).html()) == '') {
	    				$(e).css({ 
	    					color: 'white', 
	    					display: 'block', 
	    					height: '18px'
	    				})
    				}
    			})
    		$('.breakdown-view .k-grid.k-widget:first tr .k-i-arrow-e').removeClass('invisible')
    		$('.breakdown-view .k-grid.k-widget:first tr:last .k-i-arrow-e').addClass('invisible')
    		$('.breakdown-view .k-grid.k-widget:first table:first').css('margin-left', '-32px')
    		$('.breakdown-view .k-grid.k-widget:eq(1) .k-grid-header tr:first .k-i-arrow-s').addClass('invisible')
    		$('.breakdown-view .k-grid.k-widget:eq(1) .k-grid-header tr:first .k-header.k-alt span').addClass('invisible')
        }
	}

	app.log('breakdown', app.clone(config))
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
	$('.breakdown-view').kendoPivotGrid(config)
}

$(() => {
	bkd.refresh()
})
