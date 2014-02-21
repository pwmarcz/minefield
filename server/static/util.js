// http://stackoverflow.com/a/2880929/78145

function getParams() {
    var match;
    var pl = /\+/g;  // Regex for replacing addition symbol with a space
    var search = /([^&=]+)=?([^&]*)/g;
    var decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
    var query = window.location.search.substring(1);
    var params = {};

    while ((match = search.exec(query)))
       params[decode(match[1])] = decode(match[2]);
    return params;
}
