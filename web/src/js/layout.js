var vm = viewModel

vm.pageTitle = ko.observable('Dashboard');
vm.menu = ko.observableArray([
	{ title: 'Dashboard', icon: 'home', href: '#', submenu: [] },
	{ title: 'Data', icon: 'user', href: '#', submenu: [
		{ title: 'Data Browser', href: '#', submenu: [] },
		{ title: 'Data Serializer', href: '#', submenu: [] },
		{ title: 'Web Grabber', href: '#', submenu: [] },
		{ title: 'File Browser', href: '#', submenu: [] }
	] },
	{ title: 'Admin', icon: 'gear', href: '#', submenu: [] }
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
	});
}

vm.prepareFilterToggle = () => {
	$('.material-switch input[type="checkbox"]').on('change', function() {
		let show = $(this).is(':checked')
		let $target = $(this).closest(".panel").find(".panel-filter")
		if (show) {
			$target.show(200)
		} else {
			$target.hide(200)
		}
	}).trigger('click')
}

$(() => {
	vm.prepareDropDownMenu()
	vm.prepareFilterToggle()
})