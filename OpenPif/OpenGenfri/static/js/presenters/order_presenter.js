'use strict';

/**
 * The presenter class.
 * The "P" of the {@link https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93presenter|MVP pattern}.
 * It stay in the middle between the model (store and AJAX calls) and the view (HTML DOM).
 * @class
 * @params {OrderModel} hModel
 * @params {PDFModel}   hPdfBill
 */
function orderPresenter (hModel) {
    var hMod = hModel,
        /** @type {Object} */
        ref = {
            /** @type {jQuery} */
            $Main              : $('main'),
            /** @type {jQuery} */
            $Aside             : $('aside'),
            /** @type {jQuery} */
            $CategoryContainer : $('.categories'),
            /** @type {jQuery} */
            $ProductsContainer : $('.products'),
            /** @type {jQuery} */
            $NameInput         : $('.customer-name'),
            /** @type {jQuery} */
            $PrintBtn          : $('.btn-print-bill'),
            /** @type {jQuery} */
            $ItemNotes         : $('.item-notes'),// TODO: Check if used
            /** @type {jQuery} */
            $AlertBtn          : $('.btn-ok-alert'),
            /** @type {jQuery} */
            $BillTable         : $('.billItems'),
            /** @type {jQuery} */
            $BillTotal         : $('.billTotal'),
            /** @type {jQuery} */
            $AlertPanel        : $('.alert-panel'),
            /** @type {jQuery} */
            $AlertMessage      : $('.alert-message'),
            /** @type {jQuery} */
            $Mask              : $('.mask'),
            /** @type {String} */
            sTplBillCategory    : $('.billCategoryRow').html(),
            /** @type {String} */
            sTplBillItem        : $('.billItemRow').html(),
            /** @type {String} */
            sTplBillNotes       : $('billItemNotes').html(),
            /** @type {String} */
            sTplBillSeparator   : $('billSeparatorRow').html()
        },
        /** @type {HTMLAnchorElement} */
        elPrintBtn          = document.getElementsByClassName('btn-print-bill')[0],
        /** @type {HTMLTableElement} */
        elBillTable         = document.getElementsByClassName('billItems')[0],
        /** @type {HTMLTableCellElement} */
        elBillTotal         = document.getElementsByClassName('billTotal')[0],
        /** @type {HTMLDivElement} */
        elAlertPanel        = document.getElementsByClassName('alert-panel')[0],
        /** @type {HTMLDivElement} */
        elAlertMessage      = document.getElementsByClassName('alert-message')[0],
        /** @type {HTMLDivElement} */
        elMask              = document.getElementsByClassName('mask')[0],
        /** @type {String} */
        sTplBillCategory    = document.getElementsByClassName('billCategoryRow')[0].innerHTML,
        /** @type {String} */
        sTplBillItem        = document.getElementsByClassName('billItemRow')[0].innerHTML,
        /** @type {String} */
        sTplBillNotes       = document.getElementsByClassName('billItemNotes')[0].innerHTML,
        /** @type {String} */
        sTplBillSeparator   = document.getElementsByClassName('billSeparatorRow')[0].innerHTML,

        fnAttachEvents = function () {
            hMod.on('addToBill', addToBill);
            hMod.on('refreshButtons', refreshButtons);

            ref.$CategoryContainer.on('click touch', 'a', onClickBtnCategory);
            ref.$ProductsContainer.on('click touch', onClickBtnProduct);
            ref.$Aside.on('click touch', onClickMenu);
            ref.$Aside.on('keyup', onKeyupMenu);
            ref.$Main.on('dragstart', disableEvent);
            ref.$AlertBtn.on('click touch', onClickBtnAlert);
        };

    /**
     * @private
     */
    function onClickBtnCategory (evt) {
        evt.preventDefault();
        filterCategory(evt.target);
    }

    function onClickBtnProduct (evt) {
        evt.preventDefault();
        if (evt.target.tagName === 'A' && !evt.target.parentNode.classList.contains('disabled')) {
            orderProduct(evt.target);
        }
    }

    function onClickMenu (evt) {
        evt.preventDefault();
        if (evt.target.tagName === 'A') {
            if (evt.target.classList.contains('add')) {
                incrementProduct(evt.target);
            } else if (evt.target.classList.contains('remove')) {
                decrementProduct(evt.target);
            } else if (evt.target === elPrintBtn) {
                sendBill(evt.target);
            }
        }
    }

    function onKeyupMenu (evt) {
        evt.preventDefault();
        if (evt.target.tagName === 'INPUT') {
            ref.$PrintBtn.toggleClass('disabled', evt.target.value.length <= 2);
        } else if (evt.target.tagName === 'TEXTAREA') {
            addNotesToProduct(evt.target);
        }
    }

    function onClickBtnAlert (evt) {
        evt.preventDefault();
        if (evt.target.tagName === 'A') {
            hideAlert();
        }
    }

    /**
     * Show the alert popup.
     * @param {String}  sText        The text to show into it.
     * @param {Boolean} [bShow=true] If `false` hide the alert.
     */
    function showAlert (sText, bShow) {
        if (bShow === false) {
            hideAlert();
        } else {
            elAlertMessage.innerHTML = sText || '';
            elAlertPanel.classList.remove('hidden');
            elMask.classList.remove('hidden');
        }
    }

    /**
     * Hide the alert popup.
     */
    function hideAlert () {
        elAlertPanel.classList.add('hidden');
        elMask.classList.add('hidden');
    }

    /**
     * Filter articles via category button.
     * @param {HTMLAnchorElement} elCategoryBtn The category button.
     */
    function filterCategory (elCategoryBtn) {
        var $CategoryBtn = $(elCategoryBtn),
            nId = parseInt($CategoryBtn.data('id'), 10),
            $ToFilterButtons = $('.products .category-' + nId),
            $AllItemButtons = $('.products li'),
            $AllCategoryButtons = $('.categories a');

        // Remove filter
        if ($CategoryBtn.hasClass('filtered')) {
            $AllCategoryButtons.removeClass('filtered');
            $AllItemButtons.show();
        // Add filter
        } else {
            $AllCategoryButtons.removeClass('filtered');
            $CategoryBtn.addClass('filtered');
            $AllItemButtons.hide();
            $ToFilterButtons.show();
        }
    }

    /**
     * Order a product via it's button.
     * @param {HTMLAnchorElement} elProductBtn The product button.
     */
    function orderProduct (elProductBtn) {
        var nId    = parseInt(elProductBtn.dataset.id,       10),
            nIdCat = parseInt(elProductBtn.dataset.category, 10);

        hMod.addProduct({
            id       : nId,
            category : nIdCat,
            name     : elProductBtn.innerHTML,
            qty      : 1,
            price    : parseFloat(elProductBtn.dataset.price),
            notes    : ""
        });
    }

    /**
     * Increment a product amount via it's button.
     * @param {HTMLAnchorElement} elProductBtn The product button.
     */
    function incrementProduct (elProductBtn) {
        var nId = parseInt(elProductBtn.dataset.id, 10);

        hMod.incrementProduct({
            id  : nId,
            qty : 1
        });
    }

    function decrementProduct (elButton) {
        var nId = parseInt(elButton.dataset.id, 10);

        hMod.decrementProduct({
            id  : nId,
            qty : 1
        });
    }

    function addNotesToProduct (elTextarea) {
        var nId = parseInt(elTextarea.dataset.id, 10);

        hMod.addNotesToProduct({
            id    : nId,
            notes : elTextarea.value
        });
    }

    /**
     * Add the items to the right bill container.
     *
     * @param {object} hBill The bill data coming from the model.
     * @param {object} hBill.items An object containing the items as a value and their id as a key.
     * @param {number} hBill.total The total amount of the whole bill.
     */
    function addToBill (hBill) {
        elBillTable.innerHTML = '';
        var sHTMLRow,
            hCat = hModel.getCategories(), 
            i,
            hItem,
            elTr,
            nLastCategory,
            aOrderedBill = orderBillByCategories(hBill.items),
            billLen = aOrderedBill.length,
            elSeparator = document.createElement('tr');

        elSeparator.innerHTML =  riot.render(sTplBillSeparator);

        for (i = 0; i < billLen; i++) {
            hItem = aOrderedBill[i];
            if (nLastCategory !== hItem.category) {
                if (i > 0) {
                    elBillTable.appendChild(elSeparator.cloneNode(true));
                }
                if (hCat[hItem.category]) {
                    elTr = document.createElement('tr');
                    elTr.innerHTML = riot.render(sTplBillCategory, {
                        name : hCat[hItem.category].name
                    });
                    elBillTable.appendChild(elTr);
                }
            }

            // Bill item
            sHTMLRow = riot.render(sTplBillItem, {
                id     : hItem.id,
                name   : hItem.name,
                amount : hItem.qty,
                price  : $.pif.formatPrice(hItem.qty * hItem.price)
            });
            elTr = document.createElement('tr');

            elTr.innerHTML = sHTMLRow;
            elBillTable.appendChild(elTr);

            //Notes
            elTr = document.createElement('tr');
            elTr.innerHTML = riot.render(sTplBillNotes, {
                id    : hItem.id,
                notes : hItem.notes
            });
            elBillTable.appendChild(elTr);

            nLastCategory = hItem.category
        }

        elBillTable.appendChild(elSeparator);

        // Total
        elBillTotal.innerHTML = $.pif.formatPrice(hBill.total) + ' &euro;';
    }

    /**
     * Group the bill items by category.
     *
     * @return object[] The items grouped by category.
     */
    function orderBillByCategories (hItems) {
        var aResults = [],
            nId,
            aCat = hModel.getCategories();

        for (nId in hItems) {
            aResults.push(hItems[nId]);
        }
        aResults.sort(function (hItem1, hItem2) {
            var nPriority1 = aCat[hItem1.category].priority,
                nPriority2 = aCat[hItem2.category].priority,
                nReturn = 0;

            if (nPriority1 < nPriority2) {
                nReturn = -1;
            } else if (nPriority1 > nPriority2) {
                nReturn = 1;
            } else if (hItem1.category < hItem2.category) {
                nReturn = -1;
            } else if (hItem1.category > hItem2.category) {
                nReturn = 1;
            }

            return nReturn;
        });

        return aResults;
    }

    /**
     * Validate the server response after the bill is sent to it.
     * @param {Object} hResponse The response object.
     * @param {Object} hResponse.errors      An object of articles with errors formatted as `{"Article_name" : max_quantity, ...}`.
     * @param {Number} hResponse.bill_id     The bill ID.
     * @param {String} hResponse.customer_id The customer ID.
     * @param {String} hResponse.date        The bill timestamp.
     * @param {Number} hResponse.total       The validated-by-server bill total.
     * @return {Boolean} `true` if everything is fine, `false` and print an error otherwise.
     */
    function validateBillResponse (hResponse) {
        // Response missing
        if (!hResponse) {
            // Items missing
            showAlert("<p>Il server non ha risposto correttamente</p>Ritenta o chiama un tecnico");
            return false;
        }
        if (!hResponse.bill_id) {
            var sName,
                aTxtSupply = [];

            for (sName in hResponse.errors) {
                aTxtSupply.push(hResponse.errors[sName] + ' ' + sName);
            }

            showAlert("<p>Disponibilità non sufficienti</p>È rimasto " + aTxtSupply.join('; '));
            return false;
        }
        // Total amount changed
        if (parseFloat(hResponse.total) !== hMod.getTotal()) {
            showAlert("<p>Totale variato</p>Il totale aggiornato è di " + $.pif.formatPrice(parseFloat(hResponse.total)) + " €");
            return false;
        }
        return true;
    }

    /**
     * Send the bill to the server and validate the response.
     * @param elBtn
     */
    function sendBill (elBtn) {
        if (elBtn.classList.contains('disabled') || hModel.billIsEmpty()) {
            return;
        }
        /**
         * Function that handle the AJAX response.
         * @param {Object} hResponse The response object.
         * @param {Object} hResponse.errors      An object of articles with errors formatted as `{"Article_name" : max_quantity, ...}`.
         * @param {Number} hResponse.bill_id     The bill ID.
         * @param {String} hResponse.customer_id The customer ID.
         * @param {String} hResponse.date        The bill timestamp.
         * @param {Number} hResponse.total       The validated-by-server bill total.
         * @param {String} hResponse.pdf_url     The PDF url to print it.
         */
        var fnAjaxSuccess = function (hResponse) {
                if (validateBillResponse(hResponse)) {
                    var hPrintWindow = window.open(hResponse.pdf_url),
                        isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
                    if (!isFirefox) {// Firefox PDF.js is buggy. Better to not trigger automatic print
                        hPrintWindow.print();
                    }
                    window.location.reload();
                }
            };

        hMod.commitBill(ref.$NameInput.val(), fnAjaxSuccess, function () {
            showAlert("<p>Errore di comunicazione col server</p>Ritenta o chiama un tecnico");
        });
    }

    function disableEvent (evt) {
        evt.preventDefault();
    }

    function getCategories () {
        var hCat = {};
        ref.$CategoryContainer.children().each(function (idx, elListItem) {
            var $Button = $('a', elListItem),
                nId = parseInt($Button.data('id'), 10);
            hCat[nId] = {
                id       : nId,
                name     : $Button.html(),
                priority : parseInt($Button.data('priority'), 10)
            };
        });

        return hCat;
    }

    function setUploadLoop () {
        return setInterval(function () {
            hMod.getUpdates();
        }, 1000 * 1);
    }

    function refreshButtons (hItems) {
        var sName,
            aValues,
            nQty,
            $Button,
            elButton;

        for (sName in hItems) {
            aValues = hItems[sName];
            nQty = aValues[0];
            $Button = $("[data-name='" + sName +"']");
            elButton = $Button.get(0);
            if (nQty !== null && nQty <= 5) {
                $Button.addClass('badge');
                elButton.dataset.badge = nQty;
                $Button.toggleClass('disabled', nQty === 0);
            } else {
                $Button.removeClass('badge');
                delete elButton.dataset.badge
            }
        }
    }

    fnAttachEvents();

    hMod.setCategories(getCategories());
    setUploadLoop();
}

orderPresenter(new OrderModel());
