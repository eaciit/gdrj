"use strict";

viewModel.breakdown = new Object();
var bkd = viewModel.breakdown;

bkd.data = ko.observableArray([]);
bkd.getParam = function () {
	return ra.wrapParam('analysis_ideas');
};
bkd.refresh = function () {
	// bkd.data(DATATEMP_BREAKDOWN)
	app.ajaxPost("/report/summarycalculatedatapivot", bkd.getParam(), function (res) {
		bkd.data(res.Data);
		bkd.render();
	});
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
			columns: [{ field: '_id', title: 'ID' }, { field: 'plheader1', title: 'Group 1' }, { field: 'plheader2', title: 'Group 2' }, { field: 'plheader3', title: 'Group 3' }, { field: 'value', headerTemplate: '<div class="align-right">Value</div>', format: '{0:n2}', attributes: { class: 'align-right' } }],
			pageable: true
		});
	};

	var detailLvl1 = function detailLvl1(e) {
		$("<div/>").appendTo(e.detailCell).kendoGrid({
			dataSource: {
				data: Lazy(bkd.data()).filter(function (d) {
					return d.plheader1 == e.data.plheader1;
				}).groupBy('plheader2').map(function (v, k) {
					return {
						_id: v[0]._id,
						plheader1: v[0].plheader1,
						plheader2: k,
						value: Lazy(v).sum(function (d) {
							return d.value;
						})
					};
				}).toArray(),
				pageSize: 10
			},
			columns: [{ field: '_id', title: 'ID' }, { field: 'plheader1', title: 'Group 1' }, { field: 'plheader2', title: 'Group 2' }, { field: 'value', headerTemplate: '<div class="align-right">Value</div>', format: '{0:n2}', attributes: { class: 'align-right' } }],
			// detailInit: detailLvl2,
			pageable: true
		});
	};

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
			aggregate: [{ field: 'value', aggregate: 'sum' }],
			pageSize: 10
		},
		columns: [{ field: '_id', title: 'ID', footerTemplate: 'Total :' }, { field: 'plheader1', title: 'Group 1' }, { field: 'value', headerTemplate: '<div class="align-right">Value</div>', format: '{0:n2}', aggregates: ['sum'], footerTemplate: '<div class="align-right">#= kendo.toString(sum, "n2") #</div>', attributes: { class: 'align-right' } }],
		detailInit: detailLvl1,
		// dataBound: function() {
		// 	this.expandRow(this.tbody.find("tr.k-master-row").first());
		// },
		pageable: true
	};

	app.log('table', app.clone(config));
	$('.breakdown-view').replaceWith("<div class=\"breakdown-view table\"></div>");
	$('.breakdown-view').kendoGrid(config);
};

$(function () {
	bkd.refresh();
});