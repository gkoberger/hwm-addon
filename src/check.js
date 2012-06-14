// room.js - Hulu With Me's module
// author: gkobergermoz

var el = document.getElementById('detecting_hwm');

if(el) {
    var vals = location.href.match(/([a-zA-Z0-9]*)-([0-9]*)/);
    window.location.href = "http://hulu.com/watch/" + vals[2] + "/#hwm-" + vals[1];
}

document.getElementsByTagName('body')[0].className = "is_installed";
