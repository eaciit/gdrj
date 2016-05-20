"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

viewModel.app = new Object();
var app = viewModel.app;

app.noop = function () {};
app.miniloader = ko.observable(false);
app.ajaxPost = function (url, data, callbackSuccess, callbackError, otherConfig) {
    var startReq = moment();
    var callbackScheduler = function callbackScheduler(callback) {
        app.miniloader(false);
        callback();
    };

    if ((typeof callbackSuccess === "undefined" ? "undefined" : _typeof(callbackSuccess)) == "object") {
        otherConfig = callbackSuccess;
        callbackSuccess = app.noop;
        callbackError = app.noop;
    }

    if ((typeof callbackError === "undefined" ? "undefined" : _typeof(callbackError)) == "object") {
        otherConfig = callbackError;
        callbackError = app.noop;
    }

    var config = {
        url: url,
        type: 'post',
        dataType: 'json',
        contentType: 'application/json charset=utf-8',
        data: ko.mapping.toJSON(data),
        success: function success(a) {
            callbackScheduler(function () {
                if (callbackSuccess) {
                    callbackSuccess(a);
                }
            });
        },
        error: function error(a, b, c) {
            callbackScheduler(function () {
                if (callbackError) {
                    callbackError(a, b, c);
                }
            });
        }
    };

    if (data instanceof FormData) {
        delete config.config;
        config.data = data;
        config.async = false;
        config.cache = false;
        config.contentType = false;
        config.processData = false;
    }

    if (otherConfig != undefined) {
        config = $.extend(true, config, otherConfig);
    }

    if (config.hasOwnProperty("withLoader")) {
        if (config.withLoader) {
            app.miniloader(true);
        }
    } else {
        app.miniloader(true);
    }

    return $.ajax(config);
};
app.seriesColorsGodrej = ['#e7505a', '#66b23c', '#3b79c2'];
app.randomRange = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
app.capitalize = function (d) {
    return "" + d[0].toUpperCase() + d.slice(1);
};
app.isFine = function (res) {
    if (!res.success) {
        sweetAlert("Oops...", res.message, "error");
        return false;
    }

    return true;
};