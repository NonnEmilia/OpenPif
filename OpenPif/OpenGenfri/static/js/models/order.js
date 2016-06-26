/**
 * The model. Manage the store and the AJAX calls.
 * @class
 */
function OrderModel () {
    var that        = riot.observable(this),
        /** @type {Object[]} The store. An object formatted as { id_item : { "category" : id_category, "id" : id_item, "name" : "item_name", "price" : item_price, "qty" : item_ordered_qty, "notes" : item_notes } } */
        aStore      = [],
        /** @type {Object} The categories object formatted as { id_number : { "id" : number, "name" : string, "priority" : number } */
        hCategories = {};

    /**
     * Add a product to the store.
     *
     * @param {Object} hProd The product object.
     * @param {Number} hProd.id       The product ID.
     * @param {Number} hProd.category The category ID.
     * @param {String} hProd.name     The product name.
     * @param {Number} hProd.qty      The ordered quantity.
     * @param {Number} hProd.price    The product price.
     * @param {String} hProd.notes    The product notes.
     * @param {Object} hProd.extras The product extras. Each has ID and quantity.
     */
    that.addProduct = function (hProd) {
        // var hStoredProd = aStore[hProd.id];
        var hStoredProd = that.findProduct(hProd);

        // Insert product into the store.
        if (!hStoredProd) {
            hStoredProd = $.extend({}, hProd);
            aStore.push(hStoredProd);
        } else {
            aStore[hStoredProd.idx].qty += hProd.qty;
        }
        hStoredProd.rowTotal = calculateRowTotal(hStoredProd);

        triggerAddToBill();
    };

    /**
     * Find a specified product in the store.
     *
     * @param {Object} hProd The product.
     *
     * @returns {Object|undefined} A product if exists, otherwise undefined. The product will have the new key `idx`
     *                             with its position within the array to find it easily.
     */
    that.findProduct = function (hProd) {
        var hStoredProduct    = undefined,
            nProdExtrasLength = 0;

        if (hProd.hasOwnProperty("extras") && typeof hProd.extras === "object") {
            nProdExtrasLength = $.pif.objectLength(hProd.extras);
        }

        $.each(aStore, function (nIdProduct, hProduct) {
            var nStoredExtrasLength = 0;

            if (hProduct.hasOwnProperty("extras") && typeof hProduct.extras === "object") {
                nStoredExtrasLength = $.pif.objectLength(hProduct.extras);
            }

            if (hProduct.id === hProd.id && nStoredExtrasLength === nProdExtrasLength) {
                var nMatchedExtra = 0;

                $.each(hProduct.extras, function (nIdExtra, hExtra) {
                    $.each(hProd.extras, function (nIdExt, hProdExtra) {
                        if (hExtra.id === hProdExtra.id) {
                            nMatchedExtra += 1;
                        }
                    });
                });

                // Same ID and same extras -> found!
                if (nMatchedExtra === nStoredExtrasLength) {
                    hStoredProduct = $.extend({}, hProduct);
                    hStoredProduct.idx = nIdProduct;// The array position to find it
                    return true;
                }
            }
        });

        return hStoredProduct;
    };

    /**
     * Increment quantity of a product.
     * @param {Object} hProd The product data.
     * @param {Number} nQty  The quantity to add.
     */
    that.incrementProduct = function (hProd, nQty) {
        var hStoreProd = that.findProduct(hProd);

        // Increment product already in the store
        if (hStoreProd) {
            hStoreProd.qty += nQty;
            hStoreProd.rowTotal = calculateRowTotal(hStoreProd);
            aStore[hStoreProd.idx] = hStoreProd;
            triggerAddToBill();
        }
    };

    /**
     * Decrement quantity of a product.
     * @param {Object} hProd The product data.
     * @param {Number} nQty  The quantity to subtract.
     */
    that.decrementProduct = function (hProd, nQty) {
        var hStoreProd = that.findProduct(hProd);

        // Decrement product already in the store. If the only delete it.
        if (hStoreProd) {
            var nFinalQty = hStoreProd.qty - nQty;
            if (nFinalQty > 0) {
                hStoreProd.qty = nFinalQty;
                hStoreProd.rowTotal = calculateRowTotal(hStoreProd);
                aStore[hStoreProd.idx] = hStoreProd;
            } else {
                deleteProduct(hStoreProd.idx);
            }
            triggerAddToBill();
        }
    };

    /**
     * Add an extra to a product.
     * @param {Object} hProd        The product data.
     * @param {Number} hProd.id     The product ID.
     * @param {String} hProd.notes  The product notes.
     * @param {Object} hExtra       The extra data.
     * @param {Number} hExtra.id    The extra ID.
     * @param {Number} hExtra.name  The extra name.
     * @param {Number} hExtra.price The extra price.
     */
    that.addExtraToProduct = function (hProd, hExtra) {
        var hStoreProd = that.findProduct(hProd);

        if (hStoreProd) {
            hStoreProd.extras[hExtra.name] = hExtra;
        }

        triggerAddToBill();
    };

    that.removeExtraToProduct = function (hProd, hExtra) {
        var hStoreProd = that.findProduct(hProd);

        if (hStoreProd) {
            delete hStoreProd.extras[hExtra.name];
        }

        triggerAddToBill();
    };

    /**
     * Decrement quantity of a product.
     * @param {Object} hProd       The product data.
     * @param {Number} hProd.id    The product ID.
     * @param {String} hProd.notes The product notes.
     */
    that.addNotesToProduct = function (hProd) {
        // var hStoreProd = aStore[hProd.id];
        var hStoreProd = that.findProduct(hProd);

        // Add notes to a product already in the store
        if (hStoreProd) {
            hStoreProd.notes = hProd.notes;
        }
    };

    /**
     * Calculate the row total amount.
     * @param {Object} hProd The product data.
     */
    function calculateRowTotal (hProd) {
        var fExtraPrices = 0;

        $.each(hProd.extras, function (sName, hExtra) {
            fExtraPrices += hExtra.price;
        });

        return hProd.qty * (hProd.price + fExtraPrices);
    }

    /**
     * Delete a product from the store.
     * @param {Number} nIdx The product position.
     */
    function deleteProduct (nIdx) {
        aStore.splice(nIdx, 1);
    }

    /**
     * @fires OrderModel#addToBill
     */
    function triggerAddToBill () {
        /**
         * @event OrderModel#addToBill
         * @type {Object}
         * @property {Object} items The bill items.
         * @property {Number} total The bill total amount.
         */
        that.trigger('addToBill', {
            items : aStore,
            total : calculateTotal(aStore)
        });
    }

    that.setCategories = function (hCat) {
        hCategories = hCat;
    };

    that.getCategories = function () {
        return hCategories;
    };

    /**
     * Retrieve the total amount.
     * @returns {Number} The total amount.
     */
    that.getTotal = function () {
        return calculateTotal(aStore);
    };

    /**
     * Calculate the total amount.
     * @param {Object[]} aStore The store.
     * @returns {Number} The total amount. The minimum amount is 0.
     */
    function calculateTotal (aStore) {
        var nTotal = 0;

        $.each(aStore, function (nIdx, hProduct) {
            // nTotal += hProduct.qty * hProduct.price;
            nTotal += calculateRowTotal(hProduct);
        });

        return nTotal < 0 ? 0 : nTotal;
    }

    /**
     * Check if the bill is empty or not.
     * @returns {Boolean}
     */
    that.billIsEmpty = function () {
        return aStore.length === 0;
    };

    that.getBill = function () {
        return aStore;
    };

    /**
     * Commit the bill to the server.
     * @param {String}      sCustomerName The customer name.
     * @param {AjaxSuccess} fnSuccess     The success callback.
     * @param {AjaxFailure} fnFailure     The failure callback.
     */
    that.commitBill = function (sCustomerName, fnSuccess, fnFailure) {
        var hData = {
            customer_name : sCustomerName,
            items         : []
        };

        $.each(aStore, function (nIdx, hProduct) {
            hData.items.push({
                name   : hProduct.name,
                qty    : hProduct.qty,
                notes  : hProduct.notes,
                extras : hProduct.extras
            });
        });

        $.pif.ajaxCall({
            url    : '/webpos/commit/',
            params : JSON.stringify(hData)
        }, fnSuccess, fnFailure);
    };

    that.getUpdates = function () {
        $.pif.ajaxCall({
            url : '/webpos/refresh/'
        }, function (hResponse) {
            that.trigger('refreshButtons', hResponse);
        });
    };
}