'use strict';

vm.currentMenu('Outlet Location');
vm.currentTitle('Outlet Location');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Outlet Location', href: '/outletlocation' }]);

viewModel.outletLocation = new Object();
var ol = viewModel.outletLocation;
ol.map = {};
ol.showBy = ko.observable('Branch');
ol.accessToken = 'pk.eyJ1Ijoibm92YWxhZ3VuZyIsImEiOiJjaW90aXJhd2EwMGMydWxtNWRjamx1bTRkIn0.n8q9HSAC6VscEvUuVZiCyg';
ol.mapURL = 'https://api.mapbox.com/styles/v1/novalagung/ciotivzfv001vcpnnyuwa3dr6/tiles/{z}/{x}/{y}?access_token=' + ol.accessToken;
ol.mapConfig = {};
ol.indonesiaLatLng = [-7.1022721, 110.6229416]; // [-1.8504955, 117.4004627]
ol.mapData = [];

ol.getLocation = function (datamap) {
	var arrLoc = [],
	    points = [];
	for (var i = 0; i < datamap.length; i++) {
		if (datamap[i].Location != '') {
			arrLoc = datamap[i].Location.split(",");
			arrLoc = [parseFloat(arrLoc[0]), parseFloat(arrLoc[1])];
			points.push({
				name: datamap[i].Name,
				latlng: arrLoc
			});
		}
	}
	return points;
};

ol.changeVal = function (which) {
	return function () {
		ol.showBy(which);
		setTimeout(ol.mark, 300);
		return true;
	};
};

ol.initMap = function () {
	ol.map = L.map('outlet-location').setView(ol.indonesiaLatLng, 6);
	L.tileLayer(ol.mapURL, ol.mapConfig).addTo(ol.map);
	ol.mark();
};

ol.init = function () {
	var detector = null;
	detector = setInterval(function () {
		if (rpt.masterData.Branch().length == 0) {
			return;
		}

		clearInterval(detector);
		ol.initMap();
	}, 100);
};

ol.mark = function () {
	ol.mapData.forEach(function (d) {
		if (typeof d.marker !== 'undefined') {
			if (d.marker != null) {
				ol.map.removeLayer(d.marker);
				d.marker = undefined;
			}
		}
	});

	ol.mapData = ol.getLocation(rpt.masterData[ol.showBy()]());
	ol.mapData.forEach(function (d) {
		d['marker'] = L.marker(d.latlng, { icon: new L.DivIcon({
				className: 'my-div-icon',
				html: '<div class="leaflet-div-icon2"><span>100</span></div>'
			})
		}).addTo(ol.map);
		d.marker.bindPopup(['<b>' + d.name + '</b>', d.latlng].join('<br />'));
	});
};