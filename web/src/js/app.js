viewModel.app = new Object()
var app = viewModel.app

app.noop = (() => {})
app.ajaxPost = (url, data, callbackSuccess, callbackError, otherConfig) => {
    var startReq = moment()
    var callbackScheduler = (callback) => {
        app.miniloader(false)
        callback()
    }

    if (typeof callbackSuccess == "object") {
        otherConfig = callbackSuccess
        callbackSuccess = app.noop
        callbackError = app.noop
    } 

    if (typeof callbackError == "object") {
        otherConfig = callbackError
        callbackError = app.noop
    } 

    var config = {
        url: url,
        type: 'post',
        dataType: 'json',
        contentType: 'application/json charset=utf-8',
        data: ko.mapping.toJSON(data),
        success: (a) => {
            callbackScheduler(() => {
                if (callbackSuccess) {
                    callbackSuccess(a)
                }
            })
        },
        error: (a, b, c) => {
            callbackScheduler(() => {
                if (callbackError) {
                    callbackError(a, b, c)
                }
            })
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

    if (otherConfig != undefined) {
        config = $.extend(true, config, otherConfig)
    }

    if (config.hasOwnProperty("withLoader")) {
        if (config.withLoader) {
            app.miniloader(true)
        }
    } else {
        app.miniloader(true)
    }

    return $.ajax(config)
}
app.seriesColorsGodrej = ['#e7505a', '#66b23c', '#3b79c2']
app.randomRange = (min, max) => (Math.floor(Math.random() * (max - min + 1)) + min)
app.capitalize = (d) => `${d[0].toUpperCase()}${d.slice(1)}`