'use strict';

var vm = viewModel;

vm.pageTitle = ko.observable('Dashboard');
vm.menu = ko.observableArray([{ title: 'Dashboard', icon: 'home', href: '#', submenu: [] }, { title: 'Report', icon: 'file-text-o', href: '#', submenu: [{ title: 'Distribution', icon: 'user', href: '/web/reportdistribution', submenu: [] }, { title: 'General Trade', icon: 'list', href: '/web/reportgeneraltrade', submenu: [] }, { title: 'Market Efficiency', icon: 'shopping-basket', href: '/web/reportmarketefficiency', submenu: [] }, { title: 'SG & A', icon: 'list', href: '/web/reportsgna', submenu: [] }] }, { title: 'Data Manager', icon: 'database', href: '#', submenu: [{ title: 'Data Browser', icon: 'list', href: '/web/databrowser', submenu: [] }, { title: 'Upload Data', icon: 'upload', href: '/web/uploaddata', submenu: [] }] }, { title: 'Administration', icon: 'gear', href: '#', submenu: [{ title: 'Allocation Flow', icon: 'arrows', href: '/web/allocationflow', submenu: [] }, { title: 'Access', icon: 'unlock-alt', href: '#', submenu: [] }, { title: 'Group', icon: 'users', href: '#', submenu: [] }, { title: 'User', icon: 'user', href: '#', submenu: [] }, { title: 'Session', icon: 'clock-o', href: '#', submenu: [] }] }]);
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
vm.logout = function () {
	app.ajaxPost('/login/logout', {}, function (res) {
		if (!app.isFine(res)) {
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

vm.account  = ko.observable(false);
vm.session  = ko.observable('');
vm.username = ko.observable('');

vm.element = function(data){
	//console.log(data.length);
	$parent = $('#nav-ul');
	$navbar = $('<ul class="nav navbar-nav"></ul>');
	$navbar.appendTo($parent);
	if(data == null ){
		$liparent = $("<li class='dropdown' id='liparent'><a>You don't have any access</a></li>");
		$liparent.appendTo($navbar);
	}else{
		$.each(data, function(i, items){
			if(items.childrens.length != 0){
				$liparent = $('<li class="dropdown" id="liparent"><a href="#" class="dropdown-toggle" data-toggle="dropdown">'+items.title+' <span class="caret"></span></a></li>');
				$liparent.appendTo($navbar);
				$ulchild = $('<ul class="dropdown-menu"></ul>');
				$ulchild.appendTo($liparent);
				$.each(items.childrens, function(e, childs){
					$lichild =  $('<li><a href="'+childs.link+'">'+childs.title+'</a></li>');
					$lichild.appendTo($ulchild);
				});
			}else{
				$liparent = $('<li id="liparent"><a href="'+items.link+'">'+items.title+'</a></li>');
				$liparent.appendTo($navbar);
			}

		});
	}

}
vm.getLoadMenu = function () { 
	var isFine = function (res) {
		if (!res.success || res.message.toLowerCase().indexOf("found") > -1 
						 || res.message.toLowerCase().indexOf("expired") > -1 
						 || res.message.toLowerCase().indexOf("failed") > -1) {
			if (document.URL.indexOf("/web/login") == -1) {
				swal({
					title: "Oops...",
					type: "warning",
					text: res.message,
				}, function () {
					app.isFine(res);
					setTimeout(function () { window.location = "/web/login"; }, 200);
				});
			}

			return false;
		}

		return true;
	};
	
	app.ajaxPost("/login/getaccessmenu", {}, function (res) {
		if (res.success && res.message == "devmode") {
			vm.element(res.data);
			vm.account(false);
			return;
		}

		if (!isFine(res)) {
			vm.element(null);
			vm.account(false);
			return;
		}

		app.ajaxPost("/login/getusername", {}, function (res2) {
			if (!isFine(res2)) {
				vm.element(null);
				vm.account(false);
				return;
			}

			vm.username(" Hi' " + res2.data.username);
			vm.element(res.data);
			vm.account(true);
		}, function () {
			vm.element(null);
			vm.account(false);
		});
	}, function () {
		vm.element(null);
		vm.account(false);
	});	
};

$(function () {
	vm.getLoadMenu();
	vm.prepareDropDownMenu();
	vm.prepareFilterToggle();
	vm.adjustLayout();
	vm.prepareToggleFilter();
	app.prepareTooltipster();
	vm.prepareLoader();
});