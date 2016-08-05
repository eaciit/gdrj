let vm = viewModel

vm.currentMenu = ko.observable('Dashboard')
vm.currentTitle = ko.observable('Dashboard')
vm.menu = ko.observableArray([
	{ title: 'Home', icon: 'home', href: viewModel.appName + 'page/home', submenu: [] },
	{ title: 'P&L Performance', icon: 'tachometer', href: viewModel.appName + 'page/pnlperformance', submenu: [] },
	{ title: 'YoY Rev & EBIT', icon: 'bar-chart-o', href: viewModel.appName + 'page/yearcompare', submenu: [] },
	{ title: 'Marketing Efficiency', icon: 'bar-chart-o', href: viewModel.appName + 'page/marketingefficiency', submenu: [] },
	{ title: 'Analysis', icon: 'bar-chart-o', href: '#', submenu: [
		{"title":"Branch Analysis","icon":"bar-chart-o","href":"/web/page/branchanalysis","submenu":[]},
		{"title":"Branch Group Analysis","icon":"bar-chart-o","href":"/web/page/branchgroupanalysis","submenu":[]},
		{"title":"Branch vs RD Analysis","icon":"bar-chart-o","href":"/web/page/rdvsbranchanalysis","submenu":[]},
		{"title":"Brand Analysis","icon":"bar-chart-o","href":"/web/page/brandanalysis","submenu":[]},
		{"title":"Contribution Analysis","icon":"bar-chart-o","href":"/web/page/contributionanalysis","submenu":[]},
		{"title":"Custom Analysis","icon":"bar-chart-o","href":"/web/page/customanalysis","submenu":[]},
		{"title":"Distribution Analysis","icon":"bar-chart-o","href":"/web/page/distributionanalysis","submenu":[]},
		{"title":"G&A Analysis","icon":"bar-chart-o","href":"/web/page/gnaanalysis","submenu":[]},
		{"title":"Growth Analysis","icon":"bar-chart-o","href":"/web/page/growthanalysis","submenu":[]},
		// {"title":"Key Account Analysis","icon":"bar-chart-o","href":"/web/page/keyaccountanalysis","submenu":[]},
		{"title":"RD Analysis","icon":"bar-chart-o","href":"/web/page/rdanalysis","submenu":[]},
		{"title":"Sales Return Analysis","icon":"bar-chart-o","href":"/web/page/salesreturnanalysis","submenu":[]}
	] },
	{ title: 'Analysis Ideas', icon: 'bar-chart-o', href: viewModel.appName + 'page/reportdynamic?p=sales-by-outlet', submenu: [] },
	// { title: 'Report', icon: 'file-text-o', href: viewModel.appName + 'page/report/list', submenu: [] },
	{ title: 'Data Manager', icon: 'database', href: '#', submenu: [
		{ title: 'Data Browser', icon: 'list', href: viewModel.appName + 'page/databrowser', submenu: [] },
		// { title: 'Upload Data', icon: 'upload', href: viewModel.appName + 'page/uploaddata', submenu: [] }
	] },
	// { title: 'Organization', icon: 'sitemap', href: viewModel.appName + 'page/organization', submenu: [] },
	{ title: 'Administration', icon: 'gear', href: '#', submenu: [
		// { title: 'Allocation Flow', icon: 'arrows', href: viewModel.appName + 'page/allocationflow', submenu: [] },
		{ title: 'Access', icon: 'unlock-alt', href: viewModel.appName + 'page/access', submenu: [] },
		{ title: 'Group', icon: 'users', href: viewModel.appName + 'page/group', submenu: [] },
		{ title: 'User', icon: 'user', href: viewModel.appName + 'page/user', submenu: [] },
		{ title: 'Session', icon: 'clock-o', href: viewModel.appName + 'page/session', submenu: [] },
		{ title: 'Log', icon: 'book', href: viewModel.appName + 'page/log', submenu: [] },
		{ title: 'Admin Collection', icon: 'table', href: viewModel.appName + 'page/admintable', submenu: [] }
	] }
])

vm.breadcrumb = ko.observableArray([
	{ title: 'Godrej', href: '#' },
	{ title: 'Dashboard', href: '#' }
])

vm.menuIcon = (data) => ko.computed(() => `fa fa-${data.icon}`)

vm.prepareDropDownMenu = () => {
	$('ul.nav li.dd-hover').hover(function() {
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
vm.showFilterCallback = toolkit.noop
vm.showFilter = () => {
	let btnToggleFilter = $('.btn-toggle-filter')
	let panelFilterContainer = $('.panel-filter').parent()

	panelFilterContainer.removeClass('minimized')
	btnToggleFilter.find('.fa')
		.removeClass('color-blue').addClass('color-orange')
		.removeClass('fa-angle-double-right').addClass('fa-angle-double-left')

	$('.panel-filter').show(300)
	$('.panel-content').animate({ 'width': 'auto' }, 300, vm.showFilterCallback)
}
vm.hideFilterCallback = toolkit.noop
vm.hideFilter = () => {
	let btnToggleFilter = $('.btn-toggle-filter')
	let panelFilterContainer = $('.panel-filter').parent()

	panelFilterContainer.addClass('minimized')
	btnToggleFilter.find('.fa')
		.removeClass('color-orange').addClass('color-blue')
		.removeClass('fa-angle-double-left').addClass('fa-angle-double-right')

	$('.panel-filter').hide(300)
	$('.panel-content').animate({ 'width': '100%' }, 300, vm.hideFilterCallback)
}
vm.prepareToggleFilter = () => {
	let btnToggleFilter = $('.btn-toggle-filter')
	let panelFilterContainer = $('.panel-filter').parent()

	$('<i class="fa fa-angle-double-left tooltipster align-center color-orange" title="Toggle filter pane visibility"></i>').appendTo(btnToggleFilter)
	toolkit.prepareTooltipster($(btnToggleFilter).find('.fa'))

	btnToggleFilter.on('click', () => {
		if (panelFilterContainer.hasClass('minimized')) {
			vm.showFilter()
		} else {
			vm.hideFilter()
		}
	})
}
vm.prepareLoader = () => {
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
	toolkit.ajaxPost(viewModel.appName + 'login/logout', { }, (res) => {
		if (!toolkit.isFine(res)) {
			return;
		}
		swal({
			title: 'Logout Success',
			text: 'Will automatically redirect to login page in 3 seconds',
			type: 'success',
			timer: 3000,
			showConfirmButton: false
		}, () => {
			location.href = viewModel.appName + 'page/login'
		});
	})
}

$(() => {
	vm.prepareDropDownMenu()
	vm.prepareFilterToggle()
	vm.adjustLayout()
	vm.prepareToggleFilter()
	toolkit.prepareTooltipster()
	vm.prepareLoader()
})