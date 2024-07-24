
function urlcleanup(isEvent){
    if(location.hash && (location.hash && location.hash.match('\\+')) && !sessionStorage.hashstart){
        if(isEvent){
            var pn = location.pathname + location.search + location.hash.replace(/\+.*$/g, '');
            if(pn.substr(-1) == '#') pn = pn.replace(/.$/, '');
            history.replaceState({id: pn}, '', pn);
        }else{
            sessionStorage.hashstart = location.hash;
            location.replace(location.pathname + location.search);
            return false;
        }
    }
    return true;
}
function sameurl(a, b){
    a = a.replace(/#.+/, '');
    b = b.replace(/#.+/, '');
    if(a == b) return true;
    var ax = document.createElement('a'); ax.href = a;
    var bx = document.createElement('a'); bx.href = b;
    if(ax.href == bx.href) return true;
    return false;
}
function exec(href, oldwindow){
    var hash = href.match('(#.+)$') && RegExp.$1, o = null;
    oldwindow = !oldwindow && window.opener && opener.location &&
        sameurl(opener.location.href, href) ? opener : null;
    if(oldwindow){
        if(!oldwindow.opened) oldwindow.opened = {};
        o = oldwindow.opened;
    }else{
        if(!window.opened) window.opened = {};
        o = window.opened;
    }
    // console.log('exec:href', href, 'and set opened[hash]', hash, oldwindow);
    o[hash] = {
        window: oldwindow ? ((oldwindow.location.href = href) && window) : open(href),
        status: 0
    };
    if(!window.name) window.name = 'exec-source-' + Math.floor(Math.random() * 100000);
    return new Promise(function(r, j){
        window.addEventListener('hashchange', function execohc(){
            var stat = o[hash];
            // console.log('exec: hashchange', stat, ';', location.hash);
            if(location.hash[1] == '+' && o[hash].status !== 0){
                r(decodeURIComponent(location.hash.substr(2)));
                if(!oldwindow){
                    stat.window.close();
                }else{
                    stat.status = -1;
                }
                window.removeEventListener('hashchange', execohc);
            }
        });
    });
}
function hashchange(hash){
    var isEvent = null;
    if(hash && typeof(hash) == 'object') {
        isEvent = hash;
        hash = location.hash;// hash was Event
    }
    if(!sessionStorage.hashstart) setTimeout(urlcleanup.bind(window, isEvent));
    window.onexec(hash);
    window.dispatchEvent(new CustomEvent('exec'));
}
var selectByQuery = function(calc){
    if(!calc || !calc.match('^[a-zA-Z_][a-zA-Z0-9\\-_]*$')) return false;
    return document.querySelector(
        '#' + calc + ' :where(textarea,input[type=text],input[type=number],input:not([type=number])), [name=' + calc + ']'
    );
}
window.onexec = function(hash){
    var el = null, calc = null, v = null, t = null, er = null, mt = null;
    var orighash = hash;
    hash = decodeURIComponent(hash);
    // console.log('onexec', hash, hash.match(new RegExp('^#([^\\+]*)(?:\\+([\\s\\S]+)$)?', 'igm')), ';', RegExp.$1, ';', RegExp.$2); //document.querySelector('exec-result') &&
    if(hash.match(new RegExp('^#([^\\+]*)(?:\\+([\\s\\S]+)$)?', 'igm')) &&
       (((((v = RegExp.$2) || 1) && (calc = RegExp.$1)) && (el = selectByQuery(calc))) || (
           !calc && v
       ))){
        // console.log('onexec, fnd', calc, ';', v, mt);
        if(calc && (er = document.querySelector('exec-result, .exec-result'))){
            if(el) {
                el.focus(); // focusing console.log('focusing', el);
            }
            var observer = null;
            // "ael.value = v" triggers calculation and result being set to er
            (observer = new MutationObserver(function(mlist, observer){
                for(var mutation of mlist){
                    if(mutation.type == 'childList'){
                        if(window.opened && opened[orighash]){
                            t = window.opened[orighash].window;
                            opened[orighash].status = 1;
                        }else if(window.opener && window.opener.opened && opener.opened[orighash]){
                            t = window.opener;
                            opener.opened[orighash].status = 1;
                        }else{
                            console.warn('Window not found', opened, opened[orighash], opened[hash]);
                            return;
                        }
                        t.location.hash = '#+' + er.innerText;
                        // console.log('onexec: observer', er.innerText);
                        observer.disconnect();
                    }
                }
            })).observe(er, {
                attributes: false, childList: true,
                subtree: false, characterdata: false
            });
        }
        if(el || (document.activeElement && document.activeElement.matches(
            ':where(textarea,input)'))){
            var ael = (el || document.activeElement);
            // console.log('commit event', ael);
            ael.value = v;
            var nev = new CustomEvent('keydown', {bubbles: true});
            nev.target = ael;
            ael.dispatchEvent(nev);
            ael.dispatchEvent(new CustomEvent('change', {bubbles: true}));
            ael.dispatchEvent(new CustomEvent('input', {bubbles: true}));
        }
        return true;
    }
    return false;
}
window.addEventListener('hashchange', hashchange);
if((location.hash && (location.hash.substr(0, 1) == '#')) || sessionStorage.hashstart){
    if(urlcleanup()){
        if(sessionStorage.hashstart){
            window.hashstart = sessionStorage.hashstart;
            // hashchange(sessionStorage.hashstart);
            window.addEventListener('load', function(){hashchange(window.hashstart);});
            sessionStorage.removeItem('hashstart');
        }else{
            var h = location.hash;
            window.addEventListener('load', function(){hashchange(h);});
        }
    }
}
