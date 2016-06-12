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
	{ field: "collection", title: "Collection" },
	{ field: "lastupdate", title: "Last Update", template:'# if (created == "0001-01-01T00:00:00Z") {#-#} else {# #:moment(created).utc().format("DD-MMM-YYYY HH:mm:ss")# #}#' },
	{ title: "Action", width: 80, attributes: { class: "align-center" }, template:"<button onclick='at.deletecollection(\"#:_id #\")' name='deletecollection' type='button' class='btn btn-sm btn-default btn-text-danger btn-stop tooltipster' title='Delete Collection'><span class='fa fa-times'></span></button>" }
])

at.contentIsLoading = ko.observable(false)
at.selectedTableID = ko.observable("")
at.filter = ko.mapping.fromJS(at.templateFilter)

at.refreshData = () => {
    at.contentIsLoading(true)
	$('.grid-at').data('kendoGrid').dataSource.read()
}

at.clearcollection = () => {
    app.ajaxPost("/admintable/clearcollection", {}, (res) => {
        at.refreshData()
    })
}

at.deletecollection = (idtable) => {
    console.log(idtable)
    // app.ajaxPost("/admintable/deletecollection", {idtable: idtable}, (res) => {
    //     at.refreshData()
    // })
}

at.generateGrid = () => {
	$(".grid-at").html("");
    $('.grid-at').kendoGrid({
        dataSource: {
            transport: {
                read: {
                    url: "/admintable/getadmintable",
                    dataType: "json",
                    data: ko.mapping.toJS(at.filter),
                    type: "POST",
                    success: function(data) {

                    }
                }
            },
            schema: {
                data: function(res){
                    at.contentIsLoading(false);
                    return res.data.Datas;
                },
                total: "data.total"
            },

            pageSize: 10,
            serverPaging: true,
            serverSorting: true,
        },
        resizable: true,
        scrollable: true,
        pageable: {
            refresh: false,
            pageSizes: 10,
            buttonCount: 5
        },
        columns: at.TableColumns()
    })
}

$(() => {
    at.generateGrid()
})