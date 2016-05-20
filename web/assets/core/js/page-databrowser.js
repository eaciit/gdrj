'use strict';

vm.pageTitle("Data Browser");
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Data Browser', href: '/databrowser' }]);

// ======================

viewModel.dataBrowser = new Object();
var db = viewModel.dataBrowser;

db.section = ko.observable("");
db.masterDataBrowser = ko.observableArray([]);
db.templateConfig = {
	dataModel: "",
	filters: [],
	fields: []
};
db.config = ko.mapping.fromJS(db.templateConfig);
db.dropDownConfigDataModel = {
	data: ko.computed(function () {
		return db.masterDataBrowser().map(function (d) {
			return { text: d.TableNames, value: d._id };
		});
	}),
	dataValueField: 'value',
	dataTextField: 'text',
	value: db.config.dataModel,
	optionLabel: 'Select one',
	select: function select(d) {
		console.log(d);
	}
};
db.gridConfigDataModel = {
	data: db.masterDataBrowser,
	dataSource: {
		pageSize: 10
	},
	columns: [{ field: "Field" }, { title: "Field" }, { field: "Field" }],
	pageable: true,
	sortable: true,
	filterable: false
};

db.getMasterDataBrowser = function (callback) {
	db.masterDataBrowser([]);

	app.ajaxPost('/databrowser/getdatabrowsers', {}, function (res) {
		if (!app.isFine(res)) {
			return;
		}

		db.masterDataBrowser(res.data);
		if (callback) {
			callback();
		}
	}, function (err) {
		app.showError(err.responseText);
	}, {
		timeout: 5000
	});
};
db.renderGridConfig = function () {};
db.init = function () {
	db.getMasterDataBrowser(function () {
		return db.renderGridConfig();
	});
};

$(function () {
	db.init();
});