'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

viewModel.sga = {};
var sga = viewModel.sga;(function () {
	// ========== PARSE ======
	sga.getAlphaNumeric = function (what) {
		return what.replace(/\W/g, '');
	};

	sga.constructData = function (raw) {
		sga.data([]);

		var op1 = _.groupBy(raw, function (d) {
			return [d.AccountDescription, d.AccountGroup].join('|');
		});
		var op2 = _.map(op1, function (v, k) {
			return {
				_id: sga.getAlphaNumeric(k),
				PLHeader1: v[0].AccountGroup,
				PLHeader2: v[0].AccountGroup,
				PLHeader3: v[0].AccountDescription
			};
		});

		var oq1 = _.groupBy(raw, function (d) {
			return d.AccountGroup;
		});
		var oq2 = _.map(oq1, function (v, k) {
			return {
				_id: sga.getAlphaNumeric(k),
				PLHeader1: v[0].AccountGroup,
				PLHeader2: v[0].AccountGroup,
				PLHeader3: v[0].AccountGroup
			};
		});
		rpt.plmodels(op2.concat(oq2));

		// let oq1 = _.groupBy(raw, (d) => d.AccountDescription)
		// let oq2 = _.map(oq1, (v, k) => ({
		// 	_id: sga.getAlphaNumeric(k),
		// 	PLHeader1: v[0].AccountDescription,
		// 	PLHeader2: v[0].AccountDescription,
		// 	PLHeader3: v[0].AccountDescription,
		// }))
		// rpt.plmodels(oq2)

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

			var plID = sga.getAlphaNumeric([d.AccountDescription, d.AccountGroup].join('|'));
			var plmodel = rpt.plmodels().find(function (e) {
				return e._id == plID;
			});
			if (o.hasOwnProperty(plmodel._id)) {
				o[plmodel._id] += d.Amount;
			} else {
				o[plmodel._id] = d.Amount;
			}

			var plIDHeader = sga.getAlphaNumeric(d.AccountGroup);
			var plmodelHeader = rpt.plmodels().find(function (e) {
				return e._id == plIDHeader;
			});
			if (o.hasOwnProperty(plmodelHeader._id)) {
				o[plmodelHeader._id] += d.Amount;
			} else {
				o[plmodelHeader._id] = d.Amount;
			}

			// let plID = sga.getAlphaNumeric(d.AccountDescription)
			// let plmodel = rpt.plmodels().find((e) => e._id == plID)
			// if (o.hasOwnProperty(plmodel._id)) {
			// 	o[plmodel._id] += d.Amount
			// } else {
			// 	o[plmodel._id] = d.Amount
			// }
		});
		sga.data(rawData);
		console.log('rawData', rawData);
	};

	// ==========

	sga.contentIsLoading = ko.observable(false);
	sga.breakdownNote = ko.observable('');
	sga.filterbylv1 = [{ id: "BranchName", title: "Branch Level 1" }, { id: "BranchLvl2", title: "Branch Level 2" }, { id: "BranchGroup", title: "Branch Group" }];
	sga.filterbylv2 = [{ id: "BranchLvl2", title: "Branch Level 2" }, { id: "BranchGroup", title: "Branch Group" }];

	sga.breakdownBy = ko.observable('BranchName');
	sga.filterBy = ko.observable('BranchName');
	sga.breakdownValue = ko.observableArray([]);
	sga.breakdownByFiscalYear = ko.observable('date.fiscal');

	sga.data = ko.observableArray([]);
	sga.fiscalYear = ko.observable(rpt.value.FiscalYear());
	sga.level = ko.observable(1);

	sga.filterBranch = ko.observableArray([]);
	sga.filterBranchLvl2 = ko.observableArray([]);
	sga.filterBranchGroup = ko.observableArray([]);
	sga.filterCostGroup = ko.observableArray([]);

	sga.optionBranchLvl2 = ko.observableArray([]);
	sga.optionFilterCostGroups = ko.observableArray([]);
	sga.putNetSalesPercentage = ko.observable(true);
	sga.title = ko.observable('G&A by Branch Level 1');

	rpt.fillFilterCostGroup = function () {
		toolkit.ajaxPost(viewModel.appName + "report/getdatafunction", {}, function (res) {
			sga.optionFilterCostGroups(res.data);
			sga.optionFilterCostGroups(_.orderBy(res.data, function (d) {
				return d.Name;
			}));
		});
	};

	rpt.fillFilterBranchLvl2 = function () {
		toolkit.ajaxPost(viewModel.appName + "report/getdatamasterbranchlvl2", {}, function (res) {
			sga.optionBranchLvl2(res.data);
			sga.optionBranchLvl2(_.orderBy(res.data, function (d) {
				return d.Name;
			}));
		});
	};

	sga.selectfilter = function () {
		sga.filterBranch([]);
		sga.filterBranchLvl2([]);
		sga.filterBranchGroup([]);
	};

	sga.exportExcel = function () {
		rpt.export('#sga', 'G&A Analysis - ' + sga.title(), 'header-content');
	};

	sga.changeAndRefresh = function (what, title) {
		if ($('.panel-filter').is(':visible')) {
			rpt.toggleFilter();
		}

		sga.putNetSalesPercentage(true);
		if (what == 'CostGroup') {
			sga.putNetSalesPercentage(false);
		}

		sga.title(title);

		sga.breakdownBy(what);
		sga.filterBy(what);
		sga.refresh();
	};

	sga.resetAllFilters = function () {
		sga.filterBranch([]);
		sga.filterBranchLvl2([]);
		sga.filterBranchGroup([]);
		sga.filterCostGroup([]);
		au.breakdownBranchGroup([]);
		yoy.breakdownValue([]);
		yoy.changeBreakdownBy();
	};

	sga.refresh = function () {
		var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

		var param = {};
		param.year = parseInt(sga.fiscalYear().split('-')[0], 10);
		param.groups = [sga.breakdownBy()];

		if (sga.filterBranch().length > 0) {
			param.branchnames = sga.filterBranch();
		}
		if (sga.filterBranchLvl2().length > 0) {
			param.branchlvl2 = sga.filterBranchLvl2();
		}
		if (sga.filterBranchGroup().length > 0) {
			param.branchgroups = sga.filterBranchGroup();
		}
		if (sga.filterCostGroup().length > 0) {
			param.costgroups = sga.filterCostGroup();
		}

		$('.breakdown-view:not(#sga)').empty();
		sga.contentIsLoading(true);

		var fetch = function fetch() {
			toolkit.ajaxPost(viewModel.appName + "report/getdatasga", param, function (res) {
				if (res.Status == "NOK") {
					setTimeout(function () {
						fetch();
					}, 1000 * 5);
					return;
				}

				sga.constructData(res.data);
				sga.data(sga.buildStructure(sga.data()));
				sga.emptyGrid();

				var callback = function callback() {
					sga.contentIsLoading(false);
					sga.render();
					rpt.prepareEvents();
				};

				if (sga.putNetSalesPercentage()) {
					var _ret = function () {
						var groups = [];
						var groupBy = '';
						var groupByForInjectingNetSales = '';
						switch (sga.breakdownBy()) {
							case 'BranchName':
								groupBy = 'customer.branchname';
								groupByForInjectingNetSales = 'customer.branchname';
								groups.push('customer.branchid');
								if (sga.filterBy() == 'BranchLvl2') groups.push('customer.branchlvl2');else if (sga.filterBy() == 'BranchGroup') groups.push('customer.branchgroup');
								break;
							case 'BranchLvl2':
								groupBy = 'customer.branchlvl2';
								groupByForInjectingNetSales = 'customer.branchname';
								groups.push('customer.branchid');
								groups.push('customer.branchname');
								if (sga.filterBy() == 'BranchGroup') groups.push('customer.branchgroup');
								break;
							case 'BranchGroup':
								groupBy = 'customer.branchgroup';
								groupByForInjectingNetSales = 'customer.branchgroup';
								break;
						}

						groups.push(groupBy);

						var param2 = {};
						param2.pls = [];
						param2.aggr = 'sum';
						param2.filters = rpt.getFilterValue(false, sga.fiscalYear);
						param2.groups = rpt.parseGroups(groups);

						if (sga.filterBranch().length > 0) {
							param2.filters.push({
								Field: 'customer.branchname',
								Op: '$in',
								Value: sga.filterBranch()
							});
						}
						if (sga.filterBranchGroup().length > 0) {
							param2.filters.push({
								Field: 'customer.branchgroup',
								Op: '$in',
								Value: sga.filterBranchGroup()
							});
						}

						toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param2, function (res2) {
							rpt.plmodels([{
								PLHeader1: 'Net Sales',
								PLHeader2: 'Net Sales',
								PLHeader3: 'Net Sales',
								_id: 'PL8A'
							}].concat(rpt.plmodels()));

							sga.data().forEach(function (d) {
								d.PL8A = 0;

								var key = '_id_' + toolkit.replace(groupByForInjectingNetSales, '.', '_');
								var target = res2.Data.Data.filter(function (e) {
									return e._id[key] == d._id;
								});
								if (target.length == 0) {
									return;
								}

								d.PL8A = toolkit.sum(target, function (k) {
									return k.PL8A;
								});
							});

							callback();
						}, function () {
							callback();
						});

						return {
							v: void 0
						};
					}();

					if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
				}

				callback();
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

		if (sga.putNetSalesPercentage()) {
			toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).css('height', rpt.rowHeaderHeight() * sga.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', sga.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);
		}

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
			var thheader1 = toolkit.newEl('th').html(lvl1._id.replace(/\ /g, '&nbsp;')).attr('colspan', lvl1.count).addClass('align-center').css('border-top', 'none').appendTo(trContents[0]);

			if (sga.level() == 1) {
				countWidthThenPush(thheader1, lvl1, [lvl1._id]);

				if (sga.putNetSalesPercentage()) {
					totalColumnWidth += percentageWidth;
					var thheader1p = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);
				}

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth;
					toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);
				}

				return;
			}
			thheader1.attr('colspan', lvl1.count * 2);

			lvl1.subs.forEach(function (lvl2, j) {
				var thheader2 = toolkit.newEl('th').html(lvl2._id).addClass('align-center').appendTo(trContents[1]);

				if (sga.level() == 2) {
					countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);

					totalColumnWidth += percentageWidth;
					var _thheader1p = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').appendTo(trContents[1]);

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
			dataFlat.forEach(function (e) {
				var breakdown = e.key;
				var percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100;
				var percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100;

				if (d._id != netSalesPLCode) {
					percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100;
				}

				if (percentage < 0) percentage = percentage * -1;

				row[breakdown + ' %'] = percentage;
				row[breakdown + ' %t'] = percentageOfTotal;
			});

			rows.push(row);
		});

		console.log("rows", rows);

		if (sga.putNetSalesPercentage()) {
			(function () {
				var TotalNetSales = _.find(rows, function (r) {
					return r.PLCode == netSalesPLCode;
				}).PNLTotal;
				rows.forEach(function (d, e) {
					var TotalPercentage = d.PNLTotal / TotalNetSales * 100;

					if (TotalPercentage < 0) TotalPercentage = TotalPercentage * -1;
					rows[e].Percentage = toolkit.number(TotalPercentage);
				});
			})();
		}

		// ========================= PLOT DATA

		_.orderBy(rows, function (d) {
			if (d.PLCode == netSalesPLCode) {
				return -10000000000000;
			}

			return d.PNLTotal;
		}, 'asc').forEach(function (d, i) {
			// rows.forEach((d, i) => {
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

			if (sga.putNetSalesPercentage()) {
				toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trHeader);
			}

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

				if (sga.putNetSalesPercentage()) {
					toolkit.newEl('td').html(percentage).addClass('align-right').appendTo(trContent);
				}

				if (rpt.showPercentOfTotal()) {
					toolkit.newEl('td').html(percentageOfTotal).addClass('align-right').appendTo(trContent);
				}
			});

			rpt.putStatusVal(trHeader, trContent);
		});

		// ======= TOTAL

		var keys = _.map(_.groupBy(rpt.plmodels(), function (d) {
			return d.PLHeader1;
		}), function (v, k) {
			return k;
		});
		var rowsForTotal = rows.filter(function (d) {
			return keys.indexOf(d.PNL) > -1 && d.PLCode !== 'PL8A';
		});

		var trFooterLeft = toolkit.newEl('tr').addClass('footerTotal').attr('idheaderpl', 'Total').attr('data-row', 'row-' + rows.length).css('height', rpt.rowContentHeight() + 'px').appendTo(tableHeader);

		toolkit.newEl('td').html('<i></i> Total G&A').appendTo(trFooterLeft);

		var pnlTotal = toolkit.sum(rowsForTotal, function (d) {
			return d.PNLTotal;
		});
		var netSalesTotal = toolkit.sum(sga.data(), function (d) {
			return d.PL8A;
		});
		toolkit.newEl('td').html(kendo.toString(pnlTotal, 'n0')).addClass('align-right').appendTo(trFooterLeft);

		if (sga.putNetSalesPercentage()) {
			toolkit.newEl('td').html(kendo.toString(pnlTotal / netSalesTotal * 100, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trFooterLeft);
		}

		var trFooterRight = toolkit.newEl('tr').addClass('footerTotal').attr('idpl', 'Total').attr('data-row', 'row-' + rows.length).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e, f) {
			var netSales = 0;
			var columnData = sga.data().find(function (d) {
				return d._id == e._id;
			});
			if (toolkit.isDefined(columnData)) {
				netSales = columnData.PL8A;
			}

			var value = toolkit.sum(rowsForTotal, function (d) {
				return d[e.key];
			});

			if ($.trim(value) == '') {
				value = 0;
			}

			var percentage = toolkit.number(value / netSales) * 100;
			var percentageOfTotal = toolkit.number(value / pnlTotal) * 100;

			toolkit.newEl('td').html(kendo.toString(value, 'n0')).addClass('align-right').appendTo(trFooterRight);

			if (sga.putNetSalesPercentage()) {
				toolkit.newEl('td').html(kendo.toString(percentage, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trFooterRight);
			}

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td').html(kendo.toString(percentageOfTotal, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trFooterRight);
			}
		});

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows);
	};
})();

viewModel.allocated = {};
var au = viewModel.allocated;(function () {
	au.optionDimensions = ko.observableArray([{ field: 'customer.branchname', name: 'Branch Level 1' }, { field: 'customer.branchlvl2', name: 'Branch Level 2' }].concat(rpt.optionDimensions().splice(1)));
	au.contentIsLoading = ko.observable(false);
	au.breakdownNote = ko.observable('');

	au.breakdownBy = ko.observable('customer.channelname');
	au.breakdownByBackup = ko.observable(au.breakdownBy());
	au.breakdownSGA = ko.observable('sgaalloc');
	au.breakdownByFiscalYear = ko.observable('date.fiscal');
	au.breakdownBranchGroup = ko.observableArray([]);

	au.data = ko.observableArray([]);
	au.fiscalYear = ko.observable(rpt.value.FiscalYear());
	au.level = ko.observable(1);

	au.isUseBreakdownBy = ko.observable(false);
	au.changeBreakdownBy = function (d) {
		setTimeout(function () {
			au.breakdownByBackup(au.breakdownBy());
		});
	};

	au.changeTo = function (d) {
		if (d == 'only-channel') {
			au.isUseBreakdownBy(false);
			au.breakdownBy('customer.channelname');
			return;
		}

		au.isUseBreakdownBy(true);
		au.breakdownBy(au.breakdownByBackup());
	};

	au.refresh = function () {
		var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

		var param = {};
		param.pls = [];
		param.groups = rpt.parseGroups([au.breakdownBy()]);
		param.aggr = 'sum';
		param.filters = rpt.getFilterValue(false, au.fiscalYear);

		var breakdownBranchGroup = au.breakdownBranchGroup().filter(function (d) {
			return d != 'All';
		});
		if (breakdownBranchGroup.length > 0) {
			param.filters.push({
				Field: 'customer.branchgroup',
				Op: '$in',
				Value: au.breakdownBranchGroup()
			});
		}

		var fetch = function fetch() {
			toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
				if (res.Status == "NOK") {
					setTimeout(function () {
						fetch();
					}, 1000 * 5);
					return;
				}

				if (rpt.isEmptyData(res)) {
					au.contentIsLoading(false);
					return;
				}

				var date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss");
				au.breakdownNote('Last refreshed on: ' + date);

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels);
				au.data(au.buildStructure(res.Data.Data));
				rpt.plmodels(au.buildPLModel(res.Data.PLModels));
				au.emptyGrid();
				au.contentIsLoading(false);
				au.render();
				rpt.prepareEvents();

				$('.headerPL94A_Direct,.headerPL94A_Allocated').trigger('click');
			}, function () {
				au.emptyGrid();
				au.contentIsLoading(false);
			}, {
				cache: useCache == true ? 'breakdown chart' : false
			});
		};

		$('.breakdown-view:not(#au)').empty();
		au.contentIsLoading(true);
		fetch();
	};

	au.buildPLModel = function (plmodels) {
		return plmodels.filter(function (d) {
			if (d._id.indexOf('PL94A') > -1) return true;
			if (d._id.indexOf('PL33') > -1) return true;
			if (d._id.indexOf('PL34') > -1) return true;
			if (d._id.indexOf('PL35') > -1) return true;
			if (d._id.indexOf('PL8A') > -1) return true;

			return false;
		});
	};

	au.clickExpand = function (e) {
		var right = $(e).find('i.fa-chevron-right').length,
		    down = 0;
		if (e.attr('idheaderpl') == 'PL0') down = $(e).find('i.fa-chevron-up').length;else down = $(e).find('i.fa-chevron-down').length;
		if (right > 0) {
			if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
				$('.pivot-pnl .table-header').css('width', 480);
				$('.pivot-pnl .table-content').css('margin-left', 480);
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

	au.emptyGrid = function () {
		$('#au').replaceWith('<div class="breakdown-view ez" id="au"></div>');
	};

	au.buildStructure = function (data) {
		var groupThenMap = function groupThenMap(data, group) {
			var op1 = _.groupBy(data, function (d) {
				return group(d);
			});
			var op2 = _.map(op1, function (v, k) {
				var key = { _id: k, subs: v };
				var sample = v[0];

				var _loop2 = function _loop2(prop) {
					if (sample.hasOwnProperty(prop) && prop != '_id') {
						key[prop] = toolkit.sum(v, function (d) {
							return d[prop];
						});
					}
				};

				for (var prop in sample) {
					_loop2(prop);
				}

				return key;
			});

			return op2;
		};

		var parsed = groupThenMap(data, function (d) {
			return d._id['_id_' + toolkit.replace(au.breakdownBy(), '.', '_')];
		}).map(function (d) {
			d.breakdowns = d.subs[0]._id;
			d.count = 1;

			return d;
		});

		au.level(1);
		var newParsed = _.orderBy(parsed, function (d) {
			return d.PL8A;
		}, 'desc');
		return newParsed;
	};

	au.render = function () {
		if (au.data().length == 0) {
			$('#au').html('No data found.');
			return;
		}

		// ========================= TABLE STRUCTURE

		var percentageWidth = 100;

		var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo($('#au'));

		var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

		var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

		var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

		var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

		var trHeader = toolkit.newEl('tr').appendTo(tableHeader);

		toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() * au.level() + 'px').attr('data-rowspan', au.level()).css('vertical-align', 'middle').addClass('cell-percentage-header').appendTo(trHeader);

		toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() * au.level() + 'px').attr('data-rowspan', au.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

		toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).css('height', rpt.rowHeaderHeight() * au.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', au.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);

		var trContents = [];
		for (var i = 0; i < au.level(); i++) {
			trContents.push(toolkit.newEl('tr').appendTo(tableContent).css('height', rpt.rowHeaderHeight() + 'px'));
		}

		// ========================= BUILD HEADER

		var data = au.data();

		var columnWidth = 130;
		var totalColumnWidth = 0;
		var pnlTotalSum = 0;
		var dataFlat = [];

		var countWidthThenPush = function countWidthThenPush(thheader, each, key) {
			var currentColumnWidth = each._id.length * (au.breakdownBy() == 'customer.channelname' ? 7 : 10);
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

			if (au.level() == 1) {
				countWidthThenPush(thheader1, lvl1, [lvl1._id]);

				totalColumnWidth += percentageWidth;
				var thheader1p = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth;
					var _thheader1p2 = toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);
				}

				return;
			}
			thheader1.attr('colspan', lvl1.count * (rpt.showPercentOfTotal() ? 3 : 2));

			lvl1.subs.forEach(function (lvl2, j) {
				var thheader2 = toolkit.newEl('th').html(lvl2._id.replace(/\ /g, '&nbsp;')).addClass('align-center').appendTo(trContents[1]);

				if (au.level() == 2) {
					countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);

					totalColumnWidth += percentageWidth;
					var _thheader1p3 = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').appendTo(trContents[1]);

					if (rpt.showPercentOfTotal()) {
						totalColumnWidth += percentageWidth;
						toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[1]);
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
			// grossSalesRow[breakdown] = e[grossSalesPLCode]
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

				/** if (d._id == discountActivityPLCode) {
    	percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100
    } else */if (d._id != netSalesPLCode) {
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
		// let TotalGrossSales = _.find(rows, (r) => { return r.PLCode == grossSalesPLCode }).PNLTotal
		rows.forEach(function (d, e) {
			var TotalPercentage = d.PNLTotal / TotalNetSales * 100;
			// if (d.PLCode == discountActivityPLCode) {
			// 	TotalPercentage = (d.PNLTotal / TotalGrossSales) * 100
			// }

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
				au.clickExpand(trHeader);
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
					au.renderDetail(d.PLCode, e.breakdowns);
				});
			});

			rpt.putStatusVal(trHeader, trContent);
		});

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows);
	};
})();

viewModel.yoy = {};
var yoy = viewModel.yoy;(function () {
	yoy.optionDimensions = ko.observableArray([{ field: 'BranchName', name: 'Branch Level 1' }, { field: 'BranchLvl2', name: 'Branch Level 2' }, { field: 'BranchGroup', name: 'Branch Group' }, { field: 'CostGroup', name: 'Function' }]);
	yoy.contentIsLoading = ko.observable(false);
	yoy.breakdownBy = ko.observable('BranchName');
	yoy.optionBreakdownValues = ko.observableArray([]);
	yoy.breakdownValue = ko.observableArray([]);
	yoy.data = ko.observableArray([]);
	yoy.level = ko.observable(1);

	yoy.changeBreakdownBy = function () {
		toolkit.runAfter(function () {
			switch (yoy.breakdownBy()) {
				case 'BranchName':
					yoy.optionBreakdownValues(rpt.masterData.Branch());break;
				case 'BranchLvl2':
					yoy.optionBreakdownValues(sga.optionBranchLvl2());break;
				case 'BranchGroup':
					yoy.optionBreakdownValues(rpt.masterData.BranchGroup());break;
				case 'CostGroup':
					yoy.optionBreakdownValues(sga.optionFilterCostGroups());break;
			}

			yoy.breakdownValue([]);
		}, 300);
	};

	yoy.refresh = function () {
		var param = {};
		param.groups = [yoy.breakdownBy()];
		yoy.contentIsLoading(true);

		if (yoy.breakdownValue().length > 0) {
			switch (yoy.breakdownBy()) {
				case 'BranchName':
					param.branchnames = yoy.breakdownValue();break;
				case 'BranchLvl2':
					param.branchlvl2 = yoy.breakdownValue();break;
				case 'BranchGroup':
					param.branchgroups = yoy.breakdownValue();break;
				case 'CostGroup':
					param.costgroups = yoy.breakdownValue();break;
			}
		}

		var fetch = function fetch() {
			toolkit.ajaxPost(viewModel.appName + "report/getdatasga", param, function (res) {
				yoy.data(res.data);
				yoy.contentIsLoading(false);
				yoy.render();
			}, function () {
				yoy.contentIsLoading(false);
			});
		};

		$('.breakdown-view:not(#yo)').empty();
		fetch();
	};

	yoy.render = function () {
		var breakdownBy = yoy.breakdownBy();

		var op1 = _.groupBy(yoy.data(), function (d) {
			return d[breakdownBy];
		});
		var op5 = _.map(op1, function (v, k) {
			return k;
		});
		var columnsKey = _.orderBy(op5);

		var op2 = _.groupBy(yoy.data(), function (d) {
			return d.AccountGroup;
		});
		var op3 = _.map(op2, function (v, k) {
			var o = {};
			o.key = k;

			columnsKey.forEach(function (d, i) {
				o['col' + i] = {};var k = o['col' + i];
				k.key = d;
				k.year2014 = toolkit.sum(_.filter(v, function (e) {
					return e.Year == 2014 && e[breakdownBy] == d;
				}), function (e) {
					return e.Amount;
				});
				k.year2015 = toolkit.sum(_.filter(v, function (e) {
					return e.Year == 2015 && e[breakdownBy] == d;
				}), function (e) {
					return e.Amount;
				});
				k.growth = toolkit.number((o['col' + i].year2015 - o['col' + i].year2014) / o['col' + i].year2014) * 100;
			});

			return o;
		});
		var mappedData = _.orderBy(op3, function (d) {
			return d.key;
		});

		var firstColumnTitle = yoy.breakdownBy();
		var breakdownTitleRow = yoy.optionDimensions().find(function (d) {
			return d.field == firstColumnTitle;
		});
		if (toolkit.isDefined(breakdownTitleRow)) {
			firstColumnTitle = breakdownTitleRow.name;
		}

		var columns = [{
			field: 'key',
			title: 'P&L',
			width: 200,
			locked: true,
			headerAttributes: { style: 'vertical-align: middle; text-align: center; font-weight: bold; border-right: 1px solid #ffffff;' }
		}].concat(columnsKey.map(function (d, i) {
			var o = {};
			o.title = d;
			o.headerAttributes = { style: 'text-align: center; font-weight: bold; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' };
			o.columns = [{
				field: 'col' + i + '.year2015',
				title: 'FY 2015-2016',
				width: 100,
				format: '{0:n0}',
				attributes: { class: 'align-right' },
				headerAttributes: { style: 'text-align: center; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' }
			}, {
				field: 'col' + i + '.year2014',
				title: 'FY 2014-2015',
				width: 100,
				format: '{0:n0}',
				attributes: { class: 'align-right' },
				headerAttributes: { style: 'text-align: center; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' }
			}, {
				field: 'col' + i + '.growth',
				title: '% Growth',
				width: 80,
				format: '{0:n2} %',
				attributes: { class: 'align-right' },
				headerAttributes: { style: 'text-align: center; border-right: 1px solid #ffffff; border-bottom: 1px solid #ffffff;' }
			}];
			return o;
		}));

		var config = {
			dataSource: {
				data: mappedData
			},
			columns: columns
		};

		$('#yoy').replaceWith('<div class="breakdown-view ez" id="yoy"></div>');
		$('#yoy').kendoGrid(config);
	};
})();

viewModel.elimination = {};
var el = viewModel.elimination;(function () {
	// ========== PARSE ======
	el.getAlphaNumeric = function (what) {
		return what.replace(/\W/g, '');
	};

	el.constructData = function (raw) {
		el.data([]);

		var op1 = _.groupBy(raw, function (d) {
			return [d.AccountDescription, d.AccountGroup].join('|');
		});
		var op2 = _.map(op1, function (v, k) {
			return {
				_id: el.getAlphaNumeric(k),
				PLHeader1: v[0].AccountGroup,
				PLHeader2: v[0].AccountGroup,
				PLHeader3: v[0].AccountDescription
			};
		});

		var oq1 = _.groupBy(raw, function (d) {
			return d.AccountGroup;
		});
		var oq2 = _.map(oq1, function (v, k) {
			return {
				_id: el.getAlphaNumeric(k),
				PLHeader1: v[0].AccountGroup,
				PLHeader2: v[0].AccountGroup,
				PLHeader3: v[0].AccountGroup
			};
		});
		rpt.plmodels(op2.concat(oq2));

		// let oq1 = _.groupBy(raw, (d) => d.AccountDescription)
		// let oq2 = _.map(oq1, (v, k) => ({
		// 	_id: el.getAlphaNumeric(k),
		// 	PLHeader1: v[0].AccountDescription,
		// 	PLHeader2: v[0].AccountDescription,
		// 	PLHeader3: v[0].AccountDescription,
		// }))
		// rpt.plmodels(oq2)

		var key = el.breakdownBy();
		var cache = {};
		var rawData = [];
		raw.forEach(function (d) {
			var breakdown = d[key];
			var o = cache[breakdown];
			if (typeof o === 'undefined') {
				o = {};
				o._id = {};
				o._id['_id_' + key] = breakdown;
				o._id['_id_IsElimination'] = d.IsElimination;
				rawData.push(o);
			}
			cache[breakdown] = o;

			var plID = el.getAlphaNumeric([d.AccountDescription, d.AccountGroup].join('|'));
			var plmodel = rpt.plmodels().find(function (e) {
				return e._id == plID;
			});
			if (o.hasOwnProperty(plmodel._id)) {
				o[plmodel._id] += d.Amount;
			} else {
				o[plmodel._id] = d.Amount;
			}

			var plIDHeader = el.getAlphaNumeric(d.AccountGroup);
			var plmodelHeader = rpt.plmodels().find(function (e) {
				return e._id == plIDHeader;
			});
			if (o.hasOwnProperty(plmodelHeader._id)) {
				o[plmodelHeader._id] += d.Amount;
			} else {
				o[plmodelHeader._id] = d.Amount;
			}

			// let plID = el.getAlphaNumeric(d.AccountDescription)
			// let plmodel = rpt.plmodels().find((e) => e._id == plID)
			// if (o.hasOwnProperty(plmodel._id)) {
			// 	o[plmodel._id] += d.Amount
			// } else {
			// 	o[plmodel._id] = d.Amount
			// }
		});
		el.data(rawData);
		console.log('rawData', rawData);
	};

	// ==========

	el.contentIsLoading = ko.observable(false);

	el.breakdownBy = ko.observable('BranchName');
	el.filterBy = ko.observable('BranchName');
	el.filterValue = ko.observableArray([]);
	el.breakdownByFiscalYear = ko.observable('date.fiscal');

	el.optionDimensions = ko.observableArray([{ field: 'BranchName', name: 'Branch Level 1' }, { field: 'BranchLvl2', name: 'Branch Level 2' }, { field: 'BranchGroup', name: 'Branch Group' }, { field: 'CostGroup', name: 'Function' }]);
	el.optionBreakdownValues = ko.computed(function () {
		switch (el.filterBy()) {
			case 'BranchName':
				return rpt.masterData.Branch();break;
			case 'BranchLvl2':
				return sga.optionBranchLvl2();break;
			case 'BranchGroup':
				return rpt.masterData.BranchGroup();break;
			case 'CostGroup':
				return sga.optionFilterCostGroups();break;
		}
	}, el.filterBy);

	el.data = ko.observableArray([]);
	el.fiscalYear = ko.observable(rpt.value.FiscalYear());
	el.level = ko.observable(2);

	el.putNetSalesPercentage = ko.observable(true);

	el.selectfilter = function () {
		el.filterValue([]);
	};

	el.exportExcel = function () {
		rpt.export('#el', 'G&A Analysis - Elimination & Without Elimination', 'header-content');
	};

	el.changeAndRefresh = function (what, title) {
		if ($('.panel-filter').is(':visible')) {
			rpt.toggleFilter();
		}

		el.putNetSalesPercentage(true);
		if (what == 'CostGroup') {
			el.putNetSalesPercentage(false);
		}

		el.title(title);

		el.breakdownBy(what);
		el.filterBy(what);
		el.refresh();
	};

	el.refresh = function () {
		var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

		var param = {};
		param.year = parseInt(el.fiscalYear().split('-')[0], 10);
		param.groups = [el.breakdownBy(), 'IsElimination'];

		if (el.filterValue().length > 0) {
			param[el.filterBy()] = el.filterValue();
		}

		$('.breakdown-view:not(#el)').empty();
		el.contentIsLoading(true);

		var fetch = function fetch() {
			toolkit.ajaxPost(viewModel.appName + "report/getdatasga", param, function (res) {
				if (res.Status == "NOK") {
					setTimeout(function () {
						fetch();
					}, 1000 * 5);
					return;
				}

				var groupLvl1 = _.map(_.groupBy(res.data, function (e) {
					return e.AccountGroup;
				}), function (v, k) {
					return k;
				});
				var groupLvl2 = _.map(_.groupBy(res.data, function (e) {
					return e.AccountDescription;
				}), function (v, k) {
					return k;
				});

				el.constructData(res.data);
				el.data(el.buildStructure(el.data()));
				el.emptyGrid();

				var callback = function callback() {
					el.contentIsLoading(false);
					el.render();
					rpt.prepareEvents();
				};

				if (el.breakdownBy() == 'CostGroup') {
					el.putNetSalesPercentage(false);
					callback();
					return;
				}

				el.putNetSalesPercentage(true);

				if (el.putNetSalesPercentage()) {
					var _ret5 = function () {
						var groups = [];
						var groupBy = '';
						var groupByForInjectingNetSales = '';
						switch (el.breakdownBy()) {
							case 'BranchName':
								groupBy = 'customer.branchname';
								groupByForInjectingNetSales = 'customer.branchname';
								groups.push('customer.branchid');
								if (el.filterBy() == 'BranchLvl2') groups.push('customer.branchlvl2');else if (el.filterBy() == 'BranchGroup') groups.push('customer.branchgroup');
								break;
							case 'BranchLvl2':
								groupBy = 'customer.branchlvl2';
								groupByForInjectingNetSales = 'customer.branchname';
								groups.push('customer.branchid');
								groups.push('customer.branchname');
								if (el.filterBy() == 'BranchGroup') groups.push('customer.branchgroup');
								break;
							case 'BranchGroup':
								groupBy = 'customer.branchgroup';
								groupByForInjectingNetSales = 'customer.branchgroup';
								break;
						}

						groups.push(groupBy);

						var param2 = {};
						param2.pls = [];
						param2.aggr = 'sum';
						param2.filters = rpt.getFilterValue(false, el.fiscalYear);
						param2.groups = rpt.parseGroups(groups);

						if (['BranchName', 'BranchGroup'].indexOf(el.filterBy()) > -1) {
							param2.filters.push({
								Field: 'customer.branchname',
								Op: '$in',
								Value: el.filterValue()
							});
						}

						toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param2, function (res2) {
							rpt.plmodels([{
								PLHeader1: 'Net Sales',
								PLHeader2: 'Net Sales',
								PLHeader3: 'Net Sales',
								_id: 'PL8A'
							}].concat(rpt.plmodels()));

							el.data().forEach(function (d) {
								d.subs.forEach(function (e) {
									e.PL8A = 0;

									var key = '_id_' + toolkit.replace(groupByForInjectingNetSales, '.', '_');
									var target = res2.Data.Data.filter(function (f) {
										return f._id[key] == e._id;
									});
									if (target.length == 0) {
										return;
									}

									e.PL8A = toolkit.sum(target, function (k) {
										return k.PL8A;
									});
								});

								groupLvl1.forEach(function (e) {
									groupLvl2.forEach(function (f) {
										var field1 = 'PL8A';
										var field2 = f;
										var field3 = [e, f].join('');
										var fields = [field1, field2, field3];

										fields.forEach(function (h) {
											if (d.hasOwnProperty(h)) d[h] = 0;
											d[h] = toolkit.sum(d.subs, function (g) {
												return toolkit.number(g[h]);
											});
										});
									});
								});
							});

							callback();
						}, function () {
							callback();
						});

						return {
							v: void 0
						};
					}();

					if ((typeof _ret5 === 'undefined' ? 'undefined' : _typeof(_ret5)) === "object") return _ret5.v;
				}

				callback();
			}, function () {
				el.emptyGrid();
				el.contentIsLoading(false);
			});
		};

		fetch();
	};

	el.emptyGrid = function () {
		$('#el').replaceWith('<div class="breakdown-view ez" id="el"></div>');
	};

	el.buildStructure = function (data) {
		var groupThenMap = function groupThenMap(data, group) {
			var op1 = _.groupBy(data, function (d) {
				return group(d);
			});
			var op2 = _.map(op1, function (v, k) {
				var key = { _id: k, subs: v };
				var sample = v[0];

				var _loop3 = function _loop3(prop) {
					if (sample.hasOwnProperty(prop) && prop != '_id') {
						key[prop] = toolkit.sum(v, function (d) {
							return d[prop];
						});
					}
				};

				for (var prop in sample) {
					_loop3(prop);
				}

				return key;
			});

			return op2;
		};

		var parsed = groupThenMap(data, function (d) {
			return d._id._id_IsElimination ? 'Elimination' : 'Non Elimination';
		}).map(function (d) {
			var subs = groupThenMap(d.subs, function (e) {
				return e._id['_id_' + toolkit.replace(el.breakdownBy(), '.', '_')];
			}).map(function (e) {
				e.breakdowns = e.subs[0]._id;
				d.count = 1;
				return e;
			});

			d.subs = _.orderBy(subs, function (e) {
				return toolkit.number(e.SalariesAllowance);
			}, 'desc');
			d.breakdowns = d.subs[0]._id;
			d.count = d.subs.length;
			return d;
		});

		el.level(2);
		var newParsed = _.orderBy(parsed, function (d) {
			return d._id == 'Non Elimination' ? 1 : 2;
		}, 'asc');
		return parsed;
	};

	el.render = function () {
		if (el.data().length == 0) {
			$('#el').html('No data found.');
			return;
		}

		// ========================= TABLE STRUCTURE

		var container = $('#el');
		var percentageWidth = 100;

		var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo(container);

		var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

		var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

		var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

		var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

		var trHeader = toolkit.newEl('tr').appendTo(tableHeader);

		toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() * el.level() + 'px').attr('data-rowspan', el.level()).css('vertical-align', 'middle').addClass('cell-percentage-header').appendTo(trHeader);

		toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() * el.level() + 'px').attr('data-rowspan', el.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

		if (el.putNetSalesPercentage()) {
			toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).css('height', rpt.rowHeaderHeight() * el.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', el.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);
		}

		var trContents = [];
		for (var i = 0; i < el.level(); i++) {
			trContents.push(toolkit.newEl('tr').appendTo(tableContent).css('height', rpt.rowHeaderHeight() + 'px'));
		}

		// ========================= BUILD HEADER

		var data = el.data();

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
			var thheader1 = toolkit.newEl('th').html(lvl1._id.replace(/\ /g, '&nbsp;')).attr('colspan', lvl1.count).addClass('align-center').css('border-top', 'none').appendTo(trContents[0]);

			thheader1.attr('colspan', lvl1.count * (el.putNetSalesPercentage() ? 3 : 2));

			lvl1.subs.forEach(function (lvl2, j) {
				var thheader2 = toolkit.newEl('th').html(lvl2._id).addClass('align-center').appendTo(trContents[1]);

				if (el.level() == 2) {
					countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);

					if (el.putNetSalesPercentage()) {
						totalColumnWidth += percentageWidth;
						var thheader1p = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[1]);
					}

					if (rpt.showPercentOfTotal()) {
						totalColumnWidth += percentageWidth;
						toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[1]);
					}

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
			dataFlat.forEach(function (e) {
				var breakdown = e.key;
				var percentage = toolkit.number(row[breakdown] / row.PNLTotal) * 100;
				var percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100;

				if (d._id != netSalesPLCode) {
					percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100;
				}

				if (percentage < 0) percentage = percentage * -1;

				row[breakdown + ' %'] = percentage;
				row[breakdown + ' %t'] = percentageOfTotal;
			});

			rows.push(row);
		});

		console.log("rows", rows);

		if (el.putNetSalesPercentage()) {
			(function () {
				var TotalNetSales = _.find(rows, function (r) {
					return r.PLCode == netSalesPLCode;
				}).PNLTotal;
				rows.forEach(function (d, e) {
					var TotalPercentage = d.PNLTotal / TotalNetSales * 100;

					if (TotalPercentage < 0) TotalPercentage = TotalPercentage * -1;
					rows[e].Percentage = toolkit.number(TotalPercentage);
				});
			})();
		}

		// ========================= PLOT DATA

		_.orderBy(rows, function (d) {
			if (d.PLCode == netSalesPLCode) {
				return -10000000000000;
			}

			return d.PNLTotal;
		}, 'asc').forEach(function (d, i) {
			// rows.forEach((d, i) => {
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

			if (el.putNetSalesPercentage()) {
				toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trHeader);
			}

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

				if (el.putNetSalesPercentage()) {
					toolkit.newEl('td').html(percentage).addClass('align-right').appendTo(trContent);
				}

				if (rpt.showPercentOfTotal()) {
					toolkit.newEl('td').html(percentageOfTotal).addClass('align-right').appendTo(trContent);
				}
			});

			rpt.putStatusVal(trHeader, trContent);
		});

		// ======= TOTAL

		var keys = _.map(_.groupBy(rpt.plmodels(), function (d) {
			return d.PLHeader1;
		}), function (v, k) {
			return k;
		});
		var rowsForTotal = rows.filter(function (d) {
			return keys.indexOf(d.PNL) > -1 && d.PLCode !== 'PL8A';
		});

		var trFooterLeft = toolkit.newEl('tr').addClass('footerTotal').attr('idheaderpl', 'Total').attr('data-row', 'row-' + rows.length).css('height', rpt.rowContentHeight() + 'px').appendTo(tableHeader);

		toolkit.newEl('td').html('<i></i> Total G&A').appendTo(trFooterLeft);

		var pnlTotal = toolkit.sum(rowsForTotal, function (d) {
			return d.PNLTotal;
		});
		var netSalesTotal = toolkit.sum(el.data(), function (d) {
			return d.PL8A;
		});
		toolkit.newEl('td').html(kendo.toString(pnlTotal, 'n0')).addClass('align-right').appendTo(trFooterLeft);

		if (el.putNetSalesPercentage()) {
			toolkit.newEl('td').html(kendo.toString(pnlTotal / netSalesTotal * 100, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trFooterLeft);
		}

		var trFooterRight = toolkit.newEl('tr').addClass('footerTotal').attr('idpl', 'Total').attr('data-row', 'row-' + rows.length).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e, f) {
			var netSales = 0;
			var columnData = el.data().find(function (d) {
				return d._id == e._id;
			});
			if (toolkit.isDefined(columnData)) {
				netSales = columnData.PL8A;
			}

			var value = toolkit.sum(rowsForTotal, function (d) {
				return d[e.key];
			});

			if ($.trim(value) == '') {
				value = 0;
			}

			var percentage = toolkit.number(value / netSales) * 100;
			var percentageOfTotal = toolkit.number(value / pnlTotal) * 100;

			toolkit.newEl('td').html(kendo.toString(value, 'n0')).addClass('align-right').appendTo(trFooterRight);

			if (el.putNetSalesPercentage()) {
				toolkit.newEl('td').html(kendo.toString(percentage, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trFooterRight);
			}

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td').html(kendo.toString(percentageOfTotal, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trFooterRight);
			}
		});

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows);
	};
})();

vm.currentMenu('Analysis');
vm.currentTitle('&nbsp;');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'G&A Analysis', href: '#' }]);

rpt.refresh = function () {
	// sga.refresh()
	// au.refresh()
	el.refresh();
};

$(function () {
	setTimeout(function () {
		rpt.fillFilterCostGroup();
		rpt.fillFilterBranchLvl2();
	}, 300);

	rpt.refresh();
	rpt.showExport(true);
});