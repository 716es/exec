
var hashcucond = window.hashcucond || '\\+.';
var log = function(){
    if(localStorage.debug) console.log.apply(console, arguments);
}
var lasthash = null;
if(!window.changeLocationHash){
    window.changeLocationHash = function(href){
        log('changeLocationHash to', href);
        if(href.match('(#.+)$')){
            lasthash = RegExp.$1;
        }else{
            lasthash = null;
        }
        location.href = href;
    }
}

function urlcleanup(isEvent){
    if(location.hash && (location.hash && location.hash.match(hashcucond)) &&
       !sessionStorage.hashstart){
        if(isEvent){
            var pn = location.pathname +
                location.search + location.hash.replace(/^#\+.+/g, '').replace(/(\+).*$/g, '$1');
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
    if(a == b) {return true;}
    var ax = document.createElement('a'); ax.href = a;
    var bx = document.createElement('a'); bx.href = b;
    if(ax.href == bx.href) {return true;}
    return false;
}

function exec(href, duration){
    var hash = href.match('(#.+)$') && RegExp.$1, o = null, stat = null, cw = null;
    var foundopener = !(duration - 0) && parentPort &&
        sameurl(parentPort.href, href) ? opener : null;
    log('exec:href', href, 'and set opened[hash]', hash, foundopener);
    stat = {
        hash: hash, href: href, childWindow: null,
        status: 0, port: null
    };
    if(!window.name) window.name = 'exec-source-' + Math.floor(Math.random() * 100000);
    if(foundopener){
        log('foundopener', stat, ';', href);
        // send stat to parentPort and kick hashchange
        parentPort.postMessage(stat);
        parentPort.postMessage(href);
    }else{
        if(window.opened){
            for(var i in window.opened){
                var o = window.opened[i];
                if(o.closeTimer && sameurl(o.href, href)){
                    cw = o.childWindow;
                    stat.port = o.port;
                    break;
                }
            }
        }
        stat.childWindow = cw || open(href.replace(/(#.+)$/g, ''), 'exec-dest');
        if(!window.opened) window.opened = {};
        o = window.opened;
        o[hash] = stat;
        !cw ? window.addEventListener('message', function portInit(e){
            if(e.ports && e.ports[0]){
                o[hash].port = e.ports[0];
                o[hash].port.onmessage = function(e2){
                    log('exec, onmessage from childWindow', e2.data);
                    if(typeof(e2.data) == 'string') {
                        changeLocationHash(e2.data);
                    }else if(e2.data.href){
                        o[e2.data.hash] = e2.data;
                        o[e2.data.hash].childWindow = stat.childWindow;
                        o[e2.data.hash].port = this;
                    }else if(e2.data.hash && e2.data.type == 'complete'){
                        var e = new CustomEvent('execcomplete');
                        e.hash = e2.data.hash;
                        e.result = e2.data.result;
                        window.dispatchEvent(e);
                    }
                };
                o[hash].port.postMessage(location.href);
                log('exec: send hash', hash);
                o[hash].port.postMessage(hash);
                window.removeEventListener('message', portInit);
            }
        }) : o[hash].port.postMessage(hash);
    }
    return new Promise(function(r, j){
        window.addEventListener('execcomplete', function execohc(evt){
            if(evt.hash == hash){
                var result = decodeURIComponent(evt.result.substr(2));
                r(result);
                if(foundopener){ // reverse pat
                    log('execcomplete2');
                    stat.status = -1;
                }else{ // regular pat
                    log('execcomplete1');
                    o[hash].status = 1;
                    o[hash].closeTimer = setTimeout(function(){
                        o[hash].closeTimer = null;
                        o[hash].childWindow.close();
                    }, duration || 0);
                }
                window.removeEventListener('execcomplete', execohc);
            }
        });
    });
}

function hashchange(event, hash){
    log('exec:hashchange:', hash, lasthash);
    var external = null, tx = null;
    if(lasthash && event){
        external = ((hash || location.hash) == lasthash);
        lasthash = null;
    }
    if(event){
        hash = location.hash; // hash was Event
    }
    if(!sessionStorage.hashstart) setTimeout(urlcleanup.bind(window, event));
    
    var er = document.querySelector('exec-result:not(:empty), .exec-result:not(:empty)');
    if(er){
        er.classList.add('copying');
        tx = er.innerText;
        er.classList.remove('copying');
    }
    var e = new CustomEvent('exec');
    e.data = hash;
    e.result = tx;
    window.dispatchEvent(e);
    window.onexec(hash, tx, external);
}

var selectByQuery = function(calc){
    if(!calc || !calc.match('^[a-zA-Z_][a-zA-Z0-9\\-_]*$')) return false;
    return document.querySelector(
        '#' + calc + ' :where(textarea,input:not([type]),input[type=text],input[type=number]), [name=' + calc + ']'
    );
}

window.onexec = function(hash, result, external){
    var el = null, calc = null, v = null, t = null, er = null, mt = null;
    var orighash = hash;
    hash = decodeURIComponent(hash);
    log('onexec: strt:', hash, ';', orighash);
    if(hash.match(new RegExp('^#([^\\+]*)(?:\\+([\\s\\S]+)$)?', 'igm')) &&
       (((((v = RegExp.$2) || 1) && (calc = RegExp.$1)) && (el = selectByQuery(calc))) || (
           !calc && v
       ))){
        if(calc && (er = document.querySelector('exec-result, .exec-result'))){
            if(el) {
                el.focus(); 
            }
            var observer = null;
            // "ael.value = v" triggers calculation and result being set to er
            if(v){
                (observer = new MutationObserver(function(mlist, observer){
                    for(var mutation of mlist){
                        if(mutation.type == 'childList' && mutation.addedNodes.length){
                            var port = null;
                            log('onexec: childList update', opener, parentPort, orighash);
                            if(window.opened && opened[orighash]){ // reverse pat
                                log('onexec: reverse', opened[orighash], orighash);
                                port = window.opened[orighash].port;
                                opened[orighash].status = 1;
                            }else if(window.opener && parentPort){ // regular pat
                                log('onexec: changeparent');
                                port = parentPort;
                            }else{
                                console.warn('exec: Window not found');
                                return;
                            }
                            // t.location.hash = '#+' + encodeURIComponent(er.innerText);
                            er.classList.add('copying');
                            var tx = er.innerText;
                            er.classList.remove('copying');
                            var resulth = '#+' + encodeURIComponent(tx);
                            log('onexec: result text to postMessage', resulth, ';', tx);
                            port.postMessage(resulth);
                            port.postMessage({hash: orighash, result: resulth, type: 'complete'});
                            observer.disconnect();
                        }
                    }
                })).observe(er, {
                    attributes: false, childList: true,
                    subtree: false, characterdata: false
                });
            }
        }
        if(el || (document.activeElement && document.activeElement/*.matches(
            ':where(textarea,input)')*/)){
            var ael = (el || document.activeElement);
            log('onexec: set value', el, document.activeElement, v, external, (new Error()).stack);
            ael.value = v;
            var nev = new CustomEvent('keydown', {bubbles: true});
            Object.defineProperty(nev, 'target', {writable: false, value: ael});
            if(result){
                Object.defineProperty(nev, 'result', {writable: false, value: result});
            }
            if(external){
                Object.defineProperty(nev, 'keyCode', {writable: false, value: 13});
                Object.defineProperty(nev, 'ctrlKey', {writable: false, value: true});
                Object.defineProperty(nev, 'shiftKey', {writable: false, value: true});
            }
            ael.dispatchEvent(nev);
            ael.dispatchEvent(new CustomEvent('change', {bubbles: true}));
            ael.dispatchEvent(new CustomEvent('input', {bubbles: true}));
        }
        return true;
    }
    return false;
}

if(!window.noexechashhandler){
    window.addEventListener('hashchange', hashchange);
    
    if((location.hash && (location.hash.substr(0, 1) == '#')) || sessionStorage.hashstart){
        if(urlcleanup()){
            if(sessionStorage.hashstart){
                window.hashstart = sessionStorage.hashstart;
                window.addEventListener('load', function(){
                    hashchange(null, window.hashstart);
                });
                sessionStorage.removeItem('hashstart');
            }else{
                var h = location.hash;
                window.addEventListener('load', function(){hashchange(null, h);});
            }
        }
    }
}

var parentPort = null;
function execonload(ev){
    log('exec: load: opener', window.opener, window);
    
    if(window.opener){
        var ch = new MessageChannel();
        log('exec: load: set channel', ch);
        var pp = ch.port1;
        pp.window = opener;
        pp.onmessage = function(e){
            log('exec: load: onmessage', e, e.data);
            if(!parentPort){
                log('exec: load: loaded, sent port2 and succeeded');
                parentPort = pp;
                parentPort.href = e.data;
            }else if(typeof(e.data) == 'string'){
                log('exec: load: changing href', e.data);
                changeLocationHash(e.data);
            }else if(e.data.type == 'complete'){
                var ev = new CustomEvent('execcomplete');
                ev.hash = e.data.hash;
                ev.result = e.data.result;
                window.dispatchEvent(ev);
            }
        }
        opener.postMessage('init', '*', [ch.port2]);
    }
}
if(window == top){
    if(document.readyState == 'complete'){
        execonload();
    }else{
        window.addEventListener('load', execonload);
    }
}else{
    console.warn('exec: Non top window');
}

window.exec = exec;

