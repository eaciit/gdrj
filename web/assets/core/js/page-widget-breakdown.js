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
	var data = _.sortBy(bkd.data(), function (d) {
		return parseInt(d.orderindex.replace("PL", ""), 10);
	});

	var config = {
		filterable: false,
		reorderable: false,
		dataSource: {
			data: data,
			schema: {
				model: {
					fields: {
						_id: { type: "string" },
						plheader1: { type: "string" },
						plheader2: { type: "string" },
						// plheader3: { type: "string" },
						value: { type: "number" }
					}
				},
				cube: {
					dimensions: {
						_id: { type: "string" },
						plheader1: { caption: "Group 1" },
						plheader2: { caption: "Group 2" }
					},
					// plheader3: { caption: "Group 3" }
					measures: {
						Amount: {
							field: "value",
							aggregate: "sum",
							format: "{0:n2}"
						}
					}
				}
			},
			rows: [{ name: "plheader1", expand: true }, { name: "plheader2" }],

			// { name: "plheader3" }
			measures: ["Amount"]
		},
		dataCellTemplate: function dataCellTemplate(d) {
			return "<div class=\"align-right\">" + kendo.toString(d.dataItem.value, "n2") + "</div>";
		},
		dataBound: function dataBound() {
			$('.breakdown-view .k-grid.k-widget.k-alt tr:first td:first').remove();
			$('.breakdown-view .k-grid.k-widget.k-alt tr').each(function (i, e) {
				var target = $(e).find('td:eq(1) span:eq(1)');
				target.remove();

				$(e).find('[colspan="2"]').attr('colspan', 1);

				// temporary hidden until level 3 is readdy
				$(e).find('.k-grid-footer').remove();
			});

			$('.breakdown-view .k-grid-header .k-header').find('span').html('Value');
		}
	};

	app.log('breakdown', app.clone(config));
	$('.breakdown-view').replaceWith("<div class=\"breakdown-view ez\"></div>");
	$('.breakdown-view').kendoPivotGrid(config);
};

$(function () {
	bkd.refresh();
});