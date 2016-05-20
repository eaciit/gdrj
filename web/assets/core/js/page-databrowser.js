"use strict";

viewModel.dataBrowser = new Object();

vm.pageTitle("Data Browser");

var db = viewModel.dataBrowser;
db.createDataBrowser = function(table){
	app.ajaxPost("/databrowser/getdatabrowser", {tablename: table}, function(res){
		if(!app.isFine(res)){
			return;
		}
		if (!res.data) {
			res.data = [];
		}
		$('#grid-databrowser-decription').ecDataBrowser({
			title: "",
			widthPerColumn: 6,
			showFilter: "Simple",
			dataSource: { 
	                  url: "/databrowser/getdatabrowser",
	                  type: "post",
	                  callData: {tablename: table},
	                  fieldTotal: "DataCount",
	                  fieldData: "DataValue",
	                  serverPaging: true,
	                  pageSize: 10,
	                  serverSorting: true,
	                  callOK: function(res){
	                  	// console.log(res);
	                  }
	            },
			metadata: res.data.dataresult.MetaData,
		});
	}, {
		timeout: 10 * 1000
	});
};
db.selectTableName = function(e){
	var dataItem = this.dataItem(e.item);
	db.createDataBrowser(dataItem);
};