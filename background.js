/*var RC_BASE_URL = "https://localhost/gce/web/dist";

var sourceVendors = "/scripts/89f3cc71.vendor.js";
var sourceScripts = "/scripts/3b8dc2c5.scripts.js";
var sourceCss = "/styles/5418b2cb.main.css";

*/

document.body.setAttribute('ng-app', "openCtiApp");
document.body.setAttribute('class', "{{brand}}");

var extraHtml = document.createElement('div');
extraHtml.setAttribute('id', "rcpane");
extraHtml.setAttribute('style', "width:260px; height:560px;");
document.body.appendChild(extraHtml);


var scripts = makeScripts();

for (var i = 0; i < scripts.length; i++) {
	document.body.appendChild(scripts[i]);
}


chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if ( typeof request.phone_number != 'undefined' ) {
			sendRingOut(request.phone_number);
			sendResponse({message: "Ringing Out: "+request.phone_number});
		}
});

function sendRingOut(phone_number) {
 	makeCallHelper(phone_number);
}

function makeScripts() {
	var scripts = [];
	
	scripts[0] = document.createElement('script');
	scripts[0].setAttribute('src', chrome.extension.getURL("web/scripts/globals.js"));
	scripts[0].setAttribute('type', 'text/javascript');
	
	scripts[1] = document.createElement('script');
	scripts[1].setAttribute('src', chrome.extension.getURL("web/scripts/vendors/jquery.min.js"));
	scripts[1].setAttribute('type', 'text/javascript');
	
	scripts[2] = document.createElement('script');
	scripts[2].setAttribute('src', chrome.extension.getURL("web/scripts/deferred.js"));
	scripts[2].setAttribute('type', 'text/javascript');
	
	scripts[3] = document.createElement('script');
	scripts[3].setAttribute('src', chrome.extension.getURL("web/scripts/LinkCreator.js"));
	scripts[3].setAttribute('type', 'text/javascript');
	
	scripts[4] = document.createElement('script');
	scripts[4].setAttribute('src', chrome.extension.getURL("web/scripts/main.js"));
	scripts[4].setAttribute('type', 'text/javascript');

	return scripts;
	
}

