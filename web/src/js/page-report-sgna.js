rpt.init = () => {
	ol.init()
	pvt.init()
}

rpt.refresh = () => {
	pvt.refreshData()
	ol.mark()
}