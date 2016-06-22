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
bkd.fiscalYear = ko.observable(rpt.value.FiscalYear());
bkd.breakdownValue = ko.observableArray([]);

bkd.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	if (bkd.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value');
		return;
	}

	var param = {};
	param.pls = [];
	param.groups = rpt.parseGroups([bkd.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, bkd.fiscalYear);

	var breakdownValue = bkd.breakdownValue().filter(function (d) {
		return d != 'All';
	});
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: bkd.breakdownBy(),
			Op: '$in',
			Value: bkd.breakdownValue()
		});
	}
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

bkd.arrChangeParent = ko.observableArray([{ idfrom: 'PL6A', idto: '', after: 'PL0' }, { idfrom: 'PL1', idto: 'PL8A', after: 'PL8A' }, { idfrom: 'PL2', idto: 'PL8A', after: 'PL8A' }, { idfrom: 'PL3', idto: 'PL8A', after: 'PL8A' }, { idfrom: 'PL4', idto: 'PL8A', after: 'PL8A' }, { idfrom: 'PL5', idto: 'PL8A', after: 'PL8A' }, { idfrom: 'PL6', idto: 'PL8A', after: 'PL8A' }]);

// bkd.arrFormulaPL = ko.observableArray([
// 	{ id: "PL0", formula: ["PL1","PL2","PL3","PL4","PL5","PL6"], cal: "sum"},
// 	{ id: "PL6A", formula: ["PL7","PL8","PL7A"], cal: "sum"},
// ])
// bkd.arrFormulaPL = ko.observableArray([
// 	{ id: "PL1", formula: ["PL7"], cal: "sum"},
// 	{ id: "PL2", formula: ["PL8"], cal: "sum"},
// ])

bkd.arrFormulaPL = ko.observableArray([{ id: "PL2", formula: ["PL2", "PL8"], cal: "sum" }, { id: "PL1", formula: ["PL8A", "PL2", "PL6"], cal: "min" }]);

bkd.changeParent = function (elemheader, elemcontent, PLCode) {
	var change = _.find(bkd.arrChangeParent(), function (a) {
		return a.idfrom == PLCode;
	});
	if (change != undefined) {
		if (change.idto != '') {
			elemheader.attr('idparent', change.idto);
			elemcontent.attr('idcontparent', change.idto);
		} else {
			elemheader.removeAttr('idparent');
			elemheader.find('td:eq(0)').css('padding-left', '8px');
			elemcontent.removeAttr('idcontparent');
		}
		return change.after;
	} else {
		return "";
	}
};

bkd.idarrayhide = ko.observableArray(['PL44A']);
bkd.render = function () {
	if (bkd.data().length == 0) {
		$('.breakdown-view').html('No data found.');
		return;
	}

	var breakdowns = [bkd.breakdownBy() /** , 'date.year' */];
	var rows = [];

	var data = _.map(bkd.data(), function (d) {
		d.breakdowns = {};
		var titleParts = [];

		breakdowns.forEach(function (e) {
			var title = d._id['_id_' + toolkit.replace(e, '.', '_')];
			title = toolkit.whenEmptyString(title, '');
			d.breakdowns[e] = title;
			titleParts.push(title);
		});

		d._id = titleParts.join(' ');
		return d;
	});

	var plmodels = _.sortBy(bkd.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	var exceptions = ["PL94C" /* "Operating Income" */
	, "PL39B" /* "Earning Before Tax" */
	, "PL41C" /* "Earning After Tax" */
	];
	var netSalesPLCode = 'PL8A';
	var netSalesPlModel = bkd.plmodels().find(function (d) {
		return d._id == netSalesPLCode;
	});
	var netSalesRow = {};

	data.forEach(function (e, a) {
		bkd.arrFormulaPL().forEach(function (d) {
			var total = 0;
			d.formula.forEach(function (f, l) {
				if (l == 0) {
					total = e[f];
				} else {
					if (d.cal == 'sum') {
						total += e[f];
					} else {
						total -= e[f];
					}
				}
			});

			data[a][d.id] = total;
		});
	});

	data.forEach(function (e) {
		var breakdown = e._id;
		var value = e['' + netSalesPlModel._id];
		value = toolkit.number(value);
		netSalesRow[breakdown] = value;
	});

	data = _.orderBy(data, function (d) {
		return netSalesRow[d._id];
	}, 'desc');

	plmodels.forEach(function (d) {
		var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 };
		data.forEach(function (e) {
			var breakdown = e._id;
			var value = e['' + d._id];
			value = toolkit.number(value);
			row[breakdown] = value;
			row.PNLTotal += value;
		});
		data.forEach(function (e) {
			var breakdown = e._id;
			var percentage = toolkit.number(e['' + d._id] / row.PNLTotal) * 100;
			percentage = toolkit.number(percentage);

			if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100;
			}

			if (percentage < 0) percentage = percentage * -1;

			row[breakdown + ' %'] = percentage;
		});

		if (exceptions.indexOf(row.PLCode) > -1) {
			return;
		}

		rows.push(row);
	});

	var TotalNetSales = _.find(rows, function (r) {
		return r.PLCode == "PL8A";
	}).PNLTotal;
	rows.forEach(function (d, e) {
		var TotalPercentage = d.PNLTotal / TotalNetSales * 100;
		if (TotalPercentage < 0) TotalPercentage = TotalPercentage * -1;
		rows[e].Percentage = TotalPercentage;
	});

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl').appendTo($('.breakdown-view'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader1 = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').appendTo(trHeader1);

	toolkit.newEl('th').html('Total').addClass('align-right').appendTo(trHeader1);

	toolkit.newEl('th').html('%').addClass('align-right').appendTo(trHeader1);

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
		if (d._id.length > 22) colWidth += 30;
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

		toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + '%').addClass('align-right').appendTo(trHeader);

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

			var idplyo = _.find(bkd.idarrayhide(), function (a) {
				return a == $trElem.attr("idheaderpl");
			});
			if (idplyo != undefined) {
				$trElem.remove();
				$('.table-content tr.column' + $trElem.attr("idheaderpl")).remove();
			}
			if (resg1 == undefined && idplyo2 == undefined) {
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
					var PLCodeChange = bkd.changeParent($trElem, $columnElem, $columnElem.attr('idpl'));
					if (PLCodeChange != "") PLyo.PLCode = PLCodeChange;
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
						var _PLCodeChange = bkd.changeParent($trElem, $columnElem, $columnElem.attr('idpl'));
						if (_PLCodeChange != "") PLyo.PLCode = _PLCodeChange;
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

			var idplyo2 = _.find(bkd.idarrayhide(), function (a) {
				return a == $trElem.attr("idparent");
			});
			if (idplyo2 != undefined) {
				$trElem.removeAttr('idparent');
				$trElem.addClass('bold');
				$trElem.css('display', 'inline-grid');
				$('.table-content tr.column' + $trElem.attr("idheaderpl")).removeAttr("idcontparent");
				$('.table-content tr.column' + $trElem.attr("idheaderpl")).attr('statusval', 'show');
				$('.table-content tr.column' + $trElem.attr("idheaderpl")).attr('statusvaltemp', 'show');
				$('.table-content tr.column' + $trElem.attr("idheaderpl")).css('display', 'inline-grid');
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
	$(".pivot-pnl .table-header tr:not([idparent]):not([idcontparent])").addClass('bold');

	setTimeout(function () {
		var newdata = [],
		    finddata = void 0;
		$('.table-header tr.bold').each(function (a, e) {
			finddata = _.find(rs.optionDimensionSelect(), function (a) {
				return a.field == $(e).attr('idheaderpl');
			});
			if (finddata != undefined) newdata.push(finddata);
		});
		newdata = _.sortBy(newdata, function (item) {
			return [item.name];
		});
		rs.optionDimensionSelect(newdata);
	});
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
	if (a == false) {
		(function () {
			var countchild = 0,
			    hidechild = 0;
			$(".table-header tbody>tr.dd").each(function (i) {
				if (i > 0) {
					countchild = $('.table-header tr[idparent=' + $(this).attr('idheaderpl') + ']').length;
					hidechild = $('.table-header tr[idparent=' + $(this).attr('idheaderpl') + '][statusvaltemp=hide]').length;
					if (countchild > 0) {
						console.log(countchild, hidechild, $(this));
						if (countchild == hidechild) {
							$(this).find('td:eq(0)>i').removeClass().css('margin-right', '0px');
							$(this).find('td:eq(0)').css('padding-left', '20px');
						}
					}
				}
			});
		})();
	}
};

bkd.optionBreakdownValues = ko.observableArray([]);
bkd.breakdownValueAll = { _id: 'All', Name: 'All' };
bkd.changeBreakdown = function () {
	var all = bkd.breakdownValueAll;
	var map = function map(arr) {
		return arr.map(function (d) {
			if ("customer.channelname" == bkd.breakdownBy()) {
				return d;
			}
			if ("customer.keyaccount" == bkd.breakdownBy()) {
				return { _id: d._id, Name: d._id };
			}

			return { _id: d.Name, Name: d.Name };
		});
	};
	setTimeout(function () {
		switch (bkd.breakdownBy()) {
			case "customer.areaname":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Area())));
				bkd.breakdownValue([all._id]);
				break;
			case "customer.region":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Region())));
				bkd.breakdownValue([all._id]);
				break;
			case "customer.zone":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())));
				bkd.breakdownValue([all._id]);
				break;
			case "product.brand":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())));
				bkd.breakdownValue([all._id]);
				break;
			case "customer.branchname":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())));
				bkd.breakdownValue([all._id]);
				break;
			case "customer.channelname":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())));
				bkd.breakdownValue([all._id]);
				break;
			case "customer.keyaccount":
				bkd.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())));
				bkd.breakdownValue([all._id]);
				break;
		}
	}, 100);
};
bkd.changeBreakdownValue = function () {
	var all = bkd.breakdownValueAll;
	setTimeout(function () {
		var condA1 = bkd.breakdownValue().length == 2;
		var condA2 = bkd.breakdownValue().indexOf(all._id) == 0;
		if (condA1 && condA2) {
			bkd.breakdownValue.remove(all._id);
			return;
		}

		var condB1 = bkd.breakdownValue().length > 1;
		var condB2 = bkd.breakdownValue().reverse()[0] == all._id;
		if (condB1 && condB2) {
			bkd.breakdownValue([all._id]);
			return;
		}

		var condC1 = bkd.breakdownValue().length == 0;
		if (condC1) {
			bkd.breakdownValue([all._id]);
		}
	}, 100);
};

viewModel.scatter = new Object();
var rs = viewModel.scatter;
var dataPoints = [{ field: "value1", name: "value1", aggr: "sum" }];

rs.contentIsLoading = ko.observable(false);
rs.title = ko.observable('P&L Analytic');
rs.breakdownBy = ko.observable('customer.channelname');
rs.selectedPNLNetSales = ko.observable("PL8A"); // PL1
rs.selectedPNL = ko.observable("PL44B");
rs.chartComparisonNote = ko.observable('');
rs.optionDimensionSelect = ko.observableArray([]);
rs.fiscalYear = ko.observable(rpt.value.FiscalYear());

rs.getSalesHeaderList = function () {
	app.ajaxPost("/report/getplmodel", {}, function (res) {
		var data = res.map(function (d) {
			return app.o({ field: d._id, name: d.PLHeader3 });
		}).filter(function (d) {
			return d.PLHeader3 !== rs.selectedPNLNetSales();
		});
		data = _.sortBy(data, function (item) {
			return [item.name];
		});
		rs.optionDimensionSelect(data);

		var prev = rs.selectedPNL();
		rs.selectedPNL('');
		setTimeout(function () {
			rs.selectedPNL(prev);
			rs.refresh(false);
		}, 300);
	});
};

rs.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	rs.contentIsLoading(true);

	var param = {};
	param.pls = [rs.selectedPNL(), rs.selectedPNLNetSales()];
	param.groups = rpt.parseGroups([rs.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, rs.fiscalYear);

	var fetch = function fetch() {
		app.ajaxPost("/report/getpnldatanew", param, function (res1) {
			if (res1.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			var date = moment(res1.time).format("dddd, DD MMMM YYYY HH:mm:ss");
			rs.chartComparisonNote('Last refreshed on: ' + date);

			var dataAllPNL = res1.Data.Data.filter(function (d) {
				return d.hasOwnProperty(rs.selectedPNL());
			}).map(function (d) {
				return { _id: d._id, value: d[rs.selectedPNL()] };
			});
			var dataAllPNLNetSales = res1.Data.Data.filter(function (d) {
				return d.hasOwnProperty(rs.selectedPNLNetSales());
			}).map(function (d) {
				return { _id: d._id, value: d[rs.selectedPNLNetSales()] };
			});

			var years = _.map(_.groupBy(dataAllPNL, function (d) {
				return d._id._id_date_year;
			}), function (v, k) {
				return k;
			});

			var sumNetSales = _.reduce(dataAllPNLNetSales, function (m, x) {
				return m + x.value;
			}, 0);
			var sumPNL = _.reduce(dataAllPNL, function (m, x) {
				return m + x.value;
			}, 0);
			var countPNL = dataAllPNL.length;
			var avgPNL = sumPNL;

			var dataScatter = [];
			var multiplier = sumNetSales == 0 ? 1 : sumNetSales;

			dataAllPNL.forEach(function (d, i) {
				dataScatter.push({
					valueNetSales: dataAllPNLNetSales[i].value,
					// category: app.nbspAble(`${d._id["_id_" + app.idAble(rs.breakdownBy())]} ${d._id._id_date_year}`, ''),
					category: d._id['_id_' + app.idAble(rs.breakdownBy())],
					year: d._id._id_date_year,
					valuePNL: Math.abs(d.value),
					valuePNLPercentage: Math.abs(d.value / dataAllPNLNetSales[i].value * 100),
					avgPNL: Math.abs(avgPNL),
					avgPNLPercentage: Math.abs(avgPNL / multiplier * 100)
				});
			});

			// sumPNL: Math.abs(sumPNL),
			// sumPNLPercentage: Math.abs(sumPNL / multiplier * 100)
			console.log("dataScatter", dataScatter);
			console.log("dataAllPNL", dataAllPNL);

			rs.contentIsLoading(false);
			rs.generateReport(dataScatter, years);
		}, function () {
			rs.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'pivot chart' : false
		});
	};

	fetch();
};

rs.generateReport = function (data, years) {
	data = _.orderBy(data, function (d) {
		return d.valueNetSales;
	}, 'desc');

	var max = _.max(_.map(data, function (d) {
		return d.avgNetSalesPercentage;
	}).concat(_.map(data, function (d) {
		return d.valuePNLPercentage;
	})));

	var netSalesTitle = rs.optionDimensionSelect().find(function (d) {
		return d.field == rs.selectedPNLNetSales();
	}).name;
	var breakdownTitle = rs.optionDimensionSelect().find(function (d) {
		return d.field == rs.selectedPNL();
	}).name;

	$('#scatter-view').replaceWith('<div id="scatter-view" style="height: 350px;"></div>');
	if (data.length * 100 > $('#scatter-view').parent().width()) $('#scatter-view').width(data.length * 120);else $('#scatter-view').css('width', '100%');
	$("#scatter-view").kendoChart({
		dataSource: {
			data: data
		},
		title: {
			text: ""
		},
		legend: {
			visible: true,
			position: "bottom"
		},
		seriesDefaults: {
			type: "line",
			missingValues: "gap"
		},
		seriesColors: ['#3498DB', "#678900"],
		series: [{
			name: 'Average ' + breakdownTitle + ' to ' + netSalesTitle,
			field: 'avgPNLPercentage',
			width: 3,
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			},
			tooltip: {
				visible: true,
				template: 'Average ' + breakdownTitle + ' to ' + netSalesTitle + ': #: kendo.toString(dataItem.avgPNLPercentage, \'n2\') # % (#: kendo.toString(dataItem.avgPNL, \'n2\') #)'
			},
			markers: {
				visible: false
			}
		}, {
			type: 'column',
			name: breakdownTitle + ' to ' + netSalesTitle,
			field: "valuePNLPercentage",
			overlay: {
				gradient: 'none'
			},
			border: {
				width: 0
			},
			tooltip: {
				visible: true,
				template: breakdownTitle + ' #: dataItem.category # to ' + netSalesTitle + ': #: kendo.toString(dataItem.valuePNLPercentage, \'n2\') # % (#: kendo.toString(dataItem.valuePNL, \'n2\') #)'
			},
			labels: {
				font: '"Source Sans Pro" 11px',
				visible: true,
				position: 'outsideEnd',
				template: function template(d) {
					return breakdownTitle + ' ' + d.category + '\n' + kendo.toString(d.value, 'n2') + ' %';
				}
			}
		}],
		valueAxis: {
			majorGridLines: {
				color: '#fafafa'
			},
			label: {
				format: "{0}%"
			}
		},
		categoryAxis: [{
			field: 'category',
			labels: {
				rotation: 20,
				font: '"Source Sans Pro" 11px'
			},
			majorGridLines: {
				color: '#fafafa'
			}
		}]
	});
};

viewModel.chartCompare = {};
var ccr = viewModel.chartCompare;

ccr.data = ko.observableArray([]);
ccr.dataComparison = ko.observableArray([]);
ccr.title = ko.observable('Chart Comparison');
ccr.contentIsLoading = ko.observable(false);
ccr.categoryAxisField = ko.observable('category');
ccr.breakdownBy = ko.observable('');
ccr.limitchart = ko.observable(6);
ccr.optionComparison = ko.observableArray([{ field: 'outlet', name: 'Outlet' }, { field: 'price', name: 'Price' }, { field: 'qty', name: 'Quantity' }]);
ccr.comparison = ko.observableArray(['price', 'qty']);
ccr.fiscalYear = ko.observable(rpt.value.FiscalYear());
ccr.order = ko.observable(ccr.optionComparison()[2].field);

ccr.getDecreasedQty = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.filters = rpt.getFilterValue(false, ccr.fiscalYear);
	param.groups = ["skuid", "date.quartertxt"];

	var fetch = function fetch() {
		toolkit.ajaxPost('/report/GetDecreasedQty', param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			ccr.contentIsLoading(false);
			ccr.dataComparison(res.Data.Data);
			ccr.plot();
		}, function () {
			ccr.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'chart comparison' : false
		});
	};

	ccr.contentIsLoading(true);
	fetch();
};
ccr.refresh = function () {
	// if (ccr.dataComparison().length > 0) {
	// 	ccr.plot()
	// } else {
	ccr.getDecreasedQty();
	// }
};
ccr.plot = function () {
	var orderedData = _.orderBy(ccr.dataComparison(), function (d) {
		if (ccr.order() == 'outlet') {
			return d.outletList;
		}

		return d[ccr.order()];
	}, 'desc');
	ccr.dataComparison(orderedData);

	// ccr.dataComparison(ccr.dummyJson)
	var tempdata = [];
	// let qty = 0
	// let price = 0
	var outlet = 0,
	    maxline = 0,
	    maxprice = 0,
	    maxqty = 0,
	    quarter = [];
	for (var i in ccr.dataComparison()) {
		if (ccr.dataComparison()[i].productName != undefined) {
			// qty = _.filter(ccr.dataComparison()[i].qty, function(resqty){ return resqty == 0}).length
			// price = _.filter(ccr.dataComparison()[i].price, function(resprice){ return resprice == 0}).length
			maxprice = _.max(ccr.dataComparison()[i].price);
			maxqty = _.max(ccr.dataComparison()[i].qty);
			outlet = _.max(ccr.dataComparison()[i].outletList);
			// if (maxprice > maxqty)
			// 	maxline = maxprice
			// else
			// 	maxline = maxqty
			quarter = [];
			for (var a in ccr.dataComparison()[i].qty) {
				quarter.push('Quarter ' + (parseInt(a) + 1));
			}
			tempdata.push({
				qty: ccr.dataComparison()[i].qtyCount,
				price: ccr.dataComparison()[i].priceCount,
				quarter: quarter,
				maxoutlet: outlet + outlet / 2,
				maxprice: maxprice + maxprice / 4,
				maxqty: maxqty + maxqty / 4,
				productName: ccr.dataComparison()[i].productName,
				data: ccr.dataComparison()[i]
			});
		}
	}
	// let sortPriceQty = _.take(_.sortBy(tempdata, function(item) {
	//    return [item.qty, item.price]
	// }).reverse(), ccr.limitchart())
	console.log("--------> TEMP DATA", tempdata);
	var sortPriceQty = _.take(tempdata, ccr.limitchart());
	ccr.data(sortPriceQty);
	ccr.render();
};
ccr.render = function () {
	var configure = function configure(data, full) {
		var seriesLibs = {
			price: {
				name: 'Price',
				// field: 'value1',
				data: data.price,
				width: 3,
				markers: {
					visible: true,
					size: 10,
					border: {
						width: 3
					}
				},
				axis: "price",
				color: '#5499C7',
				labels: {
					visible: false,
					background: 'rgba(84,153,199,0.2)'
				}
			},
			qty: {
				name: 'Qty',
				// field: 'value2',
				data: data.qty,
				width: 3,
				markers: {
					visible: true,
					size: 10,
					border: {
						width: 3
					}
				},
				axis: "qty",
				color: '#ff8d00',
				labels: {
					visible: false,
					background: 'rgba(255,141,0,0.2)'
				}
			},
			outlet: {
				name: 'Outlet',
				// field: 'value3',
				data: data.outletList,
				type: 'column',
				width: 3,
				overlay: {
					gradient: 'none'
				},
				border: {
					width: 0
				},
				markers: {
					visible: true,
					style: 'smooth',
					type: 'column'
				},
				axis: "outlet",
				color: '#678900',
				labels: {
					visible: false,
					background: 'rgba(103,137,0,0.2)'
				}
			}
		};

		var series = [];
		ccr.comparison().forEach(function (d) {
			series.push(seriesLibs[d]);
		});

		var valueAxes = [];
		// , maxyo = 0, fieldmax = '', maxselect = 0
		// if (ccr.comparison().indexOf('qty') > -1 || ccr.comparison().indexOf('price') > -1) {
		// 	valueAxes.push({
		// 		name: "priceqty",
		//               title: { text: "Qty & Price" },
		// 		majorGridLines: {
		// 			color: '#fafafa'
		// 		},
		// 		max: full.maxline,
		// 	})
		// }
		// if (ccr.comparison().indexOf('outlet') > -1) {
		// 	valueAxes.push({
		// 		name: "outlet",
		//               title: { text: "Outlet" },
		//               majorGridLines: {
		// 			color: '#fafafa'
		// 		},
		// 		max: full.maxoutlet,
		// 	})
		// }
		// if (ccr.comparison().length > 1) {
		// 	if (ccr.comparison()[0] > ccr.comparison()[1]){
		// 		maxyo = full["max"+ccr.comparison()[0]]
		// 		fieldmax = ccr.comparison()[0]
		// 	} else {
		// 		maxyo = full["max"+ccr.comparison()[1]]
		// 		fieldmax = ccr.comparison()[1]
		// 	}
		// } else if (ccr.comparison() > 0) {
		// 	maxyo = full["max"+ccr.comparison()[0]]
		// 	fieldmax = ccr.comparison()[0]
		// }
		// maxyo += maxyo / 4
		for (var _e in ccr.comparison()) {
			valueAxes.push({
				name: ccr.comparison()[_e],
				title: { text: ccr.comparison()[_e].charAt(0).toUpperCase() + ccr.comparison()[_e].slice(1) },
				majorGridLines: {
					color: '#fafafa'
				},
				max: full["max" + ccr.comparison()[_e]]
			});
		}

		return {
			// dataSource: {
			// 	data: data
			// },
			series: series,
			seriesDefaults: {
				type: "line",
				style: "smooth",
				labels: {
					font: '"Source Sans Pro" 11px',
					visible: true,
					position: 'top',
					template: function template(d) {
						return d.series.name + ': ' + kendo.toString(d.value, 'n0');
					}
				}
			},
			categoryAxis: {
				baseUnit: "month",
				// field: ccr.categoryAxisField(),
				categories: full.quarter,
				majorGridLines: {
					color: '#fafafa'
				},
				axisCrossingValue: [0, 8],
				labels: {
					font: '"Source Sans Pro" 11px',
					rotation: 40
					// template: (d) => `${toolkit.capitalize(d.value).slice(0, 3)}`
				}
			},
			legend: {
				position: 'bottom'
			},
			valueAxes: valueAxes,
			tooltip: {
				visible: true,
				template: function template(d) {
					return d.series.name + ' on : ' + kendo.toString(d.value, 'n0');
				}
			}
		};
	};

	var chartContainer = $('.chart-comparison');
	chartContainer.empty();
	for (var e in ccr.data()) {
		var html = $($('#template-chart-comparison').html());
		var config = configure(ccr.data()[e].data, ccr.data()[e]);

		html.appendTo(chartContainer);
		html.find('.title').html(ccr.data()[e].data.productName);
		html.find('.chart').kendoChart(config);
	}
	chartContainer.append($('<div />').addClass('clearfix'));
};

rpt.toggleFilterCallback = function () {
	$('.chart-comparison .k-chart').each(function (i, e) {
		$(e).data('kendoChart').redraw();
	});
};

vm.currentMenu('PNL Analysis');
vm.currentTitle('PNL Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'PNL Analysis', href: '/web/report/dashboard' }]);

bkd.title('P&L Analysis');
rs.title('P&L Comparison to Net Sales');
ccr.title('Quantity, Price & Outlet');

rpt.refresh = function () {
	rpt.refreshView('analysis');

	rs.getSalesHeaderList();

	bkd.changeBreakdown();
	setTimeout(function () {
		bkd.breakdownValue(['All']);
		bkd.refresh(false);
	}, 200);

	bkd.prepareEvents();

	ccr.getDecreasedQty(false);
};

$(function () {
	rpt.refresh();
});