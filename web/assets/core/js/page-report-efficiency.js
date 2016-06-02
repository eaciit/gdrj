"use strict";

rpt.init = function () {
	ol.init();
};

rpt.refresh = function () {
	pvt.refreshData();
	ol.mark();
};