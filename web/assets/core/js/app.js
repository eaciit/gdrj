'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

viewModel.app = new Object();
var app = viewModel.app;

app.miniloader = ko.observable(false);
app.noop = function () {};
app.ajaxPost = function (url, data, callbackSuccess, callbackError, otherConfig) {
    var startReq = moment();
    var callbackScheduler = function callbackScheduler(callback) {
        app.miniloader(false);
        callback();
    };

    if ((typeof callbackSuccess === 'undefined' ? 'undefined' : _typeof(callbackSuccess)) == 'object') {
        otherConfig = callbackSuccess;
        callbackSuccess = app.noop;
        callbackError = app.noop;
    }

    if ((typeof callbackError === 'undefined' ? 'undefined' : _typeof(callbackError)) == 'object') {
        otherConfig = callbackError;
        callbackError = app.noop;
    }

    var params = typeof data === 'undefined' ? {} : ko.mapping.toJSON(data);

    var config = {
        url: url,
        type: 'post',
        dataType: 'json',
        contentType: 'application/json charset=utf-8',
        data: params,
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

    if (config.hasOwnProperty('withLoader')) {
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
    return '' + d[0].toUpperCase() + d.slice(1);
};
app.is = function (observable, comparator) {
    var a = typeof observable === 'function' ? observable() : observable;
    var b = typeof comparator === 'function' ? comparator() : comparator;

    return a === b;
};
app.isNot = function (observable, comparator) {
    var a = typeof observable === 'function' ? observable() : observable;
    var b = typeof comparator === 'function' ? comparator() : comparator;

    return a !== b;
};
app.showError = function (message) {
    return sweetAlert('Oops...', message, 'error');
};
app.isFine = function (res) {
    if (!res.success) {
        sweetAlert('Oops...', res.message, 'error');
        return false;
    }

    return true;
};
app.isFormValid = function (selector) {
    app.resetValidation(selector);
    var $validator = $(selector).data('kendoValidator');
    return $validator.validate();
};
app.resetValidation = function (selectorID) {
    var $form = $(selectorID).data('kendoValidator');
    if (!$form) {
        $(selectorID).kendoValidator();
        $form = $(selectorID).data('kendoValidator');
    }

    try {
        $form.hideMessages();
    } catch (err) {}
};
app.prepareTooltipster = function ($o) {
    var $tooltipster = $o == undefined ? $('.tooltipster') : $o;

    $tooltipster.tooltipster({
        theme: 'tooltipster-val',
        animation: 'grow',
        delay: 0,
        offsetY: -5,
        touchDevices: false,
        trigger: 'hover',
        position: "top"
    });
};