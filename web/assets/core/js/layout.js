'use strict';

var vm = viewModel;

vm.currentMenu = ko.observable('Dashboard');
vm.currentTitle = ko.observable('Dashboard');
vm.menu = ko.observableArray([{ title: 'Dashboard', icon: 'home', href: '/web/report/dashboard', submenu: [] }, { title: 'PNL Analysis', icon: 'bar-chart-o', href: '/web/report/analysis', submenu: [] }, { title: 'Key Account Analysis', icon: 'bar-chart-o', href: '/web/report/keyaccount', submenu: [] }, { title: 'Branch Analysis', icon: 'bar-chart-o', href: '/web/report/branchanalysis', submenu: [] }, { title: 'Report', icon: 'file-text-o', href: '/web/report/list', submenu: [] }, { title: 'Data Manager', icon: 'database', href: '#', submenu: [{ title: 'Data Browser', icon: 'list', href: '/web/databrowser', submenu: [] }, { title: 'Upload Data', icon: 'upload', href: '/web/uploaddata', submenu: [] }] }, { title: 'Organization', icon: 'sitemap', href: '/web/organization', submenu: [] }, { title: 'Administration', icon: 'gear', href: '#', submenu: [{ title: 'Allocation Flow', icon: 'arrows', href: '/web/allocationflow', submenu: [] }, { title: 'Access', icon: 'unlock-alt', href: '/web/access', submenu: [] }, { title: 'Group', icon: 'users', href: '/web/group', submenu: [] }, { title: 'User', icon: 'user', href: '/web/user', submenu: [] }, { title: 'Session', icon: 'clock-o', href: '/web/session', submenu: [] }, { title: 'Log', icon: 'book', href: '/web/log', submenu: [] }, { title: 'Admin Collection', icon: 'table', href: '/web/admintable', submenu: [] }] }]);
vm.breadcrumb = ko.observableArray([{ title: 'Godrej', href: '#' }, { title: 'Dashboard', href: '#' }]);

vm.menuIcon = function (data) {
	return ko.computed(function () {
		return 'fa fa-' + data.icon;
	});
};

vm.prepareDropDownMenu = function () {
	$('ul.nav li.dd-hover').hover(function () {
		$(this).find('.dropdown-menu').stop(true, true).fadeIn(200);
	}, function () {
		$(this).find('.dropdown-menu').stop(true, true).fadeOut(200);
	});
};

vm.prepareFilterToggle = function () {
	$('.material-switch input[type="checkbox"]').on('change', function () {
		var show = $(this).is(':checked');
		var $target = $(this).closest('.panel').find('.panel-filter');
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
vm.showFilterCallback = toolkit.noop;
vm.showFilter = function () {
	var btnToggleFilter = $('.btn-toggle-filter');
	var panelFilterContainer = $('.panel-filter').parent();

	panelFilterContainer.removeClass('minimized');
	btnToggleFilter.find('.fa').removeClass('color-blue').addClass('color-orange').removeClass('fa-angle-double-right').addClass('fa-angle-double-left');

	$('.panel-filter').show(300);
	$('.panel-content').animate({ 'width': 'auto' }, 300, vm.showFilterCallback);
};
vm.hideFilterCallback = toolkit.noop;
vm.hideFilter = function () {
	var btnToggleFilter = $('.btn-toggle-filter');
	var panelFilterContainer = $('.panel-filter').parent();

	panelFilterContainer.addClass('minimized');
	btnToggleFilter.find('.fa').removeClass('color-orange').addClass('color-blue').removeClass('fa-angle-double-left').addClass('fa-angle-double-right');

	$('.panel-filter').hide(300);
	$('.panel-content').animate({ 'width': '100%' }, 300, vm.hideFilterCallback);
};
vm.prepareToggleFilter = function () {
	var btnToggleFilter = $('.btn-toggle-filter');
	var panelFilterContainer = $('.panel-filter').parent();

	$('<i class="fa fa-angle-double-left tooltipster align-center color-orange" title="Toggle filter pane visibility"></i>').appendTo(btnToggleFilter);
	toolkit.prepareTooltipster($(btnToggleFilter).find('.fa'));

	btnToggleFilter.on('click', function () {
		if (panelFilterContainer.hasClass('minimized')) {
			vm.showFilter();
		} else {
			vm.hideFilter();
		}
	});
};
vm.prepareLoader = function () {
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
vm.logout = function () {
	toolkit.ajaxPost('/login/logout', {}, function (res) {
		if (!toolkit.isFine(res)) {
			return;
		}
		swal({
			title: 'Logout Success',
			text: 'Will automatically redirect to login page in 3 seconds',
			type: 'success',
			timer: 3000,
			showConfirmButton: false
		}, function () {
			location.href = '/web/login';
		});
	});
};

$(function () {
	vm.prepareDropDownMenu();
	vm.prepareFilterToggle();
	vm.adjustLayout();
	vm.prepareToggleFilter();
	toolkit.prepareTooltipster();
	vm.prepareLoader();
});