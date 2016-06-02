"use strict";

rpt.init = function () {
	ol.init();
	pvt.init();
};

rpt.refresh = function () {
	pvt.refreshData();
	ol.mark();
};