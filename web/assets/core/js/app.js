'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

viewModel.app = new Object();
var app = viewModel.app;

app.dev = ko.observable(true);
app.noop = function () {};
app.noob = {};
app.log = function () {
    if (!app.dev()) {
        return;
    }

    console.log.apply(console, [].slice.call(arguments));
};
app.error = function () {
    if (!app.dev()) {
        return;
    }

    console.error.apply(console, [].slice.call(arguments));
};
app.isLastItem = function (o, d) {
    return o.indexOf(d) + 1 == o.length;
};
app.NaNable = function (o) {
    var dv = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
    return isNaN(o) ? dv : o;
};
app.nbspAble = function (o) {
    var dv = arguments.length <= 1 || arguments[1] === undefined ? '&nbsp;' : arguments[1];
    return $.trim(o) == '' ? dv : o;
};
app.allKeys = function (o) {
    var keys = [];
    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            keys.push(String(k));
        }
    }
    return keys;
};
app.length = function (o) {
    if (o instanceof Object) {
        var i = 0;
        for (var k in o) {
            if (o.hasOwnProperty(k)) {
                i++;
            }
        }
        return i;
    }

    return o.length;
};
app.getPropVal = function (o, key) {
    var dv = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    if (!o.hasOwnProperty(key)) {
        return dv;
    }

    return app.isUndefined(o[key]) ? dv : o[key];
};
app.isVoid = function (o) {
    if (app.isUndefined(o)) {
        return true;
    }
    if (o == null) {
        return true;
    }
    if (typeof o == 'string') {
        if ($.trim(o) == '') {
            return true;
        }
    }

    return false;
};
app.whenVoid = function (o) {
    var df = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    return app.isVoid(o) ? df : o;
};
app.hasProp = function (o, key) {
    return o.hasOwnProperty(key);
};
app.ajaxPost = function (url) {
    var data = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
    var callbackSuccess = arguments.length <= 2 || arguments[2] === undefined ? app.noop : arguments[2];
    var callbackError = arguments.length <= 3 || arguments[3] === undefined ? app.noop : arguments[3];
    var otherConfig = arguments.length <= 4 || arguments[4] === undefined ? app.noob : arguments[4];

    var startReq = moment();

    var params = ko.mapping.toJSON(app.noob);
    try {
        params = ko.mapping.toJSON(data);
    } catch (err) {}

    var cache = app.getPropVal(otherConfig, 'cache', '');
    if (cache !== '') {
        if (app.hasProp(localStorage, cache)) {
            var _data = JSON.parse(localStorage[cache]);
            callbackSuccess(_data);
            return;
        }
    }

    var config = {
        url: url.toLowerCase(),
        type: 'post',
        dataType: 'json',
        contentType: 'application/json charset=utf-8',
        data: params,
        success: function success(a) {
            if (cache !== '') {
                a.time = moment.now();
                localStorage[cache] = JSON.stringify(a);
            }

            callbackSuccess(a);
        },
        error: function error(a, b, c) {
            callbackError(a, b, c);
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

    config = $.extend(true, config, otherConfig);
    return $.ajax(config);
};
app.o = function (raw) {
    return raw;
};
app.seriesColorsGodrej = ['#3498DB', '#28B463', '#F39C12'];
app.randomRange = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};
app.capitalize = function (d) {
    return '' + d[0].toUpperCase() + d.slice(1);
};
app.typeIs = function (target, comparator) {
    return (typeof target === 'undefined' ? 'undefined' : _typeof(target)) === comparator;
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
app.isDefined = function (o) {
    return !app.isUndefined(o);
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
app.redefine = function (o, d) {
    return typeof o === 'undefined' ? d : o;
};
app.capitalize = function (s) {
    var isHardcore = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    s = app.redefine(s, '');

    if (isHardcore) {
        s = s.toLowerCase();
    }

    if (s.length == 0) {
        return '';
    }

    var res = s.split(' ').map(function (d) {
        return d.length > 0 ? d[0].toUpperCase() + d.slice(1) : 0;
    }).join(' ');
    return res;
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
app.forEach = function (d, callback) {
    if (d instanceof Array) {
        d.forEach(callback);
    }

    if (d instanceof Object) {
        for (var key in d) {
            if (d.hasOwnProperty(key)) {
                callback(key, d[key]);
            }
        }
    }
};

app.koMap = ko.mapping.fromJS;
app.koUnmap = ko.mapping.toJS;
app.observ = ko.observable;
app.observArr = ko.observArr;

app.randomString = function () {
    var length = arguments.length <= 0 || arguments[0] === undefined ? 5 : arguments[0];
    return Math.random().toString(36).substring(2, length);
};

app.latLngIndonesia = { lat: -1.8504955, lng: 117.4004627 };
app.randomGeoLocations = function () {
    var center = arguments.length <= 0 || arguments[0] === undefined ? app.latLngIndonesia : arguments[0];
    var radius = arguments.length <= 1 || arguments[1] === undefined ? 1000000 : arguments[1];
    var count = arguments.length <= 2 || arguments[2] === undefined ? 100 : arguments[2];

    var generateRandomPoint = function generateRandomPoint(center, radius) {
        var x0 = center.lng;
        var y0 = center.lat;

        // Convert Radius from meters to degrees.
        var rd = radius / 111300;

        var u = Math.random();
        var v = Math.random();

        var w = rd * Math.sqrt(u);
        var t = 2 * Math.PI * v;
        var x = w * Math.cos(t);
        var y = w * Math.sin(t);

        var xp = x / Math.cos(y0);

        return {
            name: app.randomString(10),
            latlng: [y + y0, xp + x0]
        };
    };

    var points = [];
    for (var i = 0; i < count; i++) {
        points.push(generateRandomPoint(center, radius));
    }
    return points;
};

app.split = function (arr) {
    var separator = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];
    var length = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

    if (length == 0) {
        return arr.split(separator);
    }

    var res = [];
    var resJoin = [];

    arr.split(separator).forEach(function (d, i) {
        if (i < length) {
            res.push(d);
            return;
        }

        resJoin.push(d);
    });

    res = res.concat(resJoin.join(separator));
    return res;
};

app.extend = function (which, klass) {
    app.forEach(klass, function (key, val) {
        if (app.typeIs(val, 'function')) {
            var body = { value: val };

            if (app.typeIs(which, 'string')) {
                Object.defineProperty(window[which].prototype, key, body);
            } else {
                Object.defineProperty(target.prototype, key, body);
            }
        }
    });
};
app.newEl = function (s) {
    return $('<' + s + ' />');
};
app.idAble = function (s) {
    return s.replace(/\./g, '_').replace(/\-/g, '_').replace(/\//g, '_').replace(/ /g, '_');
};
app.logAble = function () {
    var args = [].slice.call(arguments);
    app.log(args);
    return args[0];
};
app.htmlDecode = function (s) {
    var elem = document.createElement('textarea');
    elem.innerHTML = s;
    return elem.value;
};
app.runAfter = function () {
    for (var _len = arguments.length, jobs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        jobs[_key - 1] = arguments[_key];
    }

    var delay = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    var doWork = function doWork() {
        jobs.forEach(function (job) {
            job();
        });
    };

    var timeout = setTimeout(function () {
        return doWork;
    }, delay);
    return timeout;
};

viewModel.StringExt = new Object();
var s = viewModel.StringExt;

s.toObject = function () {
    var source = String(this);
    try {
        return JSON.parse(source);
    } catch (err) {
        console.error(err);
        return {};
    }
};

app.extend('String', s);