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