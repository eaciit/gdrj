'use strict';

viewModel.customtable = new Object();
var cst = viewModel.customtable;

cst.contentIsLoading = ko.observable(false);
cst.title = ko.observable('Custom Analysis');
cst.row = ko.observableArray(['pnl']);
cst.column = ko.observableArray(['product.brand', 'customer.channelname']);
cst.breakdownvalue = ko.observable([]);
cst.fiscalYear = ko.observable(rpt.value.FiscalYear());
cst.data = ko.observableArray([]);
cst.dataPoints = ko.observableArray([]);
cst.dataMeasures = ko.observableArray([]);
cst.optionDimensionSelect = ko.observableArray([]);
cst.datapnl = ko.observableArray([]);

cst.columnrow = [{ name: "P&L Item", field: "pnl" },
// {name: "Calculated ratios", field: ""},
{ name: "Channel", field: "customer.channelname", title: "customer_channelname" }, { name: "RD by distributor name", field: "" }, { name: "GT by GT category", field: "" }, { name: "Branch", field: "customer.branchname", title: "customer_branchname" }, { name: "Customer Group", field: "customer.keyaccount", title: "customer_keyaccount" }, { name: "Key Account", field: "customer.customergroup", title: "customer.customergroup" }, // filter keyaccount = KIY
{ name: "Brand", field: "product.brand", title: "product_brand" }, { name: "Zone", field: "customer.zone", title: "customer_zone" }, { name: "Region", field: "customer.region", title: "customer_region" }, { name: "City", field: "customer.areaname", title: "customer_areaname" }, { name: "Time", field: "date", title: "date" }];

cst.breakdownby = ko.observableArray([]);
cst.optionRows = ko.observableArray(cst.columnrow);
cst.optionColumns = ko.observableArray(cst.columnrow);

cst.selectfield = function () {
	setTimeout(function () {
		var columndata = $.extend(true, [], cst.columnrow);
		var rowdata = $.extend(true, [], cst.columnrow);
		if (cst.column().length > 0) {
			if (cst.column()[0] == "pnl") {
				columndata = _.find(columndata, function (e) {
					return e.field == 'pnl';
				});
				cst.optionColumns([columndata]);
			} else {
				columndata = _.remove(columndata, function (d) {
					return d.field != 'pnl';
				});
				cst.optionColumns(columndata);
			}
		} else {
			cst.optionColumns(columndata);
		}
		if (cst.row().length > 0) {
			if (cst.row()[0] == 'pnl') {
				rowdata = _.find(rowdata, function (e) {
					return e.field == 'pnl';
				});
				cst.optionRows([rowdata]);
			} else {
				rowdata = _.remove(rowdata, function (d) {
					return d.field != 'pnl';
				});
				cst.optionRows(rowdata);
			}
		} else {
			cst.optionRows(rowdata);
		}
		// let columndata = $.extend(true, [], cst.columnrow)
		// let rowdata = $.extend(true, [], cst.columnrow)
		// for (var i in cst.row()) {
		// 	columndata = _.remove(columndata, (d) => { return d.field != cst.row()[i] })
		// }
		// for (var i in cst.column()) {
		// 	rowdata = _.remove(rowdata, (d) => { return d.field != cst.column()[i] })
		// }
		// cst.optionRows(rowdata)
		// cst.optionColumns(columndata)
	}, 100);
};

cst.refresh = function () {
	var param = {};
	var groups = ['date.fiscal'].concat(cst.row().concat(cst.column()).filter(function (d) {
		return d != 'pnl';
	}));

	param.pls = cst.breakdownvalue();
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

			if (rpt.isDataEmpty(res)) {
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
			cst.optionDimensionSelect(opl2);
			if (cst.breakdownvalue().length == 0) {
				cst.breakdownvalue(['PL8A', "PL7", "PL74B", "PL74C", "PL94A", "PL44B", "PL44C"]);
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
	var keys = cst.breakdownvalue();
	var all = [];
	var columns = cst.column().map(function (d) {
		return toolkit.replace(d, '.', '_');
	});
	var rows = cst.row().map(function (d) {
		return toolkit.replace(d, '.', '_');
	});

	// BUILD WELL STRUCTURED DATA

	var allRaw = [];
	cst.data().forEach(function (d) {
		var o = {};
		var isPnlOnRow = rows.find(function (e) {
			return e == 'pnl';
		}) != undefined;

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

cst.getpnl = function (datapl) {
	datapl = _.filter(datapl, function (d) {
		return d.PLHeader1 == d.PLHeader2 && d.PLHeader1 == d.PLHeader3;
	});
	var data = datapl.map(function (d) {
		return app.o({ field: d._id, name: d.PLHeader3 });
	});
	data = _.sortBy(data, function (item) {
		return [item.name];
	});
	cst.optionDimensionSelect(data);
	cst.generatedatapl();
};

cst.generatedatapl = function () {
	cst.datapnl([]);
	var fielddimension = void 0;
	for (var i in cst.breakdownvalue()) {
		fielddimension = _.find(cst.optionDimensionSelect(), function (e) {
			return e.field == cst.breakdownvalue()[i];
		});
		if (fielddimension != undefined) cst.datapnl.push(fielddimension);
	}
	if (cst.datapnl().length == 0) cst.datapnl(cst.optionDimensionSelect());

	var data = _.map(cst.data(), function (d) {
		var datanew = {},
		    field = void 0,
		    title = "",
		    datapoint = void 0;
		$.each(d, function (key, value) {
			if (key != "_id") {
				field = _.find(cst.datapnl(), function (e) {
					return e.field == key;
				});
				if (field != undefined) {
					datanew[key] = value;
					datapoint = _.find(cst.dataPoints(), function (e) {
						return e.field == key;
					});
					if (datapoint == undefined) cst.dataPoints.push({ field: key, title: field.name });
				}
			}
		});
		$.each(d._id, function (key, value) {
			title = key.substring(4, key.length);
			datanew[title] = value;
		});

		return datanew;
	});
	cst.changecolumnrow(data);
};

cst.changecolumnrow = function (data) {
	var row = cst.row().find(function (e) {
		return e == 'pnl';
	}),
	    newdata = [],
	    fieldchange = {},
	    datapoint = void 0;
	if (row != undefined) {
		data.forEach(function (e, a) {
			cst.dataPoints().forEach(function (d) {
				fieldchange = {};
				fieldchange['pnl'] = d.title;
				fieldchange['date_fiscal'] = e['date_fiscal'];
				cst.column().forEach(function (f, i) {
					var field = toolkit.replace(f, '.', '_');
					fieldchange[e[field]] = e[d.field];
					datapoint = _.find(cst.dataMeasures(), function (g) {
						return g.field == e[field];
					});
					if (datapoint == undefined) cst.dataMeasures.push({ field: e[field], title: e[field] });
				});
				newdata.push(fieldchange);
			});
		});
		var grouppnl = _.groupBy(newdata, function (d) {
			return d.pnl;
		});
		newdata = [];
		$.each(grouppnl, function (key, value) {
			fieldchange = {};
			for (var i in value) {
				$.each(value[i], function (key2, value2) {
					if (key2 != 'pnl' && key2 != 'date_fiscal') {
						if (fieldchange[key2] == undefined) fieldchange[key2] = value2;else fieldchange[key2] += value2;
					}
				});
				fieldchange['date_fiscal'] = value[i]['date_fiscal'];
			}
			fieldchange['pnl'] = key;
			newdata.push(fieldchange);
		});
	} else {
		cst.dataMeasures(cst.dataPoints());
		newdata = data;
	}
	console.log(newdata, data);
	cst.render(newdata);
};

cst.render = function (resdata) {
	console.log('data', resdata);
	var schemaModelFields = {},
	    schemaCubeDimensions = {},
	    schemaCubeMeasures = {},
	    columns = [],
	    rows = [],
	    measures = [],
	    choose = '';

	// let data = _.sortBy(cst.data(), (d) => toolkit.redefine(d[toolkit.replace(cst.column(), '.', '_')], ''))
	var data = cst.data();

	cst.row().forEach(function (d, i) {
		var row = cst.optionRows().find(function (e) {
			return e.field == d && e.field != 'pnl';
		});
		if (row != undefined) {
			var field = toolkit.replace(row.field, '.', '_');
			schemaModelFields[field] = { type: 'string', field: field };
			rows.push({ name: field, expand: i == 0 });
		} else {
			choose = 'row';
			rows.push({ name: 'pnl', expand: true });
			schemaModelFields['pnl'] = { type: 'string', field: 'pnl' };
		}
	});

	cst.column().forEach(function (d, i) {
		var column = cst.optionColumns().find(function (e) {
			return e.field == d && e.field != 'pnl';
		});
		if (choose == '') {
			if (column != undefined) {
				var field = toolkit.replace(column.field, '.', '_');
				schemaModelFields[field] = { type: 'string', field: field };
				columns.push({ name: field, expand: i == 0 });
			} else {
				choose = 'column';
				columns.push({ name: 'pnl', expand: true });
				schemaModelFields['pnl'] = { type: 'string', field: 'pnl' };
			}
		}
	});
	console.log(columns);

	cst.dataMeasures().forEach(function (d) {
		var field = toolkit.replace(d.field, '.', '_');
		schemaModelFields[field] = { type: 'number' };
		schemaCubeDimensions[field] = { caption: d.title };

		schemaCubeMeasures[d.title] = { field: field, format: '{0:c}', aggregate: 'sum' };
		measures.push(d.title);
	});

	// console.log("schemaModelFields ", schemaModelFields)
	// console.log("schemaCubeDimensions ", schemaCubeDimensions)
	// console.log("schemaCubeMeasures ", schemaCubeMeasures)
	// console.log("measures ", measures)
	// console.log("columns ", columns)
	// console.log("rows ", rows)
	var config = {
		filterable: false,
		reorderable: false,
		dataCellTemplate: function dataCellTemplate(d) {
			return '<div class="align-right">' + kendo.toString(d.dataItem.value, "n2") + '</div>';
		},
		columnWidth: 130,
		dataSource: {
			data: resdata,
			schema: {
				model: {
					fields: schemaModelFields
				},
				cube: {
					dimensions: schemaCubeDimensions,
					measures: schemaCubeMeasures
				}
			},
			columns: columns,
			rows: rows,
			measures: measures
		}
	};
	console.log(ko.toJSON(config));
	$('.pivot').replaceWith('<div class="pivot ez"></div>');
	$('.pivot').kendoPivotGrid(config);
};

vm.currentMenu('Analysis');
vm.currentTitle('Custom Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Custom Analysis', href: '#' }]);

cst.title('Custom Analysis');

$(function () {
	cst.refresh();
	// cst.selectfield()
});