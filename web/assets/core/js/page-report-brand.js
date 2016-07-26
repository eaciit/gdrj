'use strict';

viewModel.brand = {};
var brand = viewModel.brand;

brand.contentIsLoading = ko.observable(false);
brand.breakdownNote = ko.observable('');

brand.breakdownBy = ko.observable('product.brand');
brand.breakdownByFiscalYear = ko.observable('date.fiscal');

brand.data = ko.observableArray([]);
brand.fiscalYear = ko.observable(rpt.value.FiscalYear());
brand.breakdownValue = ko.observableArray([]);
brand.breakdownChannelValue = ko.observableArray([]);
brand.level = ko.observable(1);

brand.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, brand.fiscalYear);
	param.groups = rpt.parseGroups([brand.breakdownBy()]);
	brand.contentIsLoading(true);

	var breakdownChannel = brand.breakdownChannel().filter(function (d) {
		return d !== 'All';
	});
	if (breakdownChannel.length > 0) {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: breakdownChannel
		});
	}

	var breakdownBrand = brand.breakdownBrand().filter(function (d) {
		return d !== 'All';
	});
	if (breakdownBrand.length > 0) {
		param.filters.push({
			Field: 'product.brand',
			Op: '$in',
			Value: breakdownBrand
		});
	}

	var fetch = function fetch() {
		rpt.injectMonthQuarterFilter(param.filters);
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				brand.contentIsLoading(false);
				return;
			}

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels);
			var data = brand.buildStructure(res.Data.Data);
			brand.data(data);
			rpt.plmodels(res.Data.PLModels);
			brand.emptyGrid();
			brand.contentIsLoading(false);
			brand.render();
			rpt.prepareEvents();
		}, function () {
			brand.emptyGrid();
			brand.contentIsLoading(false);
		});
	};

	fetch();
};

brand.clickExpand = function (e) {
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

brand.emptyGrid = function () {
	$('#brand').replaceWith('<div class="breakdown-view ez" id="brand"></div>');
};

brand.buildStructure = function (data) {
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
		return d._id['_id_' + toolkit.replace(brand.breakdownBy(), '.', '_')];
	}).map(function (d) {
		d.breakdowns = d.subs[0]._id;
		d.count = 1;

		return d;
	});

	brand.level(1);
	var newParsed = _.orderBy(parsed, function (d) {
		return d.PL8A;
	}, 'desc');
	return newParsed;
};

brand.render = function () {
	if (brand.data().length == 0) {
		$('#brand').html('No data found.');
		return;
	}

	// ========================= TABLE STRUCTURE

	var percentageWidth = 100;

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo($('#brand'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() * brand.level() + 'px').attr('data-rowspan', brand.level()).css('vertical-align', 'middle').addClass('cell-percentage-header').appendTo(trHeader);

	toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() * brand.level() + 'px').attr('data-rowspan', brand.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

	toolkit.newEl('th').html('% of N Sales').css('height', rpt.rowHeaderHeight() * brand.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', brand.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);

	var trContents = [];
	for (var i = 0; i < brand.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent).css('height', rpt.rowHeaderHeight() + 'px'));
	}

	// ========================= BUILD HEADER

	var data = brand.data();

	var columnWidth = 130;
	var totalColumnWidth = 0;
	var pnlTotalSum = 0;
	var dataFlat = [];

	var countWidthThenPush = function countWidthThenPush(thheader, each, key) {
		var currentColumnWidth = each._id.length * 10;
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
		var thheader1 = toolkit.newEl('th').html(lvl1._id).attr('colspan', lvl1.count).addClass('align-center').css('border-top', 'none').appendTo(trContents[0]);

		if (brand.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id]);

			totalColumnWidth += percentageWidth;
			var thheader1p = toolkit.newEl('th').html('% of N Sales').width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);

			return;
		}
		thheader1.attr('colspan', lvl1.count * 2);

		lvl1.subs.forEach(function (lvl2, j) {
			var thheader2 = toolkit.newEl('th').html(lvl2._id).addClass('align-center').appendTo(trContents[1]);

			if (brand.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);

				totalColumnWidth += percentageWidth;
				var _thheader1p = toolkit.newEl('th').html('% of N Sales').width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').appendTo(trContents[1]);

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
			percentage = toolkit.number(percentage);

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100;
			} else if (d._id != netSalesPLCode) {
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
			brand.clickExpand(trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + ' %').addClass('align-right').appendTo(trHeader);

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e, f) {
			var key = e.key;
			var value = kendo.toString(d[key], 'n0');
			var percentage = kendo.toString(d[key + ' %'], 'n2') + ' %';

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			var cellPercentage = toolkit.newEl('td').html(percentage).addClass('align-right').appendTo(trContent);

			$([cell, cellPercentage]).on('click', function () {
				brand.renderDetail(d.PLCode, e.breakdowns);
			});
		});

		var boolStatus = false;
		trContent.find('td').each(function (a, e) {
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

	// ========================= CONFIGURE THE HIRARCHY
	rpt.buildGridLevels(rows);
};

brand.breakdownChannel = ko.observableArray([]);
brand.breakdownValueAll = { _id: 'All', Name: 'All' };
brand.optionBreakdownChannel = ko.computed(function () {
	var branches = rpt.masterData.Channel().map(function (d) {
		return { _id: d._id, Name: d.Name };
	});
	return [brand.breakdownValueAll].concat(branches);
}, rpt.masterData.Channel);
brand.changeBreakdownChannel = function () {
	var all = brand.breakdownValueAll;
	setTimeout(function () {
		var condA1 = brand.breakdownChannel().length == 2;
		var condA2 = brand.breakdownChannel().indexOf(all._id) == 0;
		if (condA1 && condA2) {
			brand.breakdownChannel.remove(all._id);
			return;
		}

		var condB1 = brand.breakdownChannel().length > 1;
		var condB2 = brand.breakdownChannel().reverse()[0] == all._id;
		if (condB1 && condB2) {
			brand.breakdownChannel([all._id]);
			return;
		}

		var condC1 = brand.breakdownChannel().length == 0;
		if (condC1) {
			brand.breakdownChannel([all._id]);
		}
	}, 100);
};

brand.breakdownBrand = ko.observableArray([]);
brand.optionBreakdownBrand = ko.computed(function () {
	var branches = rpt.masterData.Brand().map(function (d) {
		return { _id: d.Name, Name: d.Name };
	});
	return [brand.breakdownValueAll].concat(branches);
}, rpt.masterData.Brand);
brand.changeBreakdownBrand = function () {
	var all = brand.breakdownValueAll;
	setTimeout(function () {
		var condA1 = brand.breakdownBrand().length == 2;
		var condA2 = brand.breakdownBrand().indexOf(all._id) == 0;
		if (condA1 && condA2) {
			brand.breakdownBrand.remove(all._id);
			return;
		}

		var condB1 = brand.breakdownBrand().length > 1;
		var condB2 = brand.breakdownBrand().reverse()[0] == all._id;
		if (condB1 && condB2) {
			brand.breakdownBrand([all._id]);
			return;
		}

		var condC1 = brand.breakdownBrand().length == 0;
		if (condC1) {
			brand.breakdownBrand([all._id]);
		}
	}, 100);
};

vm.currentMenu('Analysis');
vm.currentTitle('Brand Analysis');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: 'Brand Analysis', href: '#' }]);

rpt.refresh = function () {
	brand.changeBreakdownChannel();
	brand.changeBreakdownBrand();
	setTimeout(function () {
		brand.breakdownChannel(['All']);
		brand.breakdownBrand(['All']);
		brand.refresh();
	}, 200);
};

$(function () {
	rpt.refresh();
	rpt.showExport(true);
});