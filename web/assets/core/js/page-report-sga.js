'use strict';

viewModel.sga = {};
var sga = viewModel.sga;

// ========== PARSE ======

sga.sampleData = [{ function: 'Contr', account: 'SALARY BASIC', accountGroup: 'SALARY & BONUS', value: 182497000 }, { function: 'Factory', account: 'SALARY BASIC', accountGroup: 'SALARY & BONUS', value: 44948025651 }, { function: 'FAD', account: 'SALARY BASIC', accountGroup: 'SALARY & BONUS', value: 5901941886 }, { function: 'Contr', account: 'BONUS', accountGroup: 'SALARY & BONUS', value: 18687784590 }, { function: 'Factory', account: 'BONUS', accountGroup: 'SALARY & BONUS', value: 178332727 }, { function: 'FAD', account: 'BONUS', accountGroup: 'SALARY & BONUS', value: 0 }, { function: 'Contr', account: 'OUTSOURSING EXPENSES', accountGroup: 'SALARY & BONUS', value: 162518906 }, { function: 'Factory', account: 'OUTSOURSING EXPENSES', accountGroup: 'SALARY & BONUS', value: 2181389826 }, { function: 'FAD', account: 'OUTSOURSING EXPENSES', accountGroup: 'SALARY & BONUS', value: 3455862907 }, { function: 'Contr', account: 'SALARY BASIC-FOH', accountGroup: 'SALARY & BONUS', value: 14890082565 }, { function: 'Factory', account: 'SALARY BASIC-FOH', accountGroup: 'SALARY & BONUS', value: 0 }, { function: 'FAD', account: 'SALARY BASIC-FOH', accountGroup: 'SALARY & BONUS', value: 0 }, { function: 'Contr', account: 'CON ST & SP-FOH', accountGroup: 'SALARY & BONUS', value: 11855798316 }, { function: 'Factory', account: 'CON ST & SP-FOH', accountGroup: 'SALARY & BONUS', value: 0 }, { function: 'FAD', account: 'CON ST & SP-FOH', accountGroup: 'SALARY & BONUS', value: 0 }];

sga.rawData = ko.observableArray(sga.sampleData);
sga.getAlphaNumeric = function (what) {
	return what.replace(/\W/g, '');
};

sga.constructData = function (raw) {
	sga.data([]);

	// let op1 = _.groupBy(raw, (d) => [d.account, d.accountGroup].join('|'))
	// let op2 = _.map(op1, (v, k) => ({
	// 	_id: sga.getAlphaNumeric(k),
	// 	PLHeader1: v[0].accountGroup,
	// 	PLHeader2: v[0].accountGroup,
	// 	PLHeader3: v[0].account,
	// }))

	// let oq1 = _.groupBy(sga.rawData(), (d) => d.accountGroup)
	// let oq2 = _.map(oq1, (v, k) => ({
	// 	_id: sga.getAlphaNumeric(k),
	// 	PLHeader1: v[0].accountGroup,
	// 	PLHeader2: v[0].accountGroup,
	// 	PLHeader3: v[0].accountGroup,
	// }))
	// rpt.plmodels(op2.concat(oq2))

	var oq1 = _.groupBy(raw, function (d) {
		return d.AccountDescription;
	});
	var oq2 = _.map(oq1, function (v, k) {
		return {
			_id: sga.getAlphaNumeric(k),
			PLHeader1: v[0].AccountDescription,
			PLHeader2: v[0].AccountDescription,
			PLHeader3: v[0].AccountDescription
		};
	});
	rpt.plmodels(oq2);

	var key = sga.breakdownBy();
	var cache = {};
	var rawData = [];
	raw.forEach(function (d) {
		var breakdown = d[key];
		var o = cache[breakdown];
		if (typeof o === 'undefined') {
			o = {};
			o._id = {};
			o._id['_id_' + key] = breakdown;
			rawData.push(o);
		}
		cache[breakdown] = o;

		// let plID = sga.getAlphaNumeric([d.account, d.accountGroup].join('|'))
		// let plmodel = rpt.plmodels().find((e) => e._id == plID)
		// if (o.hasOwnProperty(plmodel._id)) {
		// 	o[plmodel._id] += d.value
		// } else {
		// 	o[plmodel._id] = d.value
		// }

		// let plIDHeader = sga.getAlphaNumeric(d.accountGroup)
		// let plmodelHeader = rpt.plmodels().find((e) => e._id == plIDHeader)
		// if (o.hasOwnProperty(plmodelHeader._id)) {
		// 	o[plmodelHeader._id] += d.value
		// } else {
		// 	o[plmodelHeader._id] = d.value
		// }

		var plID = sga.getAlphaNumeric(d.AccountDescription);
		var plmodel = rpt.plmodels().find(function (e) {
			return e._id == plID;
		});
		if (o.hasOwnProperty(plmodel._id)) {
			o[plmodel._id] += d.Amount;
		} else {
			o[plmodel._id] = d.Amount;
		}
	});
	sga.data(rawData);
};

// ==========

sga.contentIsLoading = ko.observable(false);
sga.breakdownNote = ko.observable('');

sga.breakdownBy = ko.observable('BranchName');
sga.breakdownValue = ko.observableArray([]);
sga.breakdownByFiscalYear = ko.observable('date.fiscal');

sga.data = ko.observableArray([]);
sga.fiscalYear = ko.observable(rpt.value.FiscalYear());
sga.level = ko.observable(1);

sga.filterBranch = ko.observableArray([]);
sga.filterCostGroup = ko.observableArray([]);

sga.optionFilterCostGroups = ko.observableArray([]);

rpt.fillFilterCostGroup = function () {
	toolkit.ajaxPost(viewModel.appName + "report/getdatafunction", {}, function (res) {
		sga.optionFilterCostGroups(_.orderBy(res.data, function (d) {
			return d.Name;
		}));
	});
};

sga.changeAndRefresh = function (what) {
	sga.filterBranch([]);
	sga.filterCostGroup([]);

	sga.breakdownBy(what);
	sga.refresh();
};

sga.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.year = parseInt(sga.fiscalYear().split('-')[0], 10);

	if (sga.filterBranch().length > 0) {
		param.branchnames = sga.filterBranch();
	}
	if (sga.filterCostGroup().length > 0) {
		param.costgroups = sga.filterCostGroup();
	}

	sga.contentIsLoading(true);

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getdatasga", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			sga.contentIsLoading(false);
			sga.constructData(res.data);
			sga.data(sga.buildStructure(sga.data()));
			sga.emptyGrid();
			sga.render();
			rpt.showExpandAll(true);
			rpt.prepareEvents();
		}, function () {
			sga.emptyGrid();
			sga.contentIsLoading(false);
		});
	};

	fetch();
};

sga.emptyGrid = function () {
	$('#sga').replaceWith('<div class="breakdown-view ez" id="sga"></div>');
};

sga.buildStructure = function (data) {
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
		return d._id['_id_' + toolkit.replace(sga.breakdownBy(), '.', '_')];
	}).map(function (d) {
		d.breakdowns = d.subs[0]._id;
		d.count = 1;

		return d;
	});

	sga.level(1);
	// let newParsed = _.orderBy(parsed, (d) => d._id, 'asc')
	return parsed;
};

sga.render = function () {
	if (sga.data().length == 0) {
		$('#sga').html('No data found.');
		return;
	}

	// ========================= TABLE STRUCTURE

	var container = $('#sga');
	var percentageWidth = 100;

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo(container);

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() * sga.level() + 'px').attr('data-rowspan', sga.level()).css('vertical-align', 'middle').addClass('cell-percentage-header').appendTo(trHeader);

	toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() * sga.level() + 'px').attr('data-rowspan', sga.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

	// toolkit.newEl('th')
	// 	.html('% of N Sales')
	// 	.css('height', `${rpt.rowHeaderHeight() * sga.level()}px`)
	// 	.css('vertical-align', 'middle')
	// 	.css('font-weight', 'normal')
	// 	.css('font-style', 'italic')
	// 	.width(percentageWidth - 20)
	// 	.attr('data-rowspan', sga.level())
	// 	.addClass('cell-percentage-header align-right')
	// 	.appendTo(trHeader)

	var trContents = [];
	for (var i = 0; i < sga.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent).css('height', rpt.rowHeaderHeight() + 'px'));
	}

	// ========================= BUILD HEADER

	var data = sga.data();

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

		if (sga.level() == 1) {
			console.log('--------', thheader1, lvl1, [lvl1._id]);
			countWidthThenPush(thheader1, lvl1, [lvl1._id]);

			// totalColumnWidth += percentageWidth
			// let thheader1p = toolkit.newEl('th')
			// 	.html('% of N Sales')
			// 	.width(percentageWidth)
			// 	.addClass('align-center')
			// 	.css('font-weight', 'normal')
			// 	.css('font-style', 'italic')
			// 	.css('border-top', 'none')
			// 	.appendTo(trContents[0])

			return;
		}
		thheader1.attr('colspan', lvl1.count * 2);

		lvl1.subs.forEach(function (lvl2, j) {
			var thheader2 = toolkit.newEl('th').html(lvl2._id).addClass('align-center').appendTo(trContents[1]);

			if (sga.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);

				totalColumnWidth += percentageWidth;
				var thheader1p = toolkit.newEl('th').html('% of N Sales').width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').appendTo(trContents[1]);

				return;
			}
			thheader2.attr('colspan', lvl2.count);
		});
	});

	tableContent.css('min-width', totalColumnWidth);

	// ========================= CONSTRUCT DATA

	var plmodels = rpt.plmodels();
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

			row.PNLTotal += toolkit.number(value);
		});
		// dataFlat.forEach((e) => {
		// 	let breakdown = e.key
		// 	let percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100;
		// 	percentage = toolkit.number(percentage)

		// 	if (d._id == discountActivityPLCode) {
		// 		percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
		// 	} else if (d._id != netSalesPLCode) {
		// 		percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
		// 	}

		// 	if (percentage < 0)
		// 		percentage = percentage * -1

		// 	row[`${breakdown} %`] = percentage
		// })

		rows.push(row);
	});

	console.log("rows", rows);

	// let TotalNetSales = _.find(rows, (r) => { return r.PLCode == netSalesPLCode }).PNLTotal
	// let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
	// rows.forEach((d, e) => {
	// 	// let TotalPercentage = (d.PNLTotal / TotalNetSales) * 100
	// 	// if (d.PLCode == discountActivityPLCode) {
	// 	// 	TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
	// 	// }

	// 	// if (TotalPercentage < 0)
	// 	// 	TotalPercentage = TotalPercentage * -1
	// 	// rows[e].Percentage = toolkit.number(TotalPercentage)
	// 	rows[e].Percentage = 0
	// })

	// ========================= PLOT DATA

	// _.orderBy(rows, (d) => d.PNL).forEach((d, i) => {
	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var PL = d.PLCode;
		PL = PL.replace(/\s+/g, '');
		var trHeader = toolkit.newEl('tr').addClass('header' + PL).attr('idheaderpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableHeader);

		trHeader.on('click', function () {
			rpt.clickExpand(container, trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		// toolkit.newEl('td')
		// 	.html(kendo.toString(d.Percentage, 'n2') + ' %')
		// 	.addClass('align-right')
		// 	.appendTo(trHeader)

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e, f) {
			var key = e.key;
			var value = kendo.toString(d[key], 'n0');
			var percentage = kendo.toString(d[key + ' %'], 'n2') + ' %';

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			// let cellPercentage = toolkit.newEl('td')
			// 	.html(percentage)
			// 	.addClass('align-right')
			// 	.appendTo(trContent)
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

vm.currentMenu('Analysis');
vm.currentTitle('&nbsp;');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'SG&A Analysis', href: '#' }]);

rpt.refresh = function () {
	sga.refresh();
};

$(function () {
	rpt.fillFilterCostGroup();
	rpt.refresh();
	rpt.showExport(true);
});