//var GMAIL_JS = "https://localhost/git/rc/google-bitbucket/extension/vendors/gmail.js";
var GMAIL_JS = undefined; //gmail.js is not needed by now

//var JQUERY = "https//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js";
var JQUERY = undefined;  //jquery is not needed by now

var INJECTION = chrome.extension.getURL('/injection.js');
var WEB_APP = chrome.extension.getURL('/web/index.html');
//uncomment this to test on local server
//var WEB_APP = "http://localhost:63342/googlechrome/web/app/index.html";


//initial width
var START_WIDTH = 280;
//min height of iframe when scrolling appear (header + sidebar)
var MIN_HEIGHT = 465;
