'use strict';

vm.currentMenu('Administration');
vm.currentTitle("Group");
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Administration', href: '#' }, { title: 'Group', href: '/group' }]);

viewModel.Group = new Object();
var gr = viewModel.Group;

gr.templateGroup = {
    _id: "",
    Title: "",
    Enable: false,
    Owner: "",
    GroupType: "0",
    Grants: [],
    Filter: "",
    LoginID: "",
    Fullname: "",
    Email: ""
};
gr.templateGrants = {
    AccessCreate: false,
    AccessRead: false,
    AccessUpdate: false,
    AccessDelete: false,
    AccessSpecial1: false,
    AccessSpecial2: false,
    AccessSpecial3: false,
    AccessSpecial4: false
};
gr.templateFilter = {
    search: ""
};
gr.TableColumns = ko.observableArray([{ headerTemplate: "<center><input type='checkbox' class='deletecheckall' onclick=\"gr.checkDeleteData(this, 'deleteall', 'all')\"/></center>", attributes: { style: "text-align: center;" }, width: 40, template: function template(d) {
        return ["<input type='checkbox' class='deletecheck' idcheck='" + d._id + "' onclick=\"gr.checkDeleteData(this, 'delete')\" />"].join(" ");
    } }, {
    field: "_id",
    title: "ID"
}, {
    field: "title",
    title: "Title"
}, {
    field: "enable",
    title: "Enable"
}, {
    field: "owner",
    title: "Owner"
}, {
    headerTemplate: "<center>Action</center>", width: 100,
    template: function template(d) {
        return ["<button class='btn btn-sm btn-warning'><span class='fa fa-calculator' onclick='ec.editData(\"" + d._id + "\")'></span></button>"].
        // "<div onclick='ed.showFormulaEditor("+d.Index+", "+d+")'>"+d.FormulaText.join('')+"</div>",
        join(" ");
    }
}]);

gr.filter = ko.mapping.fromJS(gr.templateFilter);
gr.config = ko.mapping.fromJS(gr.templateGroup);
gr.isNew = ko.observable(false);
gr.tempCheckIdDelete = ko.observableArray([]);
gr.selectedTableID = ko.observable("");

gr.checkDeleteData = function (elem, e) {
    if (e === 'delete') {
        if ($(elem).prop('checked') === true) gr.tempCheckIdDelete.push($(elem).attr('idcheck'));else gr.tempCheckIdDelete.remove(function (item) {
            return item === $(elem).attr('idcheck');
        });
    }
    if (e === 'deleteall') {
        if ($(elem).prop('checked') === true) {
            $('.deletecheck').each(function (index) {
                $(this).prop("checked", true);
                gr.tempCheckIdDelete.push($(this).attr('idcheck'));
            });
        } else {
            (function () {
                var idtemp = '';
                $('.deletecheck').each(function (index) {
                    $(this).prop("checked", false);
                    idtemp = $(this).attr('idcheck');
                    gr.tempCheckIdDelete.remove(function (item) {
                        return item === idtemp;
                    });
                });
            })();
        }
    }
};

gr.newData = function () {
    gr.isNew(true);
    $('#modalUpdate').modal('show');
    ko.mapping.fromJS(gr.templateGroup, gr.config);
};

gr.addGrant = function () {
    var datagrant = $.extend(true, {}, ko.mapping.toJS(gr.config));
    datagrant.Grants.push(gr.templateGrants);
    ko.mapping.fromJS(datagrant, gr.config);
};

gr.removeGrant = function (data) {
    gr.config.Grants.remove(data);
};

gr.editData = function (id) {
    gr.isNew(false);
    app.ajaxPost('/group/editgroup', { _id: id }, function (res) {
        if (!app.isFine(res)) {
            return;
        }

        $('#modalUpdate').modal('show');
        ko.mapping.fromJS(res.data, gr.config);
    }, function (err) {
        app.showError(err.responseText);
    }, {
        timeout: 5000
    });
};

gr.saveChanges = function () {
    if (!app.isFormValid(".form-group")) {
        return;
    }
    var parm = ko.mapping.toJS(gr.config);
    parm.GroupType = parseInt(parm.GroupType);
    app.ajaxPost('/group/savegroup', parm, function (res) {
        if (!app.isFine(res)) {
            return;
        }

        $('#modalUpdate').modal('hide');
        gr.refreshDataBrowser();
    }, function (err) {
        app.showError(err.responseText);
    }, {
        timeout: 5000
    });
};

gr.refreshData = function () {
    $('.grid-group').data('kendoGrid').dataSource.read();
};

gr.deletegroup = function () {
    if (gr.tempCheckIdDelete().length === 0) {
        swal({
            title: "",
            text: 'You havent choose any group to delete',
            type: "warning",
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "OK",
            closeOnConfirm: true
        });
    } else {
        swal({
            title: "Are you sure?",
            text: 'Data group(s) ' + gr.tempCheckIdDelete().toString() + ' will be deleted',
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Delete",
            closeOnConfirm: true
        }, function () {
            setTimeout(function () {
                app.ajaxPost("/group/deletegroup", { _id: gr.tempCheckIdDelete() }, function (res) {
                    if (!app.isFine(res)) {
                        return;
                    }
                    gr.refreshDataBrowser();
                    swal({ title: "Data group(s) successfully deleted", type: "success" });
                });
            }, 1000);
        });
    }
};

gr.generateGrid = function () {
    $(".grid-group").html("");
    $('.grid-group').kendoGrid({
        dataSource: {
            transport: {
                read: {
                    url: "/group/getaccessgroup",
                    dataType: "json",
                    data: ko.mapping.toJS(gr.filter),
                    type: "POST",
                    success: function success(data) {
                        $(".grid-group>.k-grid-content-locked").css("height", $(".grid-group").data("kendoGrid").table.height());
                    }
                }
            },
            schema: {
                data: function data(res) {
                    gr.selectedTableID("show");
                    app.loader(false);
                    return res.data.Datas;
                },
                total: "data.total"
            },

            pageSize: 10,
            serverPaging: true, // enable server paging
            serverSorting: true
        },
        // selectable: "multiple, row",
        // change: ac.selectGridAccess,
        resizable: true,
        scrollable: true,
        // sortable: true,
        // filterable: true,
        pageable: {
            refresh: false,
            pageSizes: 10,
            buttonCount: 5
        },
        columns: gr.TableColumns()
    });
};

$(function () {
    gr.generateGrid();
    $("#modalUpdate").insertAfter("body");
});