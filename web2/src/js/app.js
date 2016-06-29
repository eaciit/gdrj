viewModel.app = new Object()
let app = viewModel.app

app.dev = ko.observable(true)
app.noop = (() => {})
app.noob = {}
app.log = function () {
    if (!app.dev()) {
        return
    }

    console.log.apply(console, [].slice.call(arguments))
}
app.error = function () {
    if (!app.dev()) {
        return
    }

    console.error.apply(console, [].slice.call(arguments))
}
app.validateNumber = (d, df = 0) => (isNaN(d) || !isFinite(d)) ? df : d
app.isLastItem = (o, d) => (o.indexOf(d) + 1) == o.length
app.NaNable = (o, dv = 0) => isNaN(o) ? dv : o
app.nbspAble = (o, dv = '&nbsp;') => ($.trim(o) == '') ? dv : o
app.allKeys = (o) => {
    let keys = []
    for (let k in o) {
        if (o.hasOwnProperty(k)) {
            keys.push(String(k))
        }
    }
    return keys
}
app.length = (o) => {
    if (o instanceof Object) {
        let i = 0
        for (let k in o) {
            if (o.hasOwnProperty(k)) {
                i++
            }
        }
        return i
    }

    return o.length
}
app.getPropVal = (o, key, dv = null) => {
    if (!o.hasOwnProperty(key)) {
        return dv
    }

    return app.isUndefined(o[key]) ? dv : o[key]
}
app.isVoid = (o) => {
    if (app.isUndefined(o)) {
        return true
    }
    if (o == null) {
        return true
    }
    if (typeof o == 'string') {
        if ($.trim(o) == '') {
            return true
        }
    }

    return false
}
app.whenVoid = (o, df = null) => app.isVoid(o) ? df : o
app.hasProp = (o, key) => o.hasOwnProperty(key)
app.ajaxPost = (url, data = {}, callbackSuccess = app.noop, callbackError = app.noop, otherConfig = app.noob) => {
    let startReq = moment()

    let params = ko.mapping.toJSON(app.noob)
    try { params = ko.mapping.toJSON(data) } catch (err) { }

    let cache = app.getPropVal(otherConfig, 'cache', false)
    if (cache !== false) {
        if (app.hasProp(localStorage, cache)) {
            let data = JSON.parse(localStorage[cache])
            callbackSuccess(data)
            return
        }
    }

    let config = {
        url: url.toLowerCase(),
        type: 'post',
        dataType: 'json',
        contentType: 'application/json charset=utf-8',
        data: params,
        success: (a) => {
            if (cache !== '') {
                a.time = moment.now()
                localStorage[cache] = JSON.stringify(a)
            }
            
            callbackSuccess(a)
        },
        error: (a, b, c) => {
            callbackError(a, b, c)
        }
    }

    if (data instanceof FormData) {
        delete config.config
        config.data = data
        config.async = false
        config.cache = false
        config.contentType = false
        config.processData = false
    }

    config = $.extend(true, config, otherConfig)
    return $.ajax(config)
}
app.o = (raw) => raw
app.seriesColorsGodrej = ['#3498DB', '#28B463', '#F39C12', '#DB3434', '#34D3DB']
app.randomRange = (min, max) => (Math.floor(Math.random() * (max - min + 1)) + min)
app.capitalize = (d) => `${d[0].toUpperCase()}${d.slice(1)}`
app.typeIs = (target, comparator) => (typeof target === comparator)
app.is = (observable, comparator) => {
    let a = (typeof observable === 'function') ? observable() : observable
    let b = (typeof comparator === 'function') ? comparator() : comparator

    return a === b
}
app.isNot = (observable, comparator) => {
    let a = (typeof observable === 'function') ? observable() : observable
    let b = (typeof comparator === 'function') ? comparator() : comparator

    return a !== b
}
app.isDefined = (o) => !app.isUndefined(o)
app.isUndefined = (o) => {
    return (typeof o === 'undefined')
}
app.showError = (message) => sweetAlert('Oops...', message, 'error')
app.isFine = (res) => {
    if (!res.success) {
        sweetAlert('Oops...', res.message, 'error')
        return false
    }

    return true
}
app.isFormValid = (selector) => {
    app.resetValidation(selector)
    let $validator = $(selector).data('kendoValidator')
    return ($validator.validate())
}
app.resetValidation = (selectorID) => {
    let $form = $(selectorID).data('kendoValidator')
    if (!$form) {
        $(selectorID).kendoValidator()
        $form = $(selectorID).data('kendoValidator')
    }

    try {
        $form.hideMessages()
    } catch (err) {
        
    }
}
app.resetForm = ($o) => {
    $o.trigger('reset')
}
app.prepareTooltipster = ($o, argConfig) => {
    let $tooltipster = (typeof $o === 'undefined') ? $('.tooltipster') : $o

    $tooltipster.each((i, e) => {
        let position = 'top'

        if ($(e).attr('class').search('tooltipster-') > -1) {
            position = $(e).attr('class').split(' ').find((d) => d.search('tooltipster-') > -1).replace(/tooltipster\-/g, '')
        }

        let config = {
            theme: 'tooltipster-val',
            animation: 'grow',
            delay: 0,
            offsetY: -5,
            touchDevices: false,
            trigger: 'hover',
            position: position,
            content: $('<div />').html($(e).attr('title'))
        }
        if (typeof argConfig !== 'undefined') {
            config = $.extend(true, config, argConfig)
        }

        $(e).tooltipster(config)
    })
}
app.gridBoundTooltipster = (selector) => {
    return () => {
        app.prepareTooltipster($(selector).find(".tooltipster"))
    }
}
app.redefine = (o, d) => (typeof o === 'undefined') ? d : o
app.capitalize = (s, isHardcore = false) => {
    s = app.redefine(s, '')

    if (isHardcore) {
        s = s.toLowerCase()
    }

    if (s.length == 0) {
        return ''
    }

    let res = s.split(' ')
        .map((d) => (d.length > 0) ? (d[0].toUpperCase() + d.slice(1)) : 0)
        .join(' ')
    return res
}
app.repeatAlphabetically = (prefix) => {
    return 'abcdefghijklmnopqrstuvwxyz'.split('').map((d) => `${prefix} ${d.toUpperCase()}`)
}
app.arrRemoveByIndex = (arr, index) => {
    arr.splice(index, 1)
}
app.arrRemoveByItem = (arr, item) => {
    let index = arr.indexOf(item)
    if (index > -1) {
        app.arrRemoveByIndex(arr, index)
    }
}
app.clone = (o) => {
    return $.extend(true, { }, o)
}
app.distinct = (arr) => {
    return arr.filter((v, i, self) => self.indexOf(v) === i)
}
app.forEach = (d, callback) => {
    if (d instanceof Array) {
        d.forEach(callback)
    }
    
    if (d instanceof Object) {
        for (let key in d) {
            if (d.hasOwnProperty(key)) {
                callback(key, d[key])
            }
        }
    }
}

app.koMap = ko.mapping.fromJS
app.koUnmap = ko.mapping.toJS
app.observ = ko.observable
app.observArr = ko.observArr

app.randomString = (length = 5) => Math.random().toString(36).substring(2, length)

app.latLngIndonesia = { lat: -1.8504955, lng: 117.4004627 }
app.randomGeoLocations = (center = app.latLngIndonesia, radius = 1000000, count = 100) => {
    let generateRandomPoint = (center, radius) => {
        var x0 = center.lng
        var y0 = center.lat

        // Convert Radius from meters to degrees.
        var rd = radius / 111300

        var u = Math.random()
        var v = Math.random()

        var w = rd * Math.sqrt(u)
        var t = 2 * Math.PI * v
        var x = w * Math.cos(t)
        var y = w * Math.sin(t)

        var xp = x / Math.cos(y0)

        return {
            name: app.randomString(10),
            latlng : [y + y0, xp + x0]
        }
    }

    var points = []
    for (var i = 0; i < count; i++) {
        points.push(generateRandomPoint(center, radius))
    }
    return points
}

app.split = (arr, separator = '', length = 0) => {
    if (length == 0) {
        return arr.split(separator)
    }

    let res = []
    let resJoin = []

    arr.split(separator).forEach((d, i) => {
        if (i < length) {
            res.push(d)
            return
        }

        resJoin.push(d)
    })

    res = res.concat(resJoin.join(separator))
    return res
}

app.extend = (which, klass) => {
    app.forEach(klass, (key, val) => {
        if (app.typeIs(val, 'function')) {
            let body = { value: val }

            if (app.typeIs(which, 'string')) {
                Object.defineProperty(window[which].prototype, key, body)
            } else {
                Object.defineProperty(target.prototype, key, body)
            }
        }
    })
}
app.newEl = (s) => $(`<${s} />`)
app.idAble = (s) => s
    .replace(/\./g, '_')
    .replace(/\-/g, '_')
    .replace(/\//g, '_')
    .replace(/ /g, '_')
app.logAble = function() {
    let args = [].slice.call(arguments)
    app.log(args)
    return args[0]
}
app.htmlDecode = (s) => {
    var elem = document.createElement('textarea');
    elem.innerHTML = s;
    return elem.value;
}
app.runAfter = (delay = 0, ...jobs) => {
    let doWork = () => {
        jobs.forEach((job) => { job() })
    }

    let timeout = setTimeout(() => doWork, delay)
    return timeout
}

viewModel.StringExt = new Object()
let s = viewModel.StringExt

s.toObject = function () {
    let source = String(this)
    try {
        return JSON.parse(source)
    } catch (err) {
        console.error(err)
        return {}
    }
}

app.extend('String', s)