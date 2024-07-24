# Inter-page communication: window.exec()

A bare minimum function for inter-page communications using hash fragments. 

To load other webpages on different domains only to call one function and to receive the result, it defines hash fragment with specific format of : `#<call-ID>+<call-ARGUMENT>`.

To maintain privacy, the hash fragment which can potentially contain sensitive information will be removed from the browsing history. 

## Usage

Call `window.exec('<other page url with hash fragment>')` and receive the result either by: 1. returned Promise or 2. the text input form value on the page with focus (document.activeElement) which will be updated with the returned result.

1. Prepare callee page (a page for limited features)

Place a text or number input form on the page and wrap that input form with an element with ID (call-ID). Also prepare an element to show calculation result: either `<exec-result>` or an element with class name exec-result (`.exec-result`). Lastly, define an event (e.g `.addEventlistner('keydown', ..)`) with an event handler containing the actual features.

```
<div id="calc"><input type="text" onkeydown="document.querySelector('exec-result').innerText=dosomething(this.value);"></div>
<exec-result></exec-result>
```

2. Caller page (actual user interface)

Either call by JS
```
<script>
exec('function-test.com#calc+' + userinput.value).then(function(result){
    // proceed with the 'result'
});
</script>
```

or place text input form with focus. 
```
<button onclick=exec('function-test.com#calc+1')>Take snap</button>
<input autofocus />
```

Note: window.exec() is a wrapper function of window.open(). Thus it's necessary to be called with user-initiated event e.g onclick, onkeydown.

## Other note

If there is a parent window (window.opener) and it matches the URL of window.exec(<URL>), that parent window will be used for window.exec() calculation (not calling window.open()).

I'm happy to receive feedbacks (admin@716.es).


