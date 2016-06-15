'use strict';

viewModel.breakdown = new Object();
var bkd = viewModel.breakdown;

bkd.contentIsLoading = ko.observable(false);
bkd.popupIsLoading = ko.observable(false);
bkd.title = ko.observable('P&L Analytic');
bkd.detail = ko.observableArray([]);
bkd.limit = ko.observable(10);
bkd.breakdownNote = ko.observable('');

bkd.breakdownBy = ko.observable('customer.channelname');
bkd.breakdownByFiscalYear = ko.observable('date.fiscal');
bkd.oldBreakdownBy = ko.observable(bkd.breakdownBy());

bkd.data = ko.observableArray([]);
bkd.plmodels = ko.observableArray([]);
bkd.zeroValue = ko.observable(false);
bkd.fiscalYear = ko.observable(2014);

bkd.generateDataForX = function () {
	var param = {
		"pls": [],
		"groups": ["customer.channelname", "customer.branchname", "product.brand", "customer.region", "date.year", "date.fiscal"],
		"aggr": "sum",
		"filters": [{
			"Field": "date.year",
			"Op": "$gte",
			"Value": "2013-12-31T17:00:00.000Z"
		}, {
			"Field": "date.year",
			"Op": "$lte",
			"Value": "2016-12-30T17:00:00.000Z"
		}]
	};

	toolkit.ajaxPost("/report/getpnldatanew", param);
};

bkd.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.groups = [bkd.breakdownBy() /** , 'date.year' */];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue();

	param.filters.push({
		Field: 'date.fiscal',
		Op: '$eq',
		Value: bkd.fiscalYear() + '-' + (bkd.fiscalYear() + 1)
	});

	console.log("bdk", param.filters);

	bkd.oldBreakdownBy(bkd.breakdownBy());
	bkd.contentIsLoading(true);

	var fetch = function fetch() {
		toolkit.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			var date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss");
			bkd.breakdownNote('Last refreshed on: ' + date);

			bkd.data(res.Data.Data);
			bkd.plmodels(res.Data.PLModels);
			bkd.emptyGrid();
			bkd.contentIsLoading(false);
			bkd.render();
		}, function () {
			bkd.emptyGrid();
			bkd.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'breakdown chart' : false
		});
	};

	fetch();
};

bkd.clickExpand = function (e) {
	var right = $(e).find('i.fa-chevron-right').length;
	var down = $(e).find('i.fa-chevron-down').length;
	if (right > 0) {
		$(e).find('i').removeClass('fa-chevron-right');
		$(e).find('i').addClass('fa-chevron-down');
		$('tr[idparent=' + e.attr('idheaderpl') + ']').css('display', '');
		$('tr[idcontparent=' + e.attr('idheaderpl') + ']').css('display', '');
		$('tr[statusvaltemp=hide]').css('display', 'none');
	}
	if (down > 0) {
		$(e).find('i').removeClass('fa-chevron-down');
		$(e).find('i').addClass('fa-chevron-right');
		$('tr[idparent=' + e.attr('idheaderpl') + ']').css('display', 'none');
		$('tr[idcontparent=' + e.attr('idheaderpl') + ']').css('display', 'none');
	}
};
bkd.emptyGrid = function () {
	$('.breakdown-view').replaceWith('<div class="breakdown-view ez"></div>');
};

bkd.renderDetailSalesTrans = function (breakdown) {
	bkd.popupIsLoading(true);
	$('#modal-detail-ledger-summary').appendTo($('body'));
	$('#modal-detail-ledger-summary').modal('show');

	var columns = [
	// { field: '_id', title: 'ID', width: 100, locked: true },
	{ field: 'date', title: 'Date', width: 150, locked: true, template: function template(d) {
			return moment(d.date).format('DD/MM/YYYY HH:mm');
		} }, { field: "grossamount", headerTemplate: '<div class="align-right">Gross</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "discountamount", headerTemplate: '<div class="align-right">Discount</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "netamount", headerTemplate: '<div class="align-right">Net Sales</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "salesqty", headerTemplate: '<div class="align-right">Sales Qty</div>', width: 100, format: '{0:n0}', attributes: { class: 'align-right' } }, { field: "customer.branchname", title: 'Branch', width: 100 }, { field: "product.name", title: 'Product', width: 250 }, { field: "product.brand", title: 'Brand', width: 100 }];

	var config = {
		dataSource: {
			transport: {
				read: function read(options) {
					var param = options.data;
					param.tablename = "browsesalestrxs";
					param[bkd.breakdownBy()] = [breakdown];

					if (toolkit.isUndefined(param.page)) {
						param = $.extend(true, param, {
							take: 5,
							skip: 0,
							page: 1,
							pageSize: 5
						});
					}

					$.ajax({
						type: "POST",
						url: "/databrowser/getdatabrowser",
						contentType: "application/json; charset=utf-8",
						dataType: 'json',
						data: JSON.stringify(param),
						success: function success(res) {
							bkd.popupIsLoading(false);
							setTimeout(function () {
								options.success(res.data);
							}, 200);
						},
						error: function error() {
							bkd.popupIsLoading(false);
						}
					});
				},
				pageSize: 5
			},
			schema: {
				data: function data(d) {
					return d.DataValue;
				},
				total: function total(d) {
					return d.DataCount;
				}
			},
			serverPaging: true,
			columns: [],
			pageSize: 5
		},
		sortable: true,
		pageable: true,
		scrollable: true,
		columns: columns
	};

	$('.grid-detail').replaceWith('<div class="grid-detail"></div>');
	$('.grid-detail').kendoGrid(config);
};
bkd.renderDetail = function (plcode, breakdowns) {
	bkd.popupIsLoading(true);
	$('#modal-detail-ledger-summary .modal-title').html('Detail');
	$('#modal-detail-ledger-summary').appendTo($('body'));
	$('#modal-detail-ledger-summary').modal('show');

	var titleParts = [];
	for (var p in breakdowns) {
		if (breakdowns.hasOwnProperty(p)) {
			titleParts.push(breakdowns[p]);
		}
	}

	$('#modal-detail-ledger-summary .modal-title').html('Detail of ' + titleParts.join(' '));

	var columns = [{ title: 'Date', width: 120, locked: true, footerTemplate: 'Total :', template: function template(d) {
			return moment(d.date.date).format('DD/MM/YYYY HH:mm');
		}, attributes: { class: 'bold' } },
	// { field: `pldatas.${plcode}.amount`, width: 120, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Amount</div>", footerTemplate: (d) => d[`pldatas.${plcode}.amount`].sum, format: '{0:n2}', attributes: { class: 'align-right' } },
	{ field: 'grossamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Gross</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.grossamount.sum, 'n0')}</div>`,  */format: '{0:n2}', attributes: { class: 'align-right' } }, { field: 'discountamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Discount</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.discountamount.sum, 'n0')}</div>`,  */format: '{0:n2}', attributes: { class: 'align-right' } }, { field: 'netamount', width: 90, aggregates: ["sum"], headerTemplate: "<div class='align-right'>Net Sales</div>", /** footerTemplate: (d) => `<div class="align-right">${kendo.toString(d.netamount.sum, 'n0')}</div>`,  */format: '{0:n2}', attributes: { class: 'align-right' } },
	// { title: 'Cost Center', template: (d) => toolkit.redefine(toolkit.redefine(d.cc, {}).name, ''), width: 250 },
	{ title: 'Outlet', template: function template(d) {
			return toolkit.redefine(toolkit.redefine(d.customer, {}).name, '');
		}, width: 200 }, { title: 'Branch', template: function template(d) {
			return toolkit.redefine(toolkit.redefine(d.customer, {}).branchname, '');
		}, width: 150 }, { title: 'Channel', template: function template(d) {
			return toolkit.redefine(toolkit.redefine(d.customer, {}).channelname, '');
		}, width: 150 }, { title: 'Brand', template: function template(d) {
			return toolkit.redefine(toolkit.redefine(d.product, {}).brand, '');
		}, width: 100 }, { title: 'Product', template: function template(d) {
			return toolkit.redefine(toolkit.redefine(d.product, {}).name, '');
		}, width: 250 }];

	var config = {
		dataSource: {
			transport: {
				read: function read(options) {
					var param = options.data;
					param.filters = [];

					for (var _p in breakdowns) {
						if (breakdowns.hasOwnProperty(_p)) {
							param.filters.push({
								field: _p,
								op: "$eq",
								value: breakdowns[_p]
							});
						}
					}

					if (toolkit.isUndefined(param.page)) {
						param = $.extend(true, param, {
							take: 5,
							skip: 0,
							page: 1,
							pageSize: 5
						});
					}

					$.ajax({
						type: "POST",
						url: "/report/getpnldetail",
						contentType: "application/json; charset=utf-8",
						dataType: 'json',
						data: JSON.stringify(param),
						success: function success(res) {
							bkd.popupIsLoading(false);
							setTimeout(function () {
								console.log("++++", res);
								options.success(res.Data);
							}, 200);
						},
						error: function error() {
							bkd.popupIsLoading(false);
						}
					});
				},
				pageSize: 5
			},
			schema: {
				data: function data(d) {
					return d.DataValue;
				},
				total: function total(d) {
					return d.DataCount;
				}
			},
			//       aggregates: [
			// 	{ field: "netamount", aggregate: "sum" },
			// 	{ field: "grossamount", aggregate: "sum" },
			// 	{ field: "discountamount", aggregate: "sum" },
			// 	{ field: `pldatas.${plcode}.amount`, aggregate: 'sum' }
			// ],
			serverPaging: true,
			pageSize: 5
		},
		sortable: true,
		pageable: true,
		scrollable: true,
		columns: columns,
		dataBound: function dataBound(d) {
			$('.grid-detail .k-pager-nav.k-pager-last').hide();

			setTimeout(function () {
				var pager = $('.grid-detail .k-pager-info');
				var text = 'rows ' + pager.html().split(" ").slice(0, 3).join(" ");
				pager.html(text);
			}, 10);
		}
	};

	console.log("======", config);

	$('.grid-detail').replaceWith('<div class="grid-detail"></div>');
	$('.grid-detail').kendoGrid(config);
};
bkd.render = function () {
	if (bkd.data().length == 0) {
		$('.breakdown-view').html('No data found.');
		return;
	}

	var breakdowns = [bkd.breakdownBy() /** , 'date.year' */];
	var rows = [];

	var data = _.sortBy(_.map(bkd.data(), function (d) {
		d.breakdowns = {};
		var titleParts = [];

		breakdowns.forEach(function (e) {
			var title = d._id['_id_' + toolkit.replace(e, '.', '_')];
			title = toolkit.whenEmptyString(title, 'Uncategorized');
			d.breakdowns[e] = title;
			titleParts.push(title);
		});

		d._id = titleParts.join(' ');
		return d;
	}), function (d) {
		return d._id;
	});

	var plmodels = _.sortBy(bkd.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	plmodels.forEach(function (d) {
		var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0 };
		data.forEach(function (e) {
			var breakdown = e._id;
			var value = e['' + d._id];value = toolkit.number(value);
			row[breakdown] = value;
			row.PNLTotal += value;
		});
		data.forEach(function (e) {
			var breakdown = e._id;
			var value = e['' + d._id] / row.PNLTotal * 100;value = toolkit.number(value);
			row[breakdown + ' %'] = value;
		});
		rows.push(row);
	});

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl').appendTo($('.breakdown-view'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader1 = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').appendTo(trHeader1);

	toolkit.newEl('th').html('Total').addClass('align-right').appendTo(trHeader1);

	var trContent1 = toolkit.newEl('tr').appendTo(tableContent);

	var colWidth = 160;
	var colPercentWidth = 60;
	var totalWidth = 0;
	var pnlTotalSum = 0;

	if (bkd.breakdownBy() == "customer.branchname") {
		colWidth = 200;
	}

	if (bkd.breakdownBy() == "customer.region") {
		colWidth = 230;
	}

	var grouppl1 = _.map(_.groupBy(bkd.plmodels(), function (d) {
		return d.PLHeader1;
	}), function (k, v) {
		return { data: k, key: v };
	});
	var grouppl2 = _.map(_.groupBy(bkd.plmodels(), function (d) {
		return d.PLHeader2;
	}), function (k, v) {
		return { data: k, key: v };
	});
	var grouppl3 = _.map(_.groupBy(bkd.plmodels(), function (d) {
		return d.PLHeader3;
	}), function (k, v) {
		return { data: k, key: v };
	});
	data.forEach(function (d, i) {
		toolkit.newEl('th').html(d._id).addClass('align-right').appendTo(trContent1).width(colWidth);

		toolkit.newEl('th').html('%').addClass('align-right cell-percentage').appendTo(trContent1).width(colPercentWidth);

		totalWidth += colWidth + colPercentWidth;
	});
	// console.log('data ', data)

	tableContent.css('min-width', totalWidth);

	// console.log('row ', rows)
	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var PL = d.PLCode;
		PL = PL.replace(/\s+/g, '');
		var trHeader = toolkit.newEl('tr').addClass('header' + PL).attr('idheaderpl', PL).appendTo(tableHeader);

		trHeader.on('click', function () {
			bkd.clickExpand(trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).appendTo(tableContent);

		data.forEach(function (e, f) {
			var key = e._id;
			var value = kendo.toString(d[key], 'n0');

			var percentage = kendo.toString(d[key + ' %'], 'n2');

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			cell.on('click', function () {
				bkd.renderDetail(d.PLCode, e.breakdowns);
			});

			toolkit.newEl('td').html(percentage + ' %').addClass('align-right cell-percentage').appendTo(trContent);
		});

		var boolStatus = false;
		trContent.find('td').each(function (a, e) {
			// console.log(trHeader.find('td:eq(0)').text(),$(e).text())
			if ($(e).text() != '0' && $(e).text() != '0.00 %') {
				boolStatus = true;
			}
		});
		if (boolStatus) {
			trContent.attr('statusval', 'show');
			trHeader.attr('statusval', 'show');
		} else {
			trContent.attr('statusval', 'hide');
			trHeader.attr('statusval', 'hide');
		}
	});

	var $trElem = void 0,
	    $columnElem = void 0;
	var resg1 = void 0,
	    resg2 = void 0,
	    resg3 = void 0,
	    PLyo = void 0,
	    PLyo2 = void 0,
	    child = 0,
	    parenttr = 0,
	    textPL = void 0;
	$(".table-header tbody>tr").each(function (i) {
		if (i > 0) {
			$trElem = $(this);
			resg1 = _.find(grouppl1, function (o) {
				return o.key == $trElem.find('td:eq(0)').text();
			});
			resg2 = _.find(grouppl2, function (o) {
				return o.key == $trElem.find('td:eq(0)').text();
			});
			resg3 = _.find(grouppl3, function (o) {
				return o.key == $trElem.find('td:eq(0)').text();
			});
			if (resg1 == undefined) {
				if (resg2 != undefined) {
					textPL = _.find(resg2.data, function (o) {
						return o._id == $trElem.attr("idheaderpl");
					});
					PLyo = _.find(rows, function (o) {
						return o.PNL == textPL.PLHeader1;
					});
					PLyo2 = _.find(rows, function (o) {
						return o.PLCode == textPL._id;
					});
					$trElem.find('td:eq(0)').css('padding-left', '40px');
					$trElem.attr('idparent', PLyo.PLCode);
					child = $('tr[idparent=' + PLyo.PLCode + ']').length;
					$columnElem = $('.table-content tr.column' + PLyo2.PLCode);
					$columnElem.attr('idcontparent', PLyo.PLCode);
					if (child > 1) {
						$trElem.insertAfter($('tr[idparent=' + PLyo.PLCode + ']:eq(' + (child - 1) + ')'));
						$columnElem.insertAfter($('tr[idcontparent=' + PLyo.PLCode + ']:eq(' + (child - 1) + ')'));
					} else {
						$trElem.insertAfter($('tr.header' + PLyo.PLCode));
						$columnElem.insertAfter($('tr.column' + PLyo.PLCode));
					}
				} else if (resg2 == undefined) {
					if (resg3 != undefined) {
						PLyo = _.find(rows, function (o) {
							return o.PNL == resg3.data[0].PLHeader2;
						});
						PLyo2 = _.find(rows, function (o) {
							return o.PNL == resg3.data[0].PLHeader3;
						});
						$trElem.find('td:eq(0)').css('padding-left', '70px');
						if (PLyo == undefined) {
							PLyo = _.find(rows, function (o) {
								return o.PNL == resg3.data[0].PLHeader1;
							});
							if (PLyo != undefined) $trElem.find('td:eq(0)').css('padding-left', '40px');
						}
						$trElem.attr('idparent', PLyo.PLCode);
						child = $('tr[idparent=' + PLyo.PLCode + ']').length;
						$columnElem = $('.table-content tr.column' + PLyo2.PLCode);
						$columnElem.attr('idcontparent', PLyo.PLCode);
						if (child > 1) {
							$trElem.insertAfter($('tr[idparent=' + PLyo.PLCode + ']:eq(' + (child - 1) + ')'));
							$columnElem.insertAfter($('tr[idcontparent=' + PLyo.PLCode + ']:eq(' + (child - 1) + ')'));
						} else {
							$trElem.insertAfter($('tr.header' + PLyo.PLCode));
							$columnElem.insertAfter($('tr.column' + PLyo.PLCode));
						}
					}
				}
			}
		}
	});

	var countChild = '';
	$(".table-header tbody>tr").each(function (i) {
		$trElem = $(this);
		parenttr = $('tr[idparent=' + $trElem.attr('idheaderpl') + ']').length;
		if (parenttr > 0) {
			$trElem.addClass('dd');
			$trElem.find('td:eq(0)>i').addClass('fa fa-chevron-right').css('margin-right', '5px');
			$('tr[idparent=' + $trElem.attr('idheaderpl') + ']').css('display', 'none');
			$('tr[idcontparent=' + $trElem.attr('idheaderpl') + ']').css('display', 'none');
			$('tr[idparent=' + $trElem.attr('idheaderpl') + ']').each(function (a, e) {
				if ($(e).attr('statusval') == 'show') {
					$('tr[idheaderpl=' + $trElem.attr('idheaderpl') + ']').attr('statusval', 'show');
					$('tr[idpl=' + $trElem.attr('idheaderpl') + ']').attr('statusval', 'show');
					if ($('tr[idheaderpl=' + $trElem.attr('idheaderpl') + ']').attr('idparent') == undefined) {
						$('tr[idpl=' + $trElem.attr('idheaderpl') + ']').css('display', '');
						$('tr[idheaderpl=' + $trElem.attr('idheaderpl') + ']').css('display', '');
					}
				}
			});
		} else {
			countChild = $trElem.attr('idparent');
			if (countChild == '' || countChild == undefined) $trElem.find('td:eq(0)').css('padding-left', '20px');
		}
	});
	bkd.showZeroValue(false);
};

bkd.prepareEvents = function () {
	$('.breakdown-view').parent().on('mouseover', 'tr', function () {
		var index = $(this).index();
		var elh = $('.breakdown-view .table-header tr:eq(' + index + ')').addClass('hover');
		var elc = $('.breakdown-view .table-content tr:eq(' + index + ')').addClass('hover');
	});
	$('.breakdown-view').parent().on('mouseleave', 'tr', function () {
		$('.breakdown-view tr.hover').removeClass('hover');
	});
};

bkd.showExpandAll = function (a) {
	if (a == true) {
		$('tr.dd').find('i').removeClass('fa-chevron-right');
		$('tr.dd').find('i').addClass('fa-chevron-down');
		$('tr[idparent]').css('display', '');
		$('tr[idcontparent]').css('display', '');
		$('tr[statusvaltemp=hide]').css('display', 'none');
	} else {
		$('tr.dd').find('i').removeClass('fa-chevron-down');
		$('tr.dd').find('i').addClass('fa-chevron-right');
		$('tr[idparent]').css('display', 'none');
		$('tr[idcontparent]').css('display', 'none');
		$('tr[statusvaltemp=hide]').css('display', 'none');
	}
};

bkd.showZeroValue = function (a) {
	bkd.zeroValue(a);
	if (a == true) {
		$(".table-header tbody>tr").each(function (i) {
			if (i > 0) {
				$(this).attr('statusvaltemp', 'show');
				$('tr[idpl=' + $(this).attr('idheaderpl') + ']').attr('statusvaltemp', 'show');
				if (!$(this).attr('idparent')) {
					$(this).show();
					$('tr[idpl=' + $(this).attr('idheaderpl') + ']').show();
				}
			}
		});
	} else {
		$(".table-header tbody>tr").each(function (i) {
			if (i > 0) {
				$(this).attr('statusvaltemp', $(this).attr('statusval'));
				$('tr[idpl=' + $(this).attr('idheaderpl') + ']').attr('statusvaltemp', $(this).attr('statusval'));
			}
		});
	}
	bkd.showExpandAll(false);
};

$(function () {
	bkd.refresh(false);
	bkd.prepareEvents();
});