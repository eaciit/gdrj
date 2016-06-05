'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

viewModel.breakdown = new Object();
var bkd = viewModel.breakdown;

bkd.data = ko.observableArray([]);
bkd.getParam = function () {
	return ra.wrapParam('analysis_ideas');
};
bkd.refresh = function () {
	bkd.data(DATATEMP_BREAKDOWN);
	// app.ajaxPost("/report/summarycalculatedatapivot", bkd.getParam(), (res) => {
	// 	bkd.data(res.Data)
	bkd.render();
	// })
};
bkd.render = function () {
	var detailLvl2 = function detailLvl2(e) {
		$("<div/>").appendTo(e.detailCell).kendoGrid({
			dataSource: {
				data: Lazy(bkd.data()).filter(function (d) {
					return d.plheader2 == e.data.plheader2;
				}).groupBy('plheader3').map(function (v, k) {
					return {
						_id: v[0]._id,
						plheader1: v[0].plheader1,
						plheader2: v[0].plheader2,
						plheader3: k,
						value: Lazy(v).sum(function (d) {
							return d.value;
						})
					};
				}).toArray(),
				pageSize: 10
			},
			columns: [{ field: '_id', title: 'ID' }, { field: 'plheader1', title: 'Group 1' }, { field: 'plheader2', title: 'Group 2' }, { field: 'plheader3', title: 'Group 3' }, { field: 'value', title: 'Value', format: '{0:n2}' }],
			pageable: true
		});
	};

	var detailLvl1 = function detailLvl1(e) {
		$("<div/>").appendTo(e.detailCell).kendoGrid({
			dataSource: {
				data: Lazy(bkd.data()).filter(function (d) {
					return d.plheader1 == e.data.plheader1;
				}).groupBy('plheader2').map(function (v, k) {
					var _ref;

					return _ref = {
						_id: v[0]._id,
						plheader1: v[0].plheader1
					}, _defineProperty(_ref, 'plheader1', k), _defineProperty(_ref, 'value', Lazy(v).sum(function (d) {
						return d.value;
					})), _ref;
				}).toArray(),
				pageSize: 10
			},
			columns: [{ field: '_id', title: 'ID' }, { field: 'plheader1', title: 'Group 1' }, { field: 'plheader2', title: 'Group 2' }, { field: 'value', title: 'Value', format: '{0:n2}' }],
			detailInit: detailLvl2,
			pageable: true
		});
	};

	var columns = [{ field: '_id', title: 'ID' }, { field: 'plheader1', title: 'Group 1' }, { field: 'plheader2', title: 'Group 2' }, { field: 'plheader3', title: 'Group 3' }, { field: 'value', title: 'Value' }];

	var config = {
		dataSource: {
			data: Lazy(bkd.data()).groupBy('plheader1').map(function (v, k) {
				return {
					_id: v[0]._id,
					plheader1: k,
					value: Lazy(v).sum(function (d) {
						return d.value;
					})
				};
			}).toArray(),
			pageSize: 10
		},
		columns: [{ field: '_id', title: 'ID' }, { field: 'plheader1', title: 'Group 1' }, { field: 'value', title: 'Value', format: '{0:n2}' }],
		detailInit: detailLvl1,
		// dataBound: function() {
		// 	this.expandRow(this.tbody.find("tr.k-master-row").first());
		// },
		pageable: true
	};

	app.log('table', app.clone(config));
	$('.breakdown-view').replaceWith('<div class="breakdown-view table"></div>');
	$('.breakdown-view').kendoGrid(config);
};

$(function () {
	bkd.refresh();
});