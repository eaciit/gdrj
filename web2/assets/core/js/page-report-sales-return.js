'use strict';

viewModel.salesReturn = {};
var sr = viewModel.salesReturn;
sr.contentIsLoading = ko.observable(false);
sr.plGrossSales = ko.observable('PL0');
sr.plSalesReturn = ko.observable('salesreturn');
sr.breakdown = ko.observable('customer.channelname');
sr.fiscalYear = ko.observable(rpt.value.FiscalYear());
sr.title = ko.observable('Sales Return by Channels');

sr.changeTo = function (d, e) {
	sr.title(e);
	sr.breakdown(d);
	sr.refresh();
};

sr.refresh = function () {
	var param = {};
	param.pls = [];
	param.groups = rpt.parseGroups([sr.breakdown()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, sr.fiscalYear);

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				sr.contentIsLoading(false);
				return;
			}

			sr.contentIsLoading(false);
			sr.render(res);
		}, function () {
			sr.contentIsLoading(false);
		});
	};

	sr.contentIsLoading(true);
	fetch();
};

sr.render = function (res) {
	var key = '_id_' + toolkit.replace(sr.breakdown(), '.', '_');
	var data = _.orderBy(res.Data.Data, function (d) {
		return d[sr.plGrossSales()];
	}, 'desc');
	var rowGrossSales = { name: 'Gross Sales' };
	var rowSalesReturn = { name: 'Sales Return' };
	var rowPercentage = { name: 'Percentage' };

	var columns = [];
	columns.push({
		title: '&nbsp;',
		field: 'name',
		width: 150,
		locked: true,
		attributes: { style: 'font-weight: bold;' }
	});

	data.forEach(function (d) {
		var holder = toolkit.replace(d._id[key].toLowerCase(), ['.', '/', "'", '"', "\\", "-"], '_');

		rowGrossSales[holder] = d[sr.plGrossSales()];
		rowSalesReturn[holder] = d[sr.plSalesReturn()];
		rowPercentage[holder] = toolkit.number(d[sr.plGrossSales()] / d[sr.plSalesReturn()]) * 100;

		var column = {};
		columns.push(column);
		column.title = d._id[key];
		column.field = holder;
		column.width = 170;
		column.attributes = { class: 'align-right' };
		column.headerAttributes = { style: 'text-align: center !important; font-weight: bold;' };
		column.template = function (d) {
			if (d.name == 'Percentage') {
				return kendo.toString(d[holder], 'n2') + ' %';
			}

			return kendo.toString(d[holder], 'n0');
		};
	});

	var dataParsed = [rowGrossSales, rowSalesReturn, rowPercentage];
	console.log("dataParsed", dataParsed);

	var config = {
		dataSource: {
			data: dataParsed
		},
		columns: columns,
		resizable: false,
		sortable: false,
		pageable: false,
		filterable: false,
		dataBound: function dataBound() {
			var sel = '.grid-dashboard .k-grid-content-locked tr, .grid-dashboard .k-grid-content tr';

			$(sel).on('mouseenter', function () {
				var index = $(this).index();
				console.log(this, index);
				var elh = $('.grid-dashboard .k-grid-content-locked tr:eq(' + index + ')').addClass('hover');
				var elc = $('.grid-dashboard .k-grid-content tr:eq(' + index + ')').addClass('hover');
			});
			$(sel).on('mouseleave', function () {
				$('.grid-dashboard tr.hover').removeClass('hover');
			});
		}
	};

	$('.grid').replaceWith('<div class="grid"></div>');
	$('.grid').kendoGrid(config);
};

vm.currentMenu('Analysis');
vm.currentTitle('&nbsp;');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: 'Sales Return Analysis', href: '#' }]);

$(function () {
	rpt.tabbedContent();

	sr.refresh();
});