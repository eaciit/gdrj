'use strict';

vm.currentTitle(o.Name);
vm.breadcrumb(vm.breadcrumb().concat([{ title: o.Name, href: o.ID }]));

vm.reportAnalysis = {};
var ra = vm.reportAnalysis;

ra.pivotModel = [{ field: '_id', type: 'string', name: 'ID' }, { field: 'PC._id', type: 'string', name: 'Profit Center - ID' }, { field: 'PC.EntityID', type: 'string', name: 'Profit Center - Entity ID' }, { field: 'PC.Name', type: 'string', name: 'Profit Center - Name' }, { field: 'PC.BrandID', type: 'string', name: 'Profit Center - Brand ID' }, { field: 'PC.BrandCategoryID', type: 'string', name: 'Profit Center - Brand Category ID' }, { field: 'PC.BranchID', type: 'string', name: 'Profit Center - Branch ID' }, { field: 'PC.BranchType', type: 'int', name: 'Profit Center - Branch Type' }, { field: 'CC._id', type: 'string', name: 'Cost Center - ID' }, { field: 'CC.EntityID', type: 'string', name: 'Cost Center - Entity ID' }, { field: 'CC.Name', type: 'string', name: 'Cost Center - Name' }, { field: 'CC.CostGroup01', type: 'string', name: 'Cost Center - Cost Group 01' }, { field: 'CC.CostGroup02', type: 'string', name: 'Cost Center - Cost Group 02' }, { field: 'CC.CostGroup03', type: 'string', name: 'Cost Center - Cost Group 03' }, { field: 'CC.BranchID', type: 'string', name: 'Cost Center - Branch ID' }, { field: 'CC.BranchType', type: 'string', name: 'Cost Center - Branch Type' }, { field: 'CC.CCTypeID', type: 'string', name: 'Cost Center - Type' }, { field: 'CC.HCCGroupID', type: 'string', name: 'Cost Center - HCC Group ID' }, { field: 'CompanyCode', type: 'string', name: 'Company Code' }, { field: 'LedgerAccount', type: 'string', name: 'Ledger Account' }, { field: 'Customer._id', type: 'string', name: 'Customer - ID' }, { field: 'Customer.BranchID', type: 'string', name: 'Customer - Branch ID' }, { field: 'Customer.BranchName', type: 'string', name: 'Customer - branch Name' }, { field: 'Customer.Name', type: 'string', name: 'Customer - Name' }, { field: 'Customer.KeyAccount', type: 'string', name: 'Customer - Key Account' }, { field: 'Customer.ChannelID', type: 'string', name: 'Customer - Channel ID' }, { field: 'Customer.ChannelName', type: 'string', name: 'Customer - Channel Name' }, { field: 'Customer.CustomerGroup', type: 'string', name: 'Customer - Customer Group' }, { field: 'Customer.CustomerGroupName', type: 'string', name: 'Customer - Customer Group Name' }, { field: 'Customer.National', type: 'string', name: 'Customer - National' }, { field: 'Customer.Zone', type: 'string', name: 'Customer - Zone' }, { field: 'Customer.Region', type: 'string', name: 'Customer - Region' }, { field: 'Customer.Area', type: 'string', name: 'Customer - Area' }, { field: 'Product._id', type: 'string', name: 'Product - ID' }, { field: 'Product.Name', type: 'string', name: 'Product - Name' }, { field: 'Product.ProdCategory', type: 'string', name: 'Product - Category' }, { field: 'Product.Brand', type: 'string', name: 'Product - Brand' }, { field: 'Product.BrandCategoryID', type: 'string', name: 'Product - Brand Category ID' }, { field: 'Product.PCID', type: 'string', name: 'Product - PCID' }, { field: 'Product.ProdSubCategory', type: 'string', name: 'Product - Sub Category' }, { field: 'Product.ProdSubBrand', type: 'string', name: 'Product - Sub Brand' }, { field: 'Product.ProdVariant', type: 'string', name: 'Product - Variant' }, { field: 'Product.ProdDesignType', type: 'string', name: 'Product - Design Type' }, { field: 'Date.ID', type: 'string', name: 'Date - ID' }, { field: 'Date.Date', type: 'string', name: 'Date - Date' }, { field: 'Date.Month', type: 'string', name: 'Date - Month' }, { field: 'Date.Quarter', type: 'int', name: 'Date - Quarter' }, { field: 'Date.YearTxt', type: 'string', name: 'Date - YearTxt' }, { field: 'Date.QuarterTxt', type: 'string', name: 'Date - QuarterTxt' }, { field: 'Date.Year', type: 'int', name: 'Date - Year' }, { field: 'PLGroup1', type: 'string', name: 'PL Group 1' }, { field: 'PLGroup2', type: 'string', name: 'PL Group 2' }, { field: 'PLGroup3', type: 'string', name: 'PL Group 3' }, { field: 'PLGroup4', type: 'string', name: 'PL Group 4' }, { field: 'Value1', type: 'double', name: 'Value 1', as: 'dataPoints' }, { field: 'Value2', type: 'double', name: 'Value 2', as: 'dataPoints' }, { field: 'Value3', type: 'double', name: 'Value 3', as: 'dataPoints' }, { field: 'PCID', type: 'string', name: 'Profit Center ID' }, { field: 'CCID', type: 'string', name: 'Cost Center ID' }, { field: 'SKUID', type: 'string', name: 'SKU ID' }, { field: 'PLCode', type: 'string', name: 'PL Code' }, { field: 'Month', type: 'string', name: 'Month' }, { field: 'Year', type: 'string', name: 'Year' }];

ra.data = ko.observableArray([]);
ra.optionDimensions = ko.observableArray([{ field: "customer.branchname", name: 'Branch/RD' }, { field: 'customer.channelname', name: 'Channel' }, { field: 'customer.region', name: 'Geography' }, { field: 'product.name', name: 'Product' }, { field: 'date.year', name: 'Time' }, { field: 'cc.cctypeid', name: 'Cost Type' }, // <<<<< ====================== need to be filled
{ field: 'cc.hccgroupid', name: 'Function' }]);
ra.optionDataPoints = ko.observableArray([{ field: 'value1', name: 'Value 1' }, { field: 'value2', name: 'Value 2' }, { field: 'value3', name: 'Value 3' }]);
ra.optionAggregates = ko.observableArray([{ aggr: 'sum', name: 'Sum' }, { aggr: 'avg', name: 'Avg' }, { aggr: 'max', name: 'Max' }, { aggr: 'min', name: 'Min' }]);
ra.setName = function (data, options) {
    return function () {
        setTimeout(function () {
            var row = options().find(function (d) {
                return d.field == data.field();
            });
            if (app.isDefined(row)) {
                data.name(row.name);
            }

            console.log(app.koUnmap(data), options());
        }, 150);
    };
};

rpt.refresh = function () {
    if (app.isDefined(pvt)) {
        pvt.refresh();
    }
    if (app.isDefined(rpt)) {
        rpt.refresh();
    }
    if (app.isDefined(crt)) {
        crt.refresh();
    }
};