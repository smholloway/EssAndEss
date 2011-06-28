function pageLoad(aEvent) {
    // get loaded doc and url from event
    var doc = aEvent.originalTarget;
    var url = doc.location.href;

    if (doc instanceof HTMLDocument) {
        // is this an inner frame?
        if (doc.defaultView.frameElement) {
            // frame within a tab was loaded
            // find the root document
            while (doc.defaultView.frameElement) {
                doc = doc.defaultView.frameElement.ownerDocument;
            }
        }

        // only hack FB pages
        if (url.indexOf("http://www.facebook.com") === 0 ||
                url.indexOf("http://facebook.com") === 0) {
            // replace content
            var targetElement = doc.getElementById('rightCol');
            if (targetElement != null) {
                targetElement.innerHTML = '<iframe src="http://fbsidebar.appspot.com/content/news.html" style="border:0;width:244px;height:500px;margin:0;overflow-x:hidden"></iframe>';
            }
        }
    }

}

// add event listener on load
window.addEventListener("load", function () {
    gBrowser.addEventListener("load", pageLoad, true);
}, false);

// remove event listener on unload
window.addEventListener("unload", function () {
    gBrowser.removeEventListener("load", pageLoad, true);
}, false);
