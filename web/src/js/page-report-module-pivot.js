viewModel.pivot = new Object()
let pvt = viewModel.pivot

pvt.fields = ko.observableArray([
	{ _id: 'fieldA', Name: 'Field A' },
	{ _id: 'fieldB', Name: 'Field B' },
	{ _id: 'fieldC', Name: 'Field C' },
	{ _id: 'fieldD', Name: 'Field D' },
	{ _id: 'fieldE', Name: 'Field E' },
	{ _id: 'fieldF', Name: 'Field F' }
])
pvt.mode = ko.observable('')
pvt.columns = ko.observableArray([])
pvt.rows = ko.observableArray([])
pvt.values = ko.observableArray([])
pvt.currentTarget = null

pvt.prepareTooltipster = () => {
	$('.tooltipster-late').each((i, e) => {
		$(e).tooltipster({
			contentAsHTML: true,
			interactive: true,
			theme: 'tooltipster-whi',
			animation: 'grow',
			delay: 0,
			offsetY: -5,
			touchDevices: false,
			trigger: 'click',
			position: 'top',
			content: $(`
				<h3 class="no-margin no-padding">Add to</h3>
				<div>
					<button class='btn btn-sm btn-success' data-target-module='column' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, "column")'>
						Column
					</button>
					<button class='btn btn-sm btn-success' data-target-module='row' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, "row")'>
						Row
					</button>
					<button class='btn btn-sm btn-success' data-target-module='value' onmouseenter='pvt.hoverInModule(this);' onmouseleave='pvt.hoverOutModule(this);' onclick='pvt.addAs(this, "value")'>
						Data
					</button>
				</div>
			`)
		})
	})
}
pvt.showFieldControl = (o) => {
	pvt.currentTarget = $(o).prev()
}
pvt.hoverInModule = (o) => {
	let target = $(o).attr('data-target-module')
	$(`[data-module="${target}"]`).addClass('highlight')
}
pvt.hoverOutModule = (o) => {
	let target = $(o).attr('data-target-module')
	$(`[data-module="${target}"]`).removeClass('highlight')
}
pvt.addAs = (o, what) => {
	let holder = pvt[`${what}s`]
	let id = $(pvt.currentTarget).attr('data-id')

	let isAddedOnColumn = (typeof pvt.columns().find((d) => d._id === id) !== 'undefined')
	let isAddedOnRow    = (typeof pvt.rows   ().find((d) => d._id === id) !== 'undefined')
	let isAddedOnValue  = (typeof pvt.values ().find((d) => d._id === id) !== 'undefined')

	if (!(isAddedOnColumn || isAddedOnRow || isAddedOnValue)) {
		let row = pvt.fields().find((d) => d._id === id)
		holder.push(row)
	}
}
pvt.refreshData = () => {
	pvt.mode('render')

	$('.pivot').kendoPivotGrid({
        filterable: true,
        sortable: true,
        // columnWidth: 200,
        // height: 580,
        dataSource: {
            // type: 'xmla',
            columns: [{ name: '[Date].[Calendar]', expand: true }, { name: '[Product].[Category]' } ],
            rows: [{ name: '[Geography].[City]' }],
            measures: ['[Measures].[Reseller Freight Cost]'],
            // transport: {
            //     connection: {
            //         catalog: 'Adventure Works DW 2008R2',
            //         cube: 'Adventure Works'
            //     },
            //     read: '//demos.telerik.com/olap/msmdpump.dll'
            // },
            // schema: {
            //     type: 'xmla'
            // },
            // error: function (e) {
            //     alert('error: ' + kendo.stringify(e.errors[0]));
            // }
        }
    })

    // $('#configurator').kendoPivotConfigurator({
    //     dataSource: pivotgrid.dataSource,
    //     filterable: true,
    //     sortable: true,
    //     height: 580
    // });
}

pvt.init = () => {
	pvt.prepareTooltipster()
}

