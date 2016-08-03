'use strict';

viewModel.cogs = {};
var cogs = viewModel.cogs;

cogs.optionDimensions = ko.observableArray([{ field: 'product.skuid', name: 'SKU' }].concat(rpt.optionDimensions()));
cogs.contentIsLoading = ko.observable(false);
cogs.breakdownBy = ko.observable('customer.channelname');
cogs.breakdownByFiscalYear = ko.observable('date.fiscal');
cogs.data = ko.observableArray([]);
cogs.fiscalYear = ko.observable(rpt.value.FiscalYear());
cogs.level = ko.observable(1);

cogs.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.aggr = 'sum';
	param.flag = 'cogs';
	param.filters = rpt.getFilterValue(false, cogs.fiscalYear);
	var groups = [cogs.breakdownBy()];

	param.groups = rpt.parseGroups(groups);
	cogs.contentIsLoading(true);

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				cogs.contentIsLoading(false);
				return;
			}

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels);
			cogs.data(cogs.buildStructure(res.Data.Data));
			rpt.plmodels(cogs.buildPLModels(res.Data.PLModels));
			cogs.emptyGrid();
			cogs.contentIsLoading(false);
			cogs.render();
			rpt.prepareEvents();

			$('.columnPL891_perunit,.columnPL891').each(function (i, e) {
				return $(e).find('td').empty();
			});
			$('.headerPL891_perunit,.headerPL891').each(function (i, e) {
				return $(e).find('td:last').empty();
			});
			$('.headerPL891_perunit,.headerPL891').each(function (i, e) {
				return $(e).find('td:first').trigger('click');
			});
		}, function () {
			cogs.emptyGrid();
			cogs.contentIsLoading(false);
		});
	};

	fetch();
};

cogs.clickExpand = function (e) {
	var right = $(e).find('i.fa-chevron-right').length,
	    down = 0;
	if (e.attr('idheaderpl') == 'PL0') down = $(e).find('i.fa-chevron-up').length;else down = $(e).find('i.fa-chevron-down').length;
	if (right > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth());
			$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth());
		}

		$(e).find('i').removeClass('fa-chevron-right');
		if (e.attr('idheaderpl') == 'PL0') $(e).find('i').addClass('fa-chevron-up');else $(e).find('i').addClass('fa-chevron-down');
		$('tr[idparent=' + e.attr('idheaderpl') + ']').css('display', '');
		$('tr[idcontparent=' + e.attr('idheaderpl') + ']').css('display', '');
		$('tr[statusvaltemp=hide]').css('display', 'none');
		rpt.refreshHeight(e.attr('idheaderpl'));
		rpt.refreshchildadd(e.attr('idheaderpl'));
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '');
			$('.pivot-pnl .table-content').css('margin-left', '');
		}

		$(e).find('i').removeClass('fa-chevron-up');
		$(e).find('i').removeClass('fa-chevron-down');
		$(e).find('i').addClass('fa-chevron-right');
		$('tr[idparent=' + e.attr('idheaderpl') + ']').css('display', 'none');
		$('tr[idcontparent=' + e.attr('idheaderpl') + ']').css('display', 'none');
		rpt.hideAllChild(e.attr('idheaderpl'));
	}
};

cogs.emptyGrid = function () {
	$('#cogs').replaceWith('<div class="breakdown-view ez" id="cogs"></div>');
};

cogs.buildPLModels = function (plmodels) {
	var plsSplittable = ["PL14", "PL74A", "PL74", "PL9", "PL74B", "PL14A", "Pl20", "PL21"];
	var plsUnsplittable = ["PL1", "PL8A", "PL6A", "PL7A", "PL0", "PL7", "PL2", "PL8", "PL6"];

	plmodels = plmodels.filter(function (d) {
		if (plsSplittable.indexOf(d._id) > -1) {
			return true;
		}
		if (plsUnsplittable.indexOf(d._id) > -1) {
			return true;
		}
		return false;
	});

	// let plSpecials = ['Cost of Goods Sold', 'Indirect Expense', 'Direct Expense']
	// let plmodelsNew = []
	// plmodels.forEach((d) => {
	// 	if (plsSplittable.indexOf(d._id) > -1) {
	// 		let e = toolkit.clone(d)
	// 		e._id = `${d._id}_perunit`
	// 		e.PLHeader1 = d.PLHeader1
	// 		e.PLHeader2 = d.PLHeader2
	// 		e.PLHeader3 = d.PLHeader3

	// 		;['PLHeader1', 'PLHeader2', 'PLHeader3'].forEach((f) => {
	// 			if (plSpecials.indexOf(e[f]) > -1) {
	// 				e[f] = `${e[f]} (Per Unit)`
	// 			}

	// 			e[f] = `${e[f]} `
	// 		})

	// 		plmodelsNew.push(e)
	// 	}

	// 	plmodelsNew.push(d)
	// })

	var plParents = ['Original', 'Per Unit'];
	var plmodelsNew = [];
	plmodels.forEach(function (d) {
		if (plsSplittable.indexOf(d._id) > -1) {
			var e = toolkit.clone(d);
			e._id = d._id + '_perunit';
			e.OrderIndex = d.OrderIndex;
			e.PLHeader3 = d.PLHeader3 + ' ';
			e.PLHeader2 = d.PLHeader1 + ' ';
			e.PLHeader1 = plParents[1];
			plmodelsNew.push(e);

			d.PLHeader2 = d.PLHeader1;
			d.PLHeader1 = plParents[0];
		}

		plmodelsNew.push(d);
	});

	plParents.forEach(function (d, i) {
		var o = {};
		o._id = 'PL891';
		o.OrderIndex = 'PL0027';
		o.PLHeader1 = d;
		o.PLHeader2 = d;
		o.PLHeader3 = d;

		if (i == 1) {
			o._id = o._id + '_perunit';
		}

		plmodelsNew.push(o);
	});

	return plmodelsNew;
};

cogs.buildStructure = function (data) {
	var groupThenMap = function groupThenMap(data, group) {
		var op1 = _.groupBy(data, function (d) {
			return group(d);
		});
		var op2 = _.map(op1, function (v, k) {
			var key = { _id: k, subs: v };
			var sample = v[0];

			var _loop = function _loop(prop) {
				if (sample.hasOwnProperty(prop) && prop != '_id') {
					key[prop] = toolkit.sum(v, function (d) {
						return d[prop];
					});
				}
			};

			for (var prop in sample) {
				_loop(prop);
			}

			return key;
		});

		return op2;
	};

	var parsed = groupThenMap(data, function (d) {
		return d._id['_id_' + toolkit.replace(cogs.breakdownBy(), '.', '_')];
	}).map(function (d) {
		d.breakdowns = d.subs[0]._id;
		d.count = 1;

		return d;
	});

	cogs.level(1);
	var newParsed = _.orderBy(parsed, function (d) {
		return d.PL8A;
	}, 'desc');
	return newParsed;
};

cogs.render = function () {
	if (cogs.data().length == 0) {
		$('#cogs').html('No data found.');
		return;
	}

	// ========================= TABLE STRUCTURE

	var percentageWidth = 100;

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo($('#cogs'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() * cogs.level() + 'px').attr('data-rowspan', cogs.level()).css('vertical-align', 'middle').addClass('cell-percentage-header').appendTo(trHeader);

	toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() * cogs.level() + 'px').attr('data-rowspan', cogs.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

	toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).css('height', rpt.rowHeaderHeight() * cogs.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', cogs.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);

	var trContents = [];
	for (var i = 0; i < cogs.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent).css('height', rpt.rowHeaderHeight() + 'px'));
	}

	// ========================= BUILD HEADER

	var data = cogs.data();

	var columnWidth = 130;
	var totalColumnWidth = 0;
	var pnlTotalSum = 0;
	var dataFlat = [];

	var countWidthThenPush = function countWidthThenPush(thheader, each, key) {
		var currentColumnWidth = each._id.length * (cogs.breakdownBy() == 'customer.channelname' ? 7 : 10);
		if (currentColumnWidth < columnWidth) {
			currentColumnWidth = columnWidth;
		}

		if (each.hasOwnProperty('width')) {
			currentColumnWidth = each.width;
		}

		each.key = key.join('_');
		dataFlat.push(each);

		totalColumnWidth += currentColumnWidth;
		thheader.width(currentColumnWidth);
	};

	data.forEach(function (lvl1, i) {
		var thheader1 = toolkit.newEl('th').html(lvl1._id.replace(/\ /g, '&nbsp;')).attr('colspan', lvl1.count).addClass('align-center').css('border-top', 'none').appendTo(trContents[0]);

		var thheader2p = $('<div />');

		if (cogs.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id]);

			totalColumnWidth += percentageWidth;
			var thheader1p = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);

			if (rpt.showPercentOfTotal()) {
				totalColumnWidth += percentageWidth;
				thheader2p = toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);
			}

			return;
		}
		thheader1.attr('colspan', lvl1.count * (rpt.showPercentOfTotal() ? 3 : 2));

		lvl1.subs.forEach(function (lvl2, j) {
			var thheader2 = toolkit.newEl('th').html(lvl2._id.replace(/\ /g, '&nbsp;')).addClass('align-center').appendTo(trContents[1]);

			if (cogs.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);

				totalColumnWidth += percentageWidth;
				var _thheader1p = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').appendTo(trContents[1]);

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth;
					thheader2p = toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[1]);
				}

				return;
			}
			thheader2.attr('colspan', lvl2.count);
		});
	});

	tableContent.css('min-width', totalColumnWidth);

	// ========================= CONSTRUCT DATA

	var plmodels = _.sortBy(rpt.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	var exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */];
	var netSalesPLCode = 'PL8A';
	var netSalesRow = {};
	var grossSalesPLCode = 'PL0';
	var grossSalesRow = {};
	var discountActivityPLCode = 'PL7A';
	var rows = [];

	rpt.fixRowValue(dataFlat);

	console.log("dataFlat", dataFlat);

	dataFlat.forEach(function (e) {
		var breakdown = e.key;
		netSalesRow[breakdown] = e[netSalesPLCode];
		grossSalesRow[breakdown] = e[grossSalesPLCode];
	});

	plmodels.forEach(function (d) {
		var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 };
		dataFlat.forEach(function (e) {
			var breakdown = e.key;
			var value = e['' + d._id];
			row[breakdown] = value;

			if (toolkit.isDefined(e.excludeFromTotal)) {
				return;
			}

			row.PNLTotal += value;
		});
		dataFlat.forEach(function (e) {
			var breakdown = e.key;
			var percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100;
			var percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100;

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100;
			} else if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100;
			}

			if (percentage < 0) percentage = percentage * -1;

			row[breakdown + ' %'] = percentage;
			row[breakdown + ' %t'] = percentageOfTotal;
		});

		if (exceptions.indexOf(row.PLCode) > -1) {
			return;
		}

		rows.push(row);
	});

	console.log("rows", rows);

	var TotalNetSales = _.find(rows, function (r) {
		return r.PLCode == netSalesPLCode;
	}).PNLTotal;
	var TotalGrossSales = _.find(rows, function (r) {
		return r.PLCode == grossSalesPLCode;
	}).PNLTotal;
	rows.forEach(function (d, e) {
		var TotalPercentage = d.PNLTotal / TotalNetSales * 100;
		if (d.PLCode == discountActivityPLCode) {
			TotalPercentage = d.PNLTotal / TotalGrossSales * 100;
		}

		if (TotalPercentage < 0) TotalPercentage = TotalPercentage * -1;
		rows[e].Percentage = toolkit.number(TotalPercentage);
	});

	// ========================= PLOT DATA

	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var PL = d.PLCode;
		PL = PL.replace(/\s+/g, '');
		var trHeader = toolkit.newEl('tr').addClass('header' + PL).attr('idheaderpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableHeader);

		trHeader.on('click', function () {
			cogs.clickExpand(trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trHeader);

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e, f) {
			var key = e.key;
			var value = kendo.toString(d[key], 'n0');
			var percentage = kendo.toString(d[key + ' %'], 'n2') + '&nbsp;%';
			var percentageOfTotal = kendo.toString(d[key + ' %t'], 'n2') + '&nbsp;%';

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			var cellPercentage = toolkit.newEl('td').html(percentage).addClass('align-right').appendTo(trContent);

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td').html(percentageOfTotal).addClass('align-right').appendTo(trContent);
			}

			$([cell, cellPercentage]).on('click', function () {
				cogs.renderDetail(d.PLCode, e.breakdowns);
			});
		});

		rpt.putStatusVal(trHeader, trContent);
	});

	// ========================= CONFIGURE THE HIRARCHY
	rpt.buildGridLevels(rows);
};

vm.currentMenu('Analysis');
vm.currentTitle('COGS Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'COGS Analysis', href: '#' }]);

$(function () {
	cogs.refresh();
	rpt.showExport(true);
});