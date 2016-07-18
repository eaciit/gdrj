'use strict';

viewModel.customtable = new Object();
var cst = viewModel.customtable;

cst.contentIsLoading = ko.observable(false);
cst.title = ko.observable('Custom Analysis');
cst.fiscalYears = ko.observableArray(rpt.optionFiscalYears());
cst.data = ko.observableArray([]);
cst.dataconfig = ko.observableArray([]);
cst.selectconfig = ko.observable({});

cst.optionDimensionPNL = ko.observableArray([]);
cst.dimensionPNL = ko.observable([]);

cst.optionRowColumn = ko.observableArray([{ _id: 'row', Name: 'Row' }, { _id: 'column', Name: 'Column' }]);
cst.rowColumn = ko.observable('row');
cst.sortOrder = ko.observable('desc');

cst.optionSortOrders = ko.observableArray([{ field: 'asc', name: 'Smallest to largest' }, { field: 'desc', name: 'Largest to smallest' }]);

cst.optionDimensionBreakdown = ko.observableArray([{ name: "Channel", field: "customer.channelname", title: "customer_channelname" }, { name: "RD by RD category", field: "customer.reportsubchannel|I1", filter: { Op: "$in", Field: "customer.channelname", Value: ["I1"] } }, { name: "GT by GT category", field: "customer.reportsubchannel|I2", filter: { Op: "$in", Field: "customer.channelname", Value: ["I2"] } }, { name: "MT by MT category", field: "customer.reportsubchannel|I3", filter: { Op: "$in", Field: "customer.channelname", Value: ["I3"] } }, { name: "IT by IT category", field: "customer.reportsubchannel|I4", filter: { Op: "$in", Field: "customer.channelname", Value: ["I4"] } }, { name: "Branch", field: "customer.branchname", title: "customer_branchname" }, { name: "Customer Group", field: "customer.keyaccount", title: "customer_keyaccount" }, { name: "Key Account", field: "customer.customergroup", title: "customer_customergroupname" }, { name: "Brand", field: "product.brand", title: "product_brand" }, { name: "Zone", field: "customer.zone", title: "customer_zone" }, { name: "Region", field: "customer.region", title: "customer_region" }, { name: "City", field: "customer.areaname", title: "customer_areaname" }, { name: "Date - Fiscal Year", field: "date.fiscal", title: "date_fiscal" }, { name: "Date - Quarter", field: "date.quartertxt", title: "date_quartertxt" }, { name: "Date - Month", field: "date.month", title: "date_month" }]);
cst.breakdown = ko.observableArray(['customer.channelname']); // , 'customer.reportsubchannel|I3'])
cst.putTotalOf = ko.observable('customer.channelname'); // reportsubchannel')
cst.configName = ko.observable("config" + moment().unix());
cst.saveConfigLocal = function () {
	var retrievedObject = localStorage.getItem('arrConfigCustom');
	var parseData = [];
	if (retrievedObject) parseData = JSON.parse(retrievedObject);

	parseData.push({
		title: cst.configName(),
		fiscalYears: cst.fiscalYears(),
		breakdown: cst.breakdown(),
		sortOrder: cst.sortOrder(),
		putTotalOf: cst.putTotalOf(),
		dimensionPNL: cst.dimensionPNL()
	});
	localStorage.setItem('arrConfigCustom', JSON.stringify(parseData));
	swal({ title: "Config Saved", type: "success" });
	cst.loadLocalStorage();
};

cst.loadLocalStorage = function () {
	var retrievedObject = localStorage.getItem('arrConfigCustom');
	var parseData = [];
	if (retrievedObject) parseData = JSON.parse(retrievedObject);
	cst.dataconfig(parseData);
};

cst.getConfigLocal = function () {
	setTimeout(function () {
		if (cst.selectconfig() == "") {
			cst.fiscalYears(rpt.optionFiscalYears());
			cst.breakdown(['customer.channelname']);
			cst.sortOrder('desc');
			cst.putTotalOf('');
			cst.dimensionPNL([]);

			cst.initCategory();
			cst.initSeries();

			cst.refresh();
		} else {
			var getconfig = _.find(cst.dataconfig(), function (e) {
				return e.title == cst.selectconfig();
			});
			cst.fiscalYears(getconfig.fiscalYears);
			cst.breakdown(getconfig.breakdown);
			cst.sortOrder(getconfig.sortOrder);
			cst.putTotalOf(getconfig.putTotalOf);
			cst.dimensionPNL(getconfig.dimensionPNL);

			cst.initCategory();
			cst.initSeries();

			cst.refresh();
		}

		swal({ title: "Config Loaded", type: "success" });
	}, 100);
	// cst.refresh()
};

cst.isDimensionNotContainDate = ko.computed(function () {
	if (cst.breakdown().indexOf('date.month') > -1) {
		return false;
	}
	if (cst.breakdown().indexOf('date.quartertxt') > -1) {
		return false;
	}
	if (cst.breakdown().indexOf('date.fiscal') > -1) {
		return false;
	}
	return true;
}, cst.breakdown);

cst.isDimensionNotContainChannel = ko.computed(function () {
	return cst.breakdown().filter(function (d) {
		return d.indexOf('|') > -1;
	}).length == 0;
}, cst.breakdown);

cst.optionDimensionBreakdownForTotal = ko.computed(function () {
	return cst.optionDimensionBreakdown().filter(function (d) {
		return cst.breakdown().indexOf(d.field) > -1;
	});
}, cst.breakdown);

cst.changeBreakdown = function () {
	toolkit.runAfter(function () {
		cst.putTotalOf('');

		if (cst.breakdown().indexOf(cst.putTotalOf()) == -1) {
			cst.putTotalOf('');
		}
		if (cst.breakdown().filter(function (d) {
			return d.indexOf('|') > -1;
		}).length > 0) {
			cst.putTotalOf('customer.reportsubchannel');
		}

		cst.initCategory();
	}, 300);
};

cst.changeDimensionPNL = function () {
	toolkit.runAfter(function () {
		cst.initSeries();
	}, 300);
};

cst.breakdownClean = function () {
	var groups = [];

	cst.breakdown().forEach(function (d) {
		var dimension = d;

		if (d.indexOf('|') > -1) {
			dimension = d.split('|')[0];
		}

		if (groups.indexOf(dimension) == -1) {
			if (dimension == 'customer.reportsubchannel') {
				groups = groups.filter(function (e) {
					return e != 'customer.channelname';
				});
				groups.push('customer.channelname');
			}

			groups.push(dimension);
		}
	});

	return groups;
};

cst.refresh = function () {
	if (cst.breakdown().length == 0) {
		toolkit.showError('At least one breakdown is required');
		return;
	}

	var param = {};
	var groups = ['date.fiscal'].concat(cst.breakdownClean());

	param.pls = cst.dimensionPNL();
	param.flag = '';
	param.groups = groups;
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(true, cst.fiscalYears);

	var subchannels = [];

	cst.optionDimensionBreakdown().filter(function (d) {
		return cst.breakdown().indexOf(d.field) > -1;
	}).filter(function (d) {
		return d.hasOwnProperty('filter');
	}).forEach(function (d) {
		subchannels = subchannels.concat(d.filter.Value);
	});

	if (subchannels.length > 0) {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: subchannels
		});
	}

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

			var opl1 = _.orderBy(rpt.allowedPL(), function (d) {
				return d.OrderIndex;
			});
			var opl2 = _.map(opl1, function (d) {
				return { field: d._id, name: d.PLHeader3 };
			});
			cst.optionDimensionPNL(opl2);
			if (cst.dimensionPNL().length == 0) {
				cst.dimensionPNL(['PL8A', "PL7", "PL74B", "PL44B"]);
				cst.initSeries();
			}

			cst.build();
			cst.renderChart();
		}, function () {
			pvt.contentIsLoading(false);
		});
	};

	cst.contentIsLoading(true);
	fetch();
};

cst.build = function () {
	var breakdown = cst.breakdownClean();
	console.log('breakdown', breakdown);

	var keys = _.orderBy(cst.dimensionPNL(), function (d) {
		var plmodel = rpt.allowedPL().find(function (e) {
			return e._id == d;
		});
		return plmodel != undefined ? plmodel.OrderIndex : '';
	}, 'asc');

	var all = [];
	var columns = [];
	var rows = [];

	if (cst.rowColumn() == 'row') {
		columns = breakdown.map(function (d) {
			return toolkit.replace(d, '.', '_');
		});
		rows = ['pnl'].map(function (d) {
			return toolkit.replace(d, '.', '_');
		});
	} else {
		columns = ['pnl'].map(function (d) {
			return toolkit.replace(d, '.', '_');
		});
		rows = breakdown.map(function (d) {
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
			var pl = rpt.allowedPL().find(function (g) {
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

		var columnsInjected = columns;

		if (!cst.isDimensionNotContainDate()) {
			columnsInjected = columnsInjected.filter(function (g) {
				return g != 'date_fiscal';
			}).concat(['date_fiscal']);
		}

		columnsInjected.forEach(function (e) {
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
		}, cst.sortOrder());
		all.push(col);
	});

	all = _.orderBy(all, function (d) {
		return d.rows.length > 0 ? d.rows[0].value : d;
	}, cst.sortOrder());

	// REORDER

	if (breakdown.indexOf('date.month') > -1) {
		all = _.orderBy(all, function (d) {
			return parseInt(d.date_month, 10);
		}, 'asc'); // cst.sortOrder())

		all.forEach(function (d) {
			var m = d.date_month - 1 + 3;
			var y = parseInt(d.date_fiscal.split('-')[0], 0);

			d.date_month = moment(new Date(2015, m, 1)).format("MMMM YYYY");
		});
	} else if (breakdown.indexOf('date.quartertxt') > -1) {
		all = _.orderBy(all, function (d) {
			return d.date_quartertxt;
		}, 'asc'); // cst.sortOrder())
	}

	// INJECT TOTAL
	if (cst.putTotalOf() != '') {
		(function () {
			var group = breakdown.slice(0, breakdown.indexOf(cst.putTotalOf()));
			var groupOther = breakdown.filter(function (d) {
				return group.indexOf(d) == -1 && d != cst.putTotalOf();
			});
			var allCloned = [];
			var cache = {};

			// console.log("cst.breakdown", breakdown)
			// console.log("group", group)
			// console.log("groupOther", groupOther)

			all.forEach(function (d, i) {
				var currentKey = group.map(function (f) {
					return d[toolkit.replace(f, '.', '_')];
				}).join('_');

				if (!cache.hasOwnProperty(currentKey)) {
					(function () {
						var currentData = all.filter(function (f) {
							var targetKey = group.map(function (g) {
								return f[toolkit.replace(g, '.', '_')];
							}).join('_');
							return targetKey == currentKey;
						});

						if (currentData.length > 0) {
							(function () {
								var sample = currentData[0];
								var o = {};
								o[toolkit.replace(cst.putTotalOf(), '.', '_')] = 'Total';
								o.rows = [];

								group.forEach(function (g) {
									o[toolkit.replace(g, '.', '_')] = sample[toolkit.replace(g, '.', '_')];
								});

								groupOther.forEach(function (g) {
									o[toolkit.replace(g, '.', '_')] = '&nbsp;';
								});

								sample.rows.forEach(function (g, b) {
									var row = {};
									row.pnl = g.pnl;
									row.value = toolkit.sum(currentData, function (d) {
										return d.rows[b].value;
									});
									o.rows.push(row);
								});

								o.rows = _.orderBy(o.rows, function (d) {
									var pl = rpt.allowedPL().find(function (g) {
										return g.PLHeader3 == d.pnl;
									});
									if (pl != undefined) {
										return pl.OrderIndex;
									}

									return '';
								}, 'asc');

								allCloned.push(o);
							})();
						}

						console.log('---currentKey', currentKey);
						console.log('---currentData', currentData);

						cache[currentKey] = true;
					})();
				}

				allCloned.push(d);
			});

			all = allCloned;
		})();
	}

	console.log('columns', columns);
	console.log('plmodels', rpt.allowedPL());
	console.log('keys', keys);
	console.log("all", all);

	// PREPARE TEMPLATE

	var container = $('.pivot-ez').empty();
	var columnWidth = 100;
	var columnHeight = 30;
	var tableHeaderWidth = 200;
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

		// console.log('columns', columns)
		// console.log('op1', op1)
		// console.log('op2', op2)

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

	// columns.forEach((d) => {
	groupThenLoop(all, columns, function (groups) {
		var rowHeader = tableContent.find('tr[data-key=' + groups.length + ']');
		if (rowHeader.size() == 0) {
			rowHeader = toolkit.newEl('tr').appendTo(tableContent).attr('data-key', groups.length);
		}

		return rowHeader;
	}, function (groups, counter, what, k, v) {
		var calculatedColumnWidth = 100;

		var tdHeaderTableContent = toolkit.newEl('td').addClass('align-center title').html(k).appendTo(what);

		if (v.length > 1) {
			tdHeaderTableContent.attr('colspan', v.length);
		}

		if (k.length > 15) {
			var newContentWidth = k.length * 10;
			if (newContentWidth > calculatedColumnWidth) {
				calculatedColumnWidth = newContentWidth;
			}
		}

		tdHeaderTableContent.width(calculatedColumnWidth);
		totalWidth += calculatedColumnWidth;
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

			// console.log("-------", rows)

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
	// })

	var tableClear = toolkit.newEl('div').addClass('clearfix').appendTo(container);

	container.height(tableContent.height());
};

cst.initCategory = function () {
	if (cst.breakdown().length == 0) {
		cst.category('');
		return;
	}

	if (cst.category() == '') {
		cst.category(cst.breakdown()[0]);
	} else {
		if (cst.breakdown().indexOf(cst.category()) == -1) {
			cst.category('');
		}
	}
};
cst.initSeries = function () {
	if (cst.dimensionPNL().length == 0) {
		cst.series([]);
		return;
	}

	var series = [];
	var prevSeries = ko.mapping.toJS(cst.series());
	cst.dimensionPNL().forEach(function (d) {
		var serie = {};
		var prevSerie = prevSeries.find(function (e) {
			return e.field == d;
		});
		if (toolkit.isDefined(prevSerie)) {
			serie = prevSerie;
		} else {
			var pl = rpt.plmodels().find(function (e) {
				return e._id == d;
			});
			serie.field = d;
			serie.name = pl.PLHeader3;
			serie.type = 'column';
			serie.visible = true;
		}

		series.push(ko.mapping.fromJS(serie));
	});

	cst.series(series);
};
cst.optionDimensionBreakdownForChart = ko.computed(function () {
	return cst.optionDimensionBreakdown().filter(function (d) {
		return cst.breakdown().indexOf(d.field) > -1;
	});
}, cst.breakdown);
cst.optionUnit = ko.observableArray([{ field: '1', name: 'real', suffix: '' }, { field: '1000', name: 'hundreds', suffix: 'K' }, { field: '1000000', name: 'millions', suffix: 'M' }, { field: '1000000000', name: 'billions', suffix: 'B' }]);
cst.unit = ko.observable('1000000000');
cst.category = ko.observable('');
cst.series = ko.observableArray([]);
cst.seriesTypes = ko.observableArray(['line', 'column']);
cst.renderChart = function () {
	$('[href="#view"]').trigger('click');

	var suffix = cst.optionUnit().find(function (d) {
		return d.field == cst.unit();
	}).suffix;
	var billion = toolkit.toInt(cst.unit());
	var data = function () {
		var dimensionBreakdown = '_id_' + toolkit.replace(cst.category().split('|')[0], '.', '_');

		var op1 = _.groupBy(cst.data(), function (d) {
			return d._id[dimensionBreakdown];
		});
		var op2 = _.map(op1, function (v, k) {
			var o = {};
			o.key = $.trim(k);

			var sample = v[0];
			for (var p in sample) {
				if (sample.hasOwnProperty(p) && p.indexOf('PL') > -1) {
					o[p + '_orig'] = sample[p];
					o[p] = toolkit.safeDiv(sample[p], billion);
				}
			}return o;
		});
		var op3 = op2;
		if (cst.breakdown() == 'date.fiscal') {
			op3 = _.orderBy(op2, function (d) {
				return toolkit.toInt(d.key.split('-')[0]);
			}, 'asc');
		} else if (cst.breakdown() == 'date.quartertxt') {
			op3 = _.orderBy(op2, function (d) {
				return d.key;
			}, 'asc');
		} else if (cst.breakdown() == 'date.month') {
			op3 = _.orderBy(op2, function (d) {
				return toolkit.toInt(d.key);
			}, 'asc');
		} else {
			op3 = _.orderBy(op2, function (d) {
				return d[cst.dimensionPNL()[0] + '_orig'];
			}, 'desc');
		}

		return op3;
	}();

	var width = '100%';
	if (data.length > 6) {
		width = data.length * 200 + 'px';
	}

	var series = ko.mapping.toJS(cst.series()).filter(function (d) {
		return d.visible;
	}).map(function (d) {
		d.tooltip = {};
		d.tooltip.visible = true;
		d.tooltip.template = function (e) {
			return [e.category.replace('\n', ' '), e.series.name, kendo.toString(e.dataItem[e.series.field + '_orig'], 'n0')].join('<br />');
		};

		return d;
	});
	var config = {
		dataSource: {
			data: data
		},
		seriesDefaults: {
			type: "column",
			style: "smooth",
			missingValues: "gap",
			labels: {
				visible: true,
				// position: 'top',
				format: '{0:n2} ' + suffix
			},
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			}
		},
		legend: {
			visible: true,
			position: "bottom"
		},
		series: series,
		valueAxis: {
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: '{0:n2} ' + suffix
			}
		},
		categoryAxis: {
			field: 'key',
			labels: {
				font: '"Source Sans Pro" 11px',
				background: '#f0f3f4',
				border: {
					width: 1,
					color: 'gray'
				},
				padding: 3
			},
			majorGridLines: { color: '#fafafa' }
		}
	};

	$('#custom-chart').replaceWith('<div id="custom-chart" style="width: ' + width + '"></div>');
	$('#custom-chart').kendoChart(config);
};

vm.currentMenu('Analysis');
vm.currentTitle('Custom Analysis');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: 'Custom Analysis', href: '#' }]);

cst.title('&nbsp;');

$(function () {
	cst.initCategory();
	cst.refresh();
	rpt.showExport(true);
	cst.loadLocalStorage();
	// cst.selectfield()

	$("#modal-load-config").appendTo($('body'));
});