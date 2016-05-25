'use strict';

var vm = viewModel;

vm.pageTitle = ko.observable('Dashboard');
vm.menu = ko.observableArray([{ title: 'Dashboard', icon: 'home', href: '#', submenu: [] }, { title: 'Report', icon: 'file-text-o', href: '#', submenu: [{ title: 'Distribution', icon: 'user', href: '/web/reportdistribution', submenu: [] }, { title: 'General Trade', icon: 'list', href: '/web/reportgeneraltrade', submenu: [] }, { title: 'Market Efficiency', icon: 'shopping-basket', href: '/web/reportmarketefficiency', submenu: [] }, { title: 'SG & A', icon: 'list', href: '/web/reportsgna', submenu: [] }] }, { title: 'Data Manager', icon: 'database', href: '#', submenu: [{ title: 'Data Browser', icon: 'list', href: '/web/databrowser', submenu: [] }, { title: 'Upload Data', icon: 'upload', href: '/web/uploaddata', submenu: [] }] }, { title: 'Administration', icon: 'gear', href: '#', submenu: [{ title: 'Allocation Flow', icon: 'arrows', href: '#', submenu: [] }, { title: 'Access', icon: 'unlock-alt', href: '#', submenu: [] }, { title: 'Group', icon: 'users', href: '#', submenu: [] }, { title: 'User', icon: 'user', href: '#', submenu: [] }, { title: 'Session', icon: 'clock-o', href: '#', submenu: [] }] }]);
vm.breadcrumb = ko.observableArray([{ title: 'Godrej', href: '#' }, { title: 'Dashboard', href: '#' }]);

vm.menuIcon = function (data) {
	return ko.computed(function () {
		return 'fa fa-' + data.icon;
	});
};

vm.prepareDropDownMenu = function () {
	$('ul.nav li.dropdown').hover(function () {
		$(this).find('.dropdown-menu').stop(true, true).fadeIn(200);
	}, function () {
		$(this).find('.dropdown-menu').stop(true, true).fadeOut(200);
	});
};

vm.prepareFilterToggle = function () {
	$('.material-switch input[type="checkbox"]').on('change', function () {
		var show = $(this).is(':checked');
		var $target = $(this).closest(".panel").find(".panel-filter");
		if (show) {
			$target.show(200);
		} else {
			$target.hide(200);
		}
	}).trigger('click');
};
vm.adjustLayout = function () {
	var height = window.innerHeight - $('.app-top').height();
	$('.app-container').css('min-height', height);
};
vm.prepareToggleFilter = function () {
	var btnToggleFilter = $('.btn-toggle-filter');
	var panelFilterContainer = $('.panel-filter').parent();

	$('<i class="fa fa-angle-double-left tooltipster align-center color-orange" title="Toggle filter pane visibility"></i>').appendTo(btnToggleFilter);
	app.prepareTooltipster($(btnToggleFilter).find('.fa'));

	btnToggleFilter.on('click', function () {
		if (panelFilterContainer.hasClass('minimized')) {
			panelFilterContainer.removeClass('minimized');
			btnToggleFilter.find('.fa').removeClass('color-blue').addClass('color-orange').removeClass('fa-angle-double-right').addClass('fa-angle-double-left');

			$('.panel-filter').show(300);
			$('.panel-content').animate({ 'width': 'auto' }, 300);
		} else {
			panelFilterContainer.addClass('minimized');
			btnToggleFilter.find('.fa').removeClass('color-orange').addClass('color-blue').removeClass('fa-angle-double-left').addClass('fa-angle-double-right');

			$('.panel-filter').hide(300);
			$('.panel-content').animate({ 'width': '100%' }, 300);
		}
	});
};
vm.prepareLoader = function () {
	app.loader(true);
	$('.loader canvas').each(function (i, cvs) {
		var ctx = cvs.getContext("2d");
		var sA = Math.PI / 180 * 45;
		var sE = Math.PI / 180 * 90;
		var ca = canvas.width;
		var ch = canvas.height;

		ctx.clearRect(0, 0, ca, ch);
		ctx.lineWidth = 15;

		ctx.beginPath();
		ctx.strokeStyle = "#ffffff";
		ctx.shadowColor = "#eeeeee";
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		ctx.shadowBlur = 5;
		ctx.arc(50, 50, 25, 0, 360, false);
		ctx.stroke();
		ctx.closePath();

		sE += 0.05;
		sA += 0.05;

		ctx.beginPath();
		ctx.strokeStyle = "#aaaaaa";
		ctx.arc(50, 50, 25, sA, sE, false);
		ctx.stroke();
		ctx.closePath();
	});
};

$(function () {
	vm.prepareDropDownMenu();
	vm.prepareFilterToggle();
	vm.adjustLayout();
	vm.prepareToggleFilter();
	app.prepareTooltipster();
	vm.prepareLoader();
});