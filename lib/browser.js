var $  = require("tinix");
var fs = require("fs");
var engine = require("./engine");
var brepl = require("./browser-repl");
var dialoader = require("sugarlisp-core/dialect-loader");
var cache = {};

function createHandler(script) {
    return function(done) {
        if (!script.src) {
            done()
        } else {
            $.get(
                script.src,
                function(err, sourcecode) {
                    if (err) {
                        console.log("Error loading file " + script.src)
                    } else {
                        script.code = sourcecode;
                    }
                    done()
                },
                "text/plain"
            )
        }
    }
}

// we have our own require which caches modules
// conveyed in the body of text/sugarlisp tags

var slrequire = function(name) {
    if (cache[name]) {
        return cache[name]
    } else {
        if (require) {
            return require(name)
        } else if (window.require) {
            return window.require(name)

        } else {
            throw new Error("Cannot find module " + name)
        }
    }
}

// we expose our require so people can do requires
// in the browser repl:
// note:  it's a bad idea to wrap the standard window.require
//        I tried - an infinite require loop was the result!
if (typeof window !== 'undefined') {
  window.slrequire = slrequire;
}

function runModule(js) {
    var module = {exports: {}},
        func = new Function("module, exports, require", js)

    func(module, module.exports, slrequire)
    return module.exports
}

function doParallel(handlers, callback) {
    var counter = handlers.length
        done = function() {
            --counter
            if (counter === 0) {
                callback()
            }
        }

    handlers.forEach(function(f) {
        f(done)
    })
}

$.ready(function() {
    var sugarlisps = $.map("script[type='text/sugarlisp']", function(script) {
        return {
          id: script.id,
          src: script.src,
          filename: script.src ? script.src : "inline.slisp",
          code: script.src ? null : script.innerHTML
        };
    });
    var sugarscripts = $.map("script[type='text/sugarscript']", function(script) {
        return {
          id: script.id,
          src: script.src,
          filename: script.src ? script.src : "inline.sugar",
          code: script.src ? null : script.innerHTML
        };
    });
    var scripts = Array.prototype.slice.call(sugarlisps).concat(
                    Array.prototype.slice.call(sugarscripts));
    var handlers = scripts.map(function(script) {
        return createHandler(script)
    })
    doParallel(handlers, function() {
        scripts.forEach(function(script) {
            script.js = engine.transpile(script.code, script.filename, {for:"browser"});
            // <script> tags with an id attribute act as commonJS modules:
            // (modules do not pollute the global scope - using code and
            // the browser repl must use "require" to get at their exports)
            if (script.id) {
              cache[script.id] = runModule(script.js)
            }
            else {
              // otherwise they run as plain javascript
              // (top level vars are visible to other code and the browser repl)
              script.js = script.js.replace(/require\s*\(/g, 'slrequire(');
              eval.call(window, script.js)
            }
        })
    })
})
