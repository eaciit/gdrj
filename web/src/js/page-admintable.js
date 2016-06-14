vm.currentMenu('Administration')
vm.currentTitle("Admin Table")
vm.breadcrumb([
	{ title: 'Godrej', href: '#' },
	{ title: 'Administration', href: '#' },
	{ title: 'Admin Table', href: '/admintable' }
])

viewModel.admintable = new Object()
let at = viewModel.admintable

at.templateFilter = {
    search: "",
}

at.TableColumns = ko.observableArray([
	{ title: "Table Name", template: (d) => {
        let step = 6
        let items = d.table.split("_")
        for (let i = 1; i < items.length / step; i++) {
            items.splice(i * step, 0, "<br />");
        }
        return items.join("_").replace(new RegExp("<br />_", "g"), "<br />")
    } },
	{ title: "Dimension", template: (d) => {
        return d.dimensions.map((e) => `<span class="tag bg-blue" style="margin-bottom: 3px; display: inline-block;">${e.replace(/_/g, '.')}</span>`).join(' ')
    } },
	{ title: "Action", width: 80, attributes: { class: "align-center" }, template:"<button onclick='at.deletecollection(\"#:table #\")' class='btn btn-sm btn-danger tooltipster' title='Delete Collection'><span class='fa fa-remove'></span></button>" }
])

at.contentIsLoading = ko.observable(false)
at.selectedTableID = ko.observable("")
at.filter = ko.mapping.fromJS(at.templateFilter)

at.gridData = ko.observableArray([])
at.gridConfig = {
    data: at.gridData,
    dataSource: {
        pageSize: 10,
    },
    resizable: true,
    pageable: {
        pageSizes: 10
    },
    columns: at.TableColumns(),
    gridBound: toolkit.gridBoundTooltipster('.grid-at')
}

at.refreshData = () => {
    at.contentIsLoading(true)
    toolkit.ajaxPost("/report/getplcollections", {}, (res) => {
        at.gridData(res.Data)
        at.contentIsLoading(false)
    })
}

at.clearcollection = () => {
    let allTables = at.gridData()

    swal({
        title: "Are you sure?",
        text: `All PL* table will be deleted.`,
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Delete",
        closeOnConfirm: true
    }, function() {
        setTimeout(function () {
            toolkit.ajaxPost("/report/deleteplcollection", { _id: allTables }, function (res) {
                at.refreshData()
            })
        }, 1000)
    })
}

at.deletecollection = (idtable) => {
    swal({
        title: "Are you sure?",
        text: `Table will be deleted.`,
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: "#DD6B55",
        confirmButtonText: "Delete",
        closeOnConfirm: true
    }, function() {
        setTimeout(function () {
            toolkit.ajaxPost("/report/deleteplcollection", { _id: [idtable] }, function (res) {
                at.refreshData()
            })
        }, 1000)
    })
}

$(() => {
    at.refreshData()
})