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

		// hack the position
		// return
		var $filter = $('.ecdatabrowser-filtersimple').insertAfter($('.form-group-table-name')).removeClass('col-md-12').addClass('form-group on-left').children().each(function (i, e) {
			var $inputGroup = $(e).removeClass('col-md-6').addClass('input-group input-group-sm ez width-full');

			var $label = $inputGroup.find('.ecdatabrowser-filter');
			var $newLabel = $('<span />').addClass('input-group-addon ecdatabrowser-filter align-right width-100').html($label.text());

			$label.replaceWith($newLabel);

			$(e).find('.filter-form').removeClass('col-md-9');
		});

		$filter.append($('<div />').addClass('clearfix'));
	}, {
		timeout: 10 * 1000
	});
};

db.selectTableName = function (e) {
	var dataItem = this.dataItem(e.item);
	db.createDataBrowser(dataItem);
};

db.refreshDataBrowser = function () {
	$('#grid-databrowser-decription').ecDataBrowser("postDataFilter");
};

$(function () {
	db.getMasterDataBrowser();
});