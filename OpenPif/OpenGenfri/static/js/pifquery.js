"use strict";

/**
 * Main PiF JavaScript utility class.
 * @class
 * @param {Object}  hConfig Base configurations.
 * @param {Object}  hConfig.ajax Base AJAX calls configurations.
 * @param {String}  hConfig.ajax.url          The URL to send the request to.
 * @param {String}  hConfig.ajax.method       The HTTP method to use, such as "GET", "POST", "PUT", "DELETE", etc. Ignored for non-HTTP(S) URLs.
 * @param {Boolean} [hConfig.ajax.async=true] An optional boolean parameter indicating whether or not to perform the operation asynchronously.
 * @param {Number}  [hConfig.ajax.timeout=0]  A value of 0 (which is the default) means there is no timeout.
 */
function PiFQuery (hConfig) {
    var that = this;

    hConfig      = hConfig      || {};
    hConfig.ajax = hConfig.ajax || {};

    /**
     * The settings.
     * @type {{ajax: {url: string, method: string, async: boolean, timeout: number}}}
     */
    that.config = {
        ajax : {
            url     : hConfig.ajax.url,
            method  : hConfig.ajax.method || "GET",
            async   : (hConfig.ajax.async === undefined) ? true : hConfig.ajax.async,
            timeout : hConfig.ajax.timeout || 0
        }
    };

    /**
     * @callback AjaxSuccess
     * @param {(Object|String)} response The response. If the response is a valid JSON returns an object.
     */
    /**
     * @callback AjaxFailure
     * @param {Number} status The failure status.
     */
    /**
     * Utility to make AJAX call to server.
     *
     * @param {Object}      hParams              The parameters to make the call.
     * @param {String}      [hParams.url='']     The url for the call.
     * @param {String}      [hParams.method]     The method. Should be "POST" or "GET".
     * @param               [hParams.params]     The parameters to send.
     * @param {Boolean}     [hParams.async=true] An optional boolean parameter indicating whether or not to perform the operation asynchronously.
     * @param {Number}      [hParams.timeout=0]  A value of 0 (which is the default) means there is no timeout.
     * @param {AjaxSuccess} [fnSuccess]          The success callback function.
     * @param {AjaxFailure} [fnFailure]          The failure callback function.
     */
    that.ajaxCall = function (hParams, fnSuccess, fnFailure) {
        hParams = hParams || {};
        var ajaxCfg     = that.config.ajax,
            sUrl        = hParams.url    || ajaxCfg.url,
            sMethod     = hParams.method || ajaxCfg.method,
            bAsync      = hParams.async  || ajaxCfg.async,
            hCallParams = hParams.params || {},
            nTimeout    = (hParams.timeout > 0) ? hParams.timeout : ajaxCfg.timeout;

        $.ajax({
            url     : sUrl,
            method  : sMethod,
            timeout : nTimeout,
            headers : {
                //HTTP_X_REQUESTED_WITH : 'XMLHttpRequest',
                "X-CSRFToken"         : that.getCookie('csrftoken')
            },
            async   : bAsync,
            data    : hCallParams,
            success : fnSuccess,
            error   : fnFailure
        });
    };

    that.getCookie = function (sKey) {
        if (!sKey) {
            return null;
        }
        return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
    };

    /**
     * Format a price in the italian way (with comma and 2 decimals: 1,00).
     * @param {Number} fValue The number to format.
     * @return {String} The formatted price.
     */
    that.formatPrice = function (fValue) {
        return that.formatNumber(fValue, 2);
    };

    /**
     * Format (and round) a number in the italian way (with comma).
     * @param {Number} fValue        The number to format.
     * @param {Number} [nDecimals=0] The number of decimals.
     * @returns {String} The formatted number.
     */
    that.formatNumber = function (fValue, nDecimals) {
        nDecimals = (nDecimals >= 0) ? parseInt(nDecimals, 10) : 0;
        return parseFloat(fValue).toFixed(nDecimals).replace('.', ',');
    };

    that.objectLength = function (hObject) {
        if (typeof hObject !== "object") {
            throw new TypeError(hObject + " is not an object");
        }

        var nLength = 0,
            mKey;

        // Polyfill for Object.keys()
        if (Object.hasOwnProperty("keys")) {
            nLength = Object.keys(hObject).length;
        } else {
            for (mKey in hObject) {
                nLength += 1;
            }
        }

        return nLength;
    }
}

if (!window.$) {
    window.$ = {};
}
$.pif = new PiFQuery({
    ajax : {
        url     : '',
        timeout : 30 * 1000,// 30s,
        method  : 'POST'
    }
});
