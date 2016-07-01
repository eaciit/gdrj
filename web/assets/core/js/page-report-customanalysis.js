'use strict';

viewModel.customtable = new Object();
var cst = viewModel.customtable;

cst.contentIsLoading = ko.observable(false);
cst.title = ko.observable('Custom Analysis');
cst.fiscalYear = ko.observable(rpt.value.FiscalYear());
cst.data = ko.observableArray([]);

cst.optionDimensionPNL = ko.observableArray([]);
cst.dimensionPNL = ko.observable([]);

cst.optionRowColumn = ko.observableArray([{ _id: 'row', Name: 'Row' }, { _id: 'column', Name: 'Column' }]);
cst.rowColumn = ko.observable('row');

cst.optionDimensionBreakdown = ko.observableArray([{ name: "Channel", field: "customer.channelname", title: "customer_channelname" },
// { name: "RD by distributor name", field: "" },
// { name: "GT by GT category", field: "" },
{ name: "Branch", field: "customer.branchname", title: "customer_branchname" }, { name: "Customer Group", field: "customer.keyaccount", title: "customer_keyaccount" }, { name: "Key Account", field: "customer.customergroup", title: "customer_customergroupname" }, { name: "Brand", field: "product.brand", title: "product_brand" }, { name: "Zone", field: "customer.zone", title: "customer_zone" }, { name: "Region", field: "customer.region", title: "customer_region" }, { name: "City", field: "customer.areaname", title: "customer_areaname" }, { name: "Date Month", field: "date.month", title: "date_month" }, { name: "Date Quarter", field: "date.quartertxt", title: "date_quartertxt" }]);
cst.breakdown = ko.observableArray(['product.brand', 'customer.channelname']);

cst.refresh = function () {
	var param = {};
	var groups = ['date.fiscal'].concat(cst.breakdown()).filter(function (d) {
		return d != 'pnl';
	});

	param.pls = cst.dimensionPNL();
	param.flag = '';
	param.groups = groups;
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, cst.fiscalYear);

	var fetch = function fetch() {
		app.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				cst.contentIsLoading(false);
				return;
			}

			cst.contentIsLoading(false);

			rpt.plmodels(res.Data.PLModels);
			cst.data(res.Data.Data);

			var opl1 = _.orderBy(rpt.plmodels(), function (d) {
				return d.OrderIndex;
			});
			var opl2 = _.map(opl1, function (d) {
				return { field: d._id, name: d.PLHeader3 };
			});
			cst.optionDimensionPNL(opl2);
			if (cst.dimensionPNL().length == 0) {
				cst.dimensionPNL(['PL8A', "PL7", "PL74B", "PL74C", "PL94A", "PL44B", "PL44C"]);
			}

			cst.build();
		}, function () {
			pvt.contentIsLoading(false);
		});
	};

	cst.contentIsLoading(true);
	fetch();
};

cst.build = function () {
	var keys = cst.dimensionPNL();
	var all = [];
	var columns = [];
	var rows = [];

	if (cst.rowColumn() == 'row') {
		columns = cst.breakdown().map(function (d) {
			return toolkit.replace(d, '.', '_');
		});
		rows = ['pnl'].map(function (d) {
			return toolkit.replace(d, '.', '_');
		});
	} else {
		columns = ['pnl'].map(function (d) {
			return toolkit.replace(d, '.', '_');
		});
		rows = cst.breakdown().map(function (d) {
			return toolkit.replace(d, '.', '_');
		});
	}

	// BUILD WELL STRUCTURED DATA

	var allRaw = [];
	cst.data().forEach(function (d) {
		var o = {};

		for (var key in d._id) {
			if (d._id.hasOwnProperty(key)) {
				o[toolkit.replace(key, '_id_', '')] = d._id[key];
			}
		}keys.map(function (e) {
			var pl = rpt.plmodels().find(function (g) {
				return g._id == e;
			});
			var p = toolkit.clone(o);
			p.pnl = pl.PLHeader3;
			p.value = d[e];

			allRaw.push(p);
		});
	});

	var op1 = _.groupBy(allRaw, function (d) {
		return columns.map(function (e) {
			return d[e];
		}).join('_');
	});
	var op2 = _.map(op1, function (v, k) {
		var col = {};
		col.rows = [];
		columns.forEach(function (e) {
			col[e] = v[0][e];
		});

		v.forEach(function (w) {
			var row = {};
			row.value = w.value;
			rows.forEach(function (e) {
				row[e] = w[e];
			});
			col.rows.push(row);
		});

		col.rows = _.orderBy(col.rows, function (d) {
			return d.value;
		}, 'desc');
		all.push(col);
	});

	all = _.orderBy(all, function (d) {
		return toolkit.sum(d.rows, function (e) {
			return e.value;
		});
	}, 'desc');

	console.log("all", all);

	// PREPARE TEMPLATE

	var container = $('.pivot-ez').empty();
	var columnWidth = 100;
	var columnHeight = 30;
	var tableHeaderWidth = 120 * rows.length;
	var totalWidth = 0;

	var tableHeaderWrapper = toolkit.newEl('div').addClass('table-header').appendTo(container);
	var tableHeader = toolkit.newEl('table').appendTo(tableHeaderWrapper).width(tableHeaderWidth);
	var trHeaderTableHeader = toolkit.newEl('tr').appendTo(tableHeader);
	var tdHeaderTableHeader = toolkit.newEl('td').html('&nbsp;').attr('colspan', rows.length).attr('data-rowspan', columns.length).height(columnHeight * columns.length).appendTo(trHeaderTableHeader);

	var tableContentWrapper = toolkit.newEl('div').addClass('table-content').appendTo(container).css('left', tableHeaderWidth + 'px');
	var tableContent = toolkit.newEl('table').appendTo(tableContentWrapper);

	var groupThenLoop = function groupThenLoop(data, groups) {
		var callbackStart = arguments.length <= 2 || arguments[2] === undefined ? app.noop : arguments[2];
		var callbackEach = arguments.length <= 3 || arguments[3] === undefined ? app.noop : arguments[3];
		var callbackLast = arguments.length <= 4 || arguments[4] === undefined ? app.noop : arguments[4];

		var what = callbackStart(groups);
		var counter = 0;
		var op1 = _.groupBy(data, function (e) {
			return e[groups[0]];
		});
		var op2 = _.map(op1, function (v, k) {
			return toolkit.return({ key: k, val: v });
		});

		var op3 = op2.forEach(function (g) {
			var k = g.key,
			    v = g.val;
			callbackEach(groups, counter, what, k, v);

			var groupsLeft = _.filter(groups, function (d, i) {
				return i != 0;
			});
			if (groupsLeft.length > 0) {
				groupThenLoop(v, groupsLeft, callbackStart, callbackEach, callbackLast);
			} else {
				callbackLast(groups, counter, what, k, v);
			}

			counter++;
		});
	};

	// GENERATE TABLE CONTENT HEADER

	columns.forEach(function (d) {
		groupThenLoop(all, columns, function (groups) {
			var rowHeader = tableContent.find('tr[data-key=' + groups.length + ']');
			if (rowHeader.size() == 0) {
				rowHeader = toolkit.newEl('tr').appendTo(tableContent).attr('data-key', groups.length);
			}

			return rowHeader;
		}, function (groups, counter, what, k, v) {
			var tdHeaderTableContent = toolkit.newEl('td').addClass('align-center title').html(k).width(tableHeaderWidth).appendTo(what);

			if (v.length > 1) {
				tdHeaderTableContent.attr('colspan', v.length);
			}

			if (k.length > 15) {
				tdHeaderTableContent.width(columnWidth + 50);
				totalWidth += 50;
			}

			totalWidth += columnWidth;
		}, function (groups, counter, what, k, v) {
			// GENERATE CONTENT OF TABLE HEADER & TABLE CONTENT

			groupThenLoop(v[0].rows, rows, app.noop, app.noop /* {
                                                     w.forEach((x) => {
                                                     let key = [k, String(counter)].join('_')
                                                     console.log(k, counter, x, x, key)
                                                     let rowTrContentHeader = tableHeader.find(`tr[data-key=${key}]`)
                                                     if (rowTrContentHeader.size() == 0) {
                                                     rowTrContentHeader = toolkit.newEl('tr')
                                                     .appendTo(tableHeader)
                                                     .attr('data-key', key)
                                                     }
                                                     let rowTdContentHeader = tableHeader.find(`tr[data-key=${key}]`)
                                                     if (rowTdContentHeader.size() == 0) {
                                                     rowTdContentHeader = toolkit.newEl('tr')
                                                     .appendTo(rowTrContentHeader)
                                                     .attr('data-key', key)
                                                     }
                                                     })
                                                     } */, function (groups, counter, what, k, v) {
				var key = rows.map(function (d) {
					return v[0][d];
				}).join("_");

				var rowTrHeader = tableHeader.find('tr[data-key="' + key + '"]');
				if (rowTrHeader.size() == 0) {
					rowTrHeader = toolkit.newEl('tr').appendTo(tableHeader).attr('data-key', key);
				}

				rows.forEach(function (e) {
					var tdKey = [e, key].join('_');
					var rowTdHeader = rowTrHeader.find('td[data-key="' + tdKey + '"]');
					if (rowTdHeader.size() == 0) {
						toolkit.newEl('td').addClass('title').appendTo(rowTrHeader).attr('data-key', tdKey).html(v[0][e]);
					}
				});

				var rowTrContent = tableContent.find('tr[data-key="' + key + '"]');
				if (rowTrContent.size() == 0) {
					rowTrContent = toolkit.newEl('tr').appendTo(tableContent).attr('data-key', key);
				}

				var rowTdContent = toolkit.newEl('td').addClass('align-right').html(kendo.toString(v[0].value, 'n0')).appendTo(rowTrContent);
			});
		});

		tableContent.width(totalWidth);
	});

	var tableClear = toolkit.newEl('div').addClass('clearfix').appendTo(container);

	container.height(tableContent.height());
};

vm.currentMenu('Analysis');
vm.currentTitle('Custom Analysis');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: 'Custom Analysis', href: '#' }]);

cst.title('&nbsp;');

$(function () {
	cst.refresh();
	// cst.selectfield()
});