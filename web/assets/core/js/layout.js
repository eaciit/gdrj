'use strict';

var vm = viewModel;

vm.pageTitle = ko.observable('Dashboard');
vm.menu = ko.observableArray([{ title: 'Dashboard', icon: 'home', href: '#', submenu: [] }, { title: 'Data Browser', icon: 'list', href: '/web/databrowser', submenu: [] }, { title: 'Upload Data', icon: 'list', href: '/web/uploaddata', submenu: [] }]);
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

	btnToggleFilter.on('click', function () {
		if (panelFilterContainer.hasClass('minimized')) {
			panelFilterContainer.removeClass('minimized');
			btnToggleFilter.find('.fa').removeClass('color-blue').addClass('color-grey');

			$('.panel-filter').show(300);
			$('.panel-content').animate({ 'width': 'auto' }, 300);
		} else {
			panelFilterContainer.addClass('minimized');
			btnToggleFilter.find('.fa').removeClass('color-grey').addClass('color-blue');

			$('.panel-filter').hide(300);
			$('.panel-content').animate({ 'width': '100%' }, 300);
		}
	});
};

$(function () {
	vm.prepareDropDownMenu();
	vm.prepareFilterToggle();
	vm.adjustLayout();
	vm.prepareToggleFilter();
	app.prepareTooltipster();
});