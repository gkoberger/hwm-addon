(function() {
    var scripts = ['jquery.js', 'socket.io.js', 'room.js'],
        scripts_count = 0;

    function loadScript() {
        if(scripts.length <= scripts_count) return;
        var filename = scripts[scripts_count];
        var s = document.createElement('script');
        s.src = chrome.extension.getURL(filename);
        (document.head||document.documentElement).appendChild(s);
        s.onload = function() {
            s.parentNode.removeChild(s);
            scripts_count++;
            loadScript();
        };
    }
    loadScript();
})();

console.log("SHould show up here...");
var port = chrome.extension.connect({name: "hwm"});

var customEvent = document.createEvent('Event');
customEvent.initEvent('myCustomEvent', true, true);

port.onMessage.addListener(function(msg) {
      // Send it to the script!
      var hiddenDiv = document.getElementById('myCustomEventDiv');
      hiddenDiv.innerText = JSON.stringify(msg);
      hiddenDiv.dispatchEvent(customEvent);
});

/*
setTimeout(function() {

}, 2500);
*/
