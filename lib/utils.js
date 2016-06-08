'use strict';

var extend = require('extend');
var url = require('url');
var path = require('path');

/**
 * Join two or more url pieces into one.
 *
 * Only the protocol/port/host in the first piece is saved,but all the get parameters
 * will be saved.
 *
 * @param {String|Function}... Multiple url pieces in function or string type.
 * @return {String} The URL joined.
 */
function urljoin() {

    //convert to Array
    var pieces = Array.prototype.slice.call(arguments);
    var query = {};
    var first, paths;

    if (!pieces.length) {
        return '';
    } else if (1 === pieces.length) {
        return pieces[0];
    }

    paths = pieces.map(function(piece) {
        var pieceStr = 'function' === typeof piece ? piece() : String(piece || '');

        if (!pieceStr) {
            return '';
        }

        var parsed = url.parse(pieceStr, true);

        if (!first && parsed) {
            first = parsed;
        }

        extend(query, parsed.query);
        return parsed.pathname;
    }).filter(function(piece) {
        return !!piece;
    });

    delete first.search; //we use query instead of search
    first.query = query;
    first.pathname = path.join.apply(path, paths).replace(new RegExp('\\' + path.sep, 'g'), '/');

    console.log(first)
    console.log(paths)
    return url.format(first);
}

module.exports = {
  urljoin: urljoin
}
