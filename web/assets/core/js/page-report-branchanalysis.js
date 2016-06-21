'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

viewModel.breakdown = new Object();
var ba = viewModel.breakdown;

ba.contentIsLoading = ko.observable(false);
ba.popupIsLoading = ko.observable(false);
ba.title = ko.observable('Branch Analysis');
ba.detail = ko.observableArray([]);
ba.limit = ko.observable(10);
ba.breakdownNote = ko.observable('');

ba.breakdownBy = ko.observable('customer.branchname');
ba.breakdownByChannel = ko.observable('customer.channelname');
ba.breakdownByFiscalYear = ko.observable('date.fiscal');
ba.oldBreakdownBy = ko.observable(ba.breakdownBy());
ba.optionDimensions = ko.observableArray(rpt.optionDimensions().filter(function (d) {
	return d.field != 'customer.channelname';
}));

ba.expandRD = ko.observable(false);
ba.data = ko.observableArray([]);
ba.plmodels = ko.observableArray([]);
ba.zeroValue = ko.observable(false);
ba.fiscalYear = ko.observable(rpt.value.FiscalYear());
ba.breakdownValue = ko.observableArray([]);
ba.breakdownRD = ko.observable("All");
ba.optionBranch = ko.observableArray([{
	id: "All",
	title: "RD & Non RD"
}, {
	id: "OnlyRD",
	title: "Only RD Sales"
}, {
	id: "NonRD",
	title: "Non RD Sales"
}]); //rpt.masterData.Channel()

ba.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.groups = [ba.breakdownByChannel(), ba.breakdownBy() /** , 'date.year' */];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, ba.fiscalYear);

	var breakdownValue = ba.breakdownValue().filter(function (d) {
		return d != 'All';
	});
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: ba.breakdownBy(),
			Op: '$in',
			Value: ba.breakdownValue()
		});
	}
	console.log("bdk", param.filters);

	ba.oldBreakdownBy(ba.breakdownBy());
	ba.contentIsLoading(true);

	var fetch = function fetch() {
		toolkit.ajaxPost("/report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}
			ba.data(res.Data.Data);
			var date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss");
			ba.breakdownNote('Last refreshed on: ' + date);

			ba.plmodels(res.Data.PLModels);
			ba.emptyGrid();
			ba.contentIsLoading(false);
			ba.render();
		}, function () {
			ba.emptyGrid();
			ba.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'breakdown chart' : false
		});
	};

	fetch();
};

ba.clickExpand = function (e) {
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
ba.emptyGrid = function () {
	$('.breakdown-view').replaceWith('<div class="breakdown-view ez"></div>');
};

ba.renderDetailSalesTrans = function (breakdown) {
	ba.popupIsLoading(true);
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
					param[ba.breakdownBy()] = [breakdown];

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
							ba.popupIsLoading(false);
							setTimeout(function () {
								options.success(res.data);
							}, 200);
						},
						error: function error() {
							ba.popupIsLoading(false);
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
ba.renderDetail = function (plcode, breakdowns) {
	ba.popupIsLoading(true);
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
							ba.popupIsLoading(false);
							setTimeout(function () {
								console.log("++++", res);
								options.success(res.Data);
							}, 200);
						},
						error: function error() {
							ba.popupIsLoading(false);
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

ba.idarrayhide = ko.observableArray(['PL44A']);
ba.render = function () {
	if (ba.breakdownRD() == "OnlyRD") {
		ba.expandRD(false);
	}

	if (ba.data().length == 0) {
		$('.breakdown-view').html('No data found.');
		return;
	}

	var breakdowns = [ba.breakdownByChannel(), ba.breakdownBy() /** , 'date.year' */];
	var rows = [],
	    datayo = [],
	    dataok = [];
	var breakdownKey = '_id_' + toolkit.replace(ba.breakdownByChannel(), '.', '_');

	var groupbyrd = _.groupBy(ba.data(), function (a) {
		return a._id._id_customer_branchname;
	});
	$.each(groupbyrd, function (key, value) {
		var sumdata = {};
		var sumdata2 = {};
		datayo = _.filter(value, function (d) {
			return d._id[breakdownKey] == "RD";
		});
		if (datayo.length > 0) {
			for (var a in datayo) {
				$.each(datayo[a], function (keya, valuea) {
					if (keya != "_id") {
						if (sumdata[keya] == undefined) sumdata[keya] = 0;
						sumdata[keya] = sumdata[keya] + valuea;
					}
				});
			}
		} else {
			$.each(value[0], function (keya, valuea) {
				sumdata[keya] = 0;
			});
		}

		datayo = _.filter(value, function (d) {
			return d._id[breakdownKey] != "RD";
		});
		for (var a in datayo) {
			$.each(datayo[a], function (keya, valuea) {
				if (keya != "_id") {
					if (sumdata2[keya] == undefined) sumdata2[keya] = 0;
					sumdata2[keya] = sumdata2[keya] + valuea;
				}
			});
		}

		if (ba.breakdownRD() != "OnlyRD" && ba.expandRD()) {
			var _ret = function () {
				var sumdataOther = [];
				rpt.masterData.Channel().filter(function (f) {
					return f._id != "I1";
				}).forEach(function (d) {
					var sumdataEach = {};
					datayo = _.filter(value, function (e) {
						return e._id._id_customer_channelid == d._id;
					});
					for (var a in datayo) {
						$.each(datayo[a], function (keya, valuea) {
							if (keya != "_id") {
								if (sumdataEach[keya] == undefined) sumdataEach[keya] = 0;
								sumdataEach[keya] = sumdataEach[keya] + valuea;
							}
						});
					}
					sumdataOther.push(sumdataEach);
				});

				var newstruct = {};
				newstruct["_id_customer_branchname"] = key;
				toolkit.forEach(sumdata, function (key2, value2) {
					var values = sumdataOther.map(function (d) {
						return toolkit.number(d[key2]);
					});
					console.log("+++++", key2, value2, values);
					newstruct[key2] = [value2, sumdata2[key2]].concat(values);
				});
				dataok.push(newstruct);
				return {
					v: void 0
				};
			}();

			if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
		}

		var newstruct = {};
		newstruct["_id_customer_branchname"] = key;
		toolkit.forEach(sumdata, function (key2, value2) {
			newstruct[key2] = [value2, sumdata2[key2]];
		});
		dataok.push(newstruct);
	});

	var data = _.map(dataok, function (d) {
		d.breakdowns = {};
		var titleParts = [];

		breakdowns.forEach(function (e) {
			var title = d['_id_' + toolkit.replace(e, '.', '_')];
			title = toolkit.whenEmptyString(title, '');
			d.breakdowns[e] = title;
			titleParts.push(title);
		});

		d._id = titleParts.join(' ');
		return d;
	});

	var plmodels = _.sortBy(ba.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	var exceptions = ["PL94C", "PL39B", "PL41C"];
	var netSalesPLCode = 'PL8A';
	var netSalesPlModel = ba.plmodels().find(function (d) {
		return d._id == netSalesPLCode;
	});
	var netSalesRow = {};
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
		var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0 };
		data.forEach(function (e) {
			var breakdown = e._id;
			var value = e['' + d._id];
			row[breakdown + '1'] = toolkit.number(value[0]);
			row[breakdown + '2'] = toolkit.number(value[1]);

			if (ba.breakdownRD() != "OnlyRD" && ba.expandRD()) {
				row[breakdown + '3'] = toolkit.number(value[2]);
				row[breakdown + '4'] = toolkit.number(value[3]);
				row[breakdown + '5'] = toolkit.number(value[4]);
				row[breakdown + '6'] = toolkit.number(value[5]);
				row[breakdown + '7'] = toolkit.number(value[6]);
			}
		});
		data.forEach(function (e) {
			var breakdown = e._id;
			var total = e['' + d._id][0] + e['' + d._id][1];
			total = toolkit.number(total);
			row[breakdown + ' total'] = total;

			if (ba.breakdownRD() == "OnlyRD") {
				row.PNLTotal += e['' + d._id][0];
			} else if (ba.breakdownRD() == "NonRD") {
				row.PNLTotal += e['' + d._id][1];
			} else {
				row.PNLTotal += total;
			}
		});

		if (exceptions.indexOf(row.PLCode) > -1) {
			return;
		}

		rows.push(row);
	});

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo($('.breakdown-view'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader1 = toolkit.newEl('tr').appendTo(tableHeader);

	var trHeader2 = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').attr('colspan', 2).html('&nbsp;').addClass('cell-percentage-header').appendTo(trHeader1);

	toolkit.newEl('th').html('P&L').addClass('cell-percentage-header').appendTo(trHeader2);

	toolkit.newEl('th').html('Total').addClass('align-right').appendTo(trHeader2);

	var trContent1 = toolkit.newEl('tr').appendTo(tableContent);

	var trContent2 = toolkit.newEl('tr').appendTo(tableContent);

	var colWidth = 80;
	var colPercentWidth = 80;
	var totalWidth = 0;
	var pnlTotalSum = 0;

	var grouppl1 = _.map(_.groupBy(ba.plmodels(), function (d) {
		return d.PLHeader1;
	}), function (k, v) {
		return { data: k, key: v };
	});
	var grouppl2 = _.map(_.groupBy(ba.plmodels(), function (d) {
		return d.PLHeader2;
	}), function (k, v) {
		return { data: k, key: v };
	});
	var grouppl3 = _.map(_.groupBy(ba.plmodels(), function (d) {
		return d.PLHeader3;
	}), function (k, v) {
		return { data: k, key: v };
	});
	data.forEach(function (d, i) {
		if (d._id.length > 22) colWidth += 30;
		var thheader = toolkit.newEl('th').html(d._id).attr('colspan', '3').addClass('align-center cell-percentage-header').appendTo(trContent1).width(colWidth);

		var cell1 = toolkit.newEl('th').html('Total').addClass('align-center').attr('statuscolumn', 'TotalRD').appendTo(trContent2).width(colPercentWidth);

		var cell2 = toolkit.newEl('th').html('RD').addClass('align-center').attr('statuscolumn', 'RD').appendTo(trContent2).width(colPercentWidth);

		var cell3 = toolkit.newEl('th').html('Non RD').attr('statuscolumn', 'NonRD').addClass('align-center cell-percentage-header').appendTo(trContent2).width(colPercentWidth);

		if (ba.breakdownRD() == "OnlyRD") {
			cell1.css('display', 'none');
			cell3.css('display', 'none');
			cell2.addClass('cell-percentage-header').width(colWidth - 80);
			thheader.removeAttr("colspan");
			totalWidth += colWidth - 80 + colPercentWidth;
		} else if (ba.breakdownRD() == "NonRD") {
			cell1.css('display', 'none');
			cell2.css('display', 'none');
			cell3.addClass('cell-percentage-header').width(colWidth - 80);
			thheader.removeAttr("colspan");
			totalWidth += colWidth - 80 + colPercentWidth;
		} else {
			totalWidth += colWidth + colPercentWidth * 3;
		}

		if (ba.breakdownRD() != "OnlyRD" && ba.expandRD()) {
			totalWidth -= colWidth - 80;
			cell3.remove();
			thheader.attr("colspan", 7);
			rpt.masterData.Channel().filter(function (f) {
				return f._id != "I1";
			}).forEach(function (f) {
				var cell4 = toolkit.newEl('th').html(f.Name).addClass('align-center').appendTo(trContent2).width(colPercentWidth);
				totalWidth += colPercentWidth;
			});
			// I2, I4, I6, I3, EXP
		}
	});
	// console.log('data ', data)

	tableContent.css('min-width', totalWidth);
	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var PL = d.PLCode;
		PL = PL.replace(/\s+/g, '');
		var trHeader = toolkit.newEl('tr').addClass('header' + PL).attr('idheaderpl', PL).appendTo(tableHeader);

		trHeader.on('click', function () {
			ba.clickExpand(trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).appendTo(tableContent);

		data.forEach(function (e, f) {
			var key = e._id;
			var value1 = kendo.toString(d[key + "1"], 'n0');
			var value2 = kendo.toString(d[key + "2"], 'n0');
			var total = kendo.toString(d[key + " total"], 'n0');

			if ($.trim(value1) == '') value1 = 0;
			if ($.trim(value2) == '') value2 = 0;
			if ($.trim(total) == '') total = 0;

			var cell1 = toolkit.newEl('td').html(total).addClass('align-right').attr('statuscolumn', 'TotalRD').appendTo(trContent);

			var cell2 = toolkit.newEl('td').html(value1).addClass('align-right').attr('statuscolumn', 'RD').appendTo(trContent);

			var cell3 = toolkit.newEl('td').html(value2).addClass('align-right cell-percentage-header').attr('statuscolumn', 'NonRD').appendTo(trContent);

			if (ba.breakdownRD() == "OnlyRD") {
				cell1.css('display', 'none');
				cell3.css('display', 'none');
				cell2.addClass('cell-percentage-header');
			} else if (ba.breakdownRD() == "NonRD") {
				cell1.css('display', 'none');
				cell2.css('display', 'none');
				cell3.addClass('cell-percentage-header');
			}

			if (ba.breakdownRD() != "OnlyRD" && ba.expandRD()) {
				cell3.remove();
				rpt.masterData.Channel().filter(function (f) {
					return f._id != "I1";
				}).forEach(function (f, i) {
					var value = kendo.toString(d[key + (i + 3)], 'n0');
					var cell4 = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent).width(colPercentWidth);
				});
			}

			// cell.on('click', () => {
			// 	ba.renderDetail(d.PLCode, e.breakdowns)
			// })
		});

		var boolStatus = false;
		trContent.find('td').each(function (a, e) {
			if ($(e).text() != '0') {
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

			var idplyo = _.find(ba.idarrayhide(), function (a) {
				return a == $trElem.attr("idheaderpl");
			});
			if (idplyo != undefined) {
				$trElem.remove();
				$('.table-content tr.column' + $trElem.attr("idheaderpl")).remove();
			}
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

			var idplyo2 = _.find(ba.idarrayhide(), function (a) {
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

	ba.showZeroValue(false);
	$(".pivot-pnl-branch.pivot-pnl .table-header tr:not([idparent]):not([idcontparent])").addClass('bold');
};

ba.prepareEvents = function () {
	$('.breakdown-view').parent().on('mouseover', 'tr', function () {
		var index = $(this).index();
		var elh = $('.breakdown-view .table-header tr:eq(' + index + ')').addClass('hover');
		var elc = $('.breakdown-view .table-content tr:eq(' + index + ')').addClass('hover');
	});
	$('.breakdown-view').parent().on('mouseleave', 'tr', function () {
		$('.breakdown-view tr.hover').removeClass('hover');
	});
};

ba.showExpandAll = function (a) {
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

ba.showZeroValue = function (a) {
	ba.zeroValue(a);
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

	ba.showExpandAll(false);
};

ba.optionBreakdownValues = ko.observableArray([]);
ba.breakdownValueAll = { _id: 'All', Name: 'All' };
ba.changeBreakdown = function () {
	var all = ba.breakdownValueAll;
	var map = function map(arr) {
		return arr.map(function (d) {
			if ("customer.channelname" == ba.breakdownBy()) {
				return d;
			}
			if ("customer.keyaccount" == ba.breakdownBy()) {
				return { _id: d._id, Name: d._id };
			}

			return { _id: d.Name, Name: d.Name };
		});
	};
	setTimeout(function () {
		switch (ba.breakdownBy()) {
			case "customer.areaname":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Area())));
				ba.breakdownValue([all._id]);
				break;
			case "customer.region":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Region())));
				ba.breakdownValue([all._id]);
				break;
			case "customer.zone":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Zone())));
				ba.breakdownValue([all._id]);
				break;
			case "product.brand":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Brand())));
				ba.breakdownValue([all._id]);
				break;
			case "customer.branchname":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Branch())));
				ba.breakdownValue([all._id]);
				break;
			case "customer.channelname":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.Channel())));
				ba.breakdownValue([all._id]);
				break;
			case "customer.keyaccount":
				ba.optionBreakdownValues([all].concat(map(rpt.masterData.KeyAccount())));
				ba.breakdownValue([all._id]);
				break;
		}
	}, 100);
};
ba.changeBreakdownValue = function () {
	var all = ba.breakdownValueAll;
	setTimeout(function () {
		var condA1 = ba.breakdownValue().length == 2;
		var condA2 = ba.breakdownValue().indexOf(all._id) == 0;
		if (condA1 && condA2) {
			ba.breakdownValue.remove(all._id);
			return;
		}

		var condB1 = ba.breakdownValue().length > 1;
		var condB2 = ba.breakdownValue().reverse()[0] == all._id;
		if (condB1 && condB2) {
			ba.breakdownValue([all._id]);
			return;
		}

		var condC1 = ba.breakdownValue().length == 0;
		if (condC1) {
			ba.breakdownValue([all._id]);
		}
	}, 100);
};

vm.currentMenu('Branch Analysis');
vm.currentTitle('Branch Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Branch Analysis', href: '/web/report/dashboard' }]);

ba.title('Branch Analysis');

rpt.refresh = function () {
	ba.changeBreakdown();
	setTimeout(function () {
		ba.breakdownValue(['All']);
		ba.refresh(false);
	}, 200);

	ba.prepareEvents();
};

$(function () {
	rpt.refresh();
});