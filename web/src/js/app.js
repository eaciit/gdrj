viewModel.app = new Object()
let app = viewModel.app

app.loader = ko.observable(false)
app.noop = (() => {})
app.ajaxPost = (url, data, callbackSuccess, callbackError, otherConfig) => {
    let startReq = moment()
    let callbackScheduler = (callback) => {
        app.loader(false)
        callback()
    }

    if (typeof callbackSuccess == 'object') {
        otherConfig = callbackSuccess
        callbackSuccess = app.noop
        callbackError = app.noop
    } 

    if (typeof callbackError == 'object') {
        otherConfig = callbackError
        callbackError = app.noop
    } 

    let params = (typeof data === 'undefined') ? {} : ko.mapping.toJSON(data)

    let config = {
        url: url,
        type: 'post',
        dataType: 'json',
        contentType: 'application/json charset=utf-8',
        data: params,
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

    if (config.hasOwnProperty('withLoader')) {
        if (config.withLoader) {
            app.loader(true)
        }
    } else {
        app.loader(true)
    }

    return $.ajax(config)
}
app.seriesColorsGodrej = ['#e7505a', '#66b23c', '#3b79c2']
app.randomRange = (min, max) => (Math.floor(Math.random() * (max - min + 1)) + min)
app.capitalize = (d) => `${d[0].toUpperCase()}${d.slice(1)}`
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
app.capitalize = (s) => (s.length == 0 ? '' : (s[0].toUpperCase() + s.slice(1)))
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