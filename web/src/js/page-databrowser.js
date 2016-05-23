vm.pageTitle("Data Browser")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Data Browser', href: '/databrowser' }
])

viewModel.dataBrowser = new Object()
let db = viewModel.dataBrowser

db.masterDataBrowser = ko.observableArray([])

db.getMasterDataBrowser = () => {
	db.masterDataBrowser([])

	app.ajaxPost('/databrowser/getdatabrowsers', {}, (res) => {
		if (!app.isFine(res)) {
			return
		}

		db.masterDataBrowser(res.data)
	}, (err) => {
		app.showError(err.responseText)
	}, {
		timeout: 5000
	})
}
db.createDataBrowser = (dataItem) => {
	let table = dataItem._id
	
	app.ajaxPost("/databrowser/getdatabrowser", { tablename: table }, (res) => {
		if (!app.isFine(res)) {
			return;
		}

		if (!res.data) {
			res.data = []
		}

		$('#grid-databrowser-decription').ecDataBrowser({
			title: "",
			widthPerColumn: 6,
			showFilter: "Simple",
			dataSource: { 
				url: "/databrowser/getdatabrowser",
				type: "post",
				callData: {tablename: table},
				fieldTotal: "DataCount",
				fieldData: "DataValue",
				serverPaging: true,
				pageSize: 10,
				serverSorting: true,
				callOK: (res) => {
					console.log(res)
				}
            },
			metadata: res.data.dataresult.MetaData,
		});

		// hack the position
		// return
		let $filter = $('.ecdatabrowser-filtersimple')
			.insertAfter($('.form-group-table-name'))
			.removeClass('col-md-12')
			.addClass('form-group on-left')
			.children()
			.each((i, e) => {
				let $inputGroup = $(e)
					.removeClass('col-md-6')
					.addClass('input-group input-group-sm ez width-full')

				let $label = $inputGroup.find('.ecdatabrowser-filter')
				let $newLabel = $('<span />')
					.addClass('input-group-addon ecdatabrowser-filter align-right width-100')
					.html($label.text())

				$label.replaceWith($newLabel)

				$(e).find('.filter-form')
					.removeClass('col-md-9')
			})

		$filter.append($('<div />').addClass('clearfix'))
	}, {
		timeout: 10 * 1000
	});
}

db.selectTableName = function (e) {
	var dataItem = this.dataItem(e.item)
	db.createDataBrowser(dataItem)
}

db.refreshDataBrowser = () => {
	$('#grid-databrowser-decription').ecDataBrowser("postDataFilter")
}

$(() => {
	db.getMasterDataBrowser()
})