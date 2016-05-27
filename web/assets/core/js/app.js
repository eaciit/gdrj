'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

viewModel.app = new Object();
var app = viewModel.app;

app.loader = ko.observable(false);
app.noop = function () {};
app.ajaxPost = function (url, data, callbackSuccess, callbackError, otherConfig) {
    var startReq = moment();
    var callbackScheduler = function callbackScheduler(callback) {
        app.loader(false);
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
            app.loader(true);
        }
    } else {
        app.loader(true);
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
app.isUndefined = function (o) {
    return typeof o === 'undefined';
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
app.resetForm = function ($o) {
    $o.trigger('reset');
};
app.prepareTooltipster = function ($o, argConfig) {
    var $tooltipster = typeof $o === 'undefined' ? $('.tooltipster') : $o;

    $tooltipster.each(function (i, e) {
        var position = 'top';

        if ($(e).attr('class').search('tooltipster-') > -1) {
            position = $(e).attr('class').split(' ').find(function (d) {
                return d.search('tooltipster-') > -1;
            }).replace(/tooltipster\-/g, '');
        }

        var config = {
            theme: 'tooltipster-val',
            animation: 'grow',
            delay: 0,
            offsetY: -5,
            touchDevices: false,
            trigger: 'hover',
            position: position,
            content: $('<div />').html($(e).attr('title'))
        };
        if (typeof argConfig !== 'undefined') {
            config = $.extend(true, config, argConfig);
        }

        $(e).tooltipster(config);
    });
};
app.gridBoundTooltipster = function (selector) {
    return function () {
        app.prepareTooltipster($(selector).find(".tooltipster"));
    };
};
app.capitalize = function (s) {
    return s.length == 0 ? '' : s[0].toUpperCase() + s.slice(1);
};
app.repeatAlphabetically = function (prefix) {
    return 'abcdefghijklmnopqrstuvwxyz'.split('').map(function (d) {
        return prefix + ' ' + d.toUpperCase();
    });
};
app.arrRemoveByIndex = function (arr, index) {
    arr.splice(index, 1);
};
app.arrRemoveByItem = function (arr, item) {
    var index = arr.indexOf(item);
    if (index > -1) {
        app.arrRemoveByIndex(arr, index);
    }
};
app.clone = function (o) {
    return $.extend(true, {}, o);
};
app.distinct = function (arr) {
    return arr.filter(function (v, i, self) {
        return self.indexOf(v) === i;
    });
};