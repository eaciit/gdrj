vm.pageTitle("Data Browser")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Data Browser', href: '/databrowser' }
])

viewModel.dataBrowser = new Object()
let db = viewModel.dataBrowser

db.masterDataBrowser = ko.observableArray([])
db.metaData = ko.observableArray([])
db.indexMetaData = ko.observable(0)
db.titleData = ko.observable("")
db.configData = ko.mapping.fromJS({})

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
	// let table = dataItem._id
	
	app.ajaxPost("/databrowser/getdatabrowser", { tablename: dataItem }, (res) => {
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
				callData: {tablename: dataItem},
				fieldTotal: "DataCount",
				fieldData: "DataValue",
				serverPaging: true,
				pageSize: 10,
				serverSorting: true,
				callOK: (res) => {
					// console.log(res)
				}
            },
			metadata: res.data.dataresult.MetaData,
		});
		let metadata = res.data.dataresult.MetaData;
		for (var i in metadata){
			metadata[i]['value'] = ''
			db.metaData.push(ko.mapping.fromJS(metadata[i]))
		}
		db.titleData(res.data.dataresult.TableNames)

		// hack the position
		db.cleanLeftFilter()
		db.renderLeftFilter()

	}, {
		timeout: 10 * 1000
	});
}

db.selectEditData = (data) => {
	$('#modalUpdate').modal('show');
	$.each( data, function( key, value ) {
		for (var a in db.metaData()){
			if (db.metaData()[a].Field() == key)
				db.metaData()[a].value(value)	
		}
	})
	ko.mapping.fromJS(data, db.configData)
}

db.editDataBrowser = () => {
	let postdata = {}
	postdata['tablename'] = db.titleData()
	for (var a in db.metaData()){
		postdata[db.metaData()[a].Field()] = db.metaData()[a].value()
	}
	app.ajaxPost("/databrowser/editdatabrowser", postdata, (res) => {
		if (!app.isFine(res)) {
			return;
		}
		$('#modalUpdate').modal('hide');
		db.createDataBrowser(db.titleData())
	})
}
db.cleanRightGrid = () => {
	$('#grid-databrowser-decription')
		.replaceWith('<div id="grid-databrowser-decription"></div>')
}
db.cleanLeftFilter = () => {
	$('.panel-filter .ecdatabrowser-filtersimple').remove()
}
db.renderLeftFilter = () => {
	$("#from-filter").find(".ecdatabrowser-filtersimple").remove()
	let $filter = $('.ecdatabrowser-filtersimple')
	$filter.insertAfter($('.form-group-table-name'))
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

	$('<p />').text('Filter shown data.').prependTo($filter)
	$('<div />').addClass('clearfix').appendTo($filter)
}
db.renderRightFilter = () => {
	
}

db.selectedTableName = ko.computed(() => {
	if (db.masterDataBrowser().length == 0) {
		return ''
	}

	let row = db.masterDataBrowser().find((d) => (d._id == db.selectedTableID()))
	if (row == undefined) {
		return ''
	}

	return row.TableNames
}, db)
db.selectedTableID = ko.observable('')
db.selectTable = function (e) {
	db.cleanLeftFilter()
	let dataItem = this.dataItem(e.item)

	if (dataItem._id == '') {
		db.cleanLeftFilter()
		db.cleanRightGrid()
	} else {
		db.cleanRightGrid()
		db.createDataBrowser(dataItem._id)
	}
}

db.refreshDataBrowser = () => {
	$('#grid-databrowser-decription').ecDataBrowser("postDataFilter")
}

$(() => {
	db.getMasterDataBrowser()
	$("#modalUpdate").insertAfter("body")
})