'use strict';

vm.currentMenu('Outlet Location');
vm.currentTitle('Outlet Location');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Outlet Location', href: '/outletlocation' }]);

viewModel.outletLocation = new Object();
var ol = viewModel.outletLocation;
ol.map = {};
ol.accessToken = 'pk.eyJ1Ijoibm92YWxhZ3VuZyIsImEiOiJjaW90aXJhd2EwMGMydWxtNWRjamx1bTRkIn0.n8q9HSAC6VscEvUuVZiCyg';
ol.mapURL = 'https://api.mapbox.com/styles/v1/novalagung/ciotivzfv001vcpnnyuwa3dr6/tiles/{z}/{x}/{y}?access_token=' + ol.accessToken;
ol.mapConfig = {};
ol.indonesiaLatLng = [-1.8504955, 117.4004627];
ol.mapData = app.randomGeoLocations();

ol.initMap = function () {
	ol.map = L.map('outlet-location').setView(ol.indonesiaLatLng, 5);
	L.tileLayer(ol.mapURL, ol.mapConfig).addTo(ol.map);

	ol.mapData.forEach(function (d) {
		d.marker = L.marker(d.latlng).addTo(ol.map);
		d.marker.bindPopup(['<b>' + d.name + '</b>', d.latlng].join('<br />'));
	});
};

$(function () {
	ol.initMap();
});