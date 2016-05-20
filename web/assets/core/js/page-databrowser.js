'use strict';

vm.pageTitle("Data Browser");
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Data Browser', href: '/databrowser' }]);

viewModel.dataBrowser = new Object();
var db = viewModel.dataBrowser;

db.masterDataBrowser = ko.observableArray([]);

db.getMasterDataBrowser = function () {
	db.masterDataBrowser([]);

	app.ajaxPost('/databrowser/getdatabrowsers', {}, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		db.masterDataBrowser(res.data);
	}, function (err) {
		app.showError(err.responseText);
	}, {
		timeout: 5000
	});
};
db.createDataBrowser = function (dataItem) {
	var table = dataItem._id;

	app.ajaxPost("/databrowser/getdatabrowser", { tablename: table }, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		if (!res.data) {
			res.data = [];
		}

		$('#grid-databrowser-decription').ecDataBrowser({
			title: "",
			widthPerColumn: 6,
			showFilter: "Simple",
			dataSource: {
				url: "/databrowser/getdatabrowser",
				type: "post",
				callData: { tablename: table },
				fieldTotal: "DataCount",
				fieldData: "DataValue",
				serverPaging: true,
				pageSize: 10,
				serverSorting: true,
				callOK: function callOK(res) {
					console.log(res);
				}
			},
			metadata: res.data.dataresult.MetaData
		});
	}, {
		timeout: 10 * 1000
	});
};

db.selectTableName = function (e) {
	var dataItem = this.dataItem(e.item);
	db.createDataBrowser(dataItem);
};

$(function () {
	db.getMasterDataBrowser();
});