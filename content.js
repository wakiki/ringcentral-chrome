
var styleNode           = document.createElement ("style");
styleNode.type          = "text/css";
styleNode.textContent   = "@font-face{font-family:'FontAwesome';src:url('"+chrome.extension.getURL("fonts/fontawesome-webfont.eot")+"');src:url('"+chrome.extension.getURL("fonts/fontawesome-webfont.eot")+"') format('embedded-opentype'),url('"+chrome.extension.getURL("fonts/fontawesome-webfont.woff2")+"') format('woff2'),url('"+chrome.extension.getURL("fonts/fontawesome-webfont.woff")+"') format('woff'),url('"+chrome.extension.getURL("fonts/fontawesome-webfont.ttf")+"') format('truetype'),url('"+chrome.extension.getURL("fonts/fontawesome-webfont.svg")+"') format('svg');font-weight:normal;font-style:normal}.fa{display:inline-block;font:normal normal normal 14px/1 FontAwesome;font-size:inherit;text-rendering:auto;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;transform:translate(0, 0)}.fa-lg{font-size:1.33333333em;line-height:.75em;vertical-align:-15%}.fa-phone-square:before{content:\"\\f098\"}"+
".p33_ctd_btn{cursor: pointer;}.fa-green{ color:green;}.fa-blue{ color:blue;}"+
".p33_ctd_menu{ position:absolute; font-size:18px; font-family: Trebuchet MS,Lucida Grande,Lucida Sans Unicode,Lucida Sans,Tahoma,sans-serif; border:1px solid black; }"+
".p33_ctd_menu, .p33_ctd_menu li{ list-style:none;margin:0;padding:0;display:block; background-color:white; color:black; }"+
".p33_ctd_menu li{ padding:5px 10px; cursor: pointer;}"+
".p33_ctd_menu li:hover{ background-color: green; color:white; }"+
".p33_ctd_menu li:active{ background-color: blue; color:white; }"+
"";
document.head.appendChild (styleNode);

var p33_ctd = {
	ignoreElements: ['html','iframe','noscript','style','option','select','script','label','img','input','textarea','head','link'],
	validExpressions: [/^((\+?1)?[-. ]?((\([2-9][0-8][0-9]\))|([2-9][0-8][0-9]))[-. ]?)?([2-9][0-9]{2})[-. ]?([0-9]{4})$/, /^\+[0-9]{1,3}\.[0-9]{4,14}$/, /^\+1\.[0-9]{7,15}$/,/[1\-]?[0-9]{3}(\-| |\.)[0-9]{3}(\-| |\.)[0-9]{4}/,/\([0-9]{3}\)(\-| |\.)[0-9]{3}(\-| |\.)[0-9]{4}/,/[0-9]{2}(\-| |\.)[0-9]{2}(\-| |\.)[0-9]{4}(\-| |\.)[0-9]{4}/]
}
var c = document.body.childNodes;
var elements = [];
for ( var i = 0; i < c.length; i++ ) {
	elements[elements.length] = c[i]
}
for ( var i = 0; i < elements.length; i++ ) {
	if ( elements[i].nodeType == 1 ) {
		for (var ii = 0; ii < elements[i].childNodes.length; ii++) {
			elements[elements.length] = elements[i].childNodes[ii];
		}
	}
	if ( elements[i].nodeType == 3 ) {
		if ( p33_ctd.ignoreElements.indexOf(elements[i].parentNode.tagName.toLowerCase()) < 0 ) {
			for( var ie = 0; ie < p33_ctd.validExpressions.length; ie++ ) {
				var test = elements[i].textContent.match(p33_ctd.validExpressions[ie]);
				if ( test ) {
					var telNum = '';
					if ( typeof test[0] == 'string' ) {
						telNum = test[0].replace(/[^0-9]/ig,'');
					}
					matchText(elements[i].parentNode, p33_ctd.validExpressions[ie], function(node, match, offset) {
					    var span = document.createElement("span");
					    span.className = "CTDphoneNumber";
					    jQuery(span).attr('data-phone',telNum);
					    span.textContent = match;
/*
					    if (node.parentNode.tagName == 'A') {
						    node.parentNode.parentNode.insertBefore(span, node.parentNode); 
					    } else {
						    node.parentNode.insertBefore(span, node.nextSibling); 
					    }
*/
					    node.parentNode.insertBefore(span, node.nextSibling); 
					    jQuery(span).append('<i style="margin-left:5px;" class="fa fa-green fa-phone-square p33_ctd_btn"></i>');
					    jQuery(span).find('i').mouseover(function(){
					    });
					    jQuery(span).find('i').click(function(e){
						    addContextualMenu(e.target);
						    e.preventDefault();
							return false;
					    });
											    
					},p33_ctd.ignoreElements);
					break;
				}
			}
		}
	}	
}

function initiateCall(targetObj) {
	var phone_number = jQuery(targetObj.parentElement).attr('data-phone');
	chrome.runtime.sendMessage({'phone_number':phone_number }, function(response) {
		console.log(response);
	})
}

jQuery('body').bind('click',function(e){
	removeContextualMenu();
});


function addContextualMenu(targetObj) {
	removeContextualMenu();
	var menu = jQuery('<ul class="p33_ctd_menu"></ul>');
	var callBtn = jQuery('<li>Call</li>');
	jQuery(menu).append(callBtn);
	jQuery(callBtn).bind('click',function(e){
		targetObj.setAttribute('class', 'fa fa-blue fa-phone-square p33_ctd_btn');
		initiateCall(targetObj);
		removeContextualMenu();
	    e.preventDefault();
		return false;
	});
	jQuery(targetObj.parentNode).append(menu);
	jQuery(menu).css('left',jQuery(targetObj).position().left+"px").css('top',(jQuery(targetObj).height()+jQuery(targetObj).position().top)+"px");
}
function removeContextualMenu() {
	var menu = jQuery('.p33_ctd_menu').fadeOut(150);
}

function matchText(node, regex, callback, excludeElements) { 

    excludeElements || (excludeElements = ['script', 'style', 'iframe', 'cavas']);
    var child = node.firstChild;
	if ( child == null) {
		return false;
	}
    do {
        switch (child.nodeType) {
        case 1:
            if (excludeElements.indexOf(child.tagName.toLowerCase()) > -1) {
                continue;
            }
            matchText(child, regex, callback, excludeElements);
            break;
        case 3:
           child.data.replace(regex, function(all) {
                var args = [].slice.call(arguments),
                    offset = args[args.length - 2],
                    newTextNode = child.splitText(offset);

                newTextNode.data = newTextNode.data.substr(all.length);
                callback.apply(window, [child].concat(args));
                child = newTextNode;
            });
            break;
        }
    } while (child = child.nextSibling);

    return node;
}