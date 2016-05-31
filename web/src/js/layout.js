let vm = viewModel

vm.currentMenu = ko.observable('Dashboard')
vm.currentTitle = ko.observable('Dashboard')
vm.menu = ko.observableArray([
	{ title: 'Dashboard', icon: 'home', href: '#', submenu: [] },
	{ title: 'Report', icon: 'file-text-o', href: '#', submenu: [
		{ title: 'Distribution', icon: 'user', href: '/web/reportdistribution', submenu: [] },
		{ title: 'General Trade', icon: 'list', href: '/web/reportgeneraltrade', submenu: [] },
		{ title: 'Market Efficiency', icon: 'shopping-basket', href: '/web/reportmarketefficiency', submenu: [] },
		{ title: 'SG & A', icon: 'list', href: '/web/reportsgna', submenu: [] },
	] },
	{ title: 'Data Manager', icon: 'database', href: '#', submenu: [
		{ title: 'Data Browser', icon: 'list', href: '/web/databrowser', submenu: [] },
		{ title: 'Upload Data', icon: 'upload', href: '/web/uploaddata', submenu: [] }
	] },
	{ title: 'Organization', icon: 'sitemap', href: '/web/organization', submenu: [] },
	{ title: 'Outlet Location', icon: 'map', href: '/web/outletlocation', submenu: [] },
	{ title: 'Administration', icon: 'gear', href: '#', submenu: [
		{ title: 'Allocation Flow', icon: 'arrows', href: '/web/allocationflow', submenu: [] },
		{ title: 'Access', icon: 'unlock-alt', href: '/web/access', submenu: [] },
		{ title: 'Group', icon: 'users', href: '/web/group', submenu: [] },
		{ title: 'User', icon: 'user', href: '/web/user', submenu: [] },
		{ title: 'Session', icon: 'clock-o', href: '/web/session', submenu: [] }
	] }
])
vm.breadcrumb = ko.observableArray([
	{ title: 'Godrej', href: '#' },
	{ title: 'Dashboard', href: '#' }
])

vm.menuIcon = (data) => ko.computed(() => `fa fa-${data.icon}`)

vm.prepareDropDownMenu = () => {
	$('ul.nav li.dropdown').hover(function() {
		$(this).find('.dropdown-menu').stop(true, true).fadeIn(200)
	}, function() {
		$(this).find('.dropdown-menu').stop(true, true).fadeOut(200)
	})
}

vm.prepareFilterToggle = () => {
	$('.material-switch input[type="checkbox"]').on('change', function() {
		let show = $(this).is(':checked')
		let $target = $(this).closest('.panel').find('.panel-filter')
		if (show) {
			$target.show(200)
		} else {
			$target.hide(200)
		}
	}).trigger('click')
}
vm.adjustLayout = () => {
	let height = window.innerHeight - $('.app-top').height()
	$('.app-container').css('min-height', height)
}
vm.prepareToggleFilter = () => {
	let btnToggleFilter = $('.btn-toggle-filter')
	let panelFilterContainer = $('.panel-filter').parent()

	$('<i class="fa fa-angle-double-left tooltipster align-center color-orange" title="Toggle filter pane visibility"></i>').appendTo(btnToggleFilter)
	app.prepareTooltipster($(btnToggleFilter).find('.fa'))

	btnToggleFilter.on('click', () => {
		if (panelFilterContainer.hasClass('minimized')) {
			panelFilterContainer.removeClass('minimized')
			btnToggleFilter.find('.fa')
				.removeClass('color-blue').addClass('color-orange')
				.removeClass('fa-angle-double-right').addClass('fa-angle-double-left')

			$('.panel-filter').show(300)
			$('.panel-content').animate({ 'width': 'auto' }, 300)
		} else {
			panelFilterContainer.addClass('minimized')
			btnToggleFilter.find('.fa')
				.removeClass('color-orange').addClass('color-blue')
				.removeClass('fa-angle-double-left').addClass('fa-angle-double-right')

			$('.panel-filter').hide(300)
			$('.panel-content').animate({ 'width': '100%' }, 300)
		}
	})
}
vm.prepareLoader = () => {
	app.loader(true)
	$('.loader canvas').each((i, cvs) => {
		let ctx = cvs.getContext("2d")
		let sA = (Math.PI / 180) * 45
		let sE = (Math.PI / 180) * 90
		let ca = canvas.width
		let ch = canvas.height

		ctx.clearRect(0, 0, ca, ch)
		ctx.lineWidth = 15

		ctx.beginPath()
		ctx.strokeStyle = "#ffffff"     
		ctx.shadowColor = "#eeeeee"
		ctx.shadowOffsetX = 2
		ctx.shadowOffsetY = 2
		ctx.shadowBlur = 5
		ctx.arc(50, 50, 25, 0, 360, false)
		ctx.stroke()
		ctx.closePath()

		sE += 0.05 
		sA += 0.05
		    
		ctx.beginPath()
		ctx.strokeStyle = "#aaaaaa"
		ctx.arc(50, 50, 25, sA, sE, false)
		ctx.stroke()
		ctx.closePath()
	})
}
vm.logout = () => {
	app.ajaxPost('/login/logout', { }, (res) => {
		if (!app.isFine(res)) {
			return;
		}
		swal({
			title: 'Logout Success',
			text: 'Will automatically redirect to login page in 3 seconds',
			type: 'success',
			timer: 3000,
			showConfirmButton: false
		}, () => {
			location.href = '/web/login'
		});
	})
}

$(() => {
	vm.prepareDropDownMenu()
	vm.prepareFilterToggle()
	vm.adjustLayout()
	vm.prepareToggleFilter()
	app.prepareTooltipster()
	vm.prepareLoader()
})