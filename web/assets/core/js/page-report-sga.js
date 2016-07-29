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

	sga.breakdownBy = ko.observable('BranchName');
	sga.breakdownValue = ko.observableArray([]);
	sga.breakdownByFiscalYear = ko.observable('date.fiscal');

	sga.data = ko.observableArray([]);
	sga.fiscalYear = ko.observable(rpt.value.FiscalYear());
	sga.level = ko.observable(1);

	sga.filterBranch = ko.observableArray([]);
	sga.filterBranchGroup = ko.observableArray([]);
	sga.filterCostGroup = ko.observableArray([]);

	sga.optionFilterCostGroups = ko.observableArray([]);
	sga.putNetSalesPercentage = ko.observable(true);

	rpt.fillFilterCostGroup = function () {
		toolkit.ajaxPost(viewModel.appName + "report/getdatafunction", {}, function (res) {
			sga.optionFilterCostGroups(_.orderBy(res.data, function (d) {
				return d.Name;
			}));
		});
	};

	sga.changeAndRefresh = function (what) {
		sga.filterBranch([]);
		sga.filterBranchGroup([]);
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
		if (sga.filterBranchGroup().length > 0) {
			param.branchgroups = sga.filterBranchGroup();
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

				sga.constructData(res.data);
				sga.data(sga.buildStructure(sga.data()));
				sga.emptyGrid();

				var callback = function callback() {
					sga.contentIsLoading(false);
					sga.render();
					rpt.prepareEvents();

					$('#au [idheaderpl="PL94A"],[idheaderpl="PL94A_allocated"]').find('.fa').trigger('click');
				};

				if (sga.putNetSalesPercentage()) {
					var _ret = function () {
						var groupBy = '';
						switch (sga.breakdownBy()) {
							case 'BranchName':
								groupBy = 'customer.branchname';
								break;
							case 'BranchGroup':
								groupBy = 'customer.branchgroup';
								break;
						}

						var param2 = {};
						param2.pls = [];
						param2.aggr = 'sum';
						param2.filters = rpt.getFilterValue(false, sga.fiscalYear);
						param2.groups = rpt.parseGroups([groupBy]);
						toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param2, function (res2) {

							rpt.plmodels([{
								PLHeader1: 'Net Sales',
								PLHeader2: 'Net Sales',
								PLHeader3: 'Net Sales',
								_id: 'PL8A'
							}].concat(rpt.plmodels()));

							sga.data().forEach(function (d) {
								d.PL8A = 0;

								var key = '_id_' + toolkit.replace(groupBy, '.', '_');
								var target = res2.Data.Data.find(function (e) {
									return e._id[key] == d._id;
								});
								if (toolkit.isUndefined(target)) {
									console.log('--- not found', d._id);
									return;
								}

								d.PL8A = target.PL8A;
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
			toolkit.newEl('th').html('% of N Sales').css('height', rpt.rowHeaderHeight() * sga.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', sga.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);
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
			var thheader1 = toolkit.newEl('th').html(lvl1._id).attr('colspan', lvl1.count).addClass('align-center').css('border-top', 'none').appendTo(trContents[0]);

			if (sga.level() == 1) {
				countWidthThenPush(thheader1, lvl1, [lvl1._id]);

				if (sga.putNetSalesPercentage()) {
					totalColumnWidth += percentageWidth;
					var thheader1p = toolkit.newEl('th').html('% of N Sales').width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);
				}

				return;
			}
			thheader1.attr('colspan', lvl1.count * 2);

			lvl1.subs.forEach(function (lvl2, j) {
				var thheader2 = toolkit.newEl('th').html(lvl2._id).addClass('align-center').appendTo(trContents[1]);

				if (sga.level() == 2) {
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
				percentage = toolkit.number(percentage);

				if (d._id != netSalesPLCode) {
					percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100;
				}

				if (percentage < 0) percentage = percentage * -1;

				row[breakdown + ' %'] = percentage;
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
				toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + ' %').addClass('align-right').appendTo(trHeader);
			}

			var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

			dataFlat.forEach(function (e, f) {
				var key = e.key;
				var value = kendo.toString(d[key], 'n0');
				var percentage = kendo.toString(d[key + ' %'], 'n2') + ' %';

				if ($.trim(value) == '') {
					value = 0;
				}

				var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);

				if (sga.putNetSalesPercentage()) {
					var cellPercentage = toolkit.newEl('td').html(percentage).addClass('align-right').appendTo(trContent);
				}
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
			toolkit.newEl('td').html(kendo.toString(pnlTotal / netSalesTotal * 100, 'n2') + ' %').addClass('align-right').appendTo(trFooterLeft);
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

			toolkit.newEl('td').html(kendo.toString(value, 'n0')).addClass('align-right').appendTo(trFooterRight);

			if (sga.putNetSalesPercentage()) {
				toolkit.newEl('td').html(kendo.toString(percentage, 'n2') + ' %').addClass('align-right').appendTo(trFooterRight);
			}
		});

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows);
	};
})();

viewModel.allocated = {};
var au = viewModel.allocated;(function () {
	au.contentIsLoading = ko.observable(false);
	au.breakdownNote = ko.observable('');

	au.breakdownBy = ko.observable('customer.channelname');
	au.breakdownSGA = ko.observable('sgaalloc');
	au.breakdownByFiscalYear = ko.observable('date.fiscal');
	au.breakdownBranchGroup = ko.observableArray([]);

	au.data = ko.observableArray([]);
	au.fiscalYear = ko.observable(rpt.value.FiscalYear());
	au.level = ko.observable(1);

	au.refresh = function () {
		var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

		var param = {};
		param.pls = [];
		param.aggr = 'sum';
		param.flag = 'gna';
		param.filters = rpt.getFilterValue(false, au.fiscalYear);
		param.groups = rpt.parseGroups([au.breakdownBy(), au.breakdownSGA()]);
		au.contentIsLoading(true);

		var breakdownValue = au.breakdownBranchGroup().filter(function (d) {
			return d !== 'All';
		});
		if (breakdownValue.length > 0) {
			param.filters.push({
				Field: 'customer.branchgroup',
				Op: '$in',
				Value: breakdownValue
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
					au.contentIsLoading(false);
					return;
				}

				res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels);
				rpt.plmodels(res.Data.PLModels);
				au.data(au.buildStructure(res.Data.Data));
				au.emptyGrid();

				var callback = function callback() {
					au.contentIsLoading(false);
					au.render();
					rpt.showZeroValue(true);
					rpt.prepareEvents();

					$('#au [idheaderpl="PL94A"],[idheaderpl="PL94A_allocated"]').find('.fa').trigger('click');
				};

				var param2 = {};
				param2.pls = [];
				param2.aggr = 'sum';
				param2.filters = rpt.getFilterValue(false, au.fiscalYear);
				param2.groups = rpt.parseGroups([au.breakdownBy()]);
				toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param2, function (res2) {
					au.data().forEach(function (d) {
						d.PL8A = 0;

						var key = '_id_' + toolkit.replace(au.breakdownBy(), '.', '_');
						var target = res2.Data.Data.find(function (e) {
							return e._id[key] == d._id;
						});
						if (toolkit.isUndefined(target)) {
							return;
						}

						d.PL8A = target.PL8A;
					});

					callback();
				}, function () {
					callback();
				});
			}, function () {
				au.emptyGrid();
				au.contentIsLoading(false);
			});
		};

		fetch();
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

	au.buildPLModels = function (plmodels) {
		plmodels.filter(function (d) {
			return d.PLHeader1 === 'G&A Expenses';
		}).forEach(function (d) {
			d.PLHeader1 = 'Direct';
		});
		plmodels.filter(function (d) {
			return d.PLHeader2 === 'G&A Expenses';
		}).forEach(function (d) {
			d.PLHeader2 = 'Direct';
		});
		plmodels.filter(function (d) {
			return d.PLHeader3 === 'G&A Expenses';
		}).forEach(function (d) {
			d.PLHeader3 = 'Direct';
		});

		plmodels.forEach(function (d) {
			if (d.PLHeader1 == 'Direct' || d.PLHeader2 == 'Direct' || d.PLHeader3 == 'Direct') {
				var c = toolkit.clone(d);
				c._id = d._id + '_allocated';

				if (c.PLHeader1 == 'Direct') {
					c.PLHeader1 = 'Allocated';
				} else {
					c.PLHeader1 = c.PLHeader1 + ' ';
				}

				if (c.PLHeader2 == 'Direct') {
					c.PLHeader2 = 'Allocated';
				} else {
					c.PLHeader2 = c.PLHeader2 + ' ';
				}

				if (c.PLHeader3 == 'Direct') {
					c.PLHeader3 = 'Allocated';
				} else {
					c.PLHeader3 = c.PLHeader3 + ' ';
				}

				plmodels.push(c);
			}
		});

		// console.log('plmodels', plmodels)
		return plmodels;
	};

	au.buildStructure = function (data) {
		var breakdown = toolkit.replace(au.breakdownBy(), '.', '_');
		var indirectData = data.filter(function (d) {
			return d._id._id_sgaalloc != 'Direct';
		});
		data = data.filter(function (d) {
			return d._id._id_sgaalloc == 'Direct';
		});
		data.forEach(function (d) {
			var target = indirectData.find(function (k) {
				return k._id['_id_' + breakdown] == d._id['_id_' + breakdown];
			});
			// console.log('---target', target)

			for (var p in d) {
				if (d.hasOwnProperty(p)) {
					if (p.indexOf('PL33') > -1 || p.indexOf('PL34') > -1 || p.indexOf('PL35') > -1 || p.indexOf('PL94A') > -1) {
						if (typeof target !== 'undefined') {
							d[p + '_allocated'] = target[p];
						}
					}
				}
			}
		});

		// console.log('----data', data)

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
			return rpt.orderByChannel(d._id, d.PL8A);
		}, 'desc');
		return newParsed;
	};

	au.render = function () {
		var plmodels = au.buildPLModels(rpt.plmodels());
		plmodels = _.sortBy(plmodels, function (d) {
			return parseInt(d.OrderIndex.replace(/PL/g, ''));
		});
		plmodels = _.filter(plmodels, function (d) {
			return d._id.indexOf('PL33') > -1 || d._id.indexOf('PL34') > -1 || d._id.indexOf('PL35') > -1 || d._id.indexOf('PL94A') > -1 || d._id.indexOf('PL8A') > -1;
		});
		rpt.plmodels(plmodels);

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

		toolkit.newEl('th').html('% of N Sales').css('height', rpt.rowHeaderHeight() * au.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', au.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);

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
			var currentColumnWidth = each._id.length * 8;
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
				var thheader1p = toolkit.newEl('th').html('% of N Sales').width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);

				return;
			}
			thheader1.attr('colspan', lvl1.count * 2);
		});

		tableContent.css('min-width', totalColumnWidth);

		// ========================= CONSTRUCT DATA

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
		});

		// console.log('asdfasdfasdf', plmodels)

		plmodels.forEach(function (d) {
			var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 };
			// console.log('-----', row.PNL, row.PLCode)

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

		console.log("rows", rows);

		var TotalNetSales = _.find(rows, function (r) {
			return r.PLCode == netSalesPLCode;
		}).PNLTotal;
		rows.forEach(function (d, e) {
			var TotalPercentage = d.PNLTotal / TotalNetSales * 100;

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

				// $([cell, cellPercentage]).on('click', () => {
				// 	au.renderDetail(d.PLCode, e.breakdowns)
				// })
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

		// ======= TOTAL

		var rowsForTotal = rows.filter(function (d) {
			return d.PLCode.indexOf('PL94A') > -1;
		});

		var trFooterLeft = toolkit.newEl('tr').addClass('footerTotal').attr('idheaderpl', 'Total').attr('data-row', 'row-' + rows.length).css('height', rpt.rowContentHeight() + 'px').appendTo(tableHeader);

		toolkit.newEl('td').html('<i></i> Total G&A (Direct + Allocated)').appendTo(trFooterLeft);

		var pnlTotal = toolkit.sum(rowsForTotal, function (d) {
			return d.PNLTotal;
		});
		var netSalesTotal = toolkit.sum(au.data(), function (d) {
			return d.PL8A;
		});
		toolkit.newEl('td').html(kendo.toString(pnlTotal, 'n0')).addClass('align-right').appendTo(trFooterLeft);

		toolkit.newEl('td').html(kendo.toString(pnlTotal / netSalesTotal * 100, 'n2') + ' %').addClass('align-right').appendTo(trFooterLeft);

		var trFooterRight = toolkit.newEl('tr').addClass('footerTotal').attr('idpl', 'Total').attr('data-row', 'row-' + rows.length).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e) {
			var netSales = 0;
			var columnData = au.data().find(function (d) {
				return d._id == e._id;
			});
			if (toolkit.isDefined(columnData)) {
				netSales = columnData.PL8A;
			}

			var value = toolkit.sum(rowsForTotal, function (d) {
				return d[e.key];
			});
			console.log('------', netSales, value, rowsForTotal);

			if ($.trim(value) == '') {
				value = 0;
			}

			var percentage = toolkit.number(value / netSales) * 100;

			toolkit.newEl('td').html(kendo.toString(value, 'n0')).addClass('align-right').appendTo(trFooterRight);

			toolkit.newEl('td').html(kendo.toString(percentage, 'n2') + ' %').addClass('align-right').appendTo(trFooterRight);
		});

		// ========================= CONFIGURE THE HIRARCHY
		rpt.buildGridLevels(rows);
	};
})();

vm.currentMenu('Analysis');
vm.currentTitle('&nbsp;');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'G&A Analysis', href: '#' }]);

rpt.refresh = function () {
	sga.refresh();
	// au.refresh()
};

$(function () {
	rpt.fillFilterCostGroup();
	rpt.refresh();
	rpt.showExport(true);
});