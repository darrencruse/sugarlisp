(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

// Note that the browser repl uses jquery.terminal
// But we do not bundle jquery in browser-bundle.js due to it's size.
// If you would like to use the browser repl you must link in the relevant
// jquery files and call sugarlisp.enableBrowserRepl() in document ready

if(typeof window !== 'undefined') {

  var engine = require("./engine"),
      readline = require("readline"),
      repldialect = require("./repl-dialect"),
      packageJson = require('../package.json'),
      logo = require("./logo-ogre"),
      displayLogo = true; // we display the logo just once

  function initBrowserRepl(replElementId, showLogo, width, height, openCheck) {

    jQuery.fn[replElementId] = function(eval, options) {
        if (jQuery('body').data(replElementId)) {
            return jQuery('body').data(replElementId).terminal;
        }
        this.addClass(replElementId);
        options = options || {};
        eval = eval || function(command, term) {
            term.echo("[[;red;black]no eval found for browser repl]");
        };
        var settings = {
            prompt: 'sugar> ',
            name: 'slrepl',
            width: width,
            height: height,
            enabled: false,
            keypress: function(e) { return !(openCheck(e)); }
        };
        if(showLogo) {
          settings.greetings = [logo(),
            '                           ','SugarLisp v',packageJson.version,'\n'].join('');
        }
        else {
          settings.greetings = 'SugarLisp v' + packageJson.version;
        }
        if (options) {
            jQuery.extend(settings, options);
        }
        this.append('<div class="td"></div>');
        var self = this;
        self.terminal = this.find('.td').terminal(eval, settings);
        var focus = false;
        jQuery(document.documentElement).keypress(function(e) {
            if (openCheck(e)) {
                if(width === "100%") {
                  // sliding up:

                  // at least for now - only one at a time:
                  // (yes this a bit of a hack)
                  var otherRepl = jQuery('#slreplright:visible')
                  if(otherRepl) {
                      otherRepl.animate({width: 'toggle'}, 'fast');
                  }

                  self.slideToggle('fast');

                }
                else {
                  // sliding left:

                  // at least for now - only one at a time:
                  // (yes this a bit of a hack)
                  var otherRepl = jQuery('#slreplbottom:visible')
                  if(otherRepl) {
                      otherRepl.slideToggle('fast');
                  }

                  self.animate({width: 'toggle'}, 'fast');
                }
                self.terminal.focus(focus = !focus);
                self.terminal.attr({
                    scrollTop: self.terminal.attr("scrollHeight")
                });
            }
        });
        jQuery('body').data(replElementId, this);
        this.hide();
        return self;
    };
  }

  //--------------------------------------------------------------------------

  function handleBrowserRepl(replElementId) {

    var ext = "sugar";
    var prompt = [ext, "> "].join('');
    var sugarlisp = new engine.Engine(undefined, ["stdin.", ext].join(''));
    sugarlisp.use_dialect(repldialect);

    // Are we building up a multiline command?
    var currentCmd = '';

    function incompleteCmd(command, terminal) {
        terminal.set_prompt('  ...> ');
    }

    function completeCmd(terminal, msg, options) {
        currentCmd = '';
        if(msg) {
          terminal.echo(msg, options);
        }
        terminal.set_prompt(prompt);
    }

    jQuery("#" + replElementId)[replElementId](function(command, terminal) {
       (function() {
         // skip empty commands
         if(/\S/.test(command)) {
           try {
               var options = options || {};
               options.for = options.for || "browser";
               options.jsevalcontext = window;
               var res = sugarlisp.eval((command + '\n'), options);
               completeCmd(terminal, '[[;yellow;black]' + res + ']');
           } catch (e) {
             if(e.message.match(/.*End of File.*unterminated.*/)) {
                incompleteCmd(command, terminal);
             }
             else {
                // I tried e.stack below but it wasn't helpful since
                // the stacktrace is just the sugarlisp internals
                // not the trace inside the eval'ed code
                completeCmd(terminal, '[[;red;black]' + e +']');
             }
           }
         }
       })();
    });
  }

  function addReplElementToPage(replElementId, cssOptions) {
    jQuery("body").append('<div id=\"' + replElementId + '\" />');
    var replCss = { display: "none", position: "absolute" };
    if (cssOptions) {
        jQuery.extend(replCss, cssOptions);
    }

    $("#" + replElementId).css(replCss);
  }

  var enableBrowserRepl = function() {

    jQuery.extend_if_has = function(desc, source, array) {
       for (var i=array.length;i--;) {
         if (typeof source[array[i]] != 'undefined') {
            desc[array[i]] = source[array[i]];
         }
       }
       return desc;
    };

    // bottom repl -
    addReplElementToPage('slreplbottom', { bottom: 0, left: 0, width: "100%", "z-index": 1100 });
    initBrowserRepl('slreplbottom', true, "100%", 280, function(e) { return ((e.which == 24 || e.key === 'x') && e.ctrlKey); });
    handleBrowserRepl('slreplbottom');

    // right repl -
    addReplElementToPage('slreplright', { top: 0, right: 0, height: "100%", "z-index": 1100 });
    initBrowserRepl('slreplright', true, 325, "100%", function(e) { return ((e.which == 22 || e.key === 'v') && e.ctrlKey); });
    handleBrowserRepl('slreplright');

    console.log('SugarLisp repl available: ctrl-x for bottom, ctrl-v for right');
  };

  // the sugarlisp engine is the only public module that's nicely requireable
  // without a "./" prefix - so just make the browser repl available off it:
  engine.enableBrowserRepl = enableBrowserRepl;

}

},{"../package.json":78,"./engine":2,"./logo-ogre":5,"./repl-dialect":7,"readline":79}],2:[function(require,module,exports){
var interpreter = require('./interpreter'),
    transpiler = require('./transpiler'),
    ctx = require('sugarlisp-core/transpiler-context'),
    reader = require('sugarlisp-core/reader');

/**
* An "engine" for transpiling/interpreting SugarLisp code.
*
* For a repl it's helpful to create an instance of the
* engine that holds state (e.g. the list of active dialects)
* for the duration of the repl session.
*
* For working with source files other exported functions here
* make it convenient to simply call with the file name
* and/or already loaded code as a string (without explicitly
* creating an "engine" as an object).
*
*/

function Engine(sourcetext, filename, options) {
  this.lexer = reader.initLexerFor(sourcetext, filename, options);

  // Transpile some sugarlisp source code to a javascript string.
  this.transpile = function(codestr, options) {
    return transpiler.transpile(codestr, this.lexer, options);
  }

  // Evaluate some sugarlisp source code to a javascript value.
  this.eval = function(codestr, options) {
    return interpreter.eval(codestr, this.lexer, options);
  }

  this.use_dialect = function(dialectOrName, options) {
    return reader.use_dialect(dialectOrName, this.lexer, options);
  }

  // and we likewise expose these other transpiler functions:
  this.transpileExpression = transpiler.transpileExpression,
  this.transpileExpressions = transpiler.transpileExpressions,
  this.transpileArgList = transpiler.transpileArgList
}

module.exports = {
  Engine: Engine,
  transpile: transpiler.transpile,
  transpileExpression: transpiler.transpileExpression,
  transpileExpressions: transpiler.transpileExpressions,
  transpileArgList: transpiler.transpileArgList
};

},{"./interpreter":4,"./transpiler":9,"sugarlisp-core/reader":41,"sugarlisp-core/transpiler-context":44}],3:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    ctx = require('sugarlisp-core/transpiler-context');

var debug = require('debug')('sugarlisp:handler-utils:debug'),
    trace = require('debug')('sugarlisp:handler-utils:trace');

/**
* Find the closest scoped dialect with a handler function
* in the specified type of table (e.g. "gentab", "exectab")
* for the specified "command" and execute it.
*/
function callHandlerfnFor(command, form, tableType) {
  tableType = tableType || "gentab";
  var result;
  var lexer = sl.lexerOf(form);

  // try the dialects from beginning (inner scope) to end (outer scope)...
  for(var i = 0; !result && i < lexer.dialects.length; i++) {
    var dialect = lexer.dialects[i];
    trace('looking for "' + command + '" in ' + dialect.name + ' ' + tableType);
    var handlerfn = findHandlerfn(dialect[tableType], command, form);
    if(handlerfn) {
      // note: gen functions are allowed to return undefined
      // to defer to other handlers
      trace('found "' + command + '" in ' + dialect.name + ' ' + tableType);
      result = invokeHandlerfn(handlerfn, lexer, command, form);
    }
  }

  // if we tried all the dialects and either didn't find a match,
  // or found a match that returned undefined...
  if(!result) {
    // try all the dialects again, this time looking for "__default"
    for(var i = 0; !result && i < lexer.dialects.length; i++) {
      var dialect = lexer.dialects[i];
      debug('looking for "__default" in ' + dialect.name + ' ' + tableType);
      var handlerfn = dialect[tableType] !== undefined ? dialect[tableType]['__default'] : undefined;
      if(handlerfn) {
        debug('found "__default" in ' + dialect.name + ' ' + tableType);
        result = invokeHandlerfn(handlerfn, lexer, command, form);
      }
    }
  }

  // note if we get to here and result remains undefined, the
  // transpiler simply passes the form thru to the result code
  if(!result) {
    debug('No ' + tableType + ' function found for "' + command);
  }
  return result;
}

/**
* Find a handler function in the gentab for the given command.
*
* note:  here we match the similar function for the readtab
*   (for consistency) but we've yet to use any ":category"
*   type of entries in the current gentabs - need to give
*   more thought to this.  We have "token categories" and
*   "atom types" (e.g. as used by the match dialect).  If
*   anything the "types" seem more appropriate here than the
*   "token categories" for code generation.
*/
function findHandlerfn(table, command, form) {
  var handlerfn;
  if(table) {
    // first try just the text (this is typically what is used)
    handlerfn = table[command];

    // but ignore inherited properties e.g. "toString" etc.
    if(handlerfn && !table.hasOwnProperty(command)) {
      handlerfn = undefined;
    }

    if(!handlerfn && form.category) {
      // next try the token text qualified by it's form category
      handlerfn = table[command + ':' + form.category];
      if(!readfn && form.category) {
        // finally try the wildcarded form category (e.g. "*:float")
        handlerfn = table['*:' + form.category];
      }
    }
  }
  return handlerfn;
}

/**
* Generate some code (or forms if handlerfn a macro) and return it,
* optionally using the gentab of a "local dialect".
*
* Note: normally local dialects are assigned as the dialect name on
* the *readtab* function (and not the gentab function).  In that
* case the reader has conveyed the local dialect name to us on
* "form.dialect".
*
* Alternatively the local dialect name can be configured as
* "dialect" on the gentab function (just like it can on the
* readtab).  This might be handy e.g. if you *just* have
* custom code generation for the local dialect (and not custom
* syntax).
*
* When a local dialect is assigned, we activate it while
* generating the code, so it's gentab functions become available
* within the scope of the form.
*/
function invokeHandlerfn(handlerfn, lexer, command, form) {
  var result;
  // have we gotten a a name for a "local dialect"?
  var localdialectname = handlerfn.dialect || form.dialect;
  if(!localdialectname) {
    // nope
    result = invokeWithTranspilerCtx(handlerfn, form);
  }
  else {
    try {
      // use_dialect will load the dialect and push it on the dialect stack
      var localdialect = reader.use_dialect(localdialectname, lexer, {local: true});

      // now when the gen function is called, transpiling that *it* does
      // (e.g. by calling "x()") will have the local gentab available:
      result = invokeWithTranspilerCtx(handlerfn, form);
    }
    finally {
      // now that we're done generating code for the form, pop the
      // stack so the local dialect is no longer in effect
      reader.unuse_dialect(localdialectname, lexer);
    }
  }

  return result;
}

/**
* Low level invoke of the gentab code generator function
* The transpiler "context" becomes "this" when executed.
*/
function invokeWithTranspilerCtx(handlerfn, forms) {

  var result;

  // Give them a simple error reporter that will
  // by default use line/col info from this form:
  ctx.error = function(msg, locator) {
    forms.error(msg, locator);
  };

  // invoke the transpile function where "this" conveys
  // the "transpiler context"...

  // was the function coded to expect arguments?
  var handlerfncode = handlerfn.toString();
  var matches = /function\s*\w*\((.*)\)\s*{/.exec(handlerfncode);
  if(!matches || !matches[1]) {
    // no args - spread the args as javascript "arguments"
    // (this is expected by our "match functions" for example)
    result = handlerfn.apply(ctx, forms);
  }
  else {
    // yup does it expect just a single arg or more than one?
    var argsText = matches[1].trim();
    if(argsText === '' || argsText.indexOf(',') !== -1) {
      // none or more than one - they want the forms spread to their args
      result = handlerfn.apply(ctx, forms);
    }
    else {
      // just one - they're expecting the "forms" array
      if(argsText.indexOf("forms") === -1) {
        debug('warning - passing "forms" despite arg name "' + argsText + '" to ' + matches[0] + " ...");
      }
      result = handlerfn.call(ctx, forms);
    }
  }

  return result;
}

/**
* eval the provide javascript code using vm.runInThisContext if
* the "csp" transpile option was provided (otherwise normal eval).
*/
var evalJavascript = function (jscodestr) {
  var result;

  // we make the transpiler options visible to the eval
  var transpile = ctx.options.transpile;
  if(jscodestr.indexOf("function") !== -1) {
    jscodestr = "(" + jscodestr + ")";
  }

  // allow eval to work without error when CSP e.g. in Atom Preview
  if(ctx.options.transpile.csp) {
    require('loophole').allowUnsafeEval(function() {
      result = eval(jscodestr);
    });
  }
  else {
    if(typeof window !== 'undefined') {
      // we have our own require which caches modules
      // conveyed in the body of text/sugarlisp tags
      jscodestr = jscodestr.replace(/require\s*\(/g, 'slrequire(');

      // and we make sure all evals are done with window as the environment:
      result = eval.call(window, jscodestr);
    }
    else {
      result = eval(jscodestr);
    }
  }

  return result;
}

module.exports = {
  callHandlerfnFor: callHandlerfnFor,
  evalJavascript: evalJavascript
};

},{"debug":10,"loophole":17,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/transpiler-context":44}],4:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    lex = require('sugarlisp-core/lexer'),
    reader = require('sugarlisp-core/reader'),
    handlers = require('./handler-utils'),
    ctx = require('sugarlisp-core/transpiler-context'),
    transpiler = require('./transpiler');

var debug = require('debug')('sugarlisp:interpreter:debug'),
    trace = require('debug')('sugarlisp:interpreter:trace'),
    //slinfo = function() { console.log.apply(this, arguments); };
    slinfo = require('debug')('sugarlisp:info');

// Evaluate some sugarlisp source code to a javascript value.
function evaluate(codestr, filenameOrLexer, options) {

  options = options || {};
  var lexer;
  var filename;
  if(filenameOrLexer instanceof lex.Lexer) {
     lexer = filenameOrLexer;
     filename = lexer.filename;
  }
  else {
    filename = filenameOrLexer;
  }

  debug('***** STARTING FILE:', filename);

  // switch false to true below for a quick and dirty profile of timings
  var dumptimes = false && (console.time && console.timeEnd);
  if(dumptimes) { console.time("total"); }

  // note the way we the repl reads the "rest of the text" following the
  // code/read/tokens commands scarfs up a wrapping ")" so the repl really
  // *can't* use the "auto wrapping" () feature.
  options.wrapOuterForm = options.wrapOuterForm || "no";

  // note our options wind up as ctx.options.transpile in the global context:
  ctx.initialize(filename, options);

  // read the lispy forms from this source file (as well as any dialects it #uses)
  debug('\n** READING\n');
  if(dumptimes) { console.time("read"); }

  var forms = reader.read_from_source(codestr,
                        (lexer ? lexer : filename),
                        options);

  if(ctx.options.transpile.unwrapTopForm && Array.isArray(forms)) {
    // there are "nop" (noop) forms at the start left from the #uses:
    forms = forms[forms.length-1];
  }

  if(dumptimes) { console.timeEnd("read"); }
  debug('\n** THE FORMS READ WERE:\n' + sl.pprintSEXP(forms.toJSON(),{bareSymbols: true}));

  // if we reach here they really *do* want to transpile...

  debug('\n** EVALUATING\n');
  if(dumptimes) { console.time("eval"); }
// I ORIGINALLY HAD THIS BUT WE'RE NOT WRAPPING IN THE EXTRA()!!  var result = evalExpressions(forms, options);
  var result = evalExpression(forms, options);
  if(dumptimes) { console.timeEnd("eval"); }

  if(dumptimes) { console.timeEnd("total"); }
  return result;
}

var evalExpressions = function(forms, noReturnStmt) {
  var result;

  // we evaluate all the forms, but only return the last
  forms.forEach(function(form, formPos, forms) {
    result = evalExpression(form);
  });

  return result;
}

var evalExpression = function(form, options) {

  if (!form) { return null; }

  // for us a simple symbol like "x" is simply
  // evaluated as a javascript variable name
  if (sl.isAtom(form)) {
    return options.jsevalcontext.eval(form.value);
  }

  // it's not an atom it's an s-expression i.e. "(x..)"...
  options = options || {};
  var lexer = sl.lexerOf(form);
  var command = sl.valueOf(form[0]);
  slinfo("command: " + command);

  if(command) {
    var msg = 'looking up exectab/gentab function for "' + command + '"';
    debug(lexer.message_src_loc(msg, form[0], {file:false}));
  }
  else {
    debug('command without a symbol in first position!!',
      typeof form[0], "array:", Array.isArray(form[0]));
  }

  if (typeof command === "string") {
    var result = handlers.callHandlerfnFor(command, form, "exectab");
    if(!result) {
      // accept javascript strings as return values from gentab functions
      // note: they typically return sl.generated() objects, returning strings
      //   is the exception not the rule.
      var generated = handlers.callHandlerfnFor(command, form, "gentab");
      if(generated) {
        if(typeof generated === "string") {
          return options.jsevalcontext.eval(generated);
        }
        else {
          // is this a compile time macro function e.g. a (macro name ...)
          // form or a function prefixed by #keyword?
          if(form.__macrofn || generated.__macrofn) {
            transpiler.registerMacro(form, generated.toString());
            return undefined;
          }

          // Did we get back forms (e.g. was it a macro?)
          if(!sl.isGenerated(generated))
          {
            // eval this - we need a result (not forms)
            return evalExpression(generated);
          }
          else {
            // this was generated code - use javascript's eval on it:
            return options.jsevalcontext.eval(generated.toString());
          }
        }
      }
    }
    else {
      // result from exectab:
      return result;
    }
  }

  // if we get here nothing matched in the exectabs/gentabs
  var generated = transpiler.transpileOther(form, options);
  if(generated && sl.isGenerated(generated)) {
    return options.jsevalcontext.eval(generated.toString());
  }
}

module.exports = {
  eval: evaluate
};

},{"./handler-utils":3,"./transpiler":9,"debug":10,"sugarlisp-core/lexer":33,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/transpiler-context":44}],5:[function(require,module,exports){
module.exports = function() {
  var logo = "";
  logo += "  __                         __ _           \n";
  logo += " / _\\_   _  __ _  __ _ _ __ / /(_)___ _ __  \n";
  logo += " \\ \\| | | |/ _` |/ _` | '__/ / | / __| '_ \\ \n";
  logo += " _\\ \\ |_| | (_| | (_| | | / /__| \\__ \\ |_) |\n";
  logo += " \\__/\\__,_|\\__, |\\__,_|_| \\____/_|___/ .__/ \n";
  logo += "           |___/                     |_|    \n";
  return logo;
};

},{}],6:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    transpiler = require("../transpiler");

function code_cmd(command, sourcecode) {
    if (!sourcecode || sl.typeOf(sourcecode) !== 'string') {
      command.error('"code" expects some source code to transpile');
    }

    return transpile(sl.valueOfStr(sourcecode), this.lexer);
};

code_cmd.description = {
  summary: "display the code generated by the transpiler",
  usage: 'code <source code>',
  example: 'code var x = 1;'
};

function read_cmd(command, sourcecode) {
    if (!sourcecode || sl.typeOf(sourcecode) !== 'string') {
      command.error('"read" expects a string of source to read from');
    }

    return transpile(sl.valueOfStr(sourcecode), this.lexer, {to: 'core'});
};

read_cmd.description = {
  summary: "display the forms read by the reader",
  usage: 'read <source code>',
  example: 'read var x = 1;'
};

function tokens_cmd(command, sourcecode) {
    if (!sourcecode || sl.typeOf(sourcecode) !== 'string') {
      command.error('"tokens" expects a string of source to read from');
    }

    return transpile(sl.valueOfStr(sourcecode), this.lexer, {to: 'tokens'});
};

tokens_cmd.description = {
  summary: "display the tokens read by the lexer",
  usage: 'tokens <source code>',
  example: 'tokens var x = 1;'
};

// in the repl you can display the dialects currently being #used
// with: dialects
function dialects_cmd(command) {
  // dump the currently active dialects
  var dialectNames = [];
  sl.lexerOf(command).dialects.forEach(function(dialect) {
    dialectNames.unshift(dialect.name);
  });
  return dialectNames.join('\n');
};

dialects_cmd.description = {
  summary: "display the dialects currently being #used",
  usage: 'dialects'
};

function help_cmd(command, topic) {
  var help = "";
  if(topic) {
    if(!module.exports[topic.value]) {
      help = "no such command: " + topic.value;
    }
    else {
      var desc = module.exports[topic.value].description;
      if(!desc) {
        help = "no description available for: " + topic.value;
      }
      else {
        help = "\n" + formatSummary(topic.value, module.exports[topic.value].description) +
          (desc.usage ? pad(12, ' ',"usage:") + desc.usage + "\n" : "" ) +
          (desc.example ? pad(12, ' ', "example:") + desc.example + "\n" : "") + "\n";
      }
    }
  }
  else {
    help = "\nAvailable Commands\n\n";
    Object.keys(module.exports).forEach(function(commandname) {
      if(module.exports[commandname].description) {
        help += formatSummary(commandname, module.exports[commandname].description);
      }
    })
    help += "\n";
    help += "For more information about the above try:\n\n    help <command>\n";
    help += "\n";
  }

  return help;
};

function formatSummary(commandname, description) {
  // used two lines here so this fits in the vertical browser-repl:
  return pad(12, ' ', commandname) + "\n" + description.summary + "\n\n";
}

function pad(len, padchar, str, padLeft) {
  var pad = Array(len).join(padchar);
  if (typeof str === 'undefined')
    return pad;
  if (padLeft) {
    return (pad + str).slice(-pad.length);
  } else {
    return (str + pad).substring(0, pad.length);
  }
}

function transpile(codestr, lexer, options) {
  options = options || {};
  options.for = options.for || (typeof window !== 'undefined' ? "browser" : "server");
  return transpiler.transpile((codestr + '\n'), lexer, options);
}

module.exports = {
  code: code_cmd,
  read: read_cmd,
  tokens: tokens_cmd,
  dialects: dialects_cmd,
  help: help_cmd
}

},{"../transpiler":9,"sugarlisp-core/sl-types":43}],7:[function(require,module,exports){
module.exports = {
  name: "repl-dialect",
  readtab: require('./readtab'),
  exectab: require('./exectab')
};

},{"./exectab":6,"./readtab":8}],8:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    utils = require('sugarlisp-core/utils'),
    ctx = require('sugarlisp-core/transpiler-context');

// the code/read/tokens commands all start with a keyword
// followed by an undelimited *string* of source code
// note: the source code is read as text not as lisp forms.
function sourcecodecommand(lexer, text) {
  var list = sl.list(sl.atom(lexer.skip_token(text)));
  list.push(sl.str(lexer.rest_of_text()));
  return list;
};

// code "(a quoted string of source code)"
exports['code'] = sourcecodecommand;

// read "(a quoted string of source code)"
exports['read'] = sourcecodecommand;

// tokens "(a quoted string of source code)"
exports['tokens'] = sourcecodecommand;

// dialects
exports['dialects'] = reader.parenfree(0);

// help [topic]
exports['help'] = function(lexer, text) {
  var helpToken = lexer.skip_token(text);
  var list = sl.list(sl.atom(helpToken));
  var topic = lexer.next_word_token();
  if(topic) {
    list.push(sl.atom(topic));
  }
  return list;
};

},{"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/transpiler-context":44,"sugarlisp-core/utils":45}],9:[function(require,module,exports){
var packageJson = require('../package.json'),
    banner = "// Generated by SugarLisp v" + packageJson.version + "\n",
    bannerables = ['.slisp', '.ls', '.sugar'],
    isFunction = /^function\b/,
    returnStmtIllegalCode = /^[\s]*return\b|^[\s]*if\b|^[\s]*for\b|^[\s]*while\b|^[\s]*switch\b|^[\s]*break\b|^[\s]*console\b/,
    sl = require('sugarlisp-core/sl-types'),
    dialoader = require("sugarlisp-core/dialect-loader"), // avoid circular dependency (need to investigate)
    macros = require('sugarlisp-core/macro-expander'),
    lex = require('sugarlisp-core/lexer'),
    reader = require('sugarlisp-core/reader'),
    handlers = require('./handler-utils'),
    utils = require('sugarlisp-core/utils'),
    ctx = require('sugarlisp-core/transpiler-context'),
    beautify = require('js-beautify').js_beautify;

var debug = require('debug')('sugarlisp:transpiler:debug'),
    trace = require('debug')('sugarlisp:transpiler:trace'),
    //slinfo = function() { console.log.apply(this, arguments); };
    slinfo = require('debug')('sugarlisp:info');

/**
* transpile the source of the specified file to a string containing
* the generated code
* (this is the main entry point for the sugarlisp transpiler)
* options =
*   sourceMap: true to generate source maps
*   to: 'tokens' or 'core' or 'json' (otherwise to javascript!)
*/
var transpile = function(codestr, filenameOrLexer, options) {

  var lexer;
  var filename;
  if(filenameOrLexer instanceof lex.Lexer) {
     lexer = filenameOrLexer;
     filename = lexer.filename;
  }
  else {
    filename = filenameOrLexer;
  }

  debug('***** STARTING FILE:', filename);

  // switch false to true below for a quick and dirty profile of timings
  var dumptimes = false && (console.time && console.timeEnd);
  if(dumptimes) { console.time("total"); }

  ctx.initialize(filename, options);

  if (typeof ctx.options.transpile.includeComments === 'undefined') {
    ctx.options.transpile.includeComments = false;
  }

  // do they want a dump of the tokens (presumably for debugging purposes?)
  // note: these are an *approximate* dump of tokens available if the
  //   (more accurate) "tokens" option is failing.
  if(ctx.options.transpile.to === '~tokens') {
    var tokens = reader.nonlocal_tokens(codestr, filename);
    return lex.formatTokenDump(tokens, lex.formatTokenText);
  }
  if(ctx.options.transpile.to === '~tokensx') {
    var tokens = reader.nonlocal_tokens(codestr, filename);
    return lex.formatTokenDump(tokens, lex.formatTokenSexp, "(tokens ", ")");
  }

  // read the lispy forms from this source file (as well as any dialects it #uses)
  debug('\n** READING\n');
  if(dumptimes) { console.time("read"); }
  var forms = reader.read_from_source(codestr,
                        (lexer ? lexer : filename),
                        ctx.options.transpile);

  if(Array.isArray(forms)) {
    if(ctx.options.transpile.unwrapTopForm ||
      (typeof ctx.options.transpile.unwrapTopForm === 'undefined' &&
        (ctx.options.transpile.to === 'core' || ctx.options.transpile.to === 'json') &&
        ctx.options.transpile.wrapOuterForm !== 'no'))
    {
      // there are "nop" (noop) forms at the start left from the #uses:
      forms = forms[forms.length-1];
    }
  }

  if(dumptimes) { console.timeEnd("read"); }
  debug('\n** THE FORMS READ WERE:\n' + sl.pprintSEXP(forms.toJSON(),{bareSymbols: true}));

  if(ctx.options.transpile.to === 'core') {
    // they want the parse tree formatted back as s-expreesions
    return sl.pprintSEXP(forms.toJSON(),{bareSymbols: true}) + '\n';
  }
  else if(ctx.options.transpile.to === 'json') {
    // they just want the parse tree as json
    return sl.pprintJSON(forms.toJSON(),{bareSymbols: false}) + '\n';
  }

  // do they want an *accurate* dump of the tokens?
  // because of the "--to tokens" option, the lexer used by read_from_source
  // has kept a dump of the tokens.  This is the only way to ensure we
  // match when e.g. local dialects have their own lextabs.  Unfortunately
  // this isn't much help if reading is blowing up - so there's is also
  // the "~tokens" ("approximate tokens") option (see above).
  if(ctx.options.transpile.to === 'tokens') {
    return lex.formatTokenDump(ctx.lexer.tokenDump, lex.formatTokenText);
  }
  if(ctx.options.transpile.to === 'tokensx') {
    return lex.formatTokenDump(ctx.lexer.tokenDump, lex.formatTokenSexp, "(tokens ", ")");
  }

  // if we reach here they really *do* want to transpile...

  debug('\n** TRANSPILING\n');
  if(dumptimes) { console.time("transpile"); }
  var generated = transpileExpressions(forms)
  if(bannerables.indexOf(ctx.fileext) !== -1) {
    generated.unshift(banner);
  }
  if(dumptimes) { console.timeEnd("transpile"); }

  // generate source maps if requested
  // note:  we do not support source map generation when compiling in browser.
  if (ctx.options.transpile.sourceMap) {
// SHOULDN'T THE OUTPUT FILE NAME BE PASSED INTO US AS AN OPTION?
    var outputFilename = path.basename(filename, path.extname(filename)) + '.js';

    // Create the source map using mozilla's library
    var output = toStringWithSourceMap(generated, filename, outputFilename);
    var sourceMapFile = outputFilename + '.map';
    fs.writeFileSync(sourceMapFile, output.map)

    // note we return the code generated by the mozilla library
    // (so we're ensured it matches the source map)
    return output.code + "\n//# sourceMappingURL=" +
            path.relative(path.dirname(filename),
            sourceMapFile);
  }

  var result = generated.toString();

  // running this third party beautifier is just a stop gap till some
  // formatting bugs are fixed - note we only do this when compiling with
  // node, we don't do (or support) this in the browser (for both
  // performance and code size reasons).
  if(typeof ctx.options.transpile.pretty === 'undefined' ||
    (typeof ctx.options.transpile.pretty === 'boolean' &&
      ctx.options.transpile.pretty !== false) ||
    (typeof ctx.options.transpile.pretty === 'string' &&
      ['false','no'].indexOf(ctx.options.transpile.pretty) === -1))
  {
    if(dumptimes) { console.time("beautify"); }
    result = beautify(result, { indent_size: 2 });
    if(dumptimes) { console.timeEnd("beautify"); }
  }

  if(dumptimes) { console.timeEnd("total"); }
  return result;
}

function sanitizePrelude(prelude) {

  // we add a newline ourselves - so reduce 2 in the prelude to one:
  var sanitized = prelude.replace(/^\n/, '');
  //sanitized = sanitized.replace(/\n$/, '');
  // convert lispy line comments (";;" and ";") to javascript's "//"
  sanitized = sanitized.replace(/\;\;/g, '//').replace(/\;/g, '//');

  if(!ctx.options.transpile.includeComments && !sanitized.match(/^\s+$/)) {
    return "";
  }

  return sanitized;
}

var transpileExpressions = function(forms, noReturnStmt) {
    ctx.indent += ctx.indentSize;
    var generated = sl.generated(),
        indentstr = " ".repeat(ctx.indent);

    // a prelude on the top forms may be e.g.
    // comments from the top of a file.
    if(forms.prelude) {
      generated.push([sanitizePrelude(forms.prelude)]);
    }

    forms.forEach(function(form, formPos, forms) {
        var nextForm = null;

        if (Array.isArray(form)) {
            nextForm = transpileExpression(form)
        } else {
            nextForm = form
        }

        if (nextForm) {
            var nextFormStr = nextForm.toString();
            var nextFormStrTrimmed = nextFormStr.trim();

            // note: originally it was the "context" that held the "noSemiColon"
            //   flag but that has been a problem - want to move to the generated
            //   list's *forms* having that directly (which is more controlled)
            var endline = (nextForm.noSemiColon || ctx.noSemiColon ? "" :
              // avoid double semicolons regardless
              (nextFormStrTrimmed.charAt(nextFormStrTrimmed.length-1) === ';' ? "" : ";"));
            ctx.noSemiColon = false;
            endline += (nextForm.noNewline || ctx.noNewline ? "" :
              // avoid double newlines
              (nextFormStr.charAt(nextFormStr.length-1) === '\n' ? "" : "\n"));
            ctx.noNewline = false;

            // eliminate extra returns from compile macros
            if(nextForm.prelude && !nextForm.__compiletimemacro) {
              generated.push([sanitizePrelude(nextForm.prelude)]);
            }

            // we (typically) add a return on the last expression for
            // all but the topmost expressions (i.e. topmost in a file)
            var optionalReturnStmt = "";
            if (!noReturnStmt && formPos === forms.length-1 && ctx.indent) {
                // but not always:
                if((typeof ctx.options.transpile.implicitReturns === 'undefined' ||
                  ctx.options.transpile.implicitReturns) &&
                  !(nextForm.noReturn || ctx.noReturn) &&
                    !returnStmtIllegalCode.test(nextFormStr))
                {
                  optionalReturnStmt = "return ";
                }
                ctx.noReturn = false;
            }

            if(!reader.isignorableform(nextForm)) {
              // note we push *nextForm* not *nextFormStr* to preserve line/cols
              generated.push([indentstr + optionalReturnStmt, nextForm, endline]);
            }

            if(nextForm.endPrelude) {
               generated.push([sanitizePrelude(nextForm.endPrelude)]);
            }
        }

        // output any before/after code
        // (most likely the result of binding expressions e.g. the "#=")
        if(ctx.beforeCode && ctx.beforeCode.length > 0) {
          ctx.beforeCode.forEach(function(beforecode) {
            generated.unshift([ctx.margin(),beforecode.toString(),"\n"]);
          });
          ctx.beforeCode = [];
        }
        if(ctx.afterCode && ctx.afterCode.length > 0) {
          ctx.afterCode.forEach(function(aftercode) {
            generated.push([ctx.margin(),aftercode.toString(),"\n"]);
          });
          ctx.afterCode = [];
        }
    })

    // an endPrelude at the top level may be
    // e.g. comments at the end of a file
    if(forms.endPrelude) {
      generated.push([sanitizePrelude(forms.endPrelude)]);
    }
    ctx.indent -= ctx.indentSize;
    return generated;
}

// transpileExpression returns a generated expression
// with any prelude (leading whitespace or comments)
// prepended so they pass thru to the generated code
var transpileExpression = function(form, options) {

  var generated = transpileExpressionAlone(form, options);
  if(generated) {
    // a prelude is comments or white space preceding a form
    generated.prelude = generated.prelude || form.prelude ||
      (Array.isArray(form) && form.length > 0 ? form[0].prelude : undefined);

    // an end prelude is comments or white space preceding
    // the end of a list
    generated.endPrelude = generated.endPrelude || form.endPrelude ||
      (Array.isArray(form) && form.length > 0 ? form[0].endPrelude : undefined);
  }

  // now that this expression is completely generated
  if (Array.isArray(form)) {
    // find binding code to be included before/after this expression
    // (this is our approach to automatically invoking "reactor" functions)
    ctx.beforeCode = includeBindingCode("before", form, ctx.beforeCode);
    ctx.afterCode = includeBindingCode("after", form, ctx.afterCode);
  }

  return generated;
}

// transpileExpressionAlone is a helper for transpileExpression above
// (call it instead)
var transpileExpressionAlone = function(form, options) {

    if (!form || !form[0]) {
        return null;
    }

    options = options || {};
    var lexer = sl.lexerOf(form);
    var command = sl.valueOf(form[0]);
    slinfo("command: " + command);

    if(command) {
      var msg = 'looking up gentab function for "' + command + '"';
      debug(lexer.message_src_loc(msg, form[0], {file:false}));
    }
    else {
      debug('command without a symbol in first position!!',
        typeof form[0], "array:", Array.isArray(form[0]));
    }

    if (typeof command === "string") {
        // accept javascript strings as return values from gentab functions
        // note: they typically return sl.generated() objects, returning strings
        //   is the exception not the rule.
        var result = handlers.callHandlerfnFor(command, form);
        if(result && typeof result === "string") {
          var snode = sl.generated();
          snode.push(result);
          result = snode;
        }
        if(result) {
          // is this a compile time macro function e.g. a (macro name ...)
          // form or a function prefixed by #keyword?
          if(form.__macrofn || result.__macrofn) {
            registerMacro(form, result.toString());
            var noout = sl.generated();
            noout.__compiletimemacro = true;
            return noout;
          }

          // Did we get back forms (i.e. was it a macro or a function playing
          // the role of macro?)
          if(!sl.isGenerated(result) &&
            !options.expandOnly && !ctx.options.transpile.noMacros)
          {
            // transpile these forms - we need code!!
            return transpileExpression(result);
          }
          else {
            // it's ready for output
            return result;
          }
        }

        // transform e.g. (.method target) to (target).method
        if (command.charAt(0) === ".") {
            //NOT SURE THIS IS STILL NEEDED - NEED TO CONFIRM
console.log("IS THIS STILL USED?")
            var generated = sl.generated();
            generated.push(Array.isArray(form[1]) ? transpileExpression(form[1]) : form[1]);
            generated.unshift("(");
            generated.push([")", form[0]]);

            return generated
        }
    }

    return transpileOther(form, options);
}

// Transpile the forms that are not found in the gentab,
// e.g. forms that simply pass thru to the output, etc.
function transpileOther(form, options) {

  // the thing in first position was not a known function or macro...
  if(typeof options.passthru !== 'undefined' && !options.passthru) {
    return null;
  }

  // is it a new "top level" e.g. an inline script tag?
  if(form.__toplevel) {
    return transpileExpressions(form);
  }
  // or it may be a "passthru"
  // (things not in the gentab tables simply "pass through" to the output)
  transpileSubExpressions(form);
  var firstCodeForm = form[0];
  if(!firstCodeForm) {
    return sl.generated();
  }

  // it's most likely a function to call...
  var fName = firstCodeForm;

  // but if it's a list not an atom...
  if (sl.isGenerated(firstCodeForm)) {
    // if it's not the keyword "function"
    if(!isFunction.test(firstCodeForm.toString())) {
// I THINK I GOT A LITTLE CONFUSED BELOW - THIS IS looking
// AT THE TRANSPILED OUTPUT NOT THE READ *FORMS*.  although
// THIS IS THE CASE WHERE THINGS ARE "PASSING THRU" TO THE
// OUTPUT SO THERE IS A CORRESPONDANCE BETWEEN THE input
// FORMS AND THE TRANSPILED FORMS IN THIS CASE.
//
// I ADDED THIS CHECK BELOW TO GET MY gox.scripty csp EXAMPLE
// TO WORK - BUT IT'S A HACK!! I THINK I *CANT* TELL WHEN
// PARENS HAVE BEEN ADDED TO CONTROL PRECEDENCE VERSUS
// NORMAL USE OF LISPY PARENS!  THE LINE BELOW WAS A HACK
// TO SAY THINGS LIKE "csp.go" ARE NOT PARENTHESIZED FOR
// THE SAKE OF CONTROLLING PRECEDENCE WHEREAS (x = getit()) !== true
// IS.  MAYBE I NEED A WAY TO MARK ARRAYS WHERE THE *USER* ENTERED
// ACTUAL PARENS VERSUS WHERE THE ARRAYS REPRESENT E.G. NESTED
// STRUCTURE INFERRED BY SCRIPTY WITH ITS "NOPARENS" APPROACHES.
// AND MAYBE IN SCRIPTY WE REALLY AND TRULY SAY THAT PARENS ARE
// *NOT* LISPY PARENS.  PARENS ARE EITHER EXPECTED SYNTAX
// (EG AROUND CONDITIONS IN IFS AND WHILES) OR ELSE THEY ARE
// THE USER ADDING THEM TO OVERRIDE PRECEDENCE.   WHEREAS IN
// LISPY OBVIOUSLY PARENS ARE NORMAL LISPY PARENS.
//
// THE COUNTERPOINT IS THAT THIS IS THE *SAME* TRANSPILER FOR
// BOTH SCRIPTY AND LISPY - THERE'S ONLY ONE!! SO *IF* "EXTRA"
// PARENS ARE ALLOWED IN SCRIPTY THAT MEANS THEY'RE ALSO POSSIBLE
// IN LISPY!!  BUT WHAT DO *EXTRA* PARENS MEAN IN LISPY?  THEY
// WOULD TRADITIONALLY HAVE BEEN AN ERROR RIGHT?  IE IN LISPY
// EXTRA PARENS WOULD NORMALLY MEAN AN ARRAY THAT DOESNT HAVE
// A FUNCTION/MACRO TO CALL IN FIRST POSITION - IT HAS AN ARRAY
// IN FIRST POSITION!  CAN THIS RECONCILED WITH SCRIPTY IN A
// LOGICAL/UNDERSTANDABLE WAY?  WHAT WOULD THE RULES BE that
// MAKES IT UNDERSTANDABLE?
//
// NEEDS MORE THOUGHT AND EXPERIMENTATION - BUT NOT RIGHT NOW!!
      var frst = firstCodeForm[0];
      // NEW TRY if(frst && Array.isArray(frst) && frst.length > 0 && sl.valueOf(frst[1]) !== '.') {
      if(Array.isArray(frst) && frst.length > 0 && sl.valueOf(frst[1]) !== '.') {
        // this is not a function call it's just a
        // a form parenthesized to override default precedence
        form[0] = sl.generated(['(', firstCodeForm, ')']);
        return form;
      }
    }
    else {
      // this is an inline function to be called
      // it must be wrapped in () as an IIFE
      fName = sl.generated(['(', fName, ')'])
    }
  }

  // is this an extra wrapper?
  // (can happen e.g. if they parenthesize infix expressions in sugarscript)
  if(Array.isArray(form) && form.length === 1 &&
     (typeof form[0].callable !== 'undefined' && !form[0].callable))
  {
    return form[0]; // unwrap so don't get e.g. (x == y)() !!
  }

  // this is a function call - generate in javascript "fn(args)" style
  var fArgs = sl.generatedFromArray(form.slice(1)).join(",");
  var fCall = sl.generated(fName,
                      sl.atom("(", {token: form}),
                      fArgs,
                      sl.atom(")", {token: form, tokenType: "end"}));
  if(fName.prelude) {
    fCall.unshift([sanitizePrelude(fName.prelude)]);
  }

  return fCall;
}

function includeBindingCode(when, form, codearray) {
  if(form.length > 1 && form[0].value && form[1].value) {
    var fnName = form[0].value;
    var firstArg = form[1].value;
    var lexer = sl.lexerOf(form);
    if(lexer && lexer.bindingCode[when][fnName]) {
      lexer.bindingCode[when][fnName].forEach(function(injectspec) {
        injectspec.of.forEach(function(observed) {
          if(sl.valueOf(observed) === firstArg) {
            trace("including " + when + " " + fnName + " binding code: " + injectspec.insert.toString());
            codearray.push(injectspec.insert);
          }
        });
      });
    }
  }
  return codearray;
}

// transpileExpression shorthand:
//    infer whether the given expression needs to be generated or not
var x = function(form, options) {
  if(form && !sl.isAtom(form) && sl.isList(form) && form.length > 0) {
      return transpileExpression(form, options);
  }
  else {
    if(Array.isArray(form)) {
      transpileSubExpressions(form, options);
    }
  }

  return form;
}

/**
* transpileSubExpressions transpiles the children of the array and
* replaces them with their generated output.  It does not return anything.
*/
var transpileSubExpressions = function(forms) {
    forms.forEach(function(value, formPos, forms) {
        if (Array.isArray(value)) forms[formPos] = transpileExpression(value)
    })
}

/**
* Transpile the forms in the provided list and return them as
* a code for a comma separated argument list.
*/
var transpileArgList = function(forms) {
  transpileSubExpressions(forms);
  return sl.generatedFromArray(forms).join(",");
}


/**
* eval the js code generated from the provided expression forms
*/
var evalExpression = function (form) {
  var code = transpileExpression(form);
  return handlers.evalJavascript(code.toString());
}

// expand a macro expression (without fully compiling it)
var expandExpression = function(form) {
  // truncate compilation after expanding the macro
  return transpileExpression(form, true);
}

function toStringWithSourceMap(generated, inputFilename, outputFilename) {
  // fill in missing line/col numbers
  setMissingLineColNumbers(generated);

  // convert our generated tree to a Mozilla SourceNode tree
  var sourceNodes = toSourceNodes(generated, inputFilename);

  return sourceNodes.toStringWithSourceMap({
    file: outputFilename
  });
}

function setMissingLineColNumbers(generated) {
  var lastLine = 0, lastCol = 0;
  sl.finddeep(generated, function(form, pos) {
    if(typeof form.line !== 'undefined' && typeof form.col !== 'undefined') {
      lastLine = form.line;
      lastCol = form.col;
    }
    else {
      form.line = lastLine;
      form.col = lastCol;
    }
    return false; // (keep walking)
  });
}

function toSourceNodes(generated, inputFilename) {
  var SourceNode = require('source-map').SourceNode;
  var rootNode = new SourceNode();
  var lastLine = 0, lastCol = 0;
  sl.finddeep(generated, function(form, pos) {
    var text = sl.toString(form);
    // account for the 2 line wrapper,
    // plus lines start at 1, columns start at 0
    var node = new SourceNode(form.line >= 1 ? form.line : 1, form.col, inputFilename, text, text);
    rootNode.add(node);
    return false; // (keep walking)
  });

  return rootNode;
}

function registerMacro(form, macrofncode) {
  var mName;
  if(!sl.isList(form[1]) && sl.isList(form[2])) {
      mName = form[1];
  }
  else {
    form.error("compile time macro functions must have a name.");
  }
  debug("registering compile time macro function:", sl.valueOf(mName));
  // eval the javascript generated for the macro function
  trace("the macro function code is:", macrofncode);
  var macrofn = handlers.evalJavascript(macrofncode);
  if(macrofn) {
    // adding macro into the transpile table for the current dialect
// REVISIT THIS LINE - WHAT ABOUT LOCAL DIALECTS?  THIS IS JUST THE CURRENT FILE DIALECT:
    sl.lexerOf(form).dialects[0].gentab[mName.value] = macrofn;
  }
  else {
    form.error("malformed macro function: could not generate macro function");
  }

  // making the named macro available to the rest of the transpile
  // was all that's needed in this case.
  trace("Returning nothing in generated output (" + sl.valueOf(mName) + " was eval'ed)");
  ctx.noSemiColon = true;
  ctx.noNewline = true;
}

utils.mergeInto(ctx, {
  transpile: transpile,
  x: x,
  transpileExpressions: transpileExpressions,
  transpileExpression: transpileExpression,
  transpileSubExpressions: transpileSubExpressions,
  transpileArgList: transpileArgList,
  expandExpression: expandExpression,
  macroexpand: macros.expand,
  evalExpression: evalExpression,
  evalJavascript: handlers.evalJavascript
});

module.exports = {
  transpile: transpile,
  transpileExpression: transpileExpression,
  transpileExpressions: transpileExpressions,
  transpileArgList: transpileArgList,
  transpileOther: transpileOther,
  registerMacro: registerMacro
};

},{"../package.json":78,"./handler-utils":3,"debug":10,"js-beautify":13,"source-map":undefined,"sugarlisp-core/dialect-loader":26,"sugarlisp-core/lexer":33,"sugarlisp-core/macro-expander":35,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/transpiler-context":44,"sugarlisp-core/utils":45}],10:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":11}],11:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":12}],12:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],13:[function(require,module,exports){
/**
The following batches are equivalent:

var beautify_js = require('js-beautify');
var beautify_js = require('js-beautify').js;
var beautify_js = require('js-beautify').js_beautify;

var beautify_css = require('js-beautify').css;
var beautify_css = require('js-beautify').css_beautify;

var beautify_html = require('js-beautify').html;
var beautify_html = require('js-beautify').html_beautify;

All methods returned accept two arguments, the source string and an options object.
**/

function get_beautify(js_beautify, css_beautify, html_beautify) {
    // the default is js
    var beautify = function (src, config) {
        return js_beautify.js_beautify(src, config);
    };

    // short aliases
    beautify.js   = js_beautify.js_beautify;
    beautify.css  = css_beautify.css_beautify;
    beautify.html = html_beautify.html_beautify;

    // legacy aliases
    beautify.js_beautify   = js_beautify.js_beautify;
    beautify.css_beautify  = css_beautify.css_beautify;
    beautify.html_beautify = html_beautify.html_beautify;

    return beautify;
}

if (typeof define === "function" && define.amd) {
    // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
    define([
        "./lib/beautify",
        "./lib/beautify-css",
        "./lib/beautify-html"
    ], function(js_beautify, css_beautify, html_beautify) {
        return get_beautify(js_beautify, css_beautify, html_beautify);
    });
} else {
    (function(mod) {
        var js_beautify = require('./lib/beautify');
        var css_beautify = require('./lib/beautify-css');
        var html_beautify = require('./lib/beautify-html');

        mod.exports = get_beautify(js_beautify, css_beautify, html_beautify);

    })(module);
}


},{"./lib/beautify":16,"./lib/beautify-css":14,"./lib/beautify-html":15}],14:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 CSS Beautifier
---------------

    Written by Harutyun Amirjanyan, (amirjanyan@gmail.com)

    Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
        http://jsbeautifier.org/

    Usage:
        css_beautify(source_text);
        css_beautify(source_text, options);

    The options are (default in brackets):
        indent_size (4)                   — indentation size,
        indent_char (space)               — character to indent with,
        selector_separator_newline (true) - separate selectors with newline or
                                            not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)          - end with a newline
        newline_between_rules (true)      - add a new line after every css rule

    e.g

    css_beautify(css_source_text, {
      'indent_size': 1,
      'indent_char': '\t',
      'selector_separator': ' ',
      'end_with_newline': false,
      'newline_between_rules': true
    });
*/

// http://www.w3.org/TR/CSS21/syndata.html#tokenization
// http://www.w3.org/TR/css3-syntax/

(function() {
    function css_beautify(source_text, options) {
        options = options || {};
        source_text = source_text || '';
        // HACK: newline parsing inconsistent. This brute force normalizes the input.
        source_text = source_text.replace(/\r\n|[\r\u2028\u2029]/g, '\n')

        var indentSize = options.indent_size || 4;
        var indentCharacter = options.indent_char || ' ';
        var selectorSeparatorNewline = (options.selector_separator_newline === undefined) ? true : options.selector_separator_newline;
        var end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
        var newline_between_rules = (options.newline_between_rules === undefined) ? true : options.newline_between_rules;
        var eol = options.eol ? options.eol : '\n';

        // compatibility
        if (typeof indentSize === "string") {
            indentSize = parseInt(indentSize, 10);
        }

        if(options.indent_with_tabs){
            indentCharacter = '\t';
            indentSize = 1;
        }

        eol = eol.replace(/\\r/, '\r').replace(/\\n/, '\n')


        // tokenizer
        var whiteRe = /^\s+$/;
        var wordRe = /[\w$\-_]/;

        var pos = -1,
            ch;
        var parenLevel = 0;

        function next() {
            ch = source_text.charAt(++pos);
            return ch || '';
        }

        function peek(skipWhitespace) {
            var result = '';
            var prev_pos = pos;
            if (skipWhitespace) {
                eatWhitespace();
            }
            result = source_text.charAt(pos + 1) || '';
            pos = prev_pos - 1;
            next();
            return result;
        }

        function eatString(endChars) {
            var start = pos;
            while (next()) {
                if (ch === "\\") {
                    next();
                } else if (endChars.indexOf(ch) !== -1) {
                    break;
                } else if (ch === "\n") {
                    break;
                }
            }
            return source_text.substring(start, pos + 1);
        }

        function peekString(endChar) {
            var prev_pos = pos;
            var str = eatString(endChar);
            pos = prev_pos - 1;
            next();
            return str;
        }

        function eatWhitespace() {
            var result = '';
            while (whiteRe.test(peek())) {
                next();
                result += ch;
            }
            return result;
        }

        function skipWhitespace() {
            var result = '';
            if (ch && whiteRe.test(ch)) {
                result = ch;
            }
            while (whiteRe.test(next())) {
                result += ch;
            }
            return result;
        }

        function eatComment(singleLine) {
            var start = pos;
            singleLine = peek() === "/";
            next();
            while (next()) {
                if (!singleLine && ch === "*" && peek() === "/") {
                    next();
                    break;
                } else if (singleLine && ch === "\n") {
                    return source_text.substring(start, pos);
                }
            }

            return source_text.substring(start, pos) + ch;
        }


        function lookBack(str) {
            return source_text.substring(pos - str.length, pos).toLowerCase() ===
                str;
        }

        // Nested pseudo-class if we are insideRule
        // and the next special character found opens
        // a new block
        function foundNestedPseudoClass() {
            var openParen = 0;
            for (var i = pos + 1; i < source_text.length; i++) {
                var ch = source_text.charAt(i);
                if (ch === "{") {
                    return true;
                } else if (ch === '(') {
                    // pseudoclasses can contain ()
                    openParen += 1;
                } else if (ch === ')') {
                    if (openParen == 0) {
                        return false;
                    }
                    openParen -= 1;
                } else if (ch === ";" || ch === "}") {
                    return false;
                }
            }
            return false;
        }

        // printer
        var basebaseIndentString = source_text.match(/^[\t ]*/)[0];
        var singleIndent = new Array(indentSize + 1).join(indentCharacter);
        var indentLevel = 0;
        var nestedLevel = 0;

        function indent() {
            indentLevel++;
            basebaseIndentString += singleIndent;
        }

        function outdent() {
            indentLevel--;
            basebaseIndentString = basebaseIndentString.slice(0, -indentSize);
        }

        var print = {};
        print["{"] = function(ch) {
            print.singleSpace();
            output.push(ch);
            print.newLine();
        };
        print["}"] = function(ch) {
            print.newLine();
            output.push(ch);
            print.newLine();
        };

        print._lastCharWhitespace = function() {
            return whiteRe.test(output[output.length - 1]);
        };

        print.newLine = function(keepWhitespace) {
            if (output.length) {
                if (!keepWhitespace && output[output.length - 1] !== '\n') {
                    print.trim();
                }

                output.push('\n');

                if (basebaseIndentString) {
                    output.push(basebaseIndentString);
                }
            }
        };
        print.singleSpace = function() {
            if (output.length && !print._lastCharWhitespace()) {
                output.push(' ');
            }
        };

        print.preserveSingleSpace = function() {
            if (isAfterSpace) {
                print.singleSpace();
            }
        };

        print.trim = function() {
            while (print._lastCharWhitespace()) {
                output.pop();
            }
        };


        var output = [];
        /*_____________________--------------------_____________________*/

        var insideRule = false;
        var insidePropertyValue = false;
        var enteringConditionalGroup = false;
        var top_ch = '';
        var last_top_ch = '';

        while (true) {
            var whitespace = skipWhitespace();
            var isAfterSpace = whitespace !== '';
            var isAfterNewline = whitespace.indexOf('\n') !== -1;
            last_top_ch = top_ch;
            top_ch = ch;

            if (!ch) {
                break;
            } else if (ch === '/' && peek() === '*') { /* css comment */
                var header = indentLevel === 0;

                if (isAfterNewline || header) {
                    print.newLine();
                }

                output.push(eatComment());
                print.newLine();
                if (header) {
                    print.newLine(true);
                }
            } else if (ch === '/' && peek() === '/') { // single line comment
                if (!isAfterNewline && last_top_ch !== '{' ) {
                    print.trim();
                }
                print.singleSpace();
                output.push(eatComment());
                print.newLine();
            } else if (ch === '@') {
                print.preserveSingleSpace();
                output.push(ch);

                // strip trailing space, if present, for hash property checks
                var variableOrRule = peekString(": ,;{}()[]/='\"");

                if (variableOrRule.match(/[ :]$/)) {
                    // we have a variable or pseudo-class, add it and insert one space before continuing
                    next();
                    variableOrRule = eatString(": ").replace(/\s$/, '');
                    output.push(variableOrRule);
                    print.singleSpace();
                }

                variableOrRule = variableOrRule.replace(/\s$/, '')

                // might be a nesting at-rule
                if (variableOrRule in css_beautify.NESTED_AT_RULE) {
                    nestedLevel += 1;
                    if (variableOrRule in css_beautify.CONDITIONAL_GROUP_RULE) {
                        enteringConditionalGroup = true;
                    }
                }
            } else if (ch === '#' && peek() === '{') {
              print.preserveSingleSpace();
              output.push(eatString('}'));
            } else if (ch === '{') {
                if (peek(true) === '}') {
                    eatWhitespace();
                    next();
                    print.singleSpace();
                    output.push("{}");
                    print.newLine();
                    if (newline_between_rules && indentLevel === 0) {
                        print.newLine(true);
                    }
                } else {
                    indent();
                    print["{"](ch);
                    // when entering conditional groups, only rulesets are allowed
                    if (enteringConditionalGroup) {
                        enteringConditionalGroup = false;
                        insideRule = (indentLevel > nestedLevel);
                    } else {
                        // otherwise, declarations are also allowed
                        insideRule = (indentLevel >= nestedLevel);
                    }
                }
            } else if (ch === '}') {
                outdent();
                print["}"](ch);
                insideRule = false;
                insidePropertyValue = false;
                if (nestedLevel) {
                    nestedLevel--;
                }
                if (newline_between_rules && indentLevel === 0) {
                    print.newLine(true);
                }
            } else if (ch === ":") {
                eatWhitespace();
                if ((insideRule || enteringConditionalGroup) &&
                    !(lookBack("&") || foundNestedPseudoClass())) {
                    // 'property: value' delimiter
                    // which could be in a conditional group query
                    insidePropertyValue = true;
                    output.push(':');
                    print.singleSpace();
                } else {
                    // sass/less parent reference don't use a space
                    // sass nested pseudo-class don't use a space
                    if (peek() === ":") {
                        // pseudo-element
                        next();
                        output.push("::");
                    } else {
                        // pseudo-class
                        output.push(':');
                    }
                }
            } else if (ch === '"' || ch === '\'') {
                print.preserveSingleSpace();
                output.push(eatString(ch));
            } else if (ch === ';') {
                insidePropertyValue = false;
                output.push(ch);
                print.newLine();
            } else if (ch === '(') { // may be a url
                if (lookBack("url")) {
                    output.push(ch);
                    eatWhitespace();
                    if (next()) {
                        if (ch !== ')' && ch !== '"' && ch !== '\'') {
                            output.push(eatString(')'));
                        } else {
                            pos--;
                        }
                    }
                } else {
                    parenLevel++;
                    print.preserveSingleSpace();
                    output.push(ch);
                    eatWhitespace();
                }
            } else if (ch === ')') {
                output.push(ch);
                parenLevel--;
            } else if (ch === ',') {
                output.push(ch);
                eatWhitespace();
                if (selectorSeparatorNewline && !insidePropertyValue && parenLevel < 1) {
                    print.newLine();
                } else {
                    print.singleSpace();
                }
            } else if (ch === ']') {
                output.push(ch);
            } else if (ch === '[') {
                print.preserveSingleSpace();
                output.push(ch);
            } else if (ch === '=') { // no whitespace before or after
                eatWhitespace()
                ch = '=';
                output.push(ch);
            } else {
                print.preserveSingleSpace();
                output.push(ch);
            }
        }


        var sweetCode = '';
        if (basebaseIndentString) {
            sweetCode += basebaseIndentString;
        }

        sweetCode += output.join('').replace(/[\r\n\t ]+$/, '');

        // establish end_with_newline
        if (end_with_newline) {
            sweetCode += '\n';
        }

        if (eol != '\n') {
            sweetCode = sweetCode.replace(/[\n]/g, eol);
        }

        return sweetCode;
    }

    // https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
    css_beautify.NESTED_AT_RULE = {
        "@page": true,
        "@font-face": true,
        "@keyframes": true,
        // also in CONDITIONAL_GROUP_RULE below
        "@media": true,
        "@supports": true,
        "@document": true
    };
    css_beautify.CONDITIONAL_GROUP_RULE = {
        "@media": true,
        "@supports": true,
        "@document": true
    };

    /*global define */
    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return {
                css_beautify: css_beautify
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        exports.css_beautify = css_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.css_beautify = css_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.css_beautify = css_beautify;
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],15:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
    http://jsbeautifier.org/

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_inner_html (default false)  — indent <head> and <body> sections,
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    wrap_line_length (default 250)            -  maximum amount of characters per line (0 = disable)
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "none"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"
    preserve_newlines (default true) - whether existing line breaks before elements should be preserved
                                        Only works before elements, not inside tags or for text.
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk
    indent_handlebars (default false) - format and indent {{#foo}} and {{/foo}}
    end_with_newline (false)          - end with a newline
    extra_liners (default [head,body,/html]) -List of tags that should have an extra newline before them.

    e.g.

    style_html(html_source, {
      'indent_inner_html': false,
      'indent_size': 2,
      'indent_char': ' ',
      'wrap_line_length': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u'],
      'preserve_newlines': true,
      'max_preserve_newlines': 5,
      'indent_handlebars': false,
      'extra_liners': ['/html']
    });
*/

(function() {

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function ltrim(s) {
        return s.replace(/^\s+/g, '');
    }

    function rtrim(s) {
        return s.replace(/\s+$/g,'');
    }

    function style_html(html_source, options, js_beautify, css_beautify) {
        //Wrapper function to invoke all the necessary constructors and deal with the output.

        var multi_parser,
            indent_inner_html,
            indent_size,
            indent_character,
            wrap_line_length,
            brace_style,
            unformatted,
            preserve_newlines,
            max_preserve_newlines,
            indent_handlebars,
            wrap_attributes,
            wrap_attributes_indent_size,
            end_with_newline,
            extra_liners,
            eol;

        options = options || {};

        // backwards compatibility to 1.3.4
        if ((options.wrap_line_length === undefined || parseInt(options.wrap_line_length, 10) === 0) &&
                (options.max_char !== undefined && parseInt(options.max_char, 10) !== 0)) {
            options.wrap_line_length = options.max_char;
        }

        indent_inner_html = (options.indent_inner_html === undefined) ? false : options.indent_inner_html;
        indent_size = (options.indent_size === undefined) ? 4 : parseInt(options.indent_size, 10);
        indent_character = (options.indent_char === undefined) ? ' ' : options.indent_char;
        brace_style = (options.brace_style === undefined) ? 'collapse' : options.brace_style;
        wrap_line_length =  parseInt(options.wrap_line_length, 10) === 0 ? 32786 : parseInt(options.wrap_line_length || 250, 10);
        unformatted = options.unformatted || ['a', 'span', 'img', 'bdo', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd',
            'var', 'cite', 'abbr', 'acronym', 'q', 'sub', 'sup', 'tt', 'i', 'b', 'big', 'small', 'u', 's', 'strike',
            'font', 'ins', 'del', 'pre', 'address', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        max_preserve_newlines = preserve_newlines ?
            (isNaN(parseInt(options.max_preserve_newlines, 10)) ? 32786 : parseInt(options.max_preserve_newlines, 10))
            : 0;
        indent_handlebars = (options.indent_handlebars === undefined) ? false : options.indent_handlebars;
        wrap_attributes = (options.wrap_attributes === undefined) ? 'auto' : options.wrap_attributes;
        wrap_attributes_indent_size = (options.wrap_attributes_indent_size === undefined) ? indent_size : parseInt(options.wrap_attributes_indent_size, 10) || indent_size;
        end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
        extra_liners = (typeof options.extra_liners == 'object') && options.extra_liners ?
            options.extra_liners.concat() : (typeof options.extra_liners === 'string') ?
            options.extra_liners.split(',') : 'head,body,/html'.split(',');
        eol = options.eol ? options.eol : '\n';

        if(options.indent_with_tabs){
            indent_character = '\t';
            indent_size = 1;
        }

        eol = eol.replace(/\\r/, '\r').replace(/\\n/, '\n')

        function Parser() {

            this.pos = 0; //Parser position
            this.token = '';
            this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
            this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
                parent: 'parent1',
                parentcount: 1,
                parent1: ''
            };
            this.tag_type = '';
            this.token_text = this.last_token = this.last_text = this.token_type = '';
            this.newlines = 0;
            this.indent_content = indent_inner_html;

            this.Utils = { //Uilities made available to the various functions
                whitespace: "\n\r\t ".split(''),
                single_token: 'br,input,link,meta,source,!doctype,basefont,base,area,hr,wbr,param,img,isindex,embed'.split(','), //all the single tags for HTML
                extra_liners: extra_liners, //for tags that need a line of whitespace before them
                in_array: function(what, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        if (what === arr[i]) {
                            return true;
                        }
                    }
                    return false;
                }
            };

            // Return true if the given text is composed entirely of whitespace.
            this.is_whitespace = function(text) {
                for (var n = 0; n < text.length; text++) {
                    if (!this.Utils.in_array(text.charAt(n), this.Utils.whitespace)) {
                        return false;
                    }
                }
                return true;
            };

            this.traverse_whitespace = function() {
                var input_char = '';

                input_char = this.input.charAt(this.pos);
                if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                    this.newlines = 0;
                    while (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (preserve_newlines && input_char === '\n' && this.newlines <= max_preserve_newlines) {
                            this.newlines += 1;
                        }

                        this.pos++;
                        input_char = this.input.charAt(this.pos);
                    }
                    return true;
                }
                return false;
            };

            // Append a space to the given content (string array) or, if we are
            // at the wrap_line_length, append a newline/indentation.
            this.space_or_wrap = function(content) {
                if (this.line_char_count >= this.wrap_line_length) { //insert a line when the wrap_line_length is reached
                    this.print_newline(false, content);
                    this.print_indentation(content);
                } else {
                    this.line_char_count++;
                    content.push(' ');
                }
            };

            this.get_content = function() { //function to capture regular content between tags
                var input_char = '',
                    content = [],
                    space = false; //if a space is needed

                while (this.input.charAt(this.pos) !== '<') {
                    if (this.pos >= this.input.length) {
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                        continue;
                    }

                    if (indent_handlebars) {
                        // Handlebars parsing is complicated.
                        // {{#foo}} and {{/foo}} are formatted tags.
                        // {{something}} should get treated as content, except:
                        // {{else}} specifically behaves like {{#if}} and {{/if}}
                        var peek3 = this.input.substr(this.pos, 3);
                        if (peek3 === '{{#' || peek3 === '{{/') {
                            // These are tags and not content.
                            break;
                        } else if (peek3 === '{{!') {
                            return [this.get_tag(), 'TK_TAG_HANDLEBARS_COMMENT'];
                        } else if (this.input.substr(this.pos, 2) === '{{') {
                            if (this.get_tag(true) === '{{else}}') {
                                break;
                            }
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                    this.line_char_count++;
                    content.push(input_char); //letter at-a-time (or string) inserted to an array
                }
                return content.length ? content.join('') : '';
            };

            this.get_contents_to = function(name) { //get the full content of a script or style to pass to js_beautify
                if (this.pos === this.input.length) {
                    return ['', 'TK_EOF'];
                }
                var input_char = '';
                var content = '';
                var reg_match = new RegExp('</' + name + '\\s*>', 'igm');
                reg_match.lastIndex = this.pos;
                var reg_array = reg_match.exec(this.input);
                var end_script = reg_array ? reg_array.index : this.input.length; //absolute end of script
                if (this.pos < end_script) { //get everything in between the script tags
                    content = this.input.substring(this.pos, end_script);
                    this.pos = end_script;
                }
                return content;
            };

            this.record_tag = function(tag) { //function to record a tag and its parent in this.tags Object
                if (this.tags[tag + 'count']) { //check for the existence of this tag type
                    this.tags[tag + 'count']++;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                } else { //otherwise initialize this tag type
                    this.tags[tag + 'count'] = 1;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                }
                this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
                this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
            };

            this.retrieve_tag = function(tag) { //function to retrieve the opening tag to the corresponding closer
                if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
                    var temp_parent = this.tags.parent; //check to see if it's a closable tag.
                    while (temp_parent) { //till we reach '' (the initial value);
                        if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
                            break;
                        }
                        temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
                    }
                    if (temp_parent) { //if we caught something
                        this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
                        this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
                    }
                    delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
                    delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
                    if (this.tags[tag + 'count'] === 1) {
                        delete this.tags[tag + 'count'];
                    } else {
                        this.tags[tag + 'count']--;
                    }
                }
            };

            this.indent_to_tag = function(tag) {
                // Match the indentation level to the last use of this tag, but don't remove it.
                if (!this.tags[tag + 'count']) {
                    return;
                }
                var temp_parent = this.tags.parent;
                while (temp_parent) {
                    if (tag + this.tags[tag + 'count'] === temp_parent) {
                        break;
                    }
                    temp_parent = this.tags[temp_parent + 'parent'];
                }
                if (temp_parent) {
                    this.indent_level = this.tags[tag + this.tags[tag + 'count']];
                }
            };

            this.get_tag = function(peek) { //function to get a full tag and parse its type
                var input_char = '',
                    content = [],
                    comment = '',
                    space = false,
                    first_attr = true,
                    tag_start, tag_end,
                    tag_start_char,
                    orig_pos = this.pos,
                    orig_line_char_count = this.line_char_count;

                peek = peek !== undefined ? peek : false;

                do {
                    if (this.pos >= this.input.length) {
                        if (peek) {
                            this.pos = orig_pos;
                            this.line_char_count = orig_line_char_count;
                        }
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
                        space = true;
                        continue;
                    }

                    if (input_char === "'" || input_char === '"') {
                        input_char += this.get_unformatted(input_char);
                        space = true;

                    }

                    if (input_char === '=') { //no space before =
                        space = false;
                    }

                    if (content.length && content[content.length - 1] !== '=' && input_char !== '>' && space) {
                        //no space after = or before >
                        this.space_or_wrap(content);
                        space = false;
                        if (!first_attr && wrap_attributes === 'force' &&  input_char !== '/') {
                            this.print_newline(true, content);
                            this.print_indentation(content);
                            for (var count = 0; count < wrap_attributes_indent_size; count++) {
                                content.push(indent_character);
                            }
                        }
                        for (var i = 0; i < content.length; i++) {
                          if (content[i] === ' ') {
                            first_attr = false;
                            break;
                          }
                        }
                    }

                    if (indent_handlebars && tag_start_char === '<') {
                        // When inside an angle-bracket tag, put spaces around
                        // handlebars not inside of strings.
                        if ((input_char + this.input.charAt(this.pos)) === '{{') {
                            input_char += this.get_unformatted('}}');
                            if (content.length && content[content.length - 1] !== ' ' && content[content.length - 1] !== '<') {
                                input_char = ' ' + input_char;
                            }
                            space = true;
                        }
                    }

                    if (input_char === '<' && !tag_start_char) {
                        tag_start = this.pos - 1;
                        tag_start_char = '<';
                    }

                    if (indent_handlebars && !tag_start_char) {
                        if (content.length >= 2 && content[content.length - 1] === '{' && content[content.length - 2] === '{') {
                            if (input_char === '#' || input_char === '/' || input_char === '!') {
                                tag_start = this.pos - 3;
                            } else {
                                tag_start = this.pos - 2;
                            }
                            tag_start_char = '{';
                        }
                    }

                    this.line_char_count++;
                    content.push(input_char); //inserts character at-a-time (or string)

                    if (content[1] && (content[1] === '!' || content[1] === '?' || content[1] === '%')) { //if we're in a comment, do something special
                        // We treat all comments as literals, even more than preformatted tags
                        // we just look for the appropriate close tag
                        content = [this.get_comment(tag_start)];
                        break;
                    }

                    if (indent_handlebars && content[1] && content[1] === '{' && content[2] && content[2] === '!') { //if we're in a comment, do something special
                        // We treat all comments as literals, even more than preformatted tags
                        // we just look for the appropriate close tag
                        content = [this.get_comment(tag_start)];
                        break;
                    }

                    if (indent_handlebars && tag_start_char === '{' && content.length > 2 && content[content.length - 2] === '}' && content[content.length - 1] === '}') {
                        break;
                    }
                } while (input_char !== '>');

                var tag_complete = content.join('');
                var tag_index;
                var tag_offset;

                if (tag_complete.indexOf(' ') !== -1) { //if there's whitespace, thats where the tag name ends
                    tag_index = tag_complete.indexOf(' ');
                } else if (tag_complete.charAt(0) === '{') {
                    tag_index = tag_complete.indexOf('}');
                } else { //otherwise go with the tag ending
                    tag_index = tag_complete.indexOf('>');
                }
                if (tag_complete.charAt(0) === '<' || !indent_handlebars) {
                    tag_offset = 1;
                } else {
                    tag_offset = tag_complete.charAt(2) === '#' ? 3 : 2;
                }
                var tag_check = tag_complete.substring(tag_offset, tag_index).toLowerCase();
                if (tag_complete.charAt(tag_complete.length - 2) === '/' ||
                    this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                    }
                } else if (indent_handlebars && tag_complete.charAt(0) === '{' && tag_check === 'else') {
                    if (!peek) {
                        this.indent_to_tag('if');
                        this.tag_type = 'HANDLEBARS_ELSE';
                        this.indent_content = true;
                        this.traverse_whitespace();
                    }
                } else if (this.is_unformatted(tag_check, unformatted)) { // do not reformat the "unformatted" tags
                    comment = this.get_unformatted('</' + tag_check + '>', tag_complete); //...delegate to get_unformatted function
                    content.push(comment);
                    tag_end = this.pos - 1;
                    this.tag_type = 'SINGLE';
                } else if (tag_check === 'script' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 &&
                    tag_complete.search(/\b(text|application)\/(x-)?(javascript|ecmascript|jscript|livescript)/) > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'SCRIPT';
                    }
                } else if (tag_check === 'style' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 && tag_complete.search('text/css') > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'STYLE';
                    }
                } else if (tag_check.charAt(0) === '!') { //peek for <! comment
                    // for comments content is already correct.
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                        this.traverse_whitespace();
                    }
                } else if (!peek) {
                    if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
                        this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
                        this.tag_type = 'END';
                    } else { //otherwise it's a start-tag
                        this.record_tag(tag_check); //push it on the tag stack
                        if (tag_check.toLowerCase() !== 'html') {
                            this.indent_content = true;
                        }
                        this.tag_type = 'START';
                    }

                    // Allow preserving of newlines after a start or end tag
                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                    }

                    if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
                        this.print_newline(false, this.output);
                        if (this.output.length && this.output[this.output.length - 2] !== '\n') {
                            this.print_newline(true, this.output);
                        }
                    }
                }

                if (peek) {
                    this.pos = orig_pos;
                    this.line_char_count = orig_line_char_count;
                }

                return content.join(''); //returns fully formatted tag
            };

            this.get_comment = function(start_pos) { //function to return comment content in its entirety
                // this is will have very poor perf, but will work for now.
                var comment = '',
                    delimiter = '>',
                    matched = false;

                this.pos = start_pos;
                input_char = this.input.charAt(this.pos);
                this.pos++;

                while (this.pos <= this.input.length) {
                    comment += input_char;

                    // only need to check for the delimiter if the last chars match
                    if (comment.charAt(comment.length - 1) === delimiter.charAt(delimiter.length - 1) &&
                        comment.indexOf(delimiter) !== -1) {
                        break;
                    }

                    // only need to search for custom delimiter for the first few characters
                    if (!matched && comment.length < 10) {
                        if (comment.indexOf('<![if') === 0) { //peek for <![if conditional comment
                            delimiter = '<![endif]>';
                            matched = true;
                        } else if (comment.indexOf('<![cdata[') === 0) { //if it's a <[cdata[ comment...
                            delimiter = ']]>';
                            matched = true;
                        } else if (comment.indexOf('<![') === 0) { // some other ![ comment? ...
                            delimiter = ']>';
                            matched = true;
                        } else if (comment.indexOf('<!--') === 0) { // <!-- comment ...
                            delimiter = '-->';
                            matched = true;
                        } else if (comment.indexOf('{{!') === 0) { // {{! handlebars comment
                            delimiter = '}}';
                            matched = true;
                        } else if (comment.indexOf('<?') === 0) { // {{! handlebars comment
                            delimiter = '?>';
                            matched = true;
                        } else if (comment.indexOf('<%') === 0) { // {{! handlebars comment
                            delimiter = '%>';
                            matched = true;
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                }

                return comment;
            };

            this.get_unformatted = function(delimiter, orig_tag) { //function to return unformatted content in its entirety

                if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) !== -1) {
                    return '';
                }
                var input_char = '';
                var content = '';
                var min_index = 0;
                var space = true;
                do {

                    if (this.pos >= this.input.length) {
                        return content;
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (!space) {
                            this.line_char_count--;
                            continue;
                        }
                        if (input_char === '\n' || input_char === '\r') {
                            content += '\n';
                            /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
                for (var i=0; i<this.indent_level; i++) {
                  content += this.indent_string;
                }
                space = false; //...and make sure other indentation is erased
                */
                            this.line_char_count = 0;
                            continue;
                        }
                    }
                    content += input_char;
                    this.line_char_count++;
                    space = true;

                    if (indent_handlebars && input_char === '{' && content.length && content.charAt(content.length - 2) === '{') {
                        // Handlebars expressions in strings should also be unformatted.
                        content += this.get_unformatted('}}');
                        // These expressions are opaque.  Ignore delimiters found in them.
                        min_index = content.length;
                    }
                } while (content.toLowerCase().indexOf(delimiter, min_index) === -1);
                return content;
            };

            this.get_token = function() { //initial handler for token-retrieval
                var token;

                if (this.last_token === 'TK_TAG_SCRIPT' || this.last_token === 'TK_TAG_STYLE') { //check if we need to format javascript
                    var type = this.last_token.substr(7);
                    token = this.get_contents_to(type);
                    if (typeof token !== 'string') {
                        return token;
                    }
                    return [token, 'TK_' + type];
                }
                if (this.current_mode === 'CONTENT') {
                    token = this.get_content();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        return [token, 'TK_CONTENT'];
                    }
                }

                if (this.current_mode === 'TAG') {
                    token = this.get_tag();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        var tag_name_type = 'TK_TAG_' + this.tag_type;
                        return [token, tag_name_type];
                    }
                }
            };

            this.get_full_indent = function(level) {
                level = this.indent_level + level || 0;
                if (level < 1) {
                    return '';
                }

                return Array(level + 1).join(this.indent_string);
            };

            this.is_unformatted = function(tag_check, unformatted) {
                //is this an HTML5 block-level link?
                if (!this.Utils.in_array(tag_check, unformatted)) {
                    return false;
                }

                if (tag_check.toLowerCase() !== 'a' || !this.Utils.in_array('a', unformatted)) {
                    return true;
                }

                //at this point we have an  tag; is its first child something we want to remain
                //unformatted?
                var next_tag = this.get_tag(true /* peek. */ );

                // test next_tag to see if it is just html tag (no external content)
                var tag = (next_tag || "").match(/^\s*<\s*\/?([a-z]*)\s*[^>]*>\s*$/);

                // if next_tag comes back but is not an isolated tag, then
                // let's treat the 'a' tag as having content
                // and respect the unformatted option
                if (!tag || this.Utils.in_array(tag, unformatted)) {
                    return true;
                } else {
                    return false;
                }
            };

            this.printer = function(js_source, indent_character, indent_size, wrap_line_length, brace_style) { //handles input/output and some other printing functions

                this.input = js_source || ''; //gets the input for the Parser

                // HACK: newline parsing inconsistent. This brute force normalizes the input.
                this.input = this.input.replace(/\r\n|[\r\u2028\u2029]/g, '\n')

                this.output = [];
                this.indent_character = indent_character;
                this.indent_string = '';
                this.indent_size = indent_size;
                this.brace_style = brace_style;
                this.indent_level = 0;
                this.wrap_line_length = wrap_line_length;
                this.line_char_count = 0; //count to see if wrap_line_length was exceeded

                for (var i = 0; i < this.indent_size; i++) {
                    this.indent_string += this.indent_character;
                }

                this.print_newline = function(force, arr) {
                    this.line_char_count = 0;
                    if (!arr || !arr.length) {
                        return;
                    }
                    if (force || (arr[arr.length - 1] !== '\n')) { //we might want the extra line
                        if ((arr[arr.length - 1] !== '\n')) {
                            arr[arr.length - 1] = rtrim(arr[arr.length - 1]);
                        }
                        arr.push('\n');
                    }
                };

                this.print_indentation = function(arr) {
                    for (var i = 0; i < this.indent_level; i++) {
                        arr.push(this.indent_string);
                        this.line_char_count += this.indent_string.length;
                    }
                };

                this.print_token = function(text) {
                    // Avoid printing initial whitespace.
                    if (this.is_whitespace(text) && !this.output.length) {
                        return;
                    }
                    if (text || text !== '') {
                        if (this.output.length && this.output[this.output.length - 1] === '\n') {
                            this.print_indentation(this.output);
                            text = ltrim(text);
                        }
                    }
                    this.print_token_raw(text);
                };

                this.print_token_raw = function(text) {
                    // If we are going to print newlines, truncate trailing
                    // whitespace, as the newlines will represent the space.
                    if (this.newlines > 0) {
                        text = rtrim(text);
                    }

                    if (text && text !== '') {
                        if (text.length > 1 && text.charAt(text.length - 1) === '\n') {
                            // unformatted tags can grab newlines as their last character
                            this.output.push(text.slice(0, -1));
                            this.print_newline(false, this.output);
                        } else {
                            this.output.push(text);
                        }
                    }

                    for (var n = 0; n < this.newlines; n++) {
                        this.print_newline(n > 0, this.output);
                    }
                    this.newlines = 0;
                };

                this.indent = function() {
                    this.indent_level++;
                };

                this.unindent = function() {
                    if (this.indent_level > 0) {
                        this.indent_level--;
                    }
                };
            };
            return this;
        }

        /*_____________________--------------------_____________________*/

        multi_parser = new Parser(); //wrapping functions Parser
        multi_parser.printer(html_source, indent_character, indent_size, wrap_line_length, brace_style); //initialize starting values

        while (true) {
            var t = multi_parser.get_token();
            multi_parser.token_text = t[0];
            multi_parser.token_type = t[1];

            if (multi_parser.token_type === 'TK_EOF') {
                break;
            }

            switch (multi_parser.token_type) {
                case 'TK_TAG_START':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_STYLE':
                case 'TK_TAG_SCRIPT':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_END':
                    //Print new line only if the tag has no content and has child
                    if (multi_parser.last_token === 'TK_CONTENT' && multi_parser.last_text === '') {
                        var tag_name = multi_parser.token_text.match(/\w+/)[0];
                        var tag_extracted_from_last_output = null;
                        if (multi_parser.output.length) {
                            tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length - 1].match(/(?:<|{{#)\s*(\w+)/);
                        }
                        if (tag_extracted_from_last_output === null ||
                            (tag_extracted_from_last_output[1] !== tag_name && !multi_parser.Utils.in_array(tag_extracted_from_last_output[1], unformatted))) {
                            multi_parser.print_newline(false, multi_parser.output);
                        }
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_SINGLE':
                    // Don't add a newline before elements that should remain unformatted.
                    var tag_check = multi_parser.token_text.match(/^\s*<([a-z-]+)/i);
                    if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)) {
                        multi_parser.print_newline(false, multi_parser.output);
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_HANDLEBARS_ELSE':
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_HANDLEBARS_COMMENT':
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'TAG';
                    break;
                case 'TK_CONTENT':
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'TAG';
                    break;
                case 'TK_STYLE':
                case 'TK_SCRIPT':
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_newline(false, multi_parser.output);
                        var text = multi_parser.token_text,
                            _beautifier,
                            script_indent_level = 1;
                        if (multi_parser.token_type === 'TK_SCRIPT') {
                            _beautifier = typeof js_beautify === 'function' && js_beautify;
                        } else if (multi_parser.token_type === 'TK_STYLE') {
                            _beautifier = typeof css_beautify === 'function' && css_beautify;
                        }

                        if (options.indent_scripts === "keep") {
                            script_indent_level = 0;
                        } else if (options.indent_scripts === "separate") {
                            script_indent_level = -multi_parser.indent_level;
                        }

                        var indentation = multi_parser.get_full_indent(script_indent_level);
                        if (_beautifier) {

                            // call the Beautifier if avaliable
                            var Child_options = function() {
                                this.eol = '\n';
                            };
                            Child_options.prototype = options;
                            var child_options = new Child_options();
                            text = _beautifier(text.replace(/^\s*/, indentation), child_options);
                        } else {
                            // simply indent the string otherwise
                            var white = text.match(/^\s*/)[0];
                            var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
                            var reindent = multi_parser.get_full_indent(script_indent_level - _level);
                            text = text.replace(/^\s*/, indentation)
                                .replace(/\r\n|\r|\n/g, '\n' + reindent)
                                .replace(/\s+$/, '');
                        }
                        if (text) {
                            multi_parser.print_token_raw(text);
                            multi_parser.print_newline(true, multi_parser.output);
                        }
                    }
                    multi_parser.current_mode = 'TAG';
                    break;
                default:
                    // We should not be getting here but we don't want to drop input on the floor
                    // Just output the text and move on
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_token(multi_parser.token_text);
                    }
                    break;
            }
            multi_parser.last_token = multi_parser.token_type;
            multi_parser.last_text = multi_parser.token_text;
        }
        var sweet_code = multi_parser.output.join('').replace(/[\r\n\t ]+$/, '');

        // establish end_with_newline
        if (end_with_newline) {
            sweet_code += '\n';
        }

        if (eol != '\n') {
            sweet_code = sweet_code.replace(/[\n]/g, eol);
        }

        return sweet_code;
    }

    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define(["require", "./beautify", "./beautify-css"], function(requireamd) {
            var js_beautify =  requireamd("./beautify");
            var css_beautify =  requireamd("./beautify-css");

            return {
              html_beautify: function(html_source, options) {
                return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
              }
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        var js_beautify = require('./beautify.js');
        var css_beautify = require('./beautify-css.js');

        exports.html_beautify = function(html_source, options) {
            return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
        };
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.html_beautify = function(html_source, options) {
            return style_html(html_source, options, window.js_beautify, window.css_beautify);
        };
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.html_beautify = function(html_source, options) {
            return style_html(html_source, options, global.js_beautify, global.css_beautify);
        };
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./beautify-css.js":14,"./beautify.js":16}],16:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

 JS Beautifier
---------------


  Written by Einar Lielmanis, <einar@jsbeautifier.org>
      http://jsbeautifier.org/

  Originally converted to javascript by Vital, <vital76@gmail.com>
  "End braces on own line" added by Chris J. Shull, <chrisjshull@gmail.com>
  Parsing improvements for brace-less statements by Liam Newman <bitwiseman@gmail.com>


  Usage:
    js_beautify(js_source_text);
    js_beautify(js_source_text, options);

  The options are:
    indent_size (default 4)          - indentation size,
    indent_char (default space)      - character to indent with,
    preserve_newlines (default true) - whether existing line breaks should be preserved,
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,

    jslint_happy (default false) - if true, then jslint-stricter mode is enforced.

            jslint_happy        !jslint_happy
            ---------------------------------
            function ()         function()

            switch () {         switch() {
            case 1:               case 1:
              break;                break;
            }                   }

    space_after_anon_function (default false) - should the space before an anonymous function's parens be added, "function()" vs "function ()",
          NOTE: This option is overriden by jslint_happy (i.e. if jslint_happy is true, space_after_anon_function is true by design)

    brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "none"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are.

    space_before_conditional (default true) - should the space before conditional statement be added, "if(true)" vs "if (true)",

    unescape_strings (default false) - should printable characters in strings encoded in \xNN notation be unescaped, "example" vs "\x65\x78\x61\x6d\x70\x6c\x65"

    wrap_line_length (default unlimited) - lines should wrap at next opportunity after this number of characters.
          NOTE: This is not a hard limit. Lines will continue until a point where a newline would
                be preserved if it were present.

    end_with_newline (default false)  - end output with a newline


    e.g

    js_beautify(js_source_text, {
      'indent_size': 1,
      'indent_char': '\t'
    });

*/

(function() {

    var acorn = {};
    (function (exports) {
      // This section of code is taken from acorn.
      //
      // Acorn was written by Marijn Haverbeke and released under an MIT
      // license. The Unicode regexps (for identifiers and whitespace) were
      // taken from [Esprima](http://esprima.org) by Ariya Hidayat.
      //
      // Git repositories for Acorn are available at
      //
      //     http://marijnhaverbeke.nl/git/acorn
      //     https://github.com/marijnh/acorn.git

      // ## Character categories

      // Big ugly regular expressions that match characters in the
      // whitespace, identifier, and identifier-start categories. These
      // are only applied when a character is found to actually have a
      // code point above 128.

      var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
      var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
      var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
      var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
      var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

      // Whether a single character denotes a newline.

      var newline = exports.newline = /[\n\r\u2028\u2029]/;

      // Matches a whole line break (where CRLF is considered a single
      // line break). Used to count lines.

      var lineBreak = exports.lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

      // Test whether a given character code starts an identifier.

      var isIdentifierStart = exports.isIdentifierStart = function(code) {
        if (code < 65) return code === 36;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
      };

      // Test whether a given character is part of an identifier.

      var isIdentifierChar = exports.isIdentifierChar = function(code) {
        if (code < 48) return code === 36;
        if (code < 58) return true;
        if (code < 65) return false;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
      };
    })(acorn);

    function in_array(what, arr) {
        for (var i = 0; i < arr.length; i += 1) {
            if (arr[i] === what) {
                return true;
            }
        }
        return false;
    }

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function ltrim(s) {
        return s.replace(/^\s+/g, '');
    }

    function rtrim(s) {
        return s.replace(/\s+$/g, '');
    }

    function js_beautify(js_source_text, options) {
        "use strict";
        var beautifier = new Beautifier(js_source_text, options);
        return beautifier.beautify();
    }

    var MODE = {
            BlockStatement: 'BlockStatement', // 'BLOCK'
            Statement: 'Statement', // 'STATEMENT'
            ObjectLiteral: 'ObjectLiteral', // 'OBJECT',
            ArrayLiteral: 'ArrayLiteral', //'[EXPRESSION]',
            ForInitializer: 'ForInitializer', //'(FOR-EXPRESSION)',
            Conditional: 'Conditional', //'(COND-EXPRESSION)',
            Expression: 'Expression' //'(EXPRESSION)'
        };

    function Beautifier(js_source_text, options) {
        "use strict";
        var output
        var tokens = [], token_pos;
        var Tokenizer;
        var current_token;
        var last_type, last_last_text, indent_string;
        var flags, previous_flags, flag_store;
        var prefix;

        var handlers, opt;
        var baseIndentString = '';

        handlers = {
            'TK_START_EXPR': handle_start_expr,
            'TK_END_EXPR': handle_end_expr,
            'TK_START_BLOCK': handle_start_block,
            'TK_END_BLOCK': handle_end_block,
            'TK_WORD': handle_word,
            'TK_RESERVED': handle_word,
            'TK_SEMICOLON': handle_semicolon,
            'TK_STRING': handle_string,
            'TK_EQUALS': handle_equals,
            'TK_OPERATOR': handle_operator,
            'TK_COMMA': handle_comma,
            'TK_BLOCK_COMMENT': handle_block_comment,
            'TK_COMMENT': handle_comment,
            'TK_DOT': handle_dot,
            'TK_UNKNOWN': handle_unknown,
            'TK_EOF': handle_eof
        };

        function create_flags(flags_base, mode) {
            var next_indent_level = 0;
            if (flags_base) {
                next_indent_level = flags_base.indentation_level;
                if (!output.just_added_newline() &&
                    flags_base.line_indent_level > next_indent_level) {
                    next_indent_level = flags_base.line_indent_level;
                }
            }

            var next_flags = {
                mode: mode,
                parent: flags_base,
                last_text: flags_base ? flags_base.last_text : '', // last token text
                last_word: flags_base ? flags_base.last_word : '', // last 'TK_WORD' passed
                declaration_statement: false,
                declaration_assignment: false,
                multiline_frame: false,
                if_block: false,
                else_block: false,
                do_block: false,
                do_while: false,
                in_case_statement: false, // switch(..){ INSIDE HERE }
                in_case: false, // we're on the exact line with "case 0:"
                case_body: false, // the indented case-action block
                indentation_level: next_indent_level,
                line_indent_level: flags_base ? flags_base.line_indent_level : next_indent_level,
                start_line_index: output.get_line_number(),
                ternary_depth: 0
            };
            return next_flags;
        }

        // Some interpreters have unexpected results with foo = baz || bar;
        options = options ? options : {};
        opt = {};

        // compatibility
        if (options.braces_on_own_line !== undefined) { //graceful handling of deprecated option
            opt.brace_style = options.braces_on_own_line ? "expand" : "collapse";
        }
        opt.brace_style = options.brace_style ? options.brace_style : (opt.brace_style ? opt.brace_style : "collapse");

        // graceful handling of deprecated option
        if (opt.brace_style === "expand-strict") {
            opt.brace_style = "expand";
        }


        opt.indent_size = options.indent_size ? parseInt(options.indent_size, 10) : 4;
        opt.indent_char = options.indent_char ? options.indent_char : ' ';
        opt.eol = options.eol ? options.eol : '\n';
        opt.preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        opt.break_chained_methods = (options.break_chained_methods === undefined) ? false : options.break_chained_methods;
        opt.max_preserve_newlines = (options.max_preserve_newlines === undefined) ? 0 : parseInt(options.max_preserve_newlines, 10);
        opt.space_in_paren = (options.space_in_paren === undefined) ? false : options.space_in_paren;
        opt.space_in_empty_paren = (options.space_in_empty_paren === undefined) ? false : options.space_in_empty_paren;
        opt.jslint_happy = (options.jslint_happy === undefined) ? false : options.jslint_happy;
        opt.space_after_anon_function = (options.space_after_anon_function === undefined) ? false : options.space_after_anon_function;
        opt.keep_array_indentation = (options.keep_array_indentation === undefined) ? false : options.keep_array_indentation;
        opt.space_before_conditional = (options.space_before_conditional === undefined) ? true : options.space_before_conditional;
        opt.unescape_strings = (options.unescape_strings === undefined) ? false : options.unescape_strings;
        opt.wrap_line_length = (options.wrap_line_length === undefined) ? 0 : parseInt(options.wrap_line_length, 10);
        opt.e4x = (options.e4x === undefined) ? false : options.e4x;
        opt.end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
        opt.comma_first = (options.comma_first === undefined) ? false : options.comma_first;

        // For testing of beautify ignore:start directive
        opt.test_output_raw = (options.test_output_raw === undefined) ? false : options.test_output_raw;

        // force opt.space_after_anon_function to true if opt.jslint_happy
        if(opt.jslint_happy) {
            opt.space_after_anon_function = true;
        }

        if(options.indent_with_tabs){
            opt.indent_char = '\t';
            opt.indent_size = 1;
        }

        opt.eol = opt.eol.replace(/\\r/, '\r').replace(/\\n/, '\n')

        //----------------------------------
        indent_string = '';
        while (opt.indent_size > 0) {
            indent_string += opt.indent_char;
            opt.indent_size -= 1;
        }

        var preindent_index = 0;
        if(js_source_text && js_source_text.length) {
            while ( (js_source_text.charAt(preindent_index) === ' ' ||
                    js_source_text.charAt(preindent_index) === '\t')) {
                baseIndentString += js_source_text.charAt(preindent_index);
                preindent_index += 1;
            }
            js_source_text = js_source_text.substring(preindent_index);
        }

        last_type = 'TK_START_BLOCK'; // last token type
        last_last_text = ''; // pre-last token text
        output = new Output(indent_string, baseIndentString);

        // If testing the ignore directive, start with output disable set to true
        output.raw = opt.test_output_raw;


        // Stack of parsing/formatting states, including MODE.
        // We tokenize, parse, and output in an almost purely a forward-only stream of token input
        // and formatted output.  This makes the beautifier less accurate than full parsers
        // but also far more tolerant of syntax errors.
        //
        // For example, the default mode is MODE.BlockStatement. If we see a '{' we push a new frame of type
        // MODE.BlockStatement on the the stack, even though it could be object literal.  If we later
        // encounter a ":", we'll switch to to MODE.ObjectLiteral.  If we then see a ";",
        // most full parsers would die, but the beautifier gracefully falls back to
        // MODE.BlockStatement and continues on.
        flag_store = [];
        set_mode(MODE.BlockStatement);

        this.beautify = function() {

            /*jshint onevar:true */
            var local_token, sweet_code;
            Tokenizer = new tokenizer(js_source_text, opt, indent_string);
            tokens = Tokenizer.tokenize();
            token_pos = 0;

            while (local_token = get_token()) {
                for(var i = 0; i < local_token.comments_before.length; i++) {
                    // The cleanest handling of inline comments is to treat them as though they aren't there.
                    // Just continue formatting and the behavior should be logical.
                    // Also ignore unknown tokens.  Again, this should result in better behavior.
                    handle_token(local_token.comments_before[i]);
                }
                handle_token(local_token);

                last_last_text = flags.last_text;
                last_type = local_token.type;
                flags.last_text = local_token.text;

                token_pos += 1;
            }

            sweet_code = output.get_code();
            if (opt.end_with_newline) {
                sweet_code += '\n';
            }

            if (opt.eol != '\n') {
                sweet_code = sweet_code.replace(/[\n]/g, opt.eol);
            }

            return sweet_code;
        };

        function handle_token(local_token) {
            var newlines = local_token.newlines;
            var keep_whitespace = opt.keep_array_indentation && is_array(flags.mode);

            if (keep_whitespace) {
                for (i = 0; i < newlines; i += 1) {
                    print_newline(i > 0);
                }
            } else {
                if (opt.max_preserve_newlines && newlines > opt.max_preserve_newlines) {
                    newlines = opt.max_preserve_newlines;
                }

                if (opt.preserve_newlines) {
                    if (local_token.newlines > 1) {
                        print_newline();
                        for (var i = 1; i < newlines; i += 1) {
                            print_newline(true);
                        }
                    }
                }
            }

            current_token = local_token;
            handlers[current_token.type]();
        }

        // we could use just string.split, but
        // IE doesn't like returning empty strings
        function split_newlines(s) {
            //return s.split(/\x0d\x0a|\x0a/);

            s = s.replace(/\x0d/g, '');
            var out = [],
                idx = s.indexOf("\n");
            while (idx !== -1) {
                out.push(s.substring(0, idx));
                s = s.substring(idx + 1);
                idx = s.indexOf("\n");
            }
            if (s.length) {
                out.push(s);
            }
            return out;
        }

        function allow_wrap_or_preserved_newline(force_linewrap) {
            force_linewrap = (force_linewrap === undefined) ? false : force_linewrap;

            // Never wrap the first token on a line
            if (output.just_added_newline()) {
                return
            }

            if ((opt.preserve_newlines && current_token.wanted_newline) || force_linewrap) {
                print_newline(false, true);
            } else if (opt.wrap_line_length) {
                var proposed_line_length = output.current_line.get_character_count() + current_token.text.length +
                    (output.space_before_token ? 1 : 0);
                if (proposed_line_length >= opt.wrap_line_length) {
                    print_newline(false, true);
                }
            }
        }

        function print_newline(force_newline, preserve_statement_flags) {
            if (!preserve_statement_flags) {
                if (flags.last_text !== ';' && flags.last_text !== ',' && flags.last_text !== '=' && last_type !== 'TK_OPERATOR') {
                    while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                        restore_mode();
                    }
                }
            }

            if (output.add_new_line(force_newline)) {
                flags.multiline_frame = true;
            }
        }

        function print_token_line_indentation() {
            if (output.just_added_newline()) {
                if (opt.keep_array_indentation && is_array(flags.mode) && current_token.wanted_newline) {
                    output.current_line.push(current_token.whitespace_before);
                    output.space_before_token = false;
                } else if (output.set_indent(flags.indentation_level)) {
                    flags.line_indent_level = flags.indentation_level;
                }
            }
        }

        function print_token(printable_token) {
            if (output.raw) {
                output.add_raw_token(current_token)
                return;
            }

            if (opt.comma_first && last_type === 'TK_COMMA'
                && output.just_added_newline()) {
                if(output.previous_line.last() === ',') {
                    output.previous_line.pop();
                    print_token_line_indentation();
                    output.add_token(',');
                    output.space_before_token = true;
                }
            }

            printable_token = printable_token || current_token.text;
            print_token_line_indentation();
            output.add_token(printable_token);
        }

        function indent() {
            flags.indentation_level += 1;
        }

        function deindent() {
            if (flags.indentation_level > 0 &&
                ((!flags.parent) || flags.indentation_level > flags.parent.indentation_level))
                flags.indentation_level -= 1;
        }

        function set_mode(mode) {
            if (flags) {
                flag_store.push(flags);
                previous_flags = flags;
            } else {
                previous_flags = create_flags(null, mode);
            }

            flags = create_flags(previous_flags, mode);
        }

        function is_array(mode) {
            return mode === MODE.ArrayLiteral;
        }

        function is_expression(mode) {
            return in_array(mode, [MODE.Expression, MODE.ForInitializer, MODE.Conditional]);
        }

        function restore_mode() {
            if (flag_store.length > 0) {
                previous_flags = flags;
                flags = flag_store.pop();
                if (previous_flags.mode === MODE.Statement) {
                    output.remove_redundant_indentation(previous_flags);
                }
            }
        }

        function start_of_object_property() {
            return flags.parent.mode === MODE.ObjectLiteral && flags.mode === MODE.Statement && (
                (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set'])));
        }

        function start_of_statement() {
            if (
                    (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'do') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'return' && !current_token.wanted_newline) ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'else' && !(current_token.type === 'TK_RESERVED' && current_token.text === 'if')) ||
                    (last_type === 'TK_END_EXPR' && (previous_flags.mode === MODE.ForInitializer || previous_flags.mode === MODE.Conditional)) ||
                    (last_type === 'TK_WORD' && flags.mode === MODE.BlockStatement
                        && !flags.in_case
                        && !(current_token.text === '--' || current_token.text === '++')
                        && last_last_text !== 'function'
                        && current_token.type !== 'TK_WORD' && current_token.type !== 'TK_RESERVED') ||
                    (flags.mode === MODE.ObjectLiteral && (
                        (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set']))))
                ) {

                set_mode(MODE.Statement);
                indent();

                if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') {
                    flags.declaration_statement = true;
                }

                // Issue #276:
                // If starting a new statement with [if, for, while, do], push to a new line.
                // if (a) if (b) if(c) d(); else e(); else f();
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline(
                        current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['do', 'for', 'if', 'while']));
                }

                return true;
            }
            return false;
        }

        function all_lines_start_with(lines, c) {
            for (var i = 0; i < lines.length; i++) {
                var line = trim(lines[i]);
                if (line.charAt(0) !== c) {
                    return false;
                }
            }
            return true;
        }

        function each_line_matches_indent(lines, indent) {
            var i = 0,
                len = lines.length,
                line;
            for (; i < len; i++) {
                line = lines[i];
                // allow empty lines to pass through
                if (line && line.indexOf(indent) !== 0) {
                    return false;
                }
            }
            return true;
        }

        function is_special_word(word) {
            return in_array(word, ['case', 'return', 'do', 'if', 'throw', 'else']);
        }

        function get_token(offset) {
            var index = token_pos + (offset || 0);
            return (index < 0 || index >= tokens.length) ? null : tokens[index];
        }

        function handle_start_expr() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            var next_mode = MODE.Expression;
            if (current_token.text === '[') {

                if (last_type === 'TK_WORD' || flags.last_text === ')') {
                    // this is array index specifier, break immediately
                    // a[x], fn()[x]
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, Tokenizer.line_starters)) {
                        output.space_before_token = true;
                    }
                    set_mode(next_mode);
                    print_token();
                    indent();
                    if (opt.space_in_paren) {
                        output.space_before_token = true;
                    }
                    return;
                }

                next_mode = MODE.ArrayLiteral;
                if (is_array(flags.mode)) {
                    if (flags.last_text === '[' ||
                        (flags.last_text === ',' && (last_last_text === ']' || last_last_text === '}'))) {
                        // ], [ goes to new line
                        // }, [ goes to new line
                        if (!opt.keep_array_indentation) {
                            print_newline();
                        }
                    }
                }

            } else {
                if (last_type === 'TK_RESERVED' && flags.last_text === 'for') {
                    next_mode = MODE.ForInitializer;
                } else if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['if', 'while'])) {
                    next_mode = MODE.Conditional;
                } else {
                    // next_mode = MODE.Expression;
                }
            }

            if (flags.last_text === ';' || last_type === 'TK_START_BLOCK') {
                print_newline();
            } else if (last_type === 'TK_END_EXPR' || last_type === 'TK_START_EXPR' || last_type === 'TK_END_BLOCK' || flags.last_text === '.') {
                // TODO: Consider whether forcing this is required.  Review failing tests when removed.
                allow_wrap_or_preserved_newline(current_token.wanted_newline);
                // do nothing on (( and )( and ][ and ]( and .(
            } else if (!(last_type === 'TK_RESERVED' && current_token.text === '(') && last_type !== 'TK_WORD' && last_type !== 'TK_OPERATOR') {
                output.space_before_token = true;
            } else if ((last_type === 'TK_RESERVED' && (flags.last_word === 'function' || flags.last_word === 'typeof')) ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                // function() vs function ()
                if (opt.space_after_anon_function) {
                    output.space_before_token = true;
                }
            } else if (last_type === 'TK_RESERVED' && (in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === 'catch')) {
                if (opt.space_before_conditional) {
                    output.space_before_token = true;
                }
            }

            // Should be a space between await and an IIFE
            if(current_token.text === '(' && last_type === 'TK_RESERVED' && flags.last_word === 'await'){
                output.space_before_token = true;
            }

            // Support of this kind of newline preservation.
            // a = (b &&
            //     (c || d));
            if (current_token.text === '(') {
                if (last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                    if (!start_of_object_property()) {
                        allow_wrap_or_preserved_newline();
                    }
                }
            }

            set_mode(next_mode);
            print_token();
            if (opt.space_in_paren) {
                output.space_before_token = true;
            }

            // In all cases, if we newline while inside an expression it should be indented.
            indent();
        }

        function handle_end_expr() {
            // statements inside expressions are not valid syntax, but...
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }

            if (flags.multiline_frame) {
                allow_wrap_or_preserved_newline(current_token.text === ']' && is_array(flags.mode) && !opt.keep_array_indentation);
            }

            if (opt.space_in_paren) {
                if (last_type === 'TK_START_EXPR' && ! opt.space_in_empty_paren) {
                    // () [] no inner space in empty parens like these, ever, ref #320
                    output.trim();
                    output.space_before_token = false;
                } else {
                    output.space_before_token = true;
                }
            }
            if (current_token.text === ']' && opt.keep_array_indentation) {
                print_token();
                restore_mode();
            } else {
                restore_mode();
                print_token();
            }
            output.remove_redundant_indentation(previous_flags);

            // do {} while () // no statement required after
            if (flags.do_while && previous_flags.mode === MODE.Conditional) {
                previous_flags.mode = MODE.Expression;
                flags.do_block = false;
                flags.do_while = false;

            }
        }

        function handle_start_block() {
            // Check if this is should be treated as a ObjectLiteral
            var next_token = get_token(1)
            var second_token = get_token(2)
            if (second_token && (
                    (second_token.text === ':' && in_array(next_token.type, ['TK_STRING', 'TK_WORD', 'TK_RESERVED']))
                    || (in_array(next_token.text, ['get', 'set']) && in_array(second_token.type, ['TK_WORD', 'TK_RESERVED']))
                )) {
                // We don't support TypeScript,but we didn't break it for a very long time.
                // We'll try to keep not breaking it.
                if (!in_array(last_last_text, ['class','interface'])) {
                    set_mode(MODE.ObjectLiteral);
                } else {
                    set_mode(MODE.BlockStatement);
                }
            } else {
                set_mode(MODE.BlockStatement);
            }

            var empty_braces = !next_token.comments_before.length &&  next_token.text === '}';
            var empty_anonymous_function = empty_braces && flags.last_word === 'function' &&
                last_type === 'TK_END_EXPR';

            if (opt.brace_style === "expand" ||
                (opt.brace_style === "none" && current_token.wanted_newline)) {
                if (last_type !== 'TK_OPERATOR' &&
                    (empty_anonymous_function ||
                        last_type === 'TK_EQUALS' ||
                        (last_type === 'TK_RESERVED' && is_special_word(flags.last_text) && flags.last_text !== 'else'))) {
                    output.space_before_token = true;
                } else {
                    print_newline(false, true);
                }
            } else { // collapse
                if (last_type !== 'TK_OPERATOR' && last_type !== 'TK_START_EXPR') {
                    if (last_type === 'TK_START_BLOCK') {
                        print_newline();
                    } else {
                        output.space_before_token = true;
                    }
                } else {
                    // if TK_OPERATOR or TK_START_EXPR
                    if (is_array(previous_flags.mode) && flags.last_text === ',') {
                        if (last_last_text === '}') {
                            // }, { in array context
                            output.space_before_token = true;
                        } else {
                            print_newline(); // [a, b, c, {
                        }
                    }
                }
            }
            print_token();
            indent();
        }

        function handle_end_block() {
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
            var empty_braces = last_type === 'TK_START_BLOCK';

            if (opt.brace_style === "expand") {
                if (!empty_braces) {
                    print_newline();
                }
            } else {
                // skip {}
                if (!empty_braces) {
                    if (is_array(flags.mode) && opt.keep_array_indentation) {
                        // we REALLY need a newline here, but newliner would skip that
                        opt.keep_array_indentation = false;
                        print_newline();
                        opt.keep_array_indentation = true;

                    } else {
                        print_newline();
                    }
                }
            }
            restore_mode();
            print_token();
        }

        function handle_word() {
            if (current_token.type === 'TK_RESERVED' && flags.mode !== MODE.ObjectLiteral &&
                in_array(current_token.text, ['set', 'get'])) {
                current_token.type = 'TK_WORD';
            }

            if (current_token.type === 'TK_RESERVED' && flags.mode === MODE.ObjectLiteral) {
                var next_token = get_token(1);
                if (next_token.text == ':') {
                    current_token.type = 'TK_WORD';
                }
            }

            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            } else if (current_token.wanted_newline && !is_expression(flags.mode) &&
                (last_type !== 'TK_OPERATOR' || (flags.last_text === '--' || flags.last_text === '++')) &&
                last_type !== 'TK_EQUALS' &&
                (opt.preserve_newlines || !(last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const', 'set', 'get'])))) {

                print_newline();
            }

            if (flags.do_block && !flags.do_while) {
                if (current_token.type === 'TK_RESERVED' && current_token.text === 'while') {
                    // do {} ## while ()
                    output.space_before_token = true;
                    print_token();
                    output.space_before_token = true;
                    flags.do_while = true;
                    return;
                } else {
                    // do {} should always have while as the next word.
                    // if we don't see the expected while, recover
                    print_newline();
                    flags.do_block = false;
                }
            }

            // if may be followed by else, or not
            // Bare/inline ifs are tricky
            // Need to unwind the modes correctly: if (a) if (b) c(); else d(); else e();
            if (flags.if_block) {
                if (!flags.else_block && (current_token.type === 'TK_RESERVED' && current_token.text === 'else')) {
                    flags.else_block = true;
                } else {
                    while (flags.mode === MODE.Statement) {
                        restore_mode();
                    }
                    flags.if_block = false;
                    flags.else_block = false;
                }
            }

            if (current_token.type === 'TK_RESERVED' && (current_token.text === 'case' || (current_token.text === 'default' && flags.in_case_statement))) {
                print_newline();
                if (flags.case_body || opt.jslint_happy) {
                    // switch cases following one another
                    deindent();
                    flags.case_body = false;
                }
                print_token();
                flags.in_case = true;
                flags.in_case_statement = true;
                return;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'function') {
                if (in_array(flags.last_text, ['}', ';']) || (output.just_added_newline() && ! in_array(flags.last_text, ['[', '{', ':', '=', ',']))) {
                    // make sure there is a nice clean space of at least one blank line
                    // before a new function definition
                    if ( !output.just_added_blankline() && !current_token.comments_before.length) {
                        print_newline();
                        print_newline(true);
                    }
                }
                if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set', 'new', 'return', 'export', 'async'])) {
                        output.space_before_token = true;
                    } else if (last_type === 'TK_RESERVED' && flags.last_text === 'default' && last_last_text === 'export') {
                        output.space_before_token = true;
                    } else {
                        print_newline();
                    }
                } else if (last_type === 'TK_OPERATOR' || flags.last_text === '=') {
                    // foo = function
                    output.space_before_token = true;
                } else if (!flags.multiline_frame && (is_expression(flags.mode) || is_array(flags.mode))) {
                    // (function
                } else {
                    print_newline();
                }
            }

            if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            }

            if (current_token.type === 'TK_RESERVED' &&  in_array(current_token.text, ['function', 'get', 'set'])) {
                print_token();
                flags.last_word = current_token.text;
                return;
            }

            prefix = 'NONE';

            if (last_type === 'TK_END_BLOCK') {
                if (!(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally']))) {
                    prefix = 'NEWLINE';
                } else {
                    if (opt.brace_style === "expand" ||
                        opt.brace_style === "end-expand" ||
                        (opt.brace_style === "none" && current_token.wanted_newline)) {
                        prefix = 'NEWLINE';
                    } else {
                        prefix = 'SPACE';
                        output.space_before_token = true;
                    }
                }
            } else if (last_type === 'TK_SEMICOLON' && flags.mode === MODE.BlockStatement) {
                // TODO: Should this be for STATEMENT as well?
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_SEMICOLON' && is_expression(flags.mode)) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_STRING') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD' ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_START_BLOCK') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_END_EXPR') {
                output.space_before_token = true;
                prefix = 'NEWLINE';
            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                if (flags.last_text === 'else' || flags.last_text === 'export') {
                    prefix = 'SPACE';
                } else {
                    prefix = 'NEWLINE';
                }

            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally'])) {
                if (last_type !== 'TK_END_BLOCK' ||
                    opt.brace_style === "expand" ||
                    opt.brace_style === "end-expand" ||
                    (opt.brace_style === "none" && current_token.wanted_newline)) {
                    print_newline();
                } else {
                    output.trim(true);
                    var line = output.current_line;
                    // If we trimmed and there's something other than a close block before us
                    // put a newline back in.  Handles '} // comment' scenario.
                    if (line.last() !== '}') {
                        print_newline();
                    }
                    output.space_before_token = true;
                }
            } else if (prefix === 'NEWLINE') {
                if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                    // no newline between 'return nnn'
                    output.space_before_token = true;
                } else if (last_type !== 'TK_END_EXPR') {
                    if ((last_type !== 'TK_START_EXPR' || !(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['var', 'let', 'const']))) && flags.last_text !== ':') {
                        // no need to force newline on 'var': for (var x = 0...)
                        if (current_token.type === 'TK_RESERVED' && current_token.text === 'if' && flags.last_text === 'else') {
                            // no newline for } else if {
                            output.space_before_token = true;
                        } else {
                            print_newline();
                        }
                    }
                } else if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                    print_newline();
                }
            } else if (flags.multiline_frame && is_array(flags.mode) && flags.last_text === ',' && last_last_text === '}') {
                print_newline(); // }, in lists get a newline treatment
            } else if (prefix === 'SPACE') {
                output.space_before_token = true;
            }
            print_token();
            flags.last_word = current_token.text;

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'do') {
                flags.do_block = true;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'if') {
                flags.if_block = true;
            }
        }

        function handle_semicolon() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // Semicolon can be the start (and end) of a statement
                output.space_before_token = false;
            }
            while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                restore_mode();
            }
            print_token();
        }

        function handle_string() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // One difference - strings want at least a space before
                output.space_before_token = true;
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                output.space_before_token = true;
            } else if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            } else {
                print_newline();
            }
            print_token();
        }

        function handle_equals() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (flags.declaration_statement) {
                // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
                flags.declaration_assignment = true;
            }
            output.space_before_token = true;
            print_token();
            output.space_before_token = true;
        }

        function handle_comma() {
            if (flags.declaration_statement) {
                if (is_expression(flags.parent.mode)) {
                    // do not break on comma, for(var a = 1, b = 2)
                    flags.declaration_assignment = false;
                }

                print_token();

                if (flags.declaration_assignment) {
                    flags.declaration_assignment = false;
                    print_newline(false, true);
                } else {
                    output.space_before_token = true;
                    // for comma-first, we want to allow a newline before the comma
                    // to turn into a newline after the comma, which we will fixup later
                    if (opt.comma_first) {
                        allow_wrap_or_preserved_newline();
                    }
                }
                return;
            }

            print_token();
            if (flags.mode === MODE.ObjectLiteral ||
                (flags.mode === MODE.Statement && flags.parent.mode === MODE.ObjectLiteral)) {
                if (flags.mode === MODE.Statement) {
                    restore_mode();
                }
                print_newline();
            } else {
                // EXPR or DO_BLOCK
                output.space_before_token = true;
                // for comma-first, we want to allow a newline before the comma
                // to turn into a newline after the comma, which we will fixup later
                if (opt.comma_first) {
                    allow_wrap_or_preserved_newline();
                }
            }

        }

        function handle_operator() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                // "return" had a special handling in TK_WORD. Now we need to return the favor
                output.space_before_token = true;
                print_token();
                return;
            }

            // hack for actionscript's import .*;
            if (current_token.text === '*' && last_type === 'TK_DOT') {
                print_token();
                return;
            }

            if (current_token.text === ':' && flags.in_case) {
                flags.case_body = true;
                indent();
                print_token();
                print_newline();
                flags.in_case = false;
                return;
            }

            if (current_token.text === '::') {
                // no spaces around exotic namespacing syntax operator
                print_token();
                return;
            }

            // Allow line wrapping between operators
            if (last_type === 'TK_OPERATOR') {
                allow_wrap_or_preserved_newline();
            }

            var space_before = true;
            var space_after = true;

            if (in_array(current_token.text, ['--', '++', '!', '~']) || (in_array(current_token.text, ['-', '+']) && (in_array(last_type, ['TK_START_BLOCK', 'TK_START_EXPR', 'TK_EQUALS', 'TK_OPERATOR']) || in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === ','))) {
                // unary operators (and binary +/- pretending to be unary) special cases

                space_before = false;
                space_after = false;

                // http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.1
                // if there is a newline between -- or ++ and anything else we should preserve it.
                if (current_token.wanted_newline && (current_token.text === '--' || current_token.text === '++')) {
                    print_newline(false, true);
                }

                if (flags.last_text === ';' && is_expression(flags.mode)) {
                    // for (;; ++i)
                    //        ^^^
                    space_before = true;
                }

                if (last_type === 'TK_RESERVED') {
                    space_before = true;
                } else if (last_type === 'TK_END_EXPR') {
                    space_before = !(flags.last_text === ']' && (current_token.text === '--' || current_token.text === '++'));
                } else if (last_type === 'TK_OPERATOR') {
                    // a++ + ++b;
                    // a - -b
                    space_before = in_array(current_token.text, ['--', '-', '++', '+']) && in_array(flags.last_text, ['--', '-', '++', '+']);
                    // + and - are not unary when preceeded by -- or ++ operator
                    // a-- + b
                    // a * +b
                    // a - -b
                    if (in_array(current_token.text, ['+', '-']) && in_array(flags.last_text, ['--', '++'])) {
                        space_after = true;
                    }
                }

                if ((flags.mode === MODE.BlockStatement || flags.mode === MODE.Statement) && (flags.last_text === '{' || flags.last_text === ';')) {
                    // { foo; --i }
                    // foo(); --bar;
                    print_newline();
                }
            } else if (current_token.text === ':') {
                if (flags.ternary_depth === 0) {
                    // Colon is invalid javascript outside of ternary and object, but do our best to guess what was meant.
                    space_before = false;
                } else {
                    flags.ternary_depth -= 1;
                }
            } else if (current_token.text === '?') {
                flags.ternary_depth += 1;
            } else if (current_token.text === '*' && last_type === 'TK_RESERVED' && flags.last_text === 'function') {
                space_before = false;
                space_after = false;
            }
            output.space_before_token = output.space_before_token || space_before;
            print_token();
            output.space_before_token = space_after;
        }

        function handle_block_comment() {
            if (output.raw) {
                output.add_raw_token(current_token)
                if (current_token.directives && current_token.directives['preserve'] === 'end') {
                    // If we're testing the raw output behavior, do not allow a directive to turn it off.
                    if (!opt.test_output_raw) {
                        output.raw = false;
                    }
                }
                return;
            }

            if (current_token.directives) {
                print_newline(false, true);
                print_token();
                if (current_token.directives['preserve'] === 'start') {
                    output.raw = true;
                }
                print_newline(false, true);
                return;
            }

            // inline block
            if (!acorn.newline.test(current_token.text) && !current_token.wanted_newline) {
                output.space_before_token = true;
                print_token();
                output.space_before_token = true;
                return;
            }

            var lines = split_newlines(current_token.text);
            var j; // iterator for this case
            var javadoc = false;
            var starless = false;
            var lastIndent = current_token.whitespace_before;
            var lastIndentLength = lastIndent.length;

            // block comment starts with a new line
            print_newline(false, true);
            if (lines.length > 1) {
                if (all_lines_start_with(lines.slice(1), '*')) {
                    javadoc = true;
                }
                else if (each_line_matches_indent(lines.slice(1), lastIndent)) {
                    starless = true;
                }
            }

            // first line always indented
            print_token(lines[0]);
            for (j = 1; j < lines.length; j++) {
                print_newline(false, true);
                if (javadoc) {
                    // javadoc: reformat and re-indent
                    print_token(' ' + ltrim(lines[j]));
                } else if (starless && lines[j].length > lastIndentLength) {
                    // starless: re-indent non-empty content, avoiding trim
                    print_token(lines[j].substring(lastIndentLength));
                } else {
                    // normal comments output raw
                    output.add_token(lines[j]);
                }
            }

            // for comments of more than one line, make sure there's a new line after
            print_newline(false, true);
        }

        function handle_comment() {
            if (current_token.wanted_newline) {
                print_newline(false, true);
            } else {
                output.trim(true);
            }

            output.space_before_token = true;
            print_token();
            print_newline(false, true);
        }

        function handle_dot() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                output.space_before_token = true;
            } else {
                // allow preserved newlines before dots in general
                // force newlines on dots after close paren when break_chained - for bar().baz()
                allow_wrap_or_preserved_newline(flags.last_text === ')' && opt.break_chained_methods);
            }

            print_token();
        }

        function handle_unknown() {
            print_token();

            if (current_token.text[current_token.text.length - 1] === '\n') {
                print_newline();
            }
        }

        function handle_eof() {
            // Unwind any open statements
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
        }
    }


    function OutputLine(parent) {
        var _character_count = 0;
        // use indent_count as a marker for lines that have preserved indentation
        var _indent_count = -1;

        var _items = [];
        var _empty = true;

        this.set_indent = function(level) {
            _character_count = parent.baseIndentLength + level * parent.indent_length
            _indent_count = level;
        }

        this.get_character_count = function() {
            return _character_count;
        }

        this.is_empty = function() {
            return _empty;
        }

        this.last = function() {
            if (!this._empty) {
              return _items[_items.length - 1];
            } else {
              return null;
            }
        }

        this.push = function(input) {
            _items.push(input);
            _character_count += input.length;
            _empty = false;
        }

        this.pop = function() {
            var item = null;
            if (!_empty) {
                item = _items.pop();
                _character_count -= item.length;
                _empty = _items.length === 0;
            }
            return item;
        }

        this.remove_indent = function() {
            if (_indent_count > 0) {
                _indent_count -= 1;
                _character_count -= parent.indent_length
            }
        }

        this.trim = function() {
            while (this.last() === ' ') {
                var item = _items.pop();
                _character_count -= 1;
            }
            _empty = _items.length === 0;
        }

        this.toString = function() {
            var result = '';
            if (!this._empty) {
                if (_indent_count >= 0) {
                    result = parent.indent_cache[_indent_count];
                }
                result += _items.join('')
            }
            return result;
        }
    }

    function Output(indent_string, baseIndentString) {
        baseIndentString = baseIndentString || '';
        this.indent_cache = [ baseIndentString ];
        this.baseIndentLength = baseIndentString.length;
        this.indent_length = indent_string.length;
        this.raw = false;

        var lines =[];
        this.baseIndentString = baseIndentString;
        this.indent_string = indent_string;
        this.previous_line = null;
        this.current_line = null;
        this.space_before_token = false;

        this.add_outputline = function() {
            this.previous_line = this.current_line;
            this.current_line = new OutputLine(this);
            lines.push(this.current_line);
        }

        // initialize
        this.add_outputline();


        this.get_line_number = function() {
            return lines.length;
        }

        // Using object instead of string to allow for later expansion of info about each line
        this.add_new_line = function(force_newline) {
            if (this.get_line_number() === 1 && this.just_added_newline()) {
                return false; // no newline on start of file
            }

            if (force_newline || !this.just_added_newline()) {
                if (!this.raw) {
                    this.add_outputline();
                }
                return true;
            }

            return false;
        }

        this.get_code = function() {
            var sweet_code = lines.join('\n').replace(/[\r\n\t ]+$/, '');
            return sweet_code;
        }

        this.set_indent = function(level) {
            // Never indent your first output indent at the start of the file
            if (lines.length > 1) {
                while(level >= this.indent_cache.length) {
                    this.indent_cache.push(this.indent_cache[this.indent_cache.length - 1] + this.indent_string);
                }

                this.current_line.set_indent(level);
                return true;
            }
            this.current_line.set_indent(0);
            return false;
        }

        this.add_raw_token = function(token) {
            for (var x = 0; x < token.newlines; x++) {
                this.add_outputline();
            }
            this.current_line.push(token.whitespace_before);
            this.current_line.push(token.text);
            this.space_before_token = false;
        }

        this.add_token = function(printable_token) {
            this.add_space_before_token();
            this.current_line.push(printable_token);
        }

        this.add_space_before_token = function() {
            if (this.space_before_token && !this.just_added_newline()) {
                this.current_line.push(' ');
            }
            this.space_before_token = false;
        }

        this.remove_redundant_indentation = function (frame) {
            // This implementation is effective but has some issues:
            //     - can cause line wrap to happen too soon due to indent removal
            //           after wrap points are calculated
            // These issues are minor compared to ugly indentation.

            if (frame.multiline_frame ||
                frame.mode === MODE.ForInitializer ||
                frame.mode === MODE.Conditional) {
                return;
            }

            // remove one indent from each line inside this section
            var index = frame.start_line_index;
            var line;

            var output_length = lines.length;
            while (index < output_length) {
                lines[index].remove_indent();
                index++;
            }
        }

        this.trim = function(eat_newlines) {
            eat_newlines = (eat_newlines === undefined) ? false : eat_newlines;

            this.current_line.trim(indent_string, baseIndentString);

            while (eat_newlines && lines.length > 1 &&
                this.current_line.is_empty()) {
                lines.pop();
                this.current_line = lines[lines.length - 1]
                this.current_line.trim();
            }

            this.previous_line = lines.length > 1 ? lines[lines.length - 2] : null;
        }

        this.just_added_newline = function() {
            return this.current_line.is_empty();
        }

        this.just_added_blankline = function() {
            if (this.just_added_newline()) {
                if (lines.length === 1) {
                    return true; // start of the file and newline = blank
                }

                var line = lines[lines.length - 2];
                return line.is_empty();
            }
            return false;
        }
    }


    var Token = function(type, text, newlines, whitespace_before, mode, parent) {
        this.type = type;
        this.text = text;
        this.comments_before = [];
        this.newlines = newlines || 0;
        this.wanted_newline = newlines > 0;
        this.whitespace_before = whitespace_before || '';
        this.parent = null;
        this.directives = null;
    }

    function tokenizer(input, opts, indent_string) {

        var whitespace = "\n\r\t ".split('');
        var digit = /[0-9]/;
        var digit_hex = /[0123456789abcdefABCDEF]/;

        var punct = ('+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! ~ , : ? ^ ^= |= :: =>'
                +' <%= <% %> <?= <? ?>').split(' '); // try to be a good boy and try not to break the markup language identifiers

        // words which should always start on new line.
        this.line_starters = 'continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,import,export'.split(',');
        var reserved_words = this.line_starters.concat(['do', 'in', 'else', 'get', 'set', 'new', 'catch', 'finally', 'typeof', 'yield', 'async', 'await']);

        //  /* ... */ comment ends with nearest */ or end of file
        var block_comment_pattern = /([\s\S]*?)((?:\*\/)|$)/g;

        // comment ends just before nearest linefeed or end of file
        var comment_pattern = /([^\n\r\u2028\u2029]*)/g;

        var directives_block_pattern = /\/\* beautify( \w+[:]\w+)+ \*\//g;
        var directive_pattern = / (\w+)[:](\w+)/g;
        var directives_end_ignore_pattern = /([\s\S]*?)((?:\/\*\sbeautify\signore:end\s\*\/)|$)/g;

        var template_pattern = /((<\?php|<\?=)[\s\S]*?\?>)|(<%[\s\S]*?%>)/g

        var n_newlines, whitespace_before_token, in_html_comment, tokens, parser_pos;
        var input_length;

        this.tokenize = function() {
            // cache the source's length.
            input_length = input.length
            parser_pos = 0;
            in_html_comment = false
            tokens = [];

            var next, last;
            var token_values;
            var open = null;
            var open_stack = [];
            var comments = [];

            while (!(last && last.type === 'TK_EOF')) {
                token_values = tokenize_next();
                next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                while(next.type === 'TK_COMMENT' || next.type === 'TK_BLOCK_COMMENT' || next.type === 'TK_UNKNOWN') {
                    if (next.type === 'TK_BLOCK_COMMENT') {
                        next.directives = token_values[2];
                    }
                    comments.push(next);
                    token_values = tokenize_next();
                    next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                }

                if (comments.length) {
                    next.comments_before = comments;
                    comments = [];
                }

                if (next.type === 'TK_START_BLOCK' || next.type === 'TK_START_EXPR') {
                    next.parent = last;
                    open_stack.push(open);
                    open = next;
                }  else if ((next.type === 'TK_END_BLOCK' || next.type === 'TK_END_EXPR') &&
                    (open && (
                        (next.text === ']' && open.text === '[') ||
                        (next.text === ')' && open.text === '(') ||
                        (next.text === '}' && open.text === '{')))) {
                    next.parent = open.parent;
                    open = open_stack.pop();
                }

                tokens.push(next);
                last = next;
            }

            return tokens;
        }

        function get_directives (text) {
            if (!text.match(directives_block_pattern)) {
                return null;
            }

            var directives = {};
            directive_pattern.lastIndex = 0;
            var directive_match = directive_pattern.exec(text);

            while (directive_match) {
                directives[directive_match[1]] = directive_match[2];
                directive_match = directive_pattern.exec(text);
            }

            return directives;
        }

        function tokenize_next() {
            var i, resulting_string;
            var whitespace_on_this_line = [];

            n_newlines = 0;
            whitespace_before_token = '';

            if (parser_pos >= input_length) {
                return ['', 'TK_EOF'];
            }

            var last_token;
            if (tokens.length) {
                last_token = tokens[tokens.length-1];
            } else {
                // For the sake of tokenizing we can pretend that there was on open brace to start
                last_token = new Token('TK_START_BLOCK', '{');
            }


            var c = input.charAt(parser_pos);
            parser_pos += 1;

            while (in_array(c, whitespace)) {

                if (acorn.newline.test(c)) {
                    if (!(c === '\n' && input.charAt(parser_pos-2) === '\r')) {
                        n_newlines += 1;
                        whitespace_on_this_line = [];
                    }
                } else {
                    whitespace_on_this_line.push(c);
                }

                if (parser_pos >= input_length) {
                    return ['', 'TK_EOF'];
                }

                c = input.charAt(parser_pos);
                parser_pos += 1;
            }

            if(whitespace_on_this_line.length) {
                whitespace_before_token = whitespace_on_this_line.join('');
            }

            if (digit.test(c)) {
                var allow_decimal = true;
                var allow_e = true;
                var local_digit = digit;

                if (c === '0' && parser_pos < input_length && /[Xx]/.test(input.charAt(parser_pos))) {
                    // switch to hex number, no decimal or e, just hex digits
                    allow_decimal = false;
                    allow_e = false;
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    local_digit = digit_hex
                } else {
                    // we know this first loop will run.  It keeps the logic simpler.
                    c = '';
                    parser_pos -= 1
                }

                // Add the digits
                while (parser_pos < input_length && local_digit.test(input.charAt(parser_pos))) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;

                    if (allow_decimal && parser_pos < input_length && input.charAt(parser_pos) === '.') {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        allow_decimal = false;
                    }

                    if (allow_e && parser_pos < input_length && /[Ee]/.test(input.charAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;

                        if (parser_pos < input_length && /[+-]/.test(input.charAt(parser_pos))) {
                            c += input.charAt(parser_pos);
                            parser_pos += 1;
                        }

                        allow_e = false;
                        allow_decimal = false;
                    }
                }

                return [c, 'TK_WORD'];
            }

            if (acorn.isIdentifierStart(input.charCodeAt(parser_pos-1))) {
                if (parser_pos < input_length) {
                    while (acorn.isIdentifierChar(input.charCodeAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos === input_length) {
                            break;
                        }
                    }
                }

                if (!(last_token.type === 'TK_DOT' ||
                        (last_token.type === 'TK_RESERVED' && in_array(last_token.text, ['set', 'get'])))
                    && in_array(c, reserved_words)) {
                    if (c === 'in') { // hack for 'in' operator
                        return [c, 'TK_OPERATOR'];
                    }
                    return [c, 'TK_RESERVED'];
                }

                return [c, 'TK_WORD'];
            }

            if (c === '(' || c === '[') {
                return [c, 'TK_START_EXPR'];
            }

            if (c === ')' || c === ']') {
                return [c, 'TK_END_EXPR'];
            }

            if (c === '{') {
                return [c, 'TK_START_BLOCK'];
            }

            if (c === '}') {
                return [c, 'TK_END_BLOCK'];
            }

            if (c === ';') {
                return [c, 'TK_SEMICOLON'];
            }

            if (c === '/') {
                var comment = '';
                // peek for comment /* ... */
                if (input.charAt(parser_pos) === '*') {
                    parser_pos += 1;
                    block_comment_pattern.lastIndex = parser_pos;
                    var comment_match = block_comment_pattern.exec(input);
                    comment = '/*' + comment_match[0];
                    parser_pos += comment_match[0].length;
                    var directives = get_directives(comment);
                    if (directives && directives['ignore'] === 'start') {
                        directives_end_ignore_pattern.lastIndex = parser_pos;
                        comment_match = directives_end_ignore_pattern.exec(input)
                        comment += comment_match[0];
                        parser_pos += comment_match[0].length;
                    }
                    comment = comment.replace(acorn.lineBreak, '\n');
                    return [comment, 'TK_BLOCK_COMMENT', directives];
                }
                // peek for comment // ...
                if (input.charAt(parser_pos) === '/') {
                    parser_pos += 1;
                    comment_pattern.lastIndex = parser_pos;
                    var comment_match = comment_pattern.exec(input);
                    comment = '//' + comment_match[0];
                    parser_pos += comment_match[0].length;
                    return [comment, 'TK_COMMENT'];
                }

            }

            if (c === '`' || c === "'" || c === '"' || // string
                (
                    (c === '/') || // regexp
                    (opts.e4x && c === "<" && input.slice(parser_pos - 1).match(/^<([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])(\s+[-a-zA-Z:0-9_.]+\s*=\s*('[^']*'|"[^"]*"|{.*?}))*\s*(\/?)\s*>/)) // xml
                ) && ( // regex and xml can only appear in specific locations during parsing
                    (last_token.type === 'TK_RESERVED' && in_array(last_token.text , ['return', 'case', 'throw', 'else', 'do', 'typeof', 'yield'])) ||
                    (last_token.type === 'TK_END_EXPR' && last_token.text === ')' &&
                        last_token.parent && last_token.parent.type === 'TK_RESERVED' && in_array(last_token.parent.text, ['if', 'while', 'for'])) ||
                    (in_array(last_token.type, ['TK_COMMENT', 'TK_START_EXPR', 'TK_START_BLOCK',
                        'TK_END_BLOCK', 'TK_OPERATOR', 'TK_EQUALS', 'TK_EOF', 'TK_SEMICOLON', 'TK_COMMA'
                    ]))
                )) {

                var sep = c,
                    esc = false,
                    has_char_escapes = false;

                resulting_string = c;

                if (sep === '/') {
                    //
                    // handle regexp
                    //
                    var in_char_class = false;
                    while (parser_pos < input_length &&
                            ((esc || in_char_class || input.charAt(parser_pos) !== sep) &&
                            !acorn.newline.test(input.charAt(parser_pos)))) {
                        resulting_string += input.charAt(parser_pos);
                        if (!esc) {
                            esc = input.charAt(parser_pos) === '\\';
                            if (input.charAt(parser_pos) === '[') {
                                in_char_class = true;
                            } else if (input.charAt(parser_pos) === ']') {
                                in_char_class = false;
                            }
                        } else {
                            esc = false;
                        }
                        parser_pos += 1;
                    }
                } else if (opts.e4x && sep === '<') {
                    //
                    // handle e4x xml literals
                    //
                    var xmlRegExp = /<(\/?)([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])(\s+[-a-zA-Z:0-9_.]+\s*=\s*('[^']*'|"[^"]*"|{.*?}))*\s*(\/?)\s*>/g;
                    var xmlStr = input.slice(parser_pos - 1);
                    var match = xmlRegExp.exec(xmlStr);
                    if (match && match.index === 0) {
                        var rootTag = match[2];
                        var depth = 0;
                        while (match) {
                            var isEndTag = !! match[1];
                            var tagName = match[2];
                            var isSingletonTag = ( !! match[match.length - 1]) || (tagName.slice(0, 8) === "![CDATA[");
                            if (tagName === rootTag && !isSingletonTag) {
                                if (isEndTag) {
                                    --depth;
                                } else {
                                    ++depth;
                                }
                            }
                            if (depth <= 0) {
                                break;
                            }
                            match = xmlRegExp.exec(xmlStr);
                        }
                        var xmlLength = match ? match.index + match[0].length : xmlStr.length;
                        xmlStr = xmlStr.slice(0, xmlLength);
                        parser_pos += xmlLength - 1;
                        xmlStr = xmlStr.replace(acorn.lineBreak, '\n');
                        return [xmlStr, "TK_STRING"];
                    }
                } else {
                    //
                    // handle string
                    //
                    // Template strings can travers lines without escape characters.
                    // Other strings cannot
                    while (parser_pos < input_length &&
                            (esc || (input.charAt(parser_pos) !== sep &&
                            (sep === '`' || !acorn.newline.test(input.charAt(parser_pos)))))) {
                        // Handle \r\n linebreaks after escapes or in template strings
                        if ((esc || sep === '`') && acorn.newline.test(input.charAt(parser_pos))) {
                            if (input.charAt(parser_pos) === '\r' && input.charAt(parser_pos + 1) === '\n') {
                                parser_pos += 1;
                            }
                            resulting_string += '\n';
                        } else {
                            resulting_string += input.charAt(parser_pos);
                        }
                        if (esc) {
                            if (input.charAt(parser_pos) === 'x' || input.charAt(parser_pos) === 'u') {
                                has_char_escapes = true;
                            }
                            esc = false;
                        } else {
                            esc = input.charAt(parser_pos) === '\\';
                        }
                        parser_pos += 1;
                    }

                }

                if (has_char_escapes && opts.unescape_strings) {
                    resulting_string = unescape_string(resulting_string);
                }

                if (parser_pos < input_length && input.charAt(parser_pos) === sep) {
                    resulting_string += sep;
                    parser_pos += 1;

                    if (sep === '/') {
                        // regexps may have modifiers /regexp/MOD , so fetch those, too
                        // Only [gim] are valid, but if the user puts in garbage, do what we can to take it.
                        while (parser_pos < input_length && acorn.isIdentifierStart(input.charCodeAt(parser_pos))) {
                            resulting_string += input.charAt(parser_pos);
                            parser_pos += 1;
                        }
                    }
                }
                return [resulting_string, 'TK_STRING'];
            }

            if (c === '#') {

                if (tokens.length === 0 && input.charAt(parser_pos) === '!') {
                    // shebang
                    resulting_string = c;
                    while (parser_pos < input_length && c !== '\n') {
                        c = input.charAt(parser_pos);
                        resulting_string += c;
                        parser_pos += 1;
                    }
                    return [trim(resulting_string) + '\n', 'TK_UNKNOWN'];
                }



                // Spidermonkey-specific sharp variables for circular references
                // https://developer.mozilla.org/En/Sharp_variables_in_JavaScript
                // http://mxr.mozilla.org/mozilla-central/source/js/src/jsscan.cpp around line 1935
                var sharp = '#';
                if (parser_pos < input_length && digit.test(input.charAt(parser_pos))) {
                    do {
                        c = input.charAt(parser_pos);
                        sharp += c;
                        parser_pos += 1;
                    } while (parser_pos < input_length && c !== '#' && c !== '=');
                    if (c === '#') {
                        //
                    } else if (input.charAt(parser_pos) === '[' && input.charAt(parser_pos + 1) === ']') {
                        sharp += '[]';
                        parser_pos += 2;
                    } else if (input.charAt(parser_pos) === '{' && input.charAt(parser_pos + 1) === '}') {
                        sharp += '{}';
                        parser_pos += 2;
                    }
                    return [sharp, 'TK_WORD'];
                }
            }

            if (c === '<' && (input.charAt(parser_pos) === '?' || input.charAt(parser_pos) === '%')) {
                template_pattern.lastIndex = parser_pos - 1;
                var template_match = template_pattern.exec(input);
                if(template_match) {
                    c = template_match[0];
                    parser_pos += c.length - 1;
                    c = c.replace(acorn.lineBreak, '\n');
                    return [c, 'TK_STRING'];
                }
            }

            if (c === '<' && input.substring(parser_pos - 1, parser_pos + 3) === '<!--') {
                parser_pos += 3;
                c = '<!--';
                while (!acorn.newline.test(input.charAt(parser_pos)) && parser_pos < input_length) {
                    c += input.charAt(parser_pos);
                    parser_pos++;
                }
                in_html_comment = true;
                return [c, 'TK_COMMENT'];
            }

            if (c === '-' && in_html_comment && input.substring(parser_pos - 1, parser_pos + 2) === '-->') {
                in_html_comment = false;
                parser_pos += 2;
                return ['-->', 'TK_COMMENT'];
            }

            if (c === '.') {
                return [c, 'TK_DOT'];
            }

            if (in_array(c, punct)) {
                while (parser_pos < input_length && in_array(c + input.charAt(parser_pos), punct)) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos >= input_length) {
                        break;
                    }
                }

                if (c === ',') {
                    return [c, 'TK_COMMA'];
                } else if (c === '=') {
                    return [c, 'TK_EQUALS'];
                } else {
                    return [c, 'TK_OPERATOR'];
                }
            }

            return [c, 'TK_UNKNOWN'];
        }


        function unescape_string(s) {
            var esc = false,
                out = '',
                pos = 0,
                s_hex = '',
                escaped = 0,
                c;

            while (esc || pos < s.length) {

                c = s.charAt(pos);
                pos++;

                if (esc) {
                    esc = false;
                    if (c === 'x') {
                        // simple hex-escape \x24
                        s_hex = s.substr(pos, 2);
                        pos += 2;
                    } else if (c === 'u') {
                        // unicode-escape, \u2134
                        s_hex = s.substr(pos, 4);
                        pos += 4;
                    } else {
                        // some common escape, e.g \n
                        out += '\\' + c;
                        continue;
                    }
                    if (!s_hex.match(/^[0123456789abcdefABCDEF]+$/)) {
                        // some weird escaping, bail out,
                        // leaving whole string intact
                        return s;
                    }

                    escaped = parseInt(s_hex, 16);

                    if (escaped >= 0x00 && escaped < 0x20) {
                        // leave 0x00...0x1f escaped
                        if (c === 'x') {
                            out += '\\x' + s_hex;
                        } else {
                            out += '\\u' + s_hex;
                        }
                        continue;
                    } else if (escaped === 0x22 || escaped === 0x27 || escaped === 0x5c) {
                        // single-quote, apostrophe, backslash - escape these
                        out += '\\' + String.fromCharCode(escaped);
                    } else if (c === 'x' && escaped > 0x7e && escaped <= 0xff) {
                        // we bail out on \x7f..\xff,
                        // leaving whole string escaped,
                        // as it's probably completely binary
                        return s;
                    } else {
                        out += String.fromCharCode(escaped);
                    }
                } else if (c === '\\') {
                    esc = true;
                } else {
                    out += c;
                }
            }
            return out;
        }

    }


    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return { js_beautify: js_beautify };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var js_beautify = require("beautify").js_beautify`.
        exports.js_beautify = js_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.js_beautify = js_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.js_beautify = js_beautify;
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],17:[function(require,module,exports){
(function (global){
(function() {
  var vm,
    __slice = [].slice;

  vm = require('vm');

  exports.allowUnsafeEval = function(fn) {
    var previousEval;
    previousEval = global["eval"];
    try {
      global["eval"] = function(source) {
        return vm.runInThisContext(source);
      };
      return fn();
    } finally {
      global["eval"] = previousEval;
    }
  };

  exports.allowUnsafeNewFunction = function(fn) {
    var previousFunction;
    previousFunction = global.Function;
    try {
      global.Function = exports.Function;
      return fn();
    } finally {
      global.Function = previousFunction;
    }
  };

  exports.Function = function() {
    var body, paramList, paramLists, params, _i, _j, _len;
    paramLists = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), body = arguments[_i++];
    params = [];
    for (_j = 0, _len = paramLists.length; _j < _len; _j++) {
      paramList = paramLists[_j];
      if (typeof paramList === 'string') {
        paramList = paramList.split(/\s*,\s*/);
      }
      params.push.apply(params, paramList);
    }
    return vm.runInThisContext("(function(" + (params.join(', ')) + ") {\n  " + body + "\n})");
  };

}).call(this);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"vm":82}],18:[function(require,module,exports){
/**
 * Javascript code generation for SugarLisp Async
 */

var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader');

// THE NEXT TWO VARIATIONS ON TRY WERE PART OF GETTING THE ASYNC GENERATORS APPROACH TO WORK
// WHAT THE FINAL SOLUTION IS REMAINS TBD (ONE OR BOTH OF THESE WILL LIKELY GO AWAY)
exports["try*"] = function(forms) {
    if (forms.length < 3) {
      forms.error("try requires one or more expressions followed by a catch expression");
    }
    var c = forms.pop(),
        ind = " ".repeat(this.indent),
        generated = sl.generated();

    generated.push(["function*() {\n" + ind +
           "try {\n", this.transpileExpressions(forms.slice(1)), "\n" +
           ind + "} catch (e) {\n" +
           ind + "return (", (Array.isArray(c) ? this.transpileExpression(c) : c), ")(e);\n" +
           ind + "}\n" + ind + "}"]);

    return generated;
}

exports["try-"] = function(forms) {
    if (forms.length < 3) {
      forms.error("try requires one or more expressions followed by a catch expression");
    }
    var c = forms.pop(),
        ind = " ".repeat(this.indent),
        generated = sl.generated();

    generated.push(["try {\n", this.transpileExpressions(forms.slice(1)), "\n" +
           ind + "} catch (e) {\n" +
           ind + "return (", (Array.isArray(c) ? this.transpileExpression(c) : c), ")(e);\n" +
           ind + "}"]);

    this.noReturn = true;

    return generated;
}

exports["autoasync"] = function(forms) {

  // for each of our sibling forms
  var afterDirective = false;  // only apply on expressions *following* #autoasync
  forms.parent.forEach(function(form) {
    // but skip ourselves (of course)...
    if(form !== forms) {
      if (afterDirective && Array.isArray(form)) {
        asyncifyFunctions(form);
      }
    }
    else {
      afterDirective = true;
    }
  });

  // the directive has directly expanded the form tree -
  // (our return value can be ignored)
  this.noSemiColon = true;
  return reader.ignorable_form;
}

// Had to timebox this - double check it later -
// I've yet to handle functions nested down under
// other functions - in that case isn't co.wrap
// needed to be added both at the lowest level
// and at the higher levels?  Right now I stop
// at the higher levels.
function asyncifyFunctions(forms) {
  // for each subexpression form...
  forms.forEach(function(form) {
    if (sl.isList(form)) {
      if(sl.typeOf(form[0]) === 'symbol' &&
        sl.valueOf(form[0]) === 'function' &&
        asyncNeeded(form)) {
          form.unshift(sl.atom("async"));
          asyncifyFunctions(form);
      }
      else {
        asyncifyFunctions(form);
      }
    }
  });
}

// this needs beefing up, right now I'm only looking
// for awaits *directly* nested in the parent functions body
function asyncNeeded(funcDecl) {
  // the function body starts after the arguments
  var bodyPos;
  if(sl.typeOf(funcDecl[1]) === 'symbol') {
    bodyPos = 3;  // named function
  }
  else {
    bodyPos = 2;  // anonymous function
  }
  for(var i=bodyPos;i<funcDecl.length;i++) {
    if(sl.isList(funcDecl[i]) && sl.typeOf(funcDecl[i][0]) === 'symbol') {
      if(sl.valueOf(funcDecl[i][0]) === 'await') {
        return true;
      }
    }
  }
  return false;
}

},{"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43}],19:[function(require,module,exports){
// All the per-implementation async macros are available for use when you #use "async".
// i.e. "awaitp" (promises), "asynccb" (callbacks), etc.
//
// To make the generic "await" and "async" keywords use a chosen implementation,
// #include one of the provided "async*-enable.ls" files (after your #use "async")

var utils = require('sugarlisp-core/utils');

module.exports = {
  name: "async",
  lextab: require('./lextab'),
  readtab: require('./readtab'),
  gentab: utils.merge(require('./gentab'),
             require('./macros/asynccb.js'),
             require('./macros/asyncgen-co.js'),
             require('./macros/asyncp.js'),
             require('./macros/sync.js'))
};

},{"./gentab":18,"./lextab":20,"./macros/asynccb.js":21,"./macros/asyncgen-co.js":22,"./macros/asyncp.js":23,"./macros/sync.js":24,"./readtab":25,"sugarlisp-core/utils":45}],20:[function(require,module,exports){

module.exports = [
  // these are experimental right now as part of generator support:
  { category: 'symbol', match: [ 'try-', 'try*' ] }
];


},{}],21:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
exports["awaitcb"] = function(forms) {
  var macrodef = ["macro", ["result", "asynccall", "then", "error"],
    [
      ["~@", "asynccall"],
      ["function", ["err", ["~", "result"]],
        ["if", "err", ["~", "error"],
          ["~", "then"]
        ]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["asynccb"] = function(forms) {
  var macrodef = ["macro", ["func", "...rest"],
    ["function", ["~", "rest"]]
  ];
  return this.macroexpand(forms, macrodef);
};
},{}],22:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
exports["awaitgen"] = function(forms) {
  var macrodef = ["macro", ["result", "asynccall", "then", "error"],
    ["try-", ["var", ["~", "result"],
        ["yield", ["~", "asynccall"]]
      ],
      ["~", "then"],
      ["function", ["err"],
        ["~", "error"]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["awaitgenPrior"] = function(forms) {
  var macrodef = ["macro", ["result", "asynccall", "then", "error"],
    ["iifegen", ["try*", ["var", ["~", "result"],
        ["yield", ["~", "asynccall"]]
      ],
      ["~", "then"],
      ["function", ["err"],
        ["~", "error"]
      ]
    ]]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["asyncgen"] = function(forms) {
  var macrodef = ["macro", ["func", "...rest"],
    [
      [".", "co", "wrap"],
      ["function*", ["~", "rest"]]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["iifegen"] = function(forms) {
  var macrodef = ["macro", ["iifewrapped"],
    [
      [
        [".", "co", "wrap"],
        ["~", "iifewrapped"]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
},{}],23:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
exports["awaitp"] = function(forms) {
  var macrodef = ["macro", ["result", "promisecall", "then", "error"],
    ["->", ["~", "promisecall"],
      [
        ["dotprop", "then", ["function", [
            ["~", "result"]
          ],
          ["~", "then"]
        ]],
        ["function", ["err"],
          ["~", "error"]
        ]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["asyncp"] = function(forms) {
  var macrodef = ["macro", ["func", "...rest"],
    ["function", ["~", "rest"]]
  ];
  return this.macroexpand(forms, macrodef);
};
},{}],24:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
exports["awaitsync"] = function(forms) {
  var macrodef = ["macro", ["result", "asynccall", "then", "error"],
    ["try", ["var", ["~", "result"],
        ["~", ["js", "\"$args.asynccall[0].set($args.asynccall[0].toString() + 'Sync'); return $args.asynccall;\""]]
      ],
      ["~", "then"],
      ["function", ["err"],
        ["~", "error"]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["sync"] = function(forms) {
  var macrodef = ["macro", ["func", "...rest"],
    ["function", ["~", "rest"]]
  ];
  return this.macroexpand(forms, macrodef);
};
},{}],25:[function(require,module,exports){
var reader = require('sugarlisp-core/reader');

// #autoasync infers the "async" keyword without them entering it.
// The code behind this must run after the form tree has been fully
// parsed and read in - we translate it here as if they'd
// entered the function call (autoasync...)
exports['#autoasync'] = reader.parenfree(0, {alternate:"autoasync"});

},{"sugarlisp-core/reader":41}],26:[function(require,module,exports){
// The requires below are to satisfy browserify
//
// Though they do run on node as well, the list of requires
// below are so browserify's static analysis knows to
// include these modules in the browser-bundle.
//
// They also make these modules require-able in the "load"
// function (requires in browserify only work if it's seen
// through static analysis of the file requires).
//
// You can comment unneeded ones to make browser-bundle smaller, or
// you can add additional if you've written your own language
// extension modules you need added in browser-bundle.
//
// note:  this needs to be improved on? - could it maybe become a
//   sugarlisp file that uses macros to expand a shorter/sweeter
//   "configuration-like" syntax into the code below?

// the language extension "dialect" modules to be included in the browser-bundle
require("sugarlisp-core");
require("sugarlisp-plus");
require("sugarlisp-match");
require("sugarlisp-match/matchexpr");
require("sugarlisp-html");
require("sugarlisp-css");
require("sugarlisp-async");
require("sugarlisp-sugarscript");
require("sugarlisp-csp");

/**
* load the specified dialect for use in a sugar source file.
* note: by convention language extensions are named "sugarlisp-<dialectName>"
*/
exports.load = function(dialectName) {

  var dialect;

  try {
    // by convention language extensions are named e.g. sugarlisp-core,
    // sugarlisp-async, etc. (just to organize them all together in npm)
    dialect = require('sugarlisp-' + dialectName);

    // we require all dialect's include their name - but JIC:
    if(!dialect.name) {
      dialect.name = dialectName;
    }
  }
  catch(e) {
    console.log('Error loading dialect:', dialectName);
    console.log(e.message);
    console.log(e.stack);
    throw e;
  }

  return dialect;
}

},{"sugarlisp-async":19,"sugarlisp-core":32,"sugarlisp-csp":47,"sugarlisp-css":51,"sugarlisp-html":56,"sugarlisp-match":61,"sugarlisp-match/matchexpr":65,"sugarlisp-plus":69,"sugarlisp-sugarscript":74}],27:[function(require,module,exports){
// which dialects should be automatically "#used"
// in a file with the given extension?
//
// note: the order is the same as #uses in an actual
//  file (i.e. later ones override the earlier ones)
module.exports = {
  // "code" formats

  score: ['core'],
  slisp: ['plus'],
  sugar: ['sugarscript'],

  // "data" formats

  // these for people who like lispy syntax:
  slon: ['plus'],
  slml: ['plus', 'html'],
  slss: ['plus', 'css'],
  
  // and these for people who like the sugarscript syntax:
  sson: ['sugarscript'],
  ssml: ['sugarscript', 'html'],
  ssss: ['sugarscript', 'css']
};

},{}],28:[function(require,module,exports){
/**
 * The foundational keywords needed for bootstrapping the compile
 * of a SugarLisp core file
 */

var macros = require('./macro-expander'),
    sl = require('./sl-types'),
    debug = require('debug')('sugarlisp:core:keywords:debug'),
    trace = require('debug')('sugarlisp:core:keywords:trace');
    match = require('sugarlisp-match/pattern-match');

/**
 * Compiled macro = Generate a macro (expanding) function
 *
 * This is a function which, when called later with a form tree,
 * expands the code using the macro definition's argument template
 * and expansion code template.
 *
 * note:  as with most Lisps, SugarLisp allows characters such as
 *  "?", "=", "->", etc. as part of the macro name.  To support that,
 *  only *anonymous* macro functions are generated.  This is because
 *  a property assigned to an anonymous function can have such
 *  characters, whereas in languages such as javascript a *named*
 *  function cannot.
 */
exports["macro"] = function(forms) {

    if (forms.length != 3 && forms.length != 4)  {
      forms.error("malformed expression:  \"macro\" takes an (optional) name, followed by argument list then body");
    }

    var mName, mArgs, mBody
    var pos = 1;

    if(sl.typeOf(forms[pos]) === 'symbol') {
      // a named macro
      mName = forms[1];
      pos++;
    }

    if(Array.isArray(forms[pos])) {
      // macro arguments
      mArgs = forms[2]
      pos++;
    }
    else {
      forms.error("\"macro\" takes an (optional) name, followed by argument list then body");
    }

    // macro body
    mBody = forms.slice(pos)

    var generated = sl.generated();
    generated.push(["function(forms) {\n"]);
    generated.push(["  var macrodef = ", sl.pprintJSON(forms.toJSON(), {}, 9), ";\n"]);
    generated.push( "  return this.macroexpand(forms, macrodef);\n");
    generated.push("}");
    //this.noSemiColon = true

    // named macros are available immediately in the file they're defined in:
    if(mName) {
      // this tells the transpiler to eval this code and register it as a keyword
      generated.__macrofn = true;
    }

    // an anonymous macro is only useful when compiling macros to
    // to code - return the code for this macro function so it can be
    // written to the output file.
    return generated
}

function inlineJs(forms) {
    if (forms.length != 2)  {
      forms.error("a single string containing javascript is required");
    }

// I THOUGHT I SHOULD ALLOW E.G. (js "console.log('hello ${name}')") BUT
// THIS IS NOT AS IT SEEMS - THIS WAS PRODUCING CODE THAT WOULD JOIN THOSE
// PARTS ('hello' and name) AT RUNTIME.  BUT OUR GOAL HERE WOULD BE THAT
// console.log IS GENERATED TO OUR OUTPUT CODE - YET ITS NOT AS SIMPLE AS
// EVALING IT EITHER - NOTE THAT name IS AN UNQUOTED SYMBOL IT CANT BE
// EVALED AT COMPILE TIME!!  MAYBE THIS IS WHERE QUOTE AND QUOTE WOULD
// HELP, OR MAYBE THERE'S ACTUALLY A DIFFERENT TEMPLATE STRING SYNTAX
// NEEDED JUST FOR OUTPUTTING CODE - THATS WHAT I WAS PLANNING BEFORE.
// ALSO NOTE - YOU'RE TALKING ABOUT TEMPLATE STRINGS HERE IN JS - BUT
// THIS IS CORE AND TEMPLATE STRINGS LIVE IN PLUS!!
    var code = (sl.typeOf(forms[1]) === 'string' ?
                sl.generated(sl.valueOfStr(forms[1])) :
                sl.typeOf(forms[1]) === 'symbol' ?
                  sl.generated(sl.valueOf(forms[1])) :
                  forms[1]);

    // leave these decisions in the hands of the inlined javascript:
// THE PROBLEM HERE IS THAT THIS NO SEMI NO NEWLINE STUFF IS AFFECTING OTHER STUFF
// ISN'T IT A DESIGN FLAW THAT THESE FLAGS AREN'T *ON* THE GENERATE CODE ITSELF
// THEN IT SHOULD BE THE JOB OF TRANSPILED.TOSTRING TO INTELLIGENTLY INSERT
// PUNCTUATION AND PRELUDES!!
//    this.noSemiColon = true;
//    this.noNewline = true;

    code.noSemiColon = true;
    return code;
}

// now support a shorter "js" variant (used e.g. in the async macros).
// WHETHER THIS STAYS IS TBD
exports["javascript"] = inlineJs;
exports["js"] = inlineJs;

// the no-op form exists for the sole reason of having something
// to hang whitespace or comments on when the form that follows
// doesn't generate any code.  These are scrubbed from the
// pretty-printed parse trees btw since they're ugly and don't
// add any value.

exports["nop"] = function(forms) {

    // intentionally not checking the number of args -
    // since people might might wish to stick "nop" at
    // the front of an expression to disable it
    this.noSemiColon = true;
    this.noNewline = true;
    return sl.generated();
}

/**
* export is just a convenience for exporting from a module
* A little shorter than using "set" and you can use a symbol
* without quotes (as opposed to a quoted string) if you like.
* note: this is here instead of in a macro file because
*   it's used to bootstrap the core "macros.slisp" file before
*   macros are actually working!
*/

exports["export"] = function(forms) {
  var macrodef = ["macro",
                    ["symbol", "value"],
                    ["set",
                      ["~",
                        ["js", "\"return symbol.toQuotedString();\""]], "exports",
                      ["~", "value"]]];
  return this.macroexpand(forms, macrodef);
};

/*
 * set started as compiled sugarlisp code, but got pulled in
 * here to avoid some chicken-and-egg issues
 */
function handleSet(setFnName) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    return match(args, function(when) {
      when([
          function(sym) {
            return sym.value === setFnName;
          },
          match.var("key", match.any),
          match.var("arrayname", match.any),
          match.var("valexpr", match.any)
        ],
        function(vars) {
          return (function(key, arrayname, valexpr) {
            return sl.generated([
              this.x(arrayname), "[", this.x(key), "] = ", this.x(valexpr)
            ]);
          }).call(this, vars["key"], vars["arrayname"], vars["valexpr"]);
        }, this);
      when([
          function(sym) {
            return sym.value === setFnName;
          },
          match.var("varexpr", match.any),
          match.var("valexpr", match.any)
        ],
        function(vars) {
          return (function(varexpr, valexpr) {
            return sl.generated([
              this.x(varexpr), " = ", this.x(valexpr)
            ]);
          }).call(this, vars["varexpr"], vars["valexpr"]);
        }, this);
      when([
          match.var("any", match.lsdefault)
        ],
        function(vars) {
          return (function(any) {
            return this.error('invalid arguments for ' + setFnName);
          }).call(this, vars["any"]);
        }, this);
    }, this)
  };
}

// lispy (set var val)
exports["set"] = handleSet("set");
// and let (= var val) work the same as (set var val)...
exports["="] = handleSet("=");

},{"./macro-expander":35,"./sl-types":43,"debug":37,"sugarlisp-match/pattern-match":67}],29:[function(require,module,exports){
/**
 * Keywords of the core SugarLisp language
 */

var reader = require('sugarlisp-core/reader'),
    sl = require('./sl-types'),
    utils = require('./utils'),
    debug = require('debug')('sugarlisp:core:keywords:debug'),
    trace = require('debug')('sugarlisp:core:keywords:trace');

exports["var"] = function(forms) {
    if (forms.length < 2) {
      forms.error("missing variable name for var?");
    }
    if (forms.length > 3) {
        this.indent += this.indentSize
    }
    this.transpileSubExpressions(forms)
    var generated = sl.generated()
    generated.push(sl.atom("var", {token:forms[0]}));
    generated.push(" ");

    for (var i = 1; i < forms.length; i = i + 2) {
        if (i > 1) {
            generated.push(",\n" + " ".repeat(this.indent))
        }
        var validName = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
        if (!validName.test(sl.valueOf(forms[i]))) {
          sl.lexerOf(forms[i]).error("Invalid character in var name", forms[i]);
        }
        generated.push(forms[i]);
        if(i+1 < forms.length) {
          generated.push([' = ', forms[i + 1]])
        }
    }
    if (forms.length > 3) {
        this.indent -= this.indentSize
    }

    return generated;
}

exports["return"] = function(forms) {
    var generated = sl.generated("return");
    if(forms.length > 1) {
      generated.push(" ");
      generated.push(sl.isList(forms[1]) ? this.transpileExpression(forms[1]) : forms[1]);
    }
    return generated;
}

function handleFuncs(forms) {
    var generated = sl.generated();
    var fName, fArgs, fBody;

    if (forms.length < 2) {
      forms.error("missing arguments:  function declarations require an argument list and function body");
    }

    // fType = is this a regular "function",
    // a generator "function*",
    // an arrow function "=>"?
    var fType = sl.valueOf(forms[0]);

    if(sl.isList(forms[1])) {
        // an anonymous function
        fArgs = forms[1];
        fBody = forms.slice(2);
    }
    else if(!sl.isList(forms[1]) && sl.isList(forms[2])) {
        // a named function
        fName = forms[1];
        fArgs = forms[2];
        fBody = forms.slice(3);
    }
    else {
      forms.error("function declarations require an argument list and function body");
    }

    // Was the body wrapped in (begin..) ?
    // (e.g. the {} in arrow funcs like () => {} is translated to a (begin..))
    if(fBody.length > 0 &&
        sl.typeOf(fBody[0][0]) === 'symbol' &&
        fBody[0][0].value === "begin") {
      fBody = fBody[0]; // unwrap the body
      fBody.shift();    // remove "begin"
    }

    generated.push(sl.atom(fType === "function*" ? fType : "function"), {token:forms[0]});
    if(fName) {
      generated.push([" ", fName]);
    }
    generated.push("(");
    var generatedArgs = sl.generatedFromArray(fArgs);
    generatedArgs.join(",");
    generated.push(generatedArgs);

    var bodyCode = this.transpileExpressions(fBody);
    var bodyCodeStr = bodyCode.toString();

    // note we push bodyCode (not bodyCodeStr) to preserve line/col info
    generated.push([
        ") {",
        /^[\ \t]*\n/.test(bodyCodeStr) ? "" : "\n", bodyCode,
        /\n[\ \t]*$/.test(bodyCodeStr) ? "" : "\n",
        " ".repeat(this.indent > 0 ? this.indent : 0), "}"])
    if(fType === "=>" && generated.toString().indexOf("this") !== -1) {
      // it's an arrow function using "this" - bind "this" since
      // arrow functions are lexically scoped - but not if it's an
      // object method ("this" is already the object in that case)
      if(!(forms.parent && sl.isList(forms.parent) &&
        sl.typeOf(forms.parent[0]) === 'symbol' && sl.valueOf(forms.parent[0]) === 'object'))
      {
        generated.push(".bind(this)");
      }
    }

    if(fName) {
      // our output has been really scrunched together
      // aid readability with a little white space
// THIS CAUSES SOME FORMATTING ISSUES IN SOME CASES     generated.unshift("\n");
      generated.push("\n");
      // and named functions don't terminate with semis:
      this.noSemiColon = true;
    }
    return generated;
}

// named and anonymous functions
exports["function"] = handleFuncs;

// es6 generator functions
exports["function*"] = handleFuncs;

// es6 arrow functions
exports["=>"] = handleFuncs;

// es6 yield expressions
function handleYield(forms) {
    var yieldType = sl.valueOf(forms[0]); // "yield" or "yield*"
    if (forms.length != 2) {
      forms.error(yieldType + " expects a single expression");
    }
    this.indent += this.indentSize;
    this.transpileSubExpressions(forms);

    var generated = sl.generated();
    generated.push([yieldType, " ", forms[1]]);
    this.indent -= this.indentSize;
    return generated;
}

exports["yield"] = handleYield;
exports["yield*"] = handleYield;

exports["try"] = function(forms) {
    if (forms.length < 3) {
      forms.error("try requires one or more expressions followed by a catch expression");
    }
    var c = forms.pop(),
        ind = " ".repeat(this.indent),
        generated = sl.generated();

    generated.push(["(function() {\n" + ind +
           "try {\n", this.transpileExpressions(forms.slice(1)), "\n" +
           ind + "} catch (e) {\n" +
           ind + "return (", (sl.isList(c) ? this.transpileExpression(c) : c), ")(e);\n" +
           ind + "}\n" + ind + "})()"])

    return generated;
}

exports["throw"] = function(forms) {
    if (forms.length != 2)  {
      forms.error("missing target to be thrown");
    }
    var generated = sl.generated();

    generated.push(sl.isList(forms[1]) ? this.transpileExpression(forms[1]) : forms[1]);
    generated.unshift("(function(){throw ");
    generated.push(";})()");

    return generated;
}

/**
* transpile time "#if" condition for including/omitting code from the output
* note the expression in the condition is evaluated at *transpile time*
* Also #if (as with the other # directives) is paren free, taking two args:
* a condition in parens followed by the code to be generated or not (can
* be a single expression otherwise wrap in {}).  Note #if does not support
* an "else" (negate your condition with a second #if when you need an "else")
* TBD IS THE QUESTION OF SOURCE MAPS
* I.E. CAN SOURCE MAPS MAP TO THE FILE WITH THESE SECTIONS COLLAPSED AWAY?
* TO DO THAT IMPLIES I'VE ADJUSTED THE LINE NUMBERS
* (FOR THAT MATTER THEY CAN BE USED TO ELIMINATE JUST PART OF A LINE TOO)
* MAYBE SIMPLER WILL BE TO JUST BLANK OUT THE CODE NOT PASSED
* THRU, THEN LINE AND COLUMN NUMBERS DON'T HAVE TO BE ADJUSTED, EVEN IF IT
* LOOKS A LITTLE FUNNY.  MAYBE PART OF THE ANSWER IS TO DO WHAT I'M DOING NOW
* IF THEYRE NOT GENERATING SOURCE MAPS DO THE BLANKING IF THEY ARE.
*/
exports["#if"] = function(forms) {
    if (forms.length < 3) {
      forms.error("\"#if\" directive takes a condition and a body");
    }

    // eval javascript generated from the condition
    var cond = (sl.isList(forms[1]) ? this.transpileExpression(forms[1]) : forms[1])
    var condcode = cond.toString();
    var condPassed = this.evalJavascript(condcode);
    trace("#if", condcode, (condPassed ? "passed" : "failed"));
    if(!condPassed) {
      return reader.ignorable_form;
    }

    return this.transpileExpressions(forms.slice(2));
}

exports["get"] = function(forms) {
    if (forms.length != 3) {
      forms.error("get takes a key and object / index and array");
    }
    this.transpileSubExpressions(forms);
    return sl.generated([forms[2], "[", forms[1], "]"]);
}

// (str...) evaluates to the js Array.join of each of it's expression arguments
// note that "+" can also be used to concenate strings
exports["str"] = function(forms) {
    if (forms.length < 2) {
      forms.error("missing arguments to \"str\"");
    }
    this.transpileSubExpressions(forms);
    var generated = sl.generatedFromArray(forms.slice(1));
    generated.join(",");
    generated.unshift("[");
    generated.push("].join('')");

    return generated;
}

// (code...) is intended for use in code templates.
// it generates js code that transpiles code using an sl.generated list
exports["code"] = function(forms) {
    if (forms.length < 2) {
      forms.error("missing arguments to \"code\"");
    }

    var gencode = sl.generated();

    this.tabin();
    this.transpileSubExpressions(forms);

    var ctx = this;
    var leadin = "";
    forms.slice(1).forEach(function(form) {
      if (sl.typeOf(form) === 'symbol') {
        gencode.push(leadin + form.value);
        leadin = "";
      }
      else if (sl.typeOf(form) === 'string') {
        var codestr = sl.valueOfStr(form);
        var lines = codestr.split("\\n");
        lines.forEach(function(line, i) {
          var marginMarker = /^\s+(\.\.)[^.]/.exec(line);
          if(marginMarker) {
            var marginPos = marginMarker.index + marginMarker[0].length - 1;
            line = line.substring(marginPos);
          }
          if(i < lines.length-1) {
            gencode.push([leadin + '"' + line + '\\n"']);
            leadin = "\n" + ctx.margin();
          }
          else {
            gencode.push(leadin + '"' + line + '"');
            leadin = "";
          }
        });
      }
      else if (sl.isTranspiled(form)) {
        gencode.push(leadin + form.toString());
        leadin = "";
      }
      else {
        forms.error("unrecognized node type in \"code\": " + forms.toString());
      }
    });
    gencode.join(",");
    gencode.unshift("sl.generated([\n" + ctx.margin());
    gencode.push("])");
    this.tabout();

    return gencode;
}

exports["array"] = function(forms) {
    var generated = sl.generated()

    if (forms.length == 1) {
        generated.push("[]")
        return generated;
    }

    var ctx = this;
    ctx.tabin();
    this.transpileSubExpressions(forms);

    generated.push("[\n" + ctx.margin())
    forms.forEach(function(form, i) {
      if (i > 1) {
        generated.push(",\n" + ctx.margin())
      }
      if(i !== 0) {
        generated.push(form);
      }
    });
    ctx.tabout();
    generated.push("\n" + ctx.margin() + "]");

    return generated;
}

exports["object"] = function(forms) {
    var generated = sl.generated();

    if (forms.length == 1) {
        generated.push("{}");
        return generated;
    }

    this.indent += this.indentSize;
    this.transpileSubExpressions(forms);

    generated.push("{\n" + " ".repeat(this.indent));

    for (var i = 1; i < forms.length; i = i + 2) {
        if (i > 1) {
            generated.push(",\n" + " ".repeat(this.indent));
        }

        generated.push([forms[i].toString(), ': ', forms[i + 1]]);
    }

    this.indent -= this.indentSize;
    generated.push("\n" + " ".repeat((this.indent >= 0 ? this.indent : 0)) + "}");

    return generated;
}

exports["#include"] = function(forms) {
    if (forms.length != 2)  {
      forms.error("\"#include\" expects a single file name");
    }
    var filename = sl.stripQuotes(sl.valueOf(forms[1]));

    this.indent -= this.indentSize;

    var includedforms = reader.read_include_file(filename, sl.lexerOf(forms));
    var expanded = this.transpileExpressions(includedforms);
    this.indent += this.indentSize;

    this.noSemiColon = true;

    // some files e.g. macros files return no actual code...
    // (but if we return their forms we wind up with a blank line
    // in the generated code which looks odd)
    if(expanded && ((expanded.length && expanded.length > 0) ||
      (expanded.children && expanded.children.length > 0))) {
        // got some real content to return
        return expanded;
    }

    // nope - nothing real to return
    return reader.ignorable_form;
}

// #require requires a module during read time.
// works a little like #include but uses the module path
// instead of lispy's include path.
//  WAS AN EXPERIMENT IS IT STAYING?  ITS ODD IT JUST REQUIRES BUT
// DOESNT ASSIGN A HANDLE FOR THE REQUIRED MODULE?
exports["#require"] = function(forms) {
    if (forms.length != 2)  {
      forms.error("\"#require\" expects a single module");
    }
    var modulename = sl.valueOf(forms[1]);

    this.indent -= this.indentSize;
    var generated = require(modulename);

    this.noSemiColon = true;

    // nope - nothing real to return
    return reader.ignorable_form;
}

exports["regex"] = function(forms) {
    if (forms.length != 2)  {
      forms.error("\"regex\" expects a single string containing a regular expression");
    }
    this.noSemiColon = true;
    return '/' + sl.stripQuotes(sl.valueOf(forms[1])) + '/';
}

// "do" combines multiple expressions into one.
// it's implemented as a self invoking function
exports["do"] = function(forms) {
    // if statements are enabled
//    if(this.options.transpile.statements)
//    {
//      // then don't wrap in an IIFE (which is what our "begin" is for)
//      return exports["begin"].call(this, forms);
//    }

    // make a lispy function expression with the do args as it's body:
    var wrapperfn = sl.list(sl.atom("function"), sl.list())
    // slice(1) below = skip past "do"
    wrapperfn.pushFromArray(forms.slice(1));

    // convert that to javascript
    var generated = this.transpileExpression(wrapperfn);

    // wrap it in parens:
    generated.unshift('(');
    generated.push(')');

    // if it refers to "this" call it with *our* "this"
    if(generated.toString().indexOf("this") !== -1) {
      generated.push('.call(this)');
    }
    else {
      // otherwise call it simply
      generated.push('()');
    }

    return generated;
}

// "begin" is much like "do" except it simply
// generates the code for each expression without
// wrapping the result in an IIFE (as "do" does)
exports["begin"] = function(forms) {
    // slice(1) = get rid of "begin"
    return this.transpileExpressions(forms.slice(1), true);
}

/**
* binding assignment i.e.
*   feedback ##= feedbackmsg(score);
* For "reactor before" and:
*   feedback #= feedbackmsg(score);
* For "reactor after".
*
* These bind a "target" to some input "cells" via a "reactor
* function" (whose arguments are the cells), and keep the
* target up to date whenever the cells change, by calling
* the function automatically to get the new target value.
*
* These use the generic "#react" (see below) for their implementation.
*/
function handleBindingAssignment(forms) {
  var which = sl.valueOf(forms[0]);
  if (forms.length != 3)  {
    forms.error("Binding assignment expects lhs " + which + " rhs");
  }
  var target = forms[1];
  var reactor = forms[2];

  // extract the "cell" arguments
  // note: the expression may use a call to a named function e.g.:
  //   feedback #= feedbackmsg(score);
  // or might use an anonymous function e.g.:
  //   feedback #= function(score) {if?(score > 9) "You won!" else "Try again."};
  // or
  //   feedback #= (score) => {if?(score > 9) "You won!" else "Try again."};
  var cells;
  var invokereactorfn;
  if(sl.valueOf(reactor[0]) === "function" || sl.valueOf(reactor[0]) === "=>") {
    // grab the args from e.g. (function (score) {...})
    cells = reactor[1];

    // note here we must create a *call* to the anonymous function
    // also note the argument name(s) are assumed to *be* the cell variable names
    invokereactorfn = sl.list(reactor);
    invokereactorfn.pushFromArray(cells);
  }
  else {
    // slice just the args from e.g. (feedbackmsg score)
    cells = sl.listFromArray(reactor.slice(1));

    // note here the code provided was already a *call* which is what we need.
    // also note the argument name(s) are assumed to *be* the cell variable names
    invokereactorfn = reactor;
  }

  // We return an s-expression *form* (like a macro) not generated js
  // It uses #react to register code forms inserted (later) by the transpiler
  // it's like (#react after set (cell1, cell2) (set tgt (reactorfn cell1 cell2)))
  var registrar = sl.list("#react");
  registrar.push(which === "#=" ? "after" : "before");
  // the "mutators" set/++/+=/etc. are in the context to make them easy to change
  registrar.push(sl.listFromArray(this.mutators));
  registrar.push(cells);
  registrar.push(sl.list("set", target, invokereactorfn));

  return registrar;
}

exports['#='] = handleBindingAssignment;
exports['##='] = handleBindingAssignment;

/**
* #react registers code that gets inserted by the transpiler
* after/before a call that changes one the observed "cells".
*
* #react expects: when (fn1,...,fnM) (cell1,...,cellN) reactorcode
* where
*  when = "before" or "after"
*  (fn1,..., fnM) = the names of functions to insert code before or after (e.g. (set,++,*=))
*  (cell1,...,cellN) = observed cells i.e. the fn arguments we're reacting to changes in
*  reactorcode = code to be generated and run when a cell is modified with an fnX.
*/
function registerReactor(forms) {
  if (forms.length != 5)  {
    forms.error('#react expects: before/after, fnname, (observed cells), reactorcode');
  }

  // the word "before" or "after"
  var when = sl.valueOf(forms[1]);
  // a list of functions e.g. (set, ++, --)
  var cmds = forms[2];
  // a list of cells (arguments to the "cmds")
  var observed = forms[3];
  // code to inject when these cmds are invoked on these cells
  var reactorcode = this.transpileExpression(forms[4]);
// THIS DEBUG STATEMENT IS DUMPING THE WHOLE FORMS NEED TO PRETTY IT UP TO JUST THE NAMES
  debug('registering code to be run ' + when + ' one of "' + cmds + ' invoked on "' + observed + '"');

  // observed are the variables they need to declare as #cell
  // note: #cell is only done to encourage them to think of these
  //   variables as global to the file since we have no way to distinguish
  //   a reference to a variable in one scope from a variable with the same
  //   name in another (since we're a transpiler not an interpreter)
  var source = sl.lexerOf(forms);
  observed.forEach(function(cell) {
    var arg = sl.valueOf(cell);
    if(source.cells.indexOf(arg) === -1) {
      console.log('warning: reactor function observes "' + arg +
                    '" but "' + arg + '" is not a cell');
    }
  });

  // we store for each "cmd" an array of objects of the form:
  //   { of: [observed1, ..., observedN], insert: form }
  // where "observed" are first args for cmd (e.g. "(set observedX val)"), and
  // insert is the (already generated) js code to insert before/after
  cmds.forEach(function(cmdAtom) {
    var cmdName = sl.valueOf(cmdAtom);
    if(!source.bindingCode[when][cmdName]) {
      source.bindingCode[when][cmdName] = [];
    }
    source.bindingCode[when][cmdName].push({of: observed, insert: reactorcode});
  });

  // we expand to nothing our only job is to register the
  // code that the main transpiler injects when appropriate
  this.noSemiColon = true;
  return sl.generated();
}

exports['#react'] = registerReactor;

/**
* quote just returns the form inside it (as data)
*/
exports["quote"] = function(forms) {
  return forms[1];
};

// this is called initially with the expr *following* "quasiquote"
// then it recurses over the parsed forms
// note: this code was based on MAL see e.g.:
//  https://github.com/kanaka/mal/blob/master/process/guide.md
// and
//  https://raw.githubusercontent.com/kanaka/mal/master/js/stepA_mal.js

/* FROM MAL (DELETE)
// OLD
    if (!is_pair(ast)) {
        return [types._symbol("quote"), ast];
    } else if (ast[0].value === 'unquote') {
        return ast[1];
    } else if (is_pair(ast[0]) && ast[0][0].value === 'splice-unquote') {
        return [types._symbol("concat"),
                ast[0][1],
                quasiquote(ast.slice(1))];
    } else {
        return [types._symbol("cons"),
                quasiquote(ast[0]),
                quasiquote(ast.slice(1))];
    }
*/

function quasiquoter(forms) {
    if(sl.isAtom(forms)) {
      return sl.list("quote", forms);
    }
    else if(sl.isList(forms) && forms.length === 0) {
      return forms;
    }
    else if(forms[0].value === 'unquote') {
      return forms[1];
    }
    else if(sl.isList(forms) && forms.length === 1) {
      return quasiquoter(forms[0]);
    }
    else if(sl.isList(forms[0]) && forms[0][0].value === "splice-unquote") {
      return sl.list("concat",
              forms[0][1],
              quasiquoter(forms.slice(1)));
    }
    else {
      return new sl.list("cons",
              quasiquoter(forms[0]),
              quasiquoter(forms.slice(1)));
    }
}

exports["quasiquote"] = function(forms) {
  return quasiquoter(forms.slice(1));
}

// given an item and a list, return a list with the first argument prepended
// note: this is prepends the item at *compile time*
exports["cons"] = function(forms) {
  if (forms.length != 3)  {
    forms.error("\"cons\" expects an item to prepend and a list");
  }
  var list = sl.list();
  list.push(forms[1]);
  // I got an item (not a list) as a second argument
  // (need to follow up - is that to be expected?)
  if(sl.isList(forms[2])) {
    forms[2].forEach(function(form) {
      list.push(form);
    })
  }
  else {
    list.push(forms[2]);
  }

  return list;
}

// given 0 or more lists returns new list that is a concatenation of all of them
// note: this concatenates the items at *compile time*
exports["concat"] = function(forms) {
  if (forms.length != 3 || !sl.isList(forms[2]))  {
    forms.error("\"cons\" expects an item to prepend and a list");
  }
  var newlist = sl.list();
  // slice(1) = skip over "concat"
  forms.slice(1).forEach(function(sublist) {
     if(sl.isList(sublist)) {
       sublist.forEach(function(sublistitem) {
         newlist.push(sublistitem);
       });
     }
     else {
       // they've included elements to concatenate
       console.log("warning:  concat received atoms but is only meant for lists");
       newlist.push(sublist);
     }
  })
  return newlist;
}

// codequasiquote is an alternative to the code """
// when you want to express generated code in
// lispy form instead of javascript
exports["codequasiquote"] = function(forms) {
  // transpile the quoted lispy code to javascript
  // (but placeholders e.g. ~obj pass thru in the javascript)
  var generatedJsForms = this.transpileExpression(forms[1]);
  var generatedJsStr = generatedJsForms.toString();
  return generatedJsStr;

  // change ~(expr) so they are es6 template style i.e. ${(expr)}
  // THIS REGEX WILL FAIL IF THERE'S NESTED PARENS INSIDE THE ~(expr)!!!! FIX!!
//  var codeStr = generatedJsStr.replace(/\~\((.+)\)/g, '\$\{\($1\)\}');
//console.log("after 1:", codeStr);
  // change ~name so they are es6 template style i.e. ${name}
//  codeStr = codeStr.replace(/\~([a-zA-Z_]+[a-zA-Z0-9_\.]*)/g, '\${$1}');
//console.log("after 2:", codeStr);
  // now treating *that* as a code template string, transform it into javascript
  // generating sl.generated objects (as if they'd used """ themselves)
//  var codeForms = reader.read_from_source('"""' + codeStr + '"""',
//                    "codequasiquote.sl");
//  var result = this.transpileExpression(codeForms);
//console.log("codequasiquote result:", result.toString());
//  return result;
}

var handleCompOperator = function(forms) {
    if (forms.length < 3)  {
      forms.error(forms[0].value + " requires two or more arguments");
    }
    this.transpileSubExpressions(forms)
// DELETE = FOR US IS "SET"    if (forms[0].value == "=") forms[0] = "==="
// DELETE THIS IS CONFUSING NOW THAT WE ALSO SUPPORT ==, !==    if (forms[0].value == "!=") forms[0] = "!=="

    var op = forms[0];
    var generated = sl.generated()

    var argforms = forms.slice(1);
    for (i = 0; i < argforms.length - 1; i++)
        generated.push([argforms[i], " ", op, " ", argforms[i + 1]])

// to not lose token info our join can't be the standard Array.join
// the standard Array.join produces a string
// it also takes just a string to join between
// notice in the next function down we join with another list e.g.
// op.push([" ", arithAtom, " "]) is what is joined with.
// where again: we don't wnat token info from arithAtom lost becaus of this
    generated.join (' && ')

    // note the parens added here are critical when the generated
    // code has multiple chained conditions to get the associativity
    // right - i.e. without these we can generate things like
    //   true === typeof(var) === "undefined"
    // which will break when what we really needed was like
    //   true === (typeof(var) === "undefined")
    generated.unshift('(')
    generated.push(')')
    generated.callable = false;
    return generated;
}

var handleArithOperator = function(forms) {
    if (forms.length < 3)  {
      forms.error("binary operator requires two or more arguments");
    }
    this.transpileSubExpressions(forms)

    var arithAtom = forms[0];
    var op = sl.generated()
    op.push([" ", arithAtom, " "])

    var generated = new sl.generatedFromArray(forms.slice(1));
    generated.join(op)

    if(!arithAtom.noparens) {
      generated.unshift("(")
      generated.push(")")
    }
    generated.callable = false;
    return generated;
}

var handleBinaryOperator = function(forms) {
    if (forms.length !== 3)  {
      forms.error(forms[0].value + " requires two arguments");
    }
    return handleArithOperator.call(this, forms);
}

// Handle a unary operator e.g. i++, --i, etc.
// We're using a convention that prefix unary such as --i comes through as "--",
// but postfix unary like i-- comes through as "post--"
var handleUnaryOperator = function(forms) {
    var opName = sl.valueOf(forms[0]);
    if (forms.length < 2)  {
      forms.error("missing argument for unary operator: " + opName);
    }

    this.transpileSubExpressions(forms)
    var generated = sl.generated();
    var postPrefix = "post";
    if(opName.indexOf(postPrefix) === 0) {
      generated.push([sl.valueOf(forms[1]),opName.substring(postPrefix.length)]);
    }
    else {
      generated.push([forms[0], sl.valueOf(forms[1])]);
    }
    generated.callable = false;
    return generated;
}

// Minus is unique in that it can be a unary minus
var handleMinusOperator = function(forms) {
    if (forms.length < 2)  {
      forms.error("missing argument for operator");
    }
    if(forms.length > 2) {
      // it's a normal binary (or more) minus
      return handleArithOperator.call(this, forms);
    }

    // it's a unary minus
    this.transpileSubExpressions(forms)
    var generated = sl.generated()
    generated.push(["-", sl.valueOf(forms[1])]);
    generated.callable = false;
    return generated;
}

var handleLogicalOperator = handleArithOperator

// lispyscript 1 used "=" for comparisons, but this has been changed we
// *only* use "=" for assignment. lispyscript 1 also promoted "!="
// to "!==" in the generated code but we do not (now what they see is what
// they get!).
exports['=='] = handleCompOperator;
exports['==='] = handleCompOperator;
exports['!='] = handleCompOperator;
exports['!=='] = handleCompOperator;

// and a bunch more
exports["+"] = handleArithOperator;
exports["-"] = handleMinusOperator;
exports["*"] = handleArithOperator;
exports["/"] = handleArithOperator;
exports["%"] = handleArithOperator;
exports["+="] = handleBinaryOperator;
exports["-="] = handleBinaryOperator;
exports["*="] = handleBinaryOperator;
exports["/="] = handleBinaryOperator;
exports["%="] = handleBinaryOperator;
exports[">>"] = handleBinaryOperator;
exports[">>="] = handleBinaryOperator;
exports[">>>"] = handleBinaryOperator;
exports[">>>="] = handleBinaryOperator;
exports["<<"] = handleBinaryOperator;
exports["<<="] = handleBinaryOperator;
exports[">"] = handleCompOperator;
exports[">="] = handleCompOperator;
exports["<"] = handleCompOperator;
exports["<="] = handleCompOperator;
exports["||"] = handleLogicalOperator;
exports["&&"] = handleLogicalOperator;

exports["++"] = handleUnaryOperator;
exports["post++"] = handleUnaryOperator;
exports["--"] = handleUnaryOperator;
exports["post--"] = handleUnaryOperator;

exports["!"] = function(forms) {
    if (forms.length != 2) {
      forms.error("\"!\" expects a single expression");
    }
    this.transpileSubExpressions(forms)
    var result = sl.generated("(!" + forms[1] + ")");
    result.callable = false;
    return result;
}

},{"./sl-types":43,"./utils":45,"debug":37,"sugarlisp-core/reader":41}],30:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
var sl = require('sugarlisp-core/sl-types');
var match = require('sugarlisp-match/pattern-match');
exports["."] = function(forms) {
  this.transpileSubExpressions(forms);

  return match(forms, function(when) {
    when([
        function(sym) {
          return sym.value === ".";
        },
        match.var("object", match.any),
        match.var("property", match.any)
      ],
      function(vars) {
        return (function(object, property) {
          return sl.generated([
            object, ".", property
          ]);
        }).call(this, vars["object"], vars["property"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error('The dot (.) requires an object and a property');
        }).call(this, vars["any"]);
      }, this);
  }, this);
};
exports["dotprop"] = function(forms) {
  this.transpileSubExpressions(forms);

  return match(forms, function(when) {
    when([
        function(sym) {
          return sym.value === "dotprop";
        },
        match.var("property", match.any),
        match.var("object", match.any)
      ],
      function(vars) {
        return (function(property, object) {
          return sl.generated([
            object, ".", property
          ]);
        }).call(this, vars["property"], vars["object"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error('A dot property (.propname) requires an object');
        }).call(this, vars["any"]);
      }, this);
  }, this);
};

exports["new"] = function() {
  var args = Array.prototype.slice.call(arguments);
  return match(args, function(when) {
    when([
        function(sym) {
          return sym.value === "new";
        },
        match.var("classexpr", match.sllist)
      ],
      function(vars) {
        return (function(classexpr, constructorArgs) {
          return sl.generated([
            "new ", this.transpileExpression(classexpr), "(", this.transpileArgList(constructorArgs), ")"
          ]);
        }).call(this, vars["classexpr"], vars["_rest"]);
      }, this);
    when([
        function(sym) {
          return sym.value === "new";
        },
        match.var("classname", match.slsymbol)
      ],
      function(vars) {
        return (function(classname, constructorArgs) {
          return sl.generated([
            "new ", classname, "(", this.transpileArgList(constructorArgs), ")"
          ]);
        }).call(this, vars["classname"], vars["_rest"]);
      }, this);
    when([
        function(sym) {
          return sym.value === "new";
        }
      ],
      function(vars) {
        return (function(newArgs) {
          this.x(newArgs);
          return sl.generated([
            "new ", newArgs
          ]);
        }).call(this, vars["_rest"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error("missing class name for new operator?");
        }).call(this, vars["any"]);
      }, this);
  }, this)
};
exports["if?"] = function(forms) {
  this.transpileSubExpressions(forms);

  return match(forms, function(when) {
    when([
        function(sym) {
          return sym.value === "if?";
        },
        match.var("condition", match.any),
        match.var("iftrue", match.any),
        match.var("iffalse", match.any)
      ],
      function(vars) {
        return (function(condition, iftrue, iffalse) {
          return sl.generated([
            "(", condition, " ?\n",
            "    ", iftrue, " :\n",
            "    ", iffalse, ")"
          ]);
        }).call(this, vars["condition"], vars["iftrue"], vars["iffalse"]);
      }, this);
    when([
        function(sym) {
          return sym.value === "if?";
        },
        match.var("condition", match.any),
        match.var("iftrue", match.any)
      ],
      function(vars) {
        return (function(condition, iftrue) {
          return sl.generated([
            "(", condition, " ?\n",
            "    ", iftrue, " : undefined )"
          ]);
        }).call(this, vars["condition"], vars["iftrue"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error('if? expects a condition followed by one (for "then") or two (for "else") body expressions');
        }).call(this, vars["any"]);
      }, this);
  }, this);
};
exports["if"] = function(forms) {
  this.transpileSubExpressions(forms);

  return match(forms, function(when) {
    when([
        function(sym) {
          return sym.value === "if";
        },
        match.var("condition", match.any),
        match.var("iftrue", match.any),
        match.var("iffalse", match.any)
      ],
      function(vars) {
        return (function(condition, iftrue, iffalse) {
          return sl.generated([
            "if(", condition, ") {\n",
            "  ", iftrue, "}\n",
            "else {\n",
            "  ", iffalse, "}"
          ]);
        }).call(this, vars["condition"], vars["iftrue"], vars["iffalse"]);
      }, this);
    when([
        function(sym) {
          return sym.value === "if";
        },
        match.var("condition", match.any),
        match.var("iftrue", match.any)
      ],
      function(vars) {
        return (function(condition, iftrue) {
          return sl.generated([
            "if(", condition, ") {\n",
            "  ", iftrue, "}"
          ]);
        }).call(this, vars["condition"], vars["iftrue"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error('if expects a condition followed by one (for "then") or two (for "else") body expressions');
        }).call(this, vars["any"]);
      }, this);
  }, this);
};
exports["while"] = function() {
  var args = Array.prototype.slice.call(arguments);
  return match(args, function(when) {
    when([
        function(sym) {
          return sym.value === "while";
        },
        match.var("condition", match.any)
      ],
      function(vars) {
        return (function(condition, body) {
          return sl.generated([
            "while(", this.x(condition), ") {\n",
            "    ", this.transpileExpressions(body, true), "}"
          ]);
        }).call(this, vars["condition"], vars["_rest"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error("a while loop expects a condition and loop body");
        }).call(this, vars["any"]);
      }, this);
  }, this)
};
exports["for"] = function() {
  var args = Array.prototype.slice.call(arguments);
  return match(args, function(when) {
    when([
        function(sym) {
          return sym.value === "for";
        },
        match.var("initializer", match.any),
        match.var("condition", match.any),
        match.var("finalizer", match.any)
      ],
      function(vars) {
        return (function(initializer, condition, finalizer, body) {
          return sl.generated([
            "for(", this.x(initializer), "; ", this.x(condition), "; ", this.x(finalizer), ") {\n",
            "    ", this.transpileExpressions(body, true), "}"
          ]);
        }).call(this, vars["initializer"], vars["condition"], vars["finalizer"], vars["_rest"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error("a for loop expects an initializer, condition, finalizer, and loop body");
        }).call(this, vars["any"]);
      }, this);
  }, this)
};
exports["dotimes"] = function() {
  var args = Array.prototype.slice.call(arguments);
  return match(args, function(when) {
    when([
        function(sym) {
          return sym.value === "dotimes";
        },
        match.var("spec", match.sllist)
      ],
      function(vars) {
        return (function(spec, body) {
          return sl.generated([
            "for(var ", spec[0], " = 0; ", spec[0], " < ", this.x(spec[1]), "; ", spec[0], "++) {\n",
            "    ", this.transpileExpressions(body, true), "}"
          ]);
        }).call(this, vars["spec"], vars["_rest"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error("dotimes expects (var name, iterations) followed by the loop body");
        }).call(this, vars["any"]);
      }, this);
  }, this)
};

exports["switch"] = function() {
  var args = Array.prototype.slice.call(arguments);
  return match(args, function(when) {
    when([
        function(sym) {
          return sym.value === "switch";
        },
        match.var("switchon", match.any)
      ],
      function(vars) {
        return (function(switchon, body) {
          return sl.generated([
            "switch(", this.x(switchon), ") {\n",
            "     ", body.map(function(caseform, pos) {
              return ((((pos % 2) === 0) ?
                sl.generated((((sl.valueOf(caseform) !== "default") ?
                  "case " :
                  "")), sl.valueOf(caseform), ":\n") :
                this.transpileExpression(caseform)));
            }.bind(this)), "}"
          ]);
        }).call(this, vars["switchon"], vars["_rest"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error("a switch statement expects a value and body");
        }).call(this, vars["any"]);
      }, this);
  }, this)
};

exports["break"] = function(forms) {
  return sl.generated("break");
};
},{"sugarlisp-core/sl-types":43,"sugarlisp-match/pattern-match":67}],31:[function(require,module,exports){
var utils = require('./utils');

// to compile broken macros or other keywords written in lispy,
// remove them below, do the compile, then add them back in.
module.exports = utils.merge(
            require('./gentab-boot-native'),
            require('./gentab-native'),
            require('./gentab-sugar'),
            require('./macros.js'));

},{"./gentab-boot-native":28,"./gentab-native":29,"./gentab-sugar":30,"./macros.js":36,"./utils":45}],32:[function(require,module,exports){
var utils = require('./utils');

module.exports = {
  name: "core",
  lextab: require('./lextab'),
  readtab: require('./readtab'),
  gentab: require('./gentab')
};

},{"./gentab":31,"./lextab":34,"./readtab":42,"./utils":45}],33:[function(require,module,exports){
/**
* An instance of "Lexer" creates and categories text tokens
* from the source.
*
* There are really two levels of functions, one that works at
* the chararter level, the other at the "word" i.e. "token"
* level.
*
* In both cases you can "peek" ahead before truly consuming
* the character or token (if you need to).  You can also
* tentatively mark a "rewind point", scan ahead, and get
* back to where you were if something goes wrong (useful
* for looking ahead to resolve ambiguity then trying again
* with an alternative interpretation).
*/
var utils = require('./utils'),
    debug = require('debug')('sugarlisp:core:lexer:debug'),
    trace = require('debug')('sugarlisp:core:lexer:trace');

/**
* A Lexer for the source text we are scanning
*
* note:  Lexer has been done as a javacript prototypal
*   class with instances that hold all state for a
*   given source file as it's being read and transpiled.
*   This is in contrast to the other sugarlisp modules
*   which are pretty much stateless collections of
*   functions.  The main exception to this is the
*   "transpiler-context" which is the non-source-file
*   related state of the transpiler (essentially a
*   "singleton").
*/
function Lexer(sourcetext, filename, options) {
  options = options || {};
  this.options = options || {};
  this.dialects = []; // the "stack" dialects are pushed/popped from
  if(filename) {
    this.filename = filename;
    this.fileext = utils.getFileExt(filename, "sugar");
  }
  this.set_source_text(sourcetext);
}

/**
* Change the source text being lexed on an already created lexer.
*
* note:  normally the source text is passed into the Lexer
*   constructor and you just make a new Lexer for each file
*   being transpiled.  This alternative is used e.g. by the repl
*   where to maintain the Lexer's list of active dialects across
*   the evaluation of multiple "sourcetext" lines being entered
*   by the repl user.
*
* @param sourcetext = the new source text to start lexing.
*/
Lexer.prototype.set_source_text = function(sourcetext, options) {

  if(options) {
// DELETE utils.mergeOnto(this.options, options);
    this.options = options;
  }

  this.text = sourcetext;

  // most of our "state" is no longer valid if/when the source text changes...
  this.position = 0;
  this.lineStartPosition = 0;
  this.line = 0;

  if(this.options.wrapOuterForm !== 'no') {
    // wrap in an extra () because the top level may have multiple
    // expressions and/or comments
    // first return just ensures column numbers aren't off by one on first line
    // second return important to make sure a line comment doesn't eat the closing ")"
    var wrapHeader = this.options.wrapHeader || "(\n";
    var wrapFooter = this.options.wrapFooter || "\n)\n";
    this.text =  wrapHeader + this.text + wrapFooter;
    // but the user doesn't see these added wrapper lines, so
    // adjust the line numbers (as seen e.g. in error messages):
    this.line -= (this.options.wrapHeadHeight ? this.options.wrapHeadHeight : 0);
  }

  debug("lexer reading:", this.text);

  this.col = 0;
  this.preludeStartPosition = 0;
  this.tokenStartPosition = 0;
  this.tokenLineStartPosition = 0;
  this.tokenStartLine = 0;
  this.tokenStartCol = 0;
  this.lastToken = undefined;
  this.lastChar = undefined;
  this.rewindPoints = [];
  this.included = [];
  this.cells = [];
  this.bindingCode = {before: {}, after: {}};
  this.tokenDump = [];
  delete this.peekedToken;
}

/**
* Fetch the next character from the source.
* Returns undefined at the end of the source text
* note:  all char fetches need to happen through this function
*        in order to keep the line and column numbers correct
*/
Lexer.prototype.next_char = function(len) {
  var text = "";
  len = len || 1;
  while(len > 0 && this.position < this.text.length) {
    // we remember the last character read for doing "look back"
    this.lastChar = this.text[this.position];
    //trace("char:", this.lastChar, "line:", this.line, "col:", this.col);
    text += this.lastChar;
    this.position++;
    this.col++;
    if(this.lastChar == '\n') {
      this.lineStartPosition = this.position;
      this.line++;
      trace('starting line:', this.line);
      this.col = 0;
    }
    len--;
  }
  return text;
}

/**
* Peek at the current character without actually fetching it.
* lookahead is the number of characters ahead to peek (default is 0)
* Returns undefined at the end of the source text
*/
Lexer.prototype.peek_char = function(lookahead) {
  var ch;
  lookahead = lookahead || 0;
  if((this.position + lookahead) < this.text.length) {
    ch = this.text[this.position + lookahead];
  }
  return ch;
}

/**
* Skip the chars expected token at the current position
* expected = a length, a string, or a regex
* return the text that was skipped
*
* note:  this is a *low level* skip function so use with
*  care, e.g. it does *not* skip whitespace following the
*  chars that you skip, which could break subsequent
*  code if it assumes otherwise.  for these reasons you
*  should typically use skip_text() not skip_char().
*/
Lexer.prototype.skip_char = function(expected) {
  var len;
  expected = expected || 1;
  if(typeof expected === 'number') {
    len = expected;

    trace("skipping", len, "characters");
  }
  else if(typeof expected === 'string') {
    len = expected.length;
    trace("expected token:", expected);
  }
  else if(expected instanceof RegExp) {
    var matched = this.on(expected);
    if(matched) {
      len = matched.length;
      trace("skipping", len, "characters");
    }
    else {
      this.error('Could not skip anything matching ' + expected, this);
    }
  }
  else {
    this.error("Lexer.skip passed something not an integer, string, or regex", this);
  }

  return this.next_char(len);  // skip this many characters
}

/**
* Mark the beginning of a token
*/
Lexer.prototype.mark_token_start = function() {
  trace("mark_token_start:  the next token will start at: " + this.position);
  this.tokenStartPosition = this.position;
  this.tokenLineStartPosition = this.lineStartPosition;
  this.tokenStartLine = this.line;
  this.tokenStartCol = this.col;
}

Lexer.prototype.get_current_prelude = function(consume) {
  var prelude = this.preludeStartPosition < this.tokenStartPosition ?
        this.text.substring(this.preludeStartPosition, this.tokenStartPosition) :
        undefined;

  if(prelude) {
    // remove leading/trailing spaces/tabs/semicolons/commas (but not newlines)
    prelude = prelude.replace(/^[\ \t\;,]+|[\ \t\;,]+$/g,'');

    // the special line comment //-- is *not* sent thru to the output
    prelude = prelude.replace(/\/\/--\s(?:.*)\n/g,'');
  }

  if(consume) {
    // they're getting the prelude to make use of it
    // and so want it "consumed" so it's not returned again:
    this.preludeStartPosition = this.tokenStartPosition;
  }

  return prelude;
}

/**
* Create and return a "token" i.e. some "categorized" source text.
* In addition our token object holds metadata about where in the
* source the token was found (important for generating source maps).
*
* Normally the token is the text between when mark_token_start was called
* and the current position, unless the "text" argument is passed (in which
* case the provided text will be used as the token text).
*
* The category is also optional - if not passed the default token
* category is "symbol".
*/
Lexer.prototype.create_token = function(text, category) {
  var category = category || "symbol";
  var text = text || this.text.substring(this.tokenStartPosition, this.position);

  function maketoken(text, category, filename, line, col, lineStartPosition, preludeText) {

    debug('creating "' + category + '" token: ' + text);
    trace('    (line: ' + line + ', col: ' + col +
                (preludeText ? ', prelude: ' + preludeText : '') + ')');

    var token = {
      text: text,
// FOR ME *ATOMS* HAVE VALUES - DELETE LATER: value: text,
      category: category,
      filename: filename,
      line: line,
      col: col,
      lineStartPosition: lineStartPosition,
      __istoken: true
    };
    if(preludeText) {
      token.prelude = preludeText;
    }
    return token;
  }

  var token = maketoken(text, category, this.filename,
                    this.tokenStartLine, this.tokenStartCol,
                    this.tokenLineStartPosition,
                    this.get_current_prelude());

  // prep for the next token in line
  // (e.g. skip trailing whitespace and/or comments)
  this.advance_to_next_token();

  // remember the last created_token for doing "look back"
  this.lastToken = token;

  // if they've asked for a dump of all the tokens
  if(this.options.to && this.options.to.indexOf('tokens') !== -1) {
    var lastDumped = this.tokenDump.length > 0 ?
                        this.tokenDump[this.tokenDump.length-1] :  undefined;
    if(!lastDumped ||
      (lastDumped.line !== token.line || lastDumped.col !== token.col))
    {
        this.tokenDump.push(token);
    }
  }

  return token;
}

/**
* A utility method to advance over comments and white space to
* prepare for reading the next token.
* note: this is normally called automatically when a token is
*   read but there may be occasions to call it explicitly.
*/
Lexer.prototype.advance_to_next_token = function() {
  trace("Setting prelude start pos for the *next* token to:", this.position);
  this.preludeStartPosition = this.position; // the filler starts here
  this.skip_filler();

  // now we're on a meaningful character...
  this.mark_token_start();
}

/**
* Mark a rewind point at the current position
* This is used at the beginning of some ambiguous grammar that requires lookahead
* We mark the rewind point, attempt to parse the first way,
* and if that fails we rewind and try and parse another way.
*
* Note: think of this as analogous to starting a transaction
*/
Lexer.prototype.mark_rewind_point = function() {

  var marker = {
    position: this.position,
    lineStartPosition: this.lineStartPosition,
    line: this.line,
    col: this.col,
    preludeStartPosition: this.preludeStartPosition,
    tokenStartPosition: this.tokenStartPosition,
    tokenLineStartPosition: this.tokenLineStartPosition,
    tokenStartLine: this.tokenStartLine,
    tokenStartCol: this.tokenStartCol,
    lastToken: this.lastToken,
    lastChar: this.lastChar
  };
  this.rewindPoints.push(marker);
}

/**
* "Commit" to the last rewind point (i.e. you will not be rewinding to it)
* This should be called once the potential ambiguity has been resolved.
* It's especially important with nesting so that the inner construct does
* not leave behind a rewind point that breaks outer one.
*
* Note: think of this as analogous to committing a transaction
*/
Lexer.prototype.commit_rewind_point = function() {
  this.rewindPoints.pop();
}

/**
* Move the current position back to where it was on the last
* call to mark_rewind_point
*
* Note: think of this as analogous to rolling back a transaction
*/
Lexer.prototype.rewind = function() {
  var marker = this.rewindPoints.pop();
  this.position = marker.position;
  this.lineStartPosition = marker.lineStartPosition;
  this.line = marker.line;
  this.col = marker.col;
  this.preludeStartPosition = marker.preludeStartPosition;
  this.tokenStartPosition = marker.tokenStartPosition;
  this.tokenStartLine = marker.tokenStartLine;
  this.tokenStartCol = marker.tokenStartCol;
  this.lastToken = marker.lastToken;
  this.lastChar = marker.lastChar;
  trace('rewound to line:', this.line, 'col:', this.col);
  trace("prelude pos is back to:", this.preludeStartPosition);
}

// Are we at the "end of source"?
Lexer.prototype.eos = function(lookahead) {
  lookahead = lookahead || 0;
  return ((this.position + lookahead) >= this.text.length);
}


/**
* is the source currently sitting on something expected?
*
* @param expected = a string, regex, character predicate function, or
* an array of these (i.e. is the source on any of what's in the array?).
* @param matchPartial = allow matching part of a token (by default
* we require the match end at a reasonable token boundary)
* @return the matched text if a match was found, otherwise false
*
* Note about regexes: Due to limitations in how regexes work when
* matching into the middle of our source text, you must use a global
* match by ending your regex "/g", and you should not start your
* regex with "^".
*/
// COULD I ELIMINATE THIS MATCHPARTIAL BUSINESS?  TRYING IT OUT...
Lexer.prototype.on = function(expected, matchPartial) {

  if(this.eos()) {
    return false;
  }

  var matched = false;

  if(Array.isArray(expected)) {
    for(var i=0; i < expected.length; i++) {
      var result = this.on(expected[i],matchPartial);
      if(result) {
        return result;
      }
    }
  }
  else if(expected instanceof RegExp) {
    // regex'ing text from other than the beginning is tricky...
    // the regex must be "global" i.e. end with "/g"
    // and seemingly it should *not* start with the ^
    // plus we must set lastIndex before *each* exec
    expected.lastIndex = this.position;
    matched = expected.exec(this.text);
    if(matched && matched.index === this.position) {
      // return the text that was matched
      if(matched.length > 1) {
        // they had a group
        matched = matched[1];
      }
      else {
        // no group
        matched = matched[0];
      }
    }
    else {
      matched = false;
    }
    // this has to be awful performance on a large file though:
    // (considering this will happen repeatedly)
    // maybe change it to a function and don't even do the regex if
    // the first digit isn't a number?
    // matched = expected.test(this.text.substring(this.position));
  }
  else if(typeof expected === 'string') {
    matched = true;
    for(var i=0;matched && i<expected.length;i++) {
      if(this.peek_char(i) !== expected.charAt(i)) {
        matched = false;
      }
    }
    if(matched) {
      matched = expected;
    }
  }
  else if(typeof expected === 'function') {
    matched = true;
    var text = "";
    for(var i=0;matched && i<expected.length;i++) {
      var ch = this.peek_char(i);
      if(!expected(ch)) {
        matched = false;
      }
      text += ch;
    }
    if(matched) {
      matched = text;
    }
  }
  else {
    this.error("Unexpected type passed for 'expected' in lexer.on: " + expected, this);
    matched = false;
  }

/*
TRYING WITHOUT THIS MATCHPARTIAL BUSINESS WOULD LIKE TO SIMPLIFY AND DELETE
  if(matched && !matchPartial) {
    // we matched, but are we on a token boundary?
    if(!this.onterminatingchar(matched.length-1) &&
         (!this.eos(matched.length) && !this.onterminatingchar(matched.length))) {
      matched = false;  // this had matched the start of some text with no terminator
    }

  }
*/
  return matched;
}

/**
* assert what the next token should be, otherwise throws
*/
Lexer.prototype.assert = function(expected, error) {

  // skip leading whitespace or comments...
  this.skip_filler();

  var matched = this.on(expected);
  if (!matched) {
    this.error('Expected "' + expected + '" but found "' +
      this.text.substring(this.position, this.position+5) + '...""' +
      (error ? " - " + error : ""), this);
  }
}

/**
* skip text from the current position till the specified end
* returned is the text that was skipped
* end = string or regex (see the "on" function for details)
* includeEnd = whether to include "end" in the returned token
* note if you "includeEnd" you also "skip" the end.
*/
Lexer.prototype.skip_text_till = function(end, includeEnd) {
  var text = "";
  this.mark_token_start();

  var matched;
  while(!this.eos()) {
    matched = this.on(end);
    if(!matched) {
      text += this.next_char();
    }
    else {
      break;
    }
  }

  if(includeEnd) {
    text += matched;
    this.skip_text(end);
  }

  return text;
}

/**
* get the remaining text from the current position till the end of source
*/
Lexer.prototype.rest_of_text = function() {
  var text = "";
  while(!this.eos()) {
    text += this.next_char();
  }
  return text;
}

/**
* scan a token from the current position till the specified end
* returned is a token for the text that was scanned
* end = string or regex (see the "on" function for details)
* includeEnd = whether to include "end" in the returned token
* note if you "includeEnd" you also "skip" the end.
*/
Lexer.prototype.till = function(end, includeEnd) {
  return this.create_token(this.skip_text_till(end, includeEnd));
}

/**
* push a dialect so it becomes the "current" one.
*/
Lexer.prototype.push_dialect = function(dialect) {
  // note: unshift below since we search the dialects starting from 0
  this.dialects.unshift(dialect);
  update_std_category_REs(this);
  delete this.peekedToken;
}

/**
* pop a dialect when the end of it's scope is reached
* @params dialectName (optional) the name of the dialect to remove,
*   otherwise the most recently pushed dialect is removed.
* @return the no longer active dialect
*/
Lexer.prototype.pop_dialect = function(dialectName) {
  var removedDialect;
  if(!dialectName || this.dialects[0].name === dialectName) {
    // note: unshift below since we search the dialects starting from 0
    removedDialect = this.dialects.shift();
  }
  else {
    var index = this.dialects.findIndex(function(dialect) {
      return dialect.name === dialectName;
    });
    if(index !== -1) {
      var removed = this.dialects.splice(index, 1);
      removedDialect = removed[0];
    }
  }

  update_std_category_REs(this);
  delete this.peekedToken;
  return removedDialect;
}

/**
* utility function grabs the 'whitespace', 'linecomment', and
* 'punctuation' regexes whenever a dialect is pushed/popped.
*
* note: this is really just a performance optimization since
*   these regexes are used so much.
*/
function update_std_category_REs(lexer) {
  lexer.whitespaceREs = regexes_for_category(lexer, 'whitespace');
  lexer.linecommentREs = regexes_for_category(lexer, 'linecomment');
  lexer.punctuationREs = regexes_for_category(lexer, 'punctuation');
}

/**
* utility function accumulates all the regular expressions
* for a given token category and returns them in an array
*/
function regexes_for_category(lexer, category) {
  var REs = [];
  var done = false;
  for(var i = 0; !done && i < lexer.dialects.length; i++) {
    var dialect = lexer.dialects[i];
    if(dialect.lextab) {
      var categoryentry = dialect.lextab.find(function(lextabentry) {
         return lextabentry.category == category;
      });
      if(categoryentry) {
        REs.push(categoryentry.match);

        // if they've set entry.replace=true this dialect's
        // entry replaces other dialects' entries:
        done = categoryentry.replace;
      }
    }
  }
  return REs;
}

/**
* is the source sitting on a char matching a specified token category?
*/
function oncharincategory(lexer, lookahead, categoryREs) {
  var c = lexer.peek_char(lookahead);
  return categoryREs.find(function(re) {
    // because we're matching a single char...
    re.lastIndex = 0; // make sure we start from the start
    return re.test(c);
  });
}

/**
* is the source sitting on punctuation?
* (where "punctuation" is a token category in the lextabs)
*/
Lexer.prototype.onpunctuation = function(lookahead) {
  return oncharincategory(this, lookahead, this.punctuationREs);
}

/**
* is the source sitting on white space?
* (where "whitespace" is a token category in the lextabs)
*/
Lexer.prototype.onwhitespace = function(lookahead) {
  return oncharincategory(this, lookahead, this.whitespaceREs);
}

/**
* skip whitespace at the current position (if any)
*/
Lexer.prototype.skip_whitespace = function() {
  while(!this.eos() && this.onwhitespace()) {
    this.next_char();
  }
}

/**
* scan whitespace and return it as a token
*/
Lexer.prototype.whitespace = function() {
  var white = "";
  this.mark_token_start();

  while(!this.eos() && this.onwhitespace()) {
    white += this.next_char();
  }
  return this.create_token(white);
}

/**
* skip a comment at the current position (if any)
*/
Lexer.prototype.skip_comment = function() {
  if(!this.eos()) {
    if(this.on(this.linecommentREs, true)) {
      this.skip_text_till('\n', true);
    }
    if(this.on('/*')) {
      this.skip_text_till('*/', true);
    }
  }
}

/**
* skip whitespace or comments at the current position
*/
Lexer.prototype.skip_filler = function() {
  var startingAt = this.position;

  this.skip_whitespace();
  this.skip_comment();

  // did we skip something?
  if(startingAt != this.position) {
    // is there *more* whitespace or *another* comment?
    this.skip_filler();
  }
}

/**
* Is the source sitting on one of our terminating chars?
* "terminating chars" meaning a char that matches the
* currently active dialect's lextab definition(s) for
* "whitespace" and/or "punctuation".
*
* Note: Common Lisp has a notion of "terminating" and
*   "nonterminating" characters but here I've attempted
*   to simplify a bit.
*/
Lexer.prototype.onterminatingchar = function(lookahead) {
  return this.onwhitespace(lookahead) || this.onpunctuation(lookahead);
}

/**
* Throw an error message and show it's location in the source file.
* locator = a form or token object (i.e. something with "line" and "col")
*/
Lexer.prototype.error = function(msg, locator) {
  throw new Error(this.message_src_loc(msg,locator));
}

/**
* Display a message and show it's location in the source file.
* locator = a form or token object (i.e. something with "line" and "col")
*/
Lexer.prototype.message_src_loc = function(msg, locator, options) {
  locator = locator || {};
  options = options || this.options || {};
  var filename = locator.filename || this.filename;
  var lineStartPosition = locator.lineStartPosition || this.lineStartPosition;
  var col = locator.col || this.col;
  var line = locator.line || this.line;

  // imitating node's error format here:
  var filemsg = (typeof options.file === 'undefined' || options.file) ?
                  (filename + ":" + line + "\n") : "";
  return filemsg +
          this.line_with_caret(lineStartPosition, col) +
          (msg && msg !== "" ? "\n" + msg : "");
}

/**
* Extract the line starting at the specified position, with
* a caret beneath the specified column location.
*/
Lexer.prototype.line_with_caret = function(lineStartPosition, column) {

  var srcline = "";
  var pos = lineStartPosition;
  var ch;
  while(pos < this.text.length && (ch = this.text.charAt(pos)) && ch !== '\n') {
    srcline += ch;
    pos++;
  }

  var caretline = " ".repeat(column) + "^";

  return "\n" + srcline + "\n" + caretline;
}

// Token based (whereas the above functions are character based)

/**
* Read the next token (and optionally specify a string or regex matching
* what you expect the token to be
*/
Lexer.prototype.next_token = function(expected, options) {
  var token;
  var error;
  var matchPartial;

  if(this.eos()) {
    return undefined;
  }

// THIS MATCHPARTIAL BUSINESS IS BEING REMOVED SO
// THIS SECTION SHOULD BE ABLE TO BE DELETED AS WELL!!??
  // this is a little tricky since we originally just
  // took an optional "error" string as second arg.
  // should clean this up later...
  if(options) {
    if(typeof options === 'object') {
      error = options.error;
      matchPartial = options.matchPartial;
    }
    else if(typeof options === 'string') {
      error = options;
    }
  }

  // skip leading whitespace or comments...
  this.skip_filler();
  this.mark_token_start();

  if(expected instanceof RegExp || typeof expected === 'string') {
    var matched = this.on(expected, matchPartial);
    if(matched) {
      // did we previously peek this token?
      var previouslyPeeked = this.getPeekedToken(matched);
      if(previouslyPeeked) {
        // here the lextab category for the peeked token is returned
        // (which wouldn't be true otherwise - note we haven't hit the lextab)
        return previouslyPeeked;
      }

      // otherwise we know exactly what to read
      // (though we don't know the category - defaults to "symbol")
      this.next_char(matched.length);  // advance the current position
      token = this.create_token(matched);
    }
    else {
      var foundToken = this.peek_word_token();
      var foundText = foundToken.text;
      var firstCh = foundText.charAt(0);
      if(firstCh !== '"' && firstCh !== "'") {
        foundText = '"' + foundText;
      }
      var lastCh = foundText.charAt(foundText.length-1);
      if(lastCh !== '"' && lastCh !== "'") {
        foundText = foundText + '"';
      }
      this.error('Expected "' + expected + '" but found ' + foundText + "..." +
                    (error ? " - " + error : ""), this);
    }
  }
  else {
    // they gave nothing to expect - the lextab is our guide
    // to what the next token should be
    token = next_lextab_token(this);
  }

  if(!this.peeking && token) {
    debug('next token is "' + token.text +
      '" (line: ' + token.line + ', col: ' + token.col + ')');
  }

  return token;
}

/**
* Get the next token under the current source position according
* to the lextab entries of the current dialects.
*/
function next_lextab_token(lexer) {

  var token;

  if(lexer.eos()) {
    return undefined;
  }

  // skip leading whitespace or comments...
  lexer.skip_filler();

  var previouslyPeeked = lexer.getPeekedToken();
  if(previouslyPeeked) {
    return previouslyPeeked;
  }

  lexer.mark_token_start();
  trace(lexer.message_src_loc("", lexer, {file:false}));

  // try and match all token categories except punctuation (and
  // the default handler).  Note that single character punctuation
  // should take a back seat to longer symbols e.g. '...' should
  // match before '.'.
  token = match_in_lextabs(lexer, {omit: ['punctuation','default']});
  if(!token) {
    // okay now try again matching punctuation characters.
    token = match_in_lextabs(lexer, {include: ['punctuation']});
  }
  if(!token) {
    // ok go ahead and try any default handler(s)
    token = match_in_lextabs(lexer, {include: ['default']});
  }

  // we expect they will use an explicit default lextab entry, but JIC:
  if(!token) {
    trace('their lextab has no default handler - defaulting to next word');
    token = lexer.next_word_token();
    if(token) {
      token.category = 'symbol';
    }
  }

  return token;
}

/**
* Helper function returns a token for the source text
* under the current position based on the nearest match
* in the active dialect's lextabs.
*
* You can optionally omit specified token categories from consideration
* ("options.omit"), or include only specified token categories for
* consideration ("options.include").
*
* You can also use the word "default" in options.omit/options.include
* to refer to default lextab entries indicated with "default: true"
*/
function match_in_lextabs(lexer, options) {
  options = options || {};
  var token;
  var replaced = {};

  // for each dialect's lextab...
  for(var d = 0; !token && d < lexer.dialects.length; d++) {
    var dialect = lexer.dialects[d];
    if(!dialect.lextab) {
      continue; // no lextab for the dialect so move on
    }

    // check each entry in order...
// NOTE I AM IGNORING THE 'PRIORITY' PROPERTY RIGHT NOW - MAYBE I CAN DELETE THEM!?
    debug('matching in ' + dialect.name + ' lextable');
    for(var l = 0; !token && l < dialect.lextab.length; l++) {
      var entry = dialect.lextab[l];

      // we don't match tokens against "replaced" categories
      if(!replaced[entry.category] &&
        // and if they've specified categories to include...
        (!options.include ||
          // only consider those
          (options.include.contains(entry.category) ||
          (options.include.contains("default") && entry.default))) &&
        // or if they've specified categories to omit...
        (!options.omit ||
          // make sure we skip over those
          ((!options.omit.contains(entry.category) &&
          !(options.omit.contains("default") && entry.default)))))
      {
        // most functions "match" (with a regex)
        // but they can also just "read" (with a function)
        if(typeof entry.read !== 'function') {
          // are we on a token matching this entry's pattern?
          //trace('matching ' + entry.category + ' pattern');
          var matchedText = lexer.on(entry.match);
          if(matchedText) {
            trace('matched ' + entry.category + ' pattern');
            // advance the current position
            lexer.next_char(matchedText.length);
            // create and return the token object (including line/col info)
            token = lexer.create_token(matchedText, entry.category);
          }
        }
        else {
          // note we use a "read" function for our default entry
          // used when nothing else matches.  Such entries can
          // still set a token category, but they should set
          // "default: true" (so we know to consider them last).
          trace('invoking ' + entry.category + ' read function');
          token = entry.read(lexer);
          if(token) {
            trace('read from ' + entry.category + ' read function');
            token.category = entry.category;
          }
        }
      }

      if(entry.replace) {
        // remember that this category has been replaced
        replaced[entry.category] = true;
      }
    }
  }

  return token;
}

Lexer.prototype.peek_token = function() {

  debug('peeking what the next token will be');

  // skip leading whitespace or comments...
  this.skip_filler();

  // peek ahead but don't change the source position
  this.mark_rewind_point();
  this.peeking = true; // just to make debugging easier to follow
  var token = this.next_token();
  this.peeking = false;
  this.savePeekedToken(token);

  trace('rewinding so peek doesnt leave side effects');
  this.rewind();

  debug('peeked "' + token.text +
    '" (line: ' + token.line + ', col: ' + token.col + ')');
  return token;
}

/**
* Because of how we use our readtabs, we very often
* peek_token and follow immediately with next_token(text)
* where text was the token of the previously peeked token.
* So here we memoize the peeked token and let next_token
* use it (both the text as well as the category) when
* the conditions allow...
*/
Lexer.prototype.savePeekedToken = function(token) {
  if(token) {
    this.peekedToken = token;
  }
}

/**
* Do we have a memoized token from having peeked?
* @param expectedText = the expected text for such a token (optional)
* @return the previously peeked token if there is one, otherwise undefined
*/
Lexer.prototype.getPeekedToken = function(expectedText) {
  var token;

  // if we have a previously peeked token...
  if(this.peekedToken &&
    // and it was from the position we're currently sitting on
    this.position === (this.peekedToken.lineStartPosition + this.peekedToken.col) &&
    // and it matches the expected text (if any)
    (!expectedText || expectedText === this.peekedToken.text))
  {
      // yup skip over the token and return it
      debug('reusing peeked token ' + this.peekedToken.text +
        ' (line: ' + this.peekedToken.line + ', col: ' + this.peekedToken.col + ')');

      this.next_char(this.peekedToken.text.length);
      this.advance_to_next_token(); // plus trailing whitespace
      token = this.peekedToken;
  }

  // try and catch a potential bug -
  // it seems suspicious if the expected text matches
  // and yet the positions don't...
  if(this.peekedToken &&
    (expectedText && expectedText === this.peekedToken.text &&
      expectedText !== '(' && expectedText !== ')') &&
    this.position !== (this.peekedToken.lineStartPosition + this.peekedToken.col))
  {
      // yup skip over the token and return it
      debug('saved peeked token matches expected "' + expectedText +
        '" but the position is off - current position = ' + this.position +
        ', saved token position = ' +
        (this.peekedToken.lineStartPosition + this.peekedToken.col));
  }

  return token;
}

/**
* return the next "word" i.e. the chars up to some terminating char
* otherwise undefined is returned if end of source
*/
Lexer.prototype.next_word_token = function() {
  var text = "";
  var token;

  this.skip_filler();
  this.mark_token_start();

  if(!this.eos()) {
    // we always read at least *one* char
    // i.e. a terminating char *is* returned when it's in first position
    // (otherwise we'd stop advancing thru the text!)
    var firstChar = this.next_char();
    text += firstChar;

    while(!this.eos() && !this.onterminatingchar()) {
      text += this.next_char();
    }

    // If we started with a quote and we're sitting on a quote
    if(["'", '"', "`"].indexOf(firstChar) !== -1 &&
      this.peek_char() === firstChar)
    {
        // grab the ending quote too:
        text += this.next_char();
    }

    token = this.create_token(text);
  }

  return token;
}

Lexer.prototype.peek_word_token = function() {

  // peek ahead but don't change the source position
  this.mark_rewind_point();
  var token = this.next_word_token();
  this.rewind();
  return token;
}

/**
* scan and return some delimited text
* lexer.options.includeDelimiters = whether to include the include the
* delimiters or not (defaults to omitting the delimiters)
*/
Lexer.prototype.next_delimited_token = function(start, end, options) {
  options = options || this.options || {};
  var text = "";
  end = end || start; // sometimes it's the same delimiter on both ends

  // get the prelude before we skip the delimiter
  var prelude = this.get_current_prelude();

  // skip the initial delimiter
  if(start) {
    this.skip_char(start);
  }

  // we default to *excluding* the delimiters from the token
  if(options.includeDelimiters) {
    trace("including delimiter in token returned by next_delimited_token:", start)
    text += start;
  }

  // we take over from the lexer
  // because we're no longer tokenizing delimited "words" from source code
  // (as the lexer is designed to do)
  this.mark_token_start();

  // scan looking for the ending
  while(!this.eos() && !this.on(end)) {
    ch = this.next_char();
    if (ch === "\n") {
      ch = "\\n"; // escape returns
    } else if (ch === "\\") {
      text += ch; // escape the next character
      ch = this.next_char();
    }
    text += ch;
  }

  // we should be at the end of the delimited text now
  if(this.eos() || !this.on(end)) {
    this.error("Missing end \"" + end + "\" for " + (end === '"' ? "string" : "delimited text"), this);
  }

  // we default to *excluding* the delimiters from the token
  if(!this.eos() && options.includeDelimiters) {
     text += end;
  }

  // the token ends here
  var token = this.create_token(text);

  // override the prelude omitting the opening delimiter
  token.prelude = prelude;

  // now we can skip the end delimiter
  this.skip_char(end);
  this.advance_to_next_token();

  return token;
}

Lexer.prototype.peek_delimited_token = function(start, end) {

  // peek ahead but don't change the source position
  this.mark_rewind_point();
  var token = this.next_delimited_token(start, end);
  this.rewind();
  return token;
}

/**
* Skip some expected text at the current position and return
* the text that was skipped.
* expected = a length, a string, or a regex
*/
Lexer.prototype.skip_text = function(expected) {

  // skip the chars matching what they expected
  var text = this.skip_char(expected);

  // they explicitly skipped this text - so it doesn't
  // belong in the "prelude" (meaning whitespace or
  // comments we pass through to the output)
//  this.preludeStartPosition = this.position;

  // then skip to the next token
  this.skip_filler();

  return text;
}

/**
* Skip some expected text at the current position and return
* the token representing that text in the source file.
* expected = a length, a string, or a regex
*/
Lexer.prototype.skip_token = function(expected) {
  this.mark_token_start();
  var text = this.skip_text(expected);
  return this.create_token(text);
}

/**
* A little function for grabbing the front of the source stream
* (assumed mostly for debugging)
*/
Lexer.prototype.snoop = function(length) {
  return this.text.substring(this.position, this.position + length);
}

// note: avoiding """ for " in the below (changing to '"' in that case)
function formatTokenText(token) {
  return (token.text === '"' ? "'\"'" : token.text) + ' ';
}
// see e.g. https://en.wikipedia.org/wiki/Lexical_analysis#Tokenization
function formatTokenSexp(token) {
  return '(' + token.category + ' ' +
    (token.text === '"' ? "'\"'" : '"' + token.text + '" ' + token.line + ':' + token.col) + ') ';
}

/**
* format the token dump into a string
*
* note: we put all the tokens from a line on a line to make this easier
* to match up with the original source when debugging problems.
*
* @tokens = an array of tokens
* @formatter = a function which takes a token and returns a string.
* @resultPrefix = optional string to prepend to the result
* @resultSuffix = optional string to append to the result
* @returns the formatted string.
*/
function formatTokenDump(tokens, formatter, resultPrefix, resultSuffix) {
  var tokensSexpStr = "";
  var currentLine = -999;
  tokens.forEach(function(token, index) {
    // skip the wrapping () it's annoying in the dump
    if(!((index === 0 && token.text === "(") ||
        (index === tokens.length-1 && token.text === ")")))
    {
      // add a return if this starts a different line:
      if(currentLine !== -999 && token.line !== currentLine) {
        tokensSexpStr += '\n';
      }
      tokensSexpStr += formatter(token);
      currentLine = token.line;
    }
  });

  return (resultPrefix ? resultPrefix : "") +
          tokensSexpStr +
          (resultSuffix ? resultSuffix : "");
}

module.exports = {
  Lexer: Lexer,
  formatTokenDump: formatTokenDump,
  formatTokenText: formatTokenText,
  formatTokenSexp: formatTokenSexp
};

},{"./utils":45,"debug":37}],34:[function(require,module,exports){
/**
* The lex table that drives the core lexer's creation of tokens.
*
* Each entry has a token category name, a "match", and a priority.
* NOTE I'M TRYING WITHOUT PRIORITY IT MIGHT GO AWAY
*
* The match is normally a regex, but can also be a string or a
* character predicate function (i.e. a function taking a character
* and returning true or false).  Or it can be an array of these,
* in which case the category is used if any in the array match.
*
* The priority is needed so that when dialects "extend" others they
* can precisely control how their symbols should be prioritized
* relative to that of the other dialect's symbols.
*
* Note whitespace and punctuation delimited words work pretty well
* (even in the "sugarscript" dialect), but where it doesn't, dialects
* can add additional rules for their special cases.
*
* Normally the rules of a dialects are merged with the rules of the
* dialects they extend, and sorted by priority (from high to low) so
* that higher priority rules will match before lower priority ones.
*
* If a dialect once to override (rather than add to) the symbols
* for a given category, they can include the optional property:
*
*   replace: true
*
* Though the lexer does not return tokens for whitespace or line
* comments, they are defined as token categories so a dialect can
* control what *it* considers whitespace or line comments.
*
* The final rule here has a priority of -1000, and it provides a
* "read" function that the other rules don't.  This is the function
* that will be called to read a token value by default (i.e. when no
* other rule matches).  If for some reason a dialect needed a
* different default, a similar rule could be provided in it's
* lex table (e.g. with priority -999 to override the one here).
*
* Lastly note quote characters are returned as standalone tokens
* rather than a "string" category for entire quoted strings.
* This is because when we read template strings with placeholders
* we process what's *inside* the quotes (i.e. strings are handled in
* the reader not here in the lexer).
*/

module.exports = [
  { category: 'float', match: /[-+]?\d+\.\d+/g },
  { category: 'integer', match: /[-+]?\d+/g },
  { category: 'whitespace', match: /[\s,]/ },
  { category: 'linecomment', match: /(\/\/|\;)/g },

  // "special" symbols that don't require whitespace or punctuation to end them.
  // e.g. "...rest" is tokenized "...", "rest"
  { category: 'symbol', match: /(\.\.\.)/g },

  // "punctuation" is special in that it terminates typical symbol tokens
  // (i.e. those read with "next_word_token")
  { category: 'punctuation', match: /(\(|\)|\'|\"|\`)/g },

  // default (when nothing else matches)
  // note lisp is beautifully simple - most symbol tokens are
  // simply "words" delimited by whitespace or "punctuation"
  {
    category: 'symbol',
    default: true,
    read: function(lexer) {
      return lexer.next_word_token();
    }
  }
];

},{}],35:[function(require,module,exports){
/**
 * SugarLisp Macro Expander
 */

var isArgsExpr = /^#args-if\b|^#args-shift\b|^#args-erase-head\b|^#args-rest\b|^#args-second\b|^#args-get\b/,
  sl = require('./sl-types'),
  reader = require('./reader'),
  utils = require('./utils'),
  debug = require('debug')('sugarlisp:core:macro-expander:debug'),
  trace = require('debug')('sugarlisp:core:macro-expander:trace');

exports.expand = function(forms, macrodef) {
  var macroname = forms[0].value,
      ctx = this, // the transpiler context
      replacements = {},
      isrestarg = {},
      argtemplate, expansioncode;

  debug('expanding macro:', macroname);
  if(macrodef && Array.isArray(macrodef) && macrodef[0] === "macro") {
    // the lispy (converted to json) macro definition was passed in
    if(!Array.isArray(macrodef[1])) {
      // a named macro:
      trace('was a *named* macro');
      argtemplate = sl.fromJSON(macrodef[2]);
      expansioncode = sl.fromJSON(macrodef[3]);
    }
    else {
      // an anonymous macro
      trace('was an *anonymous* macro');
      argtemplate = sl.fromJSON(macrodef[1]);
      expansioncode = sl.fromJSON(macrodef[2]);
    }
  }
  else {
    forms.error("invalid arguments to macro expander");
  }

  for (var i = 0; i < argtemplate.length; i++) {
    var argname = argtemplate[i].value;
    // support es6 style "...rest" and original lispy style "...rest"
    var restargs = /^\.\.\.(.+)|(.+)\.\.\.$/.exec(argname);
    if(restargs && restargs.length > 2) {
      argname = restargs[1] || restargs[2];
      var argval = forms.slice(i + 1);
      // within the macro simply "~rest" is preferred
      replacements[argname] = argval;
      isrestarg[argname] = true;
    } else {
      if (forms.length === i + 1) {
        // we are here if any macro arg is not set
        forms.error('invalid number of arguments to "' + macroname + '"');
      }

      replacements[argname] = forms[i + 1]
    }
  }

  var replaced = replaceCode(ctx, forms, expansioncode, replacements, isrestarg);
  trace("macro expanded to:", sl.pprintSEXP(replaced));

  // add an indication that we were a macro expansion
  // so the transpiler knows to handle expressions in what we return)
  replaced.__transpiletype = 'macro';

  return replaced;
}

function replaceCode(ctx, forms, expansioncode, replacements, isrestarg) {
  var macroname = sl.valueOf(forms[0]);
  var source = sl.lexerOf(forms);
  var list = sl.list();
  list.setOpening(source);
  // disable the setting of parents since we don't want the *macro*
  // to be treated as the parent:
  list.disable_parenting();

  var expr_name = expansioncode[0] ? expansioncode[0].value : ""
  if (isArgsExpr.test(expr_name)) {
    return replaceArgsExpr(ctx, forms, expansioncode, replacements, isrestarg);
  }

  for (var i = 0; i < expansioncode.length; i++) {
    var codeform = expansioncode[i];
    if(!Array.isArray(codeform)) {
      // this was not a marker - pass it thru
      list.push(codeform);
    }
    else if(sl.valueOf(codeform[0]) === '~') {
      // it's an unquote
      if(codeform.length === 2 && sl.typeOf(codeform[1]) === 'symbol') {
        // it's a simple marker
        var marker = sl.valueOf(codeform[1]);
        if(replacements[marker]) {
          var replaceWith = replacements[marker];
          if(isrestarg[marker] && Array.isArray(replaceWith)) {
            for (var j = 0; j < replaceWith.length; j++) {
              list.push(replaceWith[j]);
            }
          } else {
            list.push(replaceWith);
          }
        }
        else {
          forms.error('~' + marker + ' does not have a replacement value in macro ' +
                      (macroname ? '"' + macroname + '"': ""));
        }
      }
      else {
        // a more complex unquote expression
        replaceWith = evalUnquotedExpression(ctx, codeform[1], replacements, isrestarg);
        list.push(replaceWith);
      }
    }
    else if(sl.valueOf(codeform[0]) === '~@') {
      // it's a splicing unquote
      if(codeform.length === 2 && sl.typeOf(codeform[1]) === 'symbol') {
        // it's a simple marker (presumably holding an array)
        var marker = sl.valueOf(codeform[1]);
        if(replacements[marker]) {
          var replaceWith = replacements[marker];
          if(Array.isArray(replaceWith)) {
            for (var j = 0; j < replaceWith.length; j++) {
              list.push(replaceWith[j]);
            }
          } else {
            list.push(replaceWith);
          }
        }
        else {
          forms.error('~@' + marker + ' does not have a replacement value in macro ' +
                      (macroname ? '"' + macroname + '"': ""));
        }
      }
      else {
        // a more complex unquote expression
        replaceWith = evalUnquotedExpression(ctx, codeform[1], replacements, isrestarg);
        if(Array.isArray(replaceWith)) {
          for (var j = 0; j < replaceWith.length; j++) {
            list.push(replaceWith[j]);
          }
        } else {
          list.push(replaceWith);
        }
      }
    }
    else {
      // it was an array but not an unquote -
      // recursively replace the markers in sub-expressions:
      var replcode = replaceCode(ctx, forms, codeform, replacements, isrestarg);
      if (typeof replcode !== "undefined") {
        list.push(replcode);
      }

    }
/* DELETE
 else {

      // but the form ~(js "javascript code") can evaluate
      // javascript code at macro expansion time
      else if(sl.valueOf(codeform) === '~') {
        var escResult = escapeToJs(ctx, expansioncode[i+1], replacements);
        if(escResult) {
          list.push(escResult);
          i++; // skip past the ~(js...) form
        }
      }
      else {
        // this was not a marker - pass it thru
        list.push(codeform);
      }
    }
  */
  }
  return list;
}

// Handle homoiconic "#args" expressions in macro
function replaceArgsExpr(ctx, forms, expansioncode, replacements, isrestarg) {
  var macroname = forms[0].value;

  var expr_name = expansioncode[0] ? expansioncode[0].value : ""
  var marker = (expr_name !== "#args-get" ? expansioncode[1].value :
        expansioncode[2].value ? expansioncode[2].value : expansioncode[2][0].value);

  if(marker.charAt(0) === "~") {
    marker = marker.substring(1);
  }
  var isSplice = false;
  if(marker.charAt(0) === "@") {
    marker = marker.substring(1);
    isSplice = true;
  }
  var replarray = replacements[marker];
  if (expr_name === "#args-shift") {
    if (!Array.isArray(replarray)) {
      expansioncode[1].error('can\'t #args-shift: invalid argument type in "' + macroname + '"');
    }
    var argshift = replarray.shift()
    if (typeof argshift === "undefined") {
      expansioncode[1].error('can\'t #args-shift: invalid number of arguments to "' + macroname + '"');
    }
    return spliceArgsExprResult(isSplice, argshift);
  }
  if (expr_name === "#args-erase-head") {
    if (!Array.isArray(replarray)) {
      expansioncode[1].error('can\'t #args-rest: invalid argument type in "' + macroname + '"');
    }
    replacements[marker] = replarray.splice(1, replarray.length);
    return undefined;
  }
  if (expr_name === "#args-rest") {
    if (!Array.isArray(replarray)) {
      expansioncode[1].error('can\'t #args-rest: invalid argument type in "' + macroname + '"');
    }
    var argsrest = replarray.splice(1, replarray.length);
    if (typeof argsrest === "undefined") {
      expansioncode[1].error('can\'t #args-rest: invalid number of arguments to "' + macroname + '"');
    }
    return spliceArgsExprResult(isSplice, argsrest);
  }
  if (expr_name === "#args-second") {
    if (!Array.isArray(replarray)) {
      expansioncode[1].error('can\'t #args-second: invalid argument type in "' + macroname + '"');
    }
    // note splice here does *remove* the second element from the array (a side effect!)
    var argsecond = replarray.splice(1, 1)[0]
    if (typeof argsecond === "undefined") {
      expansioncode[1].error('no #args-second: invalid number of arguments to "' + macroname + '"');
    }
    return spliceArgsExprResult(isSplice, argsecond);
  }
  if (expr_name === "#args-get") {
    // we have an extra arg compared to the other #args expressions
    var whichArg = expansioncode[1].value;

    if (!Array.isArray(replarray)) {
      expansioncode[2].error('can\'t #args-get: invalid argument type in "' + macroname + '"');
    }
    if (whichArg < 0 || whichArg >= replarray.length) {
      expansioncode[2].error("can\'t #args-get: no argument at position " + whichArg +
                                ' in "' + macroname + '"');
    }
    var argVal = replarray[whichArg];

    if (typeof argVal === "undefined") {
      expansioncode[2].error("no #args-get: undefined argument at position " + whichArg +
                                ' in "' + macroname + '"');
    }
    return spliceArgsExprResult(isSplice, argVal);

  }
  if (expr_name === "#args-if") {
    var argsif;
    if (!Array.isArray(replarray)) {
      expansioncode[1].error('can\'t #args-if: invalid argument type in "' + macroname + '"');
    }
    if (replarray.length) {
      argsif = replaceCode(ctx, forms, expansioncode[2], replacements, isrestarg);
    } else if (expansioncode[3]) {
      argsif = replaceCode(ctx, forms, expansioncode[3], replacements, isrestarg);
    } else {
      return
    }
    return spliceArgsExprResult(isSplice, argsif);
  }
}

function spliceArgsExprResult(isSplice, result) {
  var ret = result;
  if(isSplice && sl.isList(result)) {
    ret = (result.length > 0 ? result[0] : "");
  }
  return ret;
}

/**
* Escape out and run some javascript at macro expansion time
* You embed the javascript in ~(js "<javascript code here>") in the macro body
* note:  this was added prior to the addition of template strings.  That and/or
*   the addition of quasiquote may make this feature unnecessary in the future.
*/
function evalUnquotedExpression(ctx, expr, replacements, isrestarg) {
  var result;

  // transpile the unquoted expression to javascript:
  var jscodestr = ctx.transpileExpression(expr);
  // but returns in the javascript code cause "Unexpected token ILLEGAL"
  jscodestr = jscodestr.toString().replace(/\\n/g, "");
  if(jscodestr.indexOf("return") === -1) {
    jscodestr = "return (" + jscodestr + ");";
  }
  // allow Function to work without error when CSP e.g. in Atom Preview
  // consider merging or replacing the below with one of the ctx.eval* calls
  if(ctx.options.transpile.csp) {
    require('loophole').allowUnsafeNewFunction(function() {
      replacements['sl'] = sl;
      var replacementNames = Object.keys(replacements);
      replacementValues = replacementNames.map(function(p) { return replacements[p]; });
      var f =  utils.anonymousFunction(replacementNames,
                  "'use strict'; " + jscodestr,
                  replacements);
      result = f.apply(ctx, replacementValues);
    });
  }
  else {
    replacements['sl'] = sl;
    var replacementNames = Object.keys(replacements);
    replacementValues = replacementNames.map(function(p) { return replacements[p]; });
    var f =  utils.anonymousFunction(replacementNames,
                "'use strict'; " + jscodestr,
                replacements);
    result = f.apply(ctx, replacementValues);
  }

  return result;
}

/**
* Escape out and run some javascript at macro expansion time
* You embed the javascript in ~(js "<javascript code here>") in the macro body
* note:  this was added prior to the addition of template strings.  That and/or
*   the addition of quasiquote may make this feature unnecessary in the future.
*/
function escapeToJs(ctx, jsescform, replacements) {
  var result;
  // note:  currently ~(js...) is the only thing supported with ~(...)
  if (Array.isArray(jsescform) && jsescform.length > 1 && jsescform[0].value === "js") {
    var jscodestr = sl.valueOfStr(jsescform[1]);
    // returns in the javascript code cause "Unexpected token ILLEGAL"
    jscodestr = jscodestr.replace(/\\n/g, "");

    // allow Function to work without error when CSP e.g. in Atom Preview
    // consider merging or replacing the below with one of the ctx.eval* calls
    if(ctx.options.transpile.csp) {
      require('loophole').allowUnsafeNewFunction(function() {
        var f = new Function("$args", "sl", "'use strict'; " + jscodestr);
        // note the evaluated javascript can see the replacements as normal variables
        result = f.call(replacements, replacements, sl);
      });
    }
    else {
      var f = new Function("$args", "sl", "'use strict'; " + jscodestr);
      // note the evaluated javascript can see the replacements as normal variables
      result = f.call(replacements, replacements, sl);
    }
  }
  return result;
}

},{"./reader":41,"./sl-types":43,"./utils":45,"debug":37,"loophole":40}],36:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
exports["undefined?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", ["typeof", ["~", "obj"]], "\"undefined\""]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["defined?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["!==", ["typeof", ["~", "obj"]], "\"undefined\""]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["null?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", ["~", "obj"], null]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["nil?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["||", ["undefined?", ["~", "obj"]],
      ["null?", ["~", "obj"]]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["true?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", true, ["~", "obj"]]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["false?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", false, ["~", "obj"]]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["boolean?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", ["typeof", ["~", "obj"]], "\"boolean\""]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["zero?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", 0, ["~", "obj"]]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["number?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", [
      [".", [".", [".", "Object", "prototype"], "toString"], "call"],
      ["~", "obj"]
    ], "\"[object Number]\""]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["even?"] = function(forms) {
  var macrodef = ["macro", ["num"],
    ["===", ["%", ["~", "num"], 2], 0]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["odd?"] = function(forms) {
  var macrodef = ["macro", ["num"],
    ["!==", ["%", ["~", "num"], 2], 0]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["string?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", [
      [".", [".", [".", "Object", "prototype"], "toString"], "call"],
      ["~", "obj"]
    ], "\"[object String]\""]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["array?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", [
      [".", [".", [".", "Object", "prototype"], "toString"], "call"],
      ["~", "obj"]
    ], "\"[object Array]\""]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["object?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", [
      [".", [".", [".", "Object", "prototype"], "toString"], "call"],
      ["~", "obj"]
    ], "\"[object Object]\""]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["function?"] = function(forms) {
  var macrodef = ["macro", ["obj"],
    ["===", [
      [".", [".", [".", "Object", "prototype"], "toString"], "call"],
      ["~", "obj"]
    ], "\"[object Function]\""]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["when"] = function(forms) {
  var macrodef = ["macro", ["cond", "...rest"],
    ["if?", ["~", "cond"],
      ["do", ["~", "rest"]]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["unless"] = function(forms) {
  var macrodef = ["macro", ["cond", "...rest"],
    ["when", [
        ["!", ["~", "cond"]]
      ],
      ["do", ["~", "rest"]]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["cond"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    ["if?", ["#args-shift", "rest"],
      ["#args-shift", "rest"],
      ["#args-if", "rest", ["cond", ["~", "rest"]]]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["case"] = function(forms) {
  var macrodef = ["macro", ["matchto", "...rest"],
    ["if?", ["===", ["~", "matchto"],
        ["#args-shift", "rest"]
      ],
      ["#args-shift", "rest"],
      ["#args-if", "rest", ["case", ["~", "matchto"],
        ["~", "rest"]
      ]]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["arrayInit"] = function(forms) {
  var macrodef = ["macro", ["len", "obj"],
    [
      ["function", ["l", "o"],
        ["var", "ret", ["array"]],
        ["js", "\"for(var i=0;i<l;i++) ret.push(o);\""], "ret"
      ],
      ["~", "len"],
      ["~", "obj"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["arrayInit2d"] = function(forms) {
  var macrodef = ["macro", ["i", "j", "obj"],
    [
      ["function", ["i", "j", "o"],
        ["var", "ret", ["array"]],
        ["js", "\"for(var n=0;n<i;n++){var inn=[];for(var m=0;m<j;m++) inn.push(o); ret.push(inn);}\""], "ret"
      ],
      ["~", "i"],
      ["~", "j"],
      ["~", "obj"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["->"] = function(forms) {
  var macrodef = ["macro", ["func", "form", "...rest"],
    ["#args-if", "rest", ["->", [
          [
            ["#args-shift", "form"],
            ["~", "func"]
          ],
          ["~@", "form"]
        ],
        ["~", "rest"]
      ],
      [
        [
          ["#args-shift", "form"],
          ["~", "func"]
        ],
        ["~@", "form"]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["alias"] = function(forms) {
  var macrodef = ["macro", ["from", "to"],
    ["macro", ["~", "from"],
      ["...rest"],
      [
        ["~", "to"],
        ["~", ["js", "\"sl.list('~','rest')\""]]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["each"] = function(forms) {
  var macrodef = ["macro", ["arr", "...rest"],
    [
      ["dotprop", "forEach", ["~", "arr"]],
      ["~", "rest"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["eachPair"] = function(forms) {
  var macrodef = ["macro", ["arr", "fn"],
    [
      ["function", ["___a", "___f"],
        ["js", "\"for(var ___n=0;___n<___a.length-1;___n+=2){ ___f(___a[___n], ___a[___n+1]); }\""]
      ],
      ["~", "arr"],
      ["~", "fn"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["reduce"] = function(forms) {
  var macrodef = ["macro", ["arr", "...rest"],
    [
      ["dotprop", "reduce", ["~", "arr"]],
      ["~", "rest"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["eachKey"] = function(forms) {
  var macrodef = ["macro", ["obj", "fn", "...rest"],
    [
      ["function", ["o", "f", "s"],
        ["var", "_k", [
          [".", "Object", "keys"], "o"
        ]],
        ["each", "_k", ["function", ["elem"],
          [
            [".", "f", "call"], "s", ["get", "elem", "o"], "elem", "o"
          ]
        ]]
      ],
      ["~", "obj"],
      ["~", "fn"],
      ["~", "rest"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["each2d"] = function(forms) {
  var macrodef = ["macro", ["arr", "fn"],
    ["each", ["~", "arr"],
      ["function", ["___elem", "___i", "___oa"],
        ["each", "___elem", ["function", ["___val", "___j", "___ia"],
          [
            ["~", "fn"], "___val", "___j", "___i", "___ia", "___oa"
          ]
        ]]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["map"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    [
      [".", [".", [".", "Array", "prototype"], "map"], "call"],
      ["~", "rest"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["filter"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    [
      [".", [".", [".", "Array", "prototype"], "filter"], "call"],
      ["~", "rest"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["some"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    [
      [".", [".", [".", "Array", "prototype"], "some"], "call"],
      ["~", "rest"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["every"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    [
      [".", [".", [".", "Array", "prototype"], "every"], "call"],
      ["~", "rest"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["loop"] = function(forms) {
  var macrodef = ["macro", ["args", "vals", "...rest"],
    [
      ["function", [],
        ["var", "recur", null, "___result", [
          ["!", "undefined"]
        ], "___nextArgs", null, "___f", ["function", ["~", "args"],
          ["~", "rest"]
        ]],
        ["set", "recur", ["function", [],
          ["set", "___nextArgs", "arguments"],
          ["if?", ["===", "___result", "undefined"], "undefined", ["do", ["set", "___result", "undefined"],
            ["js", "\"while(___result===undefined) ___result=___f.apply(this,___nextArgs);\""], "___result"
          ]]
        ]],
        ["recur", ["~@", "vals"]]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["list-of"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    ["doMonad", "arrayMonad", ["~", "rest"]]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["first"] = function(forms) {
  var macrodef = ["macro", ["arr"],
    ["get", 0, ["~", "arr"]]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["rest"] = function(forms) {
  var macrodef = ["macro", ["arr"],
    [
      [".", ["~", "arr"], "slice"], 1, [".", ["~", "arr"], "length"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["empty?"] = function(forms) {
  var macrodef = ["macro", ["arr"],
    ["===", 0, [".", ["~", "arr"], "length"]]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["sequence"] = function(forms) {
  var macrodef = ["macro", ["name", "args", "init", "...rest"],
    ["var", ["~", "name"],
      ["function", ["~", "args"],
        [
          ["function", [],
            ["#args-erase-head", "init"],
            ["~@", "init"],
            ["var", "next", null],
            ["var", "___curr", -1],
            ["var", "___actions", ["array", ["~@", "rest"]]],
            ["set", "next", ["function", [],
              ["var", "ne", ["get", ["++", "___curr"], "___actions"]],
              ["if?", "ne", "ne", ["throw", "\"Call to (next) beyond sequence.\""]]
            ]],
            [
              [
                ["next"]
              ]
            ]
          ]
        ]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["template"] = function(forms) {
  var macrodef = ["macro", ["name", "args", "...rest"],
    ["var", ["~", "name"],
      ["function", ["~", "args"],
        ["str", ["~", "rest"]]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["template-repeat"] = function(forms) {
  var macrodef = ["macro", ["arg", "...rest"],
    ["reduce", ["~", "arg"],
      ["function", ["___memo", "elem", "index"],
        ["+", "___memo", ["str", ["~", "rest"]]]
      ], "\"\""
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["template-repeat-key"] = function(forms) {
  var macrodef = ["macro", ["obj", "...rest"],
    ["do", ["var", "___ret", "\"\""],
      ["eachKey", ["~", "obj"],
        ["function", ["value", "key"],
          ["set", "___ret", ["+", "___ret", ["str", ["~", "rest"]]]]
        ]
      ], "___ret"
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["assert"] = function(forms) {
  var macrodef = ["macro", ["cond", "message"],
    ["if?", ["true?", ["~", "cond"]],
      ["+", "\"Passed - \"", ["~", "message"]],
      ["+", "\"Failed - \"", ["~", "message"]]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["testGroup"] = function(forms) {
  var macrodef = ["macro", ["name", "...rest"],
    ["var", ["~", "name"],
      ["function", [],
        ["array", ["~", "rest"]]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["testRunner"] = function(forms) {
  var macrodef = ["macro", ["groupname", "desc"],
    [
      ["function", ["groupname", "desc"],
        ["var", "start", ["new", "Date"], "tests", ["groupname"], "passed", 0, "failed", 0],
        ["each", "tests", ["function", ["elem"],
          ["if?", [
              [".", "elem", "match"],
              ["regex", "\"^Passed\""]
            ],
            ["++", "passed"],
            ["++", "failed"]
          ]
        ]],
        ["str", ["str", "\"\\n\"", "desc", "\"\\n\"", "start", "\"\\n\\n\""],
          ["template-repeat", "tests", "elem", "\"\\n\""], "\"\\nTotal tests \"", [".", "tests", "length"], "\"\\nPassed \"", "passed", "\"\\nFailed \"", "failed", "\"\\nDuration \"", ["-", ["new", "Date"], "start"], "\"ms\\n\""
        ]
      ],
      ["~", "groupname"],
      ["~", "desc"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["identityMonad"] = function(forms) {
  var macrodef = ["macro", [],
    ["object",
      "mBind", ["function", ["mv", "mf"],
        ["mf", "mv"]
      ],
      "mResult", ["function", ["v"], "v"]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["maybeMonad"] = function(forms) {
  var macrodef = ["macro", [],
    ["object",
      "mBind", ["function", ["mv", "mf"],
        ["if?", ["null?", "mv"], null, ["mf", "mv"]]
      ],
      "mResult", ["function", ["v"], "v"],
      "mZero", null
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["arrayMonad"] = function(forms) {
  var macrodef = ["macro", [],
    ["object",
      "mBind", ["function", ["mv", "mf"],
        ["reduce", ["map", "mv", "mf"],
          ["function", ["accum", "val"],
            [
              [".", "accum", "concat"], "val"
            ]
          ],
          ["array"]
        ]
      ],
      "mResult", ["function", ["v"],
        ["array", "v"]
      ],
      "mZero", ["array"],
      "mPlus", ["function", [],
        ["reduce", [
            [".", [".", [".", "Array", "prototype"], "slice"], "call"], "arguments"
          ],
          ["function", ["accum", "val"],
            [
              [".", "accum", "concat"], "val"
            ]
          ],
          ["array"]
        ]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["stateMonad"] = function(forms) {
  var macrodef = ["macro", [],
    ["object",
      "mBind", ["function", ["mv", "f"],
        ["function", ["s"],
          ["var", "l", ["mv", "s"], "v", ["get", 0, "l"], "ss", ["get", 1, "l"]],
          [
            ["f", "v"], "ss"
          ]
        ]
      ],
      "mResult", ["function", ["v"],
        ["function", ["s"],
          ["array", "v", "s"]
        ]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["continuationMonad"] = function(forms) {
  var macrodef = ["macro", [],
    ["object",
      "mBind", ["function", ["mv", "mf"],
        ["function", ["c"],
          ["mv", ["function", ["v"],
            [
              ["mf", "v"], "c"
            ]
          ]]
        ]
      ],
      "mResult", ["function", ["v"],
        ["function", ["c"],
          ["c", "v"]
        ]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["m-bind"] = function(forms) {
  var macrodef = ["macro", ["bindings", "expr"],
    ["mBind", ["#args-second", "bindings"],
      ["function", [
          ["#args-shift", "bindings"]
        ],
        ["#args-if", "bindings", ["m-bind", ["~", "bindings"],
            ["~", "expr"]
          ],
          [
            ["function", [],
              ["~", "expr"]
            ]
          ]
        ]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["withMonad"] = function(forms) {
  var macrodef = ["macro", ["monad", "...rest"],
    [
      ["function", ["___monad"],
        ["var", "mBind", [".", "___monad", "mBind"], "mResult", [".", "___monad", "mResult"], "mZero", [".", "___monad", "mZero"], "mPlus", [".", "___monad", "mPlus"]],
        ["~", "rest"]
      ],
      [
        ["~", "monad"]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["doMonad"] = function(forms) {
  var macrodef = ["macro", ["monad", "bindings", "expr"],
    ["withMonad", ["~", "monad"],
      ["var", "____mResult", ["function", ["___arg"],
        ["if?", ["&&", ["undefined?", "___arg"],
          ["!", ["undefined?", "mZero"]]
        ], "mZero", ["mResult", "___arg"]]
      ]],
      ["m-bind", ["~", "bindings"],
        ["____mResult", ["~", "expr"]]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};

exports["monad"] = function(forms) {
  var macrodef = ["macro", ["name", "obj"],
    ["var", ["~", "name"],
      ["function", [],
        ["~", "obj"]
      ]
    ]
  ];
  return this.macroexpand(forms, macrodef);
};
},{}],37:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"./debug":38,"dup":10}],38:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11,"ms":39}],39:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12}],40:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17,"vm":82}],41:[function(require,module,exports){
(function (__dirname){
/**
* The reader transforms a stream of tokens into a list of
* atoms and/or other lists (where we have atoms of various types:
* symbols, strings, numbers, booleans etc).
*/
var lex = require('./lexer'),
  sl = require('./sl-types'),
  utils = require('./utils'),
  ctx = require('./transpiler-context'),
  filetypes = require('./filetypes'),
  fs,
  path;

var include_dirs = [
  ".",
  "..",
  "../..",
  "../../..",
  "../../../..",
  "../../../../..",
  "../../../../../..",
  "node_modules",
  "../node_modules",
  "../../node_modules",
  __dirname + "/../node_modules",
  __dirname + "/../../node_modules",
  "includes",
  "../includes",
  "../../includes",
  __dirname + "/../includes",
  __dirname + "/../../includes"
];

var debug = require('debug')('sugarlisp:core:reader:debug'),
  trace = require('debug')('sugarlisp:core:reader:trace'),
  slinfo = require('debug')('sugarlisp:info');

// these node modules unavailable/unused in the browser
// note: reliably determining where we're running is complicated
//   because the Atom editor appears as both node *and* a browser!
try {
  fs = require('fs');
  path = require('path');
}
catch(e) {
  debug("failed requiring fs and path (assume we're running in a browser)");
}

/**
* Read the expressions in the provided source code string.
* @param codestr = the source code as a string e.g. from reading a source file.
* @param filenameOrLexer = the name of source file (or the Lexer for the file)
* @return the list (see sl-types) of the expressions in codestr.
*/
function read_from_source(codestr, filenameOrLexer, options) {

  var lexer;
  if(typeof filenameOrLexer === 'string') {
    lexer = initLexerFor(codestr, filenameOrLexer, options);
  }
  else {
    lexer = filenameOrLexer;
    lexer.set_source_text(codestr, options);
  }

  // read the forms
  var forms = read(lexer);

  // it's useful to sometimes look "up" the lexical nesting of forms...
  // to make this easy/reliable - walk the form tree setting "parent"
// I SHOULD TIME THIS?  IF IT'S EXPENSIVE - I'M NOT SURE I EVEN NEED IT ANYMORE?
  if(options.setParents !== 'no' && forms.setParents) {
    forms.setParents();
  }

  return forms;
}

/**
* Create and initialize a lexer for the given code from the given file.
* This is called implicitly when using "read_from_source" above.
* When using this for something like a repl, codestr might be undefined
* (since you'll be passing in code later a line at a time), and the
* filename might be fake, but it's extension allows default dialects
* to be included appropriate for the type of code you're planning to
* evaluate later on.
*
* @param codestr = the source code as a string e.g. from reading a source file.
* @param filenameOrLexer = the name of source file (or the Lexer for the file)
* @return a Lexer for the type of code indicated by the specified filename
*/
function initLexerFor(codestr, filenameOrLexer, options) {

  options = options || {};
  var lexer;
  var filename;
  if(filenameOrLexer instanceof lex.Lexer) {
     lexer = filenameOrLexer;
     filename = lexer.filename;
  }
  else {
    filename = filenameOrLexer;
  }

  // we've had trouble preserving comments -
  // for now, default to leaving them out:
  if (typeof options.includeComments === 'undefined') {
    options.includeComments = false;
  }

  if(!lexer) {
    // create a Lexer object per file that holds state
    // e.g. the current position when reading the file
    lexer = new lex.Lexer(codestr, filename, options);
  }
  else {
    // change the source text being lexed
    // (yet retaining already #used dialects the Lexer already has)
    lexer.set_source_text(codestr, options);
  }

  // All the modules can access the Lexer for the main source file
  // via the transpiler context...
  // note:  this is fairly simplistic right now - it's assuming
  //  just one source file of any importance (as opposed to
  //  transpiling multiple source files with multiple Lexers all
  //  at the same time).  So it's fine for now but might change...
// DELETE? if(!ctx.lexer) {
    ctx.lexer = lexer;
//  }

  var fileext = utils.getFileExt(filename, "slisp");

  // filetypes defines the dialect's this dialect builds upon:
  var baseDialectNames = filetypes[fileext];
  if(!baseDialectNames) {
    throw new Error(filename + " is not a recognized sugarlisp file type.");
  }

  // options.autouse=false can be used to disable the base dialects
  // (but this is not typical)
  if(typeof options.autouse === 'undefined' || options.autouse) {
    // then add the others
    for (var i=baseDialectNames.length; i--; ) {
      var dialectName = baseDialectNames[i];
      // we skip core here because we *always* include core (see below)
//DELETE      if(dialectName !== 'core') {
//DELETE prepend #use statements just as if they'd done it themselves
//DELETE codestr = '#use "' + dialectName +  '"\n' + codestr;
        // bootstrap the core dialect which everything must have
        use_dialect(dialectName, lexer);
//      }
    }
  }

  // bootstrap the core dialect which everything must have
//  use_dialect('core', lexer);

  return lexer;
}

/**
* Return the tokens seen using just the main (non-local) dialects
* for the file.
*
* note:  this is just meant for debugging and will not reflect tokens
*  gotten by local dialects added/removed during then normal read process.
*  Those *true* tokens can be gotten after a read when the lexer is passed
*  {to: "tokens"}.  This alternative is provided mainly because there are
*  times when the read may be blowing up in which case the alternative
*  approach will fail (in which case this option is better than nothing).
* (presumably for debugging but who knows...)
*/
function nonlocal_tokens(codestr, filename) {

  // get the base dialects for this file type:
  var fileext = utils.getFileExt(filename, "slisp");
  var baseDialectNames = filetypes[fileext];
  if(!baseDialectNames) {
    throw new Error(filename + " is not a recognized sugarlisp file type.");
  }

  // note we manually ensure the lexer has the appropriate bases dialects below
  // (this is normally taken care of by reader.read_from_source() but not here)
  var lexer = new lex.Lexer(codestr, filename, {wrapOuterForm: 'no'});

  // we always bootstrap the core dialect which everything must have
  use_dialect('core', lexer);

  // And then add the extension dialects the file depends on
  baseDialectNames.forEach(function(dialectName) {
    use_dialect(dialectName, lexer);
  })

  // Just read each token and return them all...
  var token;
  var tokens = [];
  while(token = lexer.next_token()) {
    // we can't handle local dialects but at least we
    // can handle file level #used ones:
    if(token.text === "#use") {
      tokens.push(token); // push the "#use"
      tokens.push(lexer.next_token()); // push the opening quote
      var dialectNameToken = lexer.next_token();
      tokens.push(dialectNameToken);
      use_dialect(dialectNameToken.text, lexer);
    }
    else {
      tokens.push(token);
    }
  }
  return tokens;
}


/**
* Use the specified dialect (e.g. "plus", "html", etc.) for the source
* file being read by the specified Lexer.
*
* A "use" can be at file level (i.e. the "#use" directive) or a a "local
* dialect" with a smaller scope (normally established via a readtab
* entry or a "(use...)" expression).  Local dialects should pass
* options.local=true, otherwise they're assumed to be "file level".
*
* Dialects are simply commonjs modules that export (at least one of):
*    lextab = table of token definitions using regular expressions
*    readtab = table for handling custom syntax
*    gentab = table of javascript code generation and macro functions
*
* Note our "readtab" plays a similar role but is structured a little differently
* than the Common Lisp "read table" (e.g. we are driven by whole tokens not just
* the first characters of them).
*
* A Lexer keeps an array of the dialect modules that have been "used"
* in that particular file (with the most recently used at the front).
*
* Returned is the loaded and prepped dialect object
*  (if the dialect requires code output at the point of "#use", the
*   code has been loaded and is available on the property ".onusecode")
*/
function use_dialect(dialectOrName, lexer, options) {

  options = options || {};
  var dialect;
  var dialectName;
  if(typeof dialectOrName === 'string') {
    dialectName = dialectOrName;
  }
  else {
    dialect = dialectOrName;
  }

  // we only allow one of each "file level" dialect...
  if(!options.local) {
    var alreadyLoadedDialect;
    if(dialectName) {
      // has this named dialect already been loaded?
      alreadyLoadedDialect = lexer.dialects.find(function(dialect) {
        return(dialect.name === dialectName);
      });
    }
    else {
      // has this dialect object already been loaded?
      alreadyLoadedDialect = (lexer.dialects.indexOf(dialect) !== -1);
    }

    // note they can optionally pass options.reload to *force* a reload
    if(alreadyLoadedDialect && !options.reload)
    {
      // just give back the previously loaded file-level dialect
      return alreadyLoadedDialect;
    }
  }

  // note there's some circular dependency issues if dialect-loader
  // is requried at the top of this reader.js file - but it doesn't happen here
  slinfo('using dialect:', dialectName ? dialectName :
                    (dialect && dialect.name ? dialect.name : "?"));
  if(!dialect) {
    dialect = options.preloaded || require('./dialect-loader').load(dialectName);
  }

  // Make sure any dialects this one extends are loaded first
  if(dialect.extends) {
    var extendsArr = (Array.isArray(dialect.extends) ?
                        dialect.extends : [dialect.extends]);
    extendsArr.forEach(function(baseDialectName) {
      use_dialect(baseDialectName, lexer, options);
    });
  }

  // make sure the dialect provides something to work with...
  if(!dialect.lextab && !dialect.readtab && !dialect.gentab ) {
    lexer.error("System error: malformed language extension \"" + dialectName + "\"");
  }

  // but otherwise the lex/read/generate tables are all optional:
  // (e.g. they might be using just one of the three)
  dialect.lextab = dialect.lextab || [];
  dialect.readtab = dialect.readtab || {};
  dialect.gentab = dialect.gentab || {};

  // cull a list of non-parenthesized infix/prefix/suffix "operators"...
  // later "read" transforms these based on precedence (i.e. TDOP "binding powers").
  // note: though here in core, this is mostly for the benefit of the
  //   the "sugared" dialects (e.g. plus and sugarscript).  Since core
  //   is a true lisp it doesn't define infix/prefix/suffix "operators".
  dialect.readtab.__operators = {};
  Object.keys(dialect.readtab).forEach(function(sym) {
    var readfn = dialect.readtab[sym];
    if(readfn.operator) {
      dialect.readtab.__operators[sym] = readfn;
    }
  });
  dialect.readtab.__operatorsymbols = Object.keys(dialect.readtab.__operators);

  // onuse is an optional file containing js to insert in the output
  // at the point of #use.
  // (this may support lispy code in the future but for now we require js)
  if(typeof options.onusecode === 'undefined' || options.onusecode) {
    if(dialect.onuse) {
      dialect.onusecode = read_include_file(dialect.onuse, lexer);
    }
  }

  // Make the new dialect visible within this file
  lexer.push_dialect(dialect);

  // invoke the (optional) dialect initialization functions:
  invokeInitDialectFunctions(dialect, lexer, options);

  // return the newly loaded and prepped dialect
  return dialect;
}

/**
* stop using a dialect
*
* Whereas "use_dialect" enters the scope of a dialect, "unuse_dialect"
* exits that scope.
*
* @params dialectName = the name of the dialect to stop using, or if
*  undefined the most recent dialect "used" in the one that's "unused"
* @params lexer = the lexer for the file being "unused" from.
*
* note:  if options.validate is true, the function will *only* "unuse"
*   the most recent dialect and it's name must match the name you've
*   given, otherwise an error is thrown.  This validates that you
*   haven't (accidentally) failed to "unuse" an inner dialect nested
*   inside another one, leaving the dialect stack in a different state
*   than you think.
*/
function unuse_dialect(dialectName, lexer, options) {
  options = options || {};
  if(dialectName && options.validate &&
    lexer.dialects[0].name !== dialectName)
  {
    lexer.error('Attempt to exit dialect "' + dialectName + '" while "' +
      lexer.dialects[0].name + '" was still active');
  }

  slinfo('removing dialect', dialectName ? ": " + dialectName : "");
  var removedDialect = lexer.pop_dialect(dialectName);
  if(!removedDialect) {
    lexer.error('The dialect ' + (dialectName ? '"' + dialectName + '"': '') +
        ' has never been used');
  }

}

/**
* Init dialect functions can optionally be used to initialize things
* at the time a dialect is "used".
*
* They can be placed on the dialect, it's lextab, readtab, or gentab,
* under a key named "__init" (note we use two underscores).
*
* They receive as arguments the lexer, the dialect, and the overall
* options (as passed to "read_from_source".
*/
function invokeInitDialectFunctions(dialect, lexer, options) {
  var initfnkey = "__init";
  if(dialect[initfnkey]) {
    dialect[initfnkey](lexer, dialect, options);
  }
  if(dialect.lextab[initfnkey]) {
    dialect.lextab[initfnkey](lexer, dialect, options);
  }
  if(dialect.readtab[initfnkey]) {
    dialect.readtab[initfnkey](lexer, dialect, options);
  }
  if(dialect.gentab[initfnkey]) {
    dialect.gentab[initfnkey](lexer, dialect, options);
  }
}

/**
* Read the form at the current position in the source.
* @param lexer = the lexer that is reading the source file.
* @param precedence = internal use only (don't pass)
* @return the list (see sl-types) for the expression that was read.
*/
function read(lexer, precedence) {

  precedence = precedence || 0;

  var form = read_via_closest_dialect(lexer);

  // are we a prefix unary operator?
  var leftForm = form;
  if(sl.isAtom(form)) {
    var opSpec = getOperatorSpecFor(form, lexer.dialects);
    if(opSpec && isEnabled(opSpec.prefix) && opSpec.prefix.transform &&
      // "nospace" prefix ops must butt up against their arg so
      // "--i" not "-- i" this way we can't confuse e.g. (- x y)
      //  with (-x y)
      (!opSpec.options || !opSpec.options.nospace || !lexer.onwhitespace(-1)))
    {
      leftForm = opSpec.prefix.transform(lexer, opSpec.prefix, form);
    }
  }

  // note flipped check below from < to > because our precedences
  // are currently as you see them here: http://www.scriptingmaster.com/javascript/operator-precedence.asp
  // not as you see them here:  http://journal.stuffwithstuff.com/2011/03/19/pratt-parsers-expression-parsing-made-easy/
  var token, opSpecObj;
  while(!lexer.eos() && (token = lexer.peek_token()) &&
    (opSpecObj = getOperatorSpecFor(token.text, lexer.dialects)) &&
    opSpecObj && (isEnabled(opSpecObj.infix) || isEnabled(opSpecObj.postfix)))
  {
    // make sure we don't misinterpet e.g. "(get ++i)" as "(get++ i)"
   if(opSpecObj.prefix && opSpecObj.postfix &&
     (lexer.onwhitespace(-1) && !lexer.onwhitespace(token.text.length)))
   {
     break; // let it be prefix next time round
   }

    // we don't distinguish infix from postfix below:
    var opSpec = opSpecObj.infix || opSpecObj.postfix;

    // we only keep scanning if we're hitting *higher* precedence
    if((opSpec.precedence || 0) <= precedence) {
      trace("read of infix/postfix stopping because op precedence " + (opSpec.precedence || 0) +
            " is <= the current precendence of " + precedence);
      break; // stop scanning
    }

    token = lexer.next_token();
    leftForm = opSpec.transform(lexer, opSpec, leftForm, sl.atom(token));
  }

  if(sl.isList(leftForm)) {
    // now that we've finished reading the list,
    // pop any local dialects whose scope has ended
    pop_local_dialects(lexer, leftForm);
  }

  return leftForm;
}

function isEnabled(opSpecObj) {
  return (opSpecObj &&
    ((!opSpecObj.options ||
      (typeof opSpecObj.options.enabled === 'undefined') ||
      opSpecObj.options.enabled)));
}

/**
* Read the form under the current position, using the closest scoped
* dialect that contains a matching entry in it's readtab.
*
* If such an entry returns "reader.retry", try the
* *next* closest dialect with a match (and so on) until one
* of the dialect's reads the form, otherwise it gets read by
* the closest "__default" handler.
*/

function read_via_closest_dialect(lexer, options) {
  trace(lexer.message_src_loc("", lexer, {file:false}));

  // options allow this function to be used when a readtab
  // handler needs to read by invoking a handler that it's
  // overridden, without knowing what dialect was overridden.
  // (see invoke_readfn_overridden_by below)
  options = options || {};
  // normally we start with the close dialect (0)
  var startingDialect = options.startingDialect || 0;

  // And normally we read the source text under the current position
  // unless they give us a token that's already been read)
  var token = options.token;
  if(!token) {
    // we *peek* when determining which readtab read function to call,
    // so the read functions can consume the *entire* form, including the
    // first token (which makes the design of the read functions easier
    // easier to understand and test in isolation).
    token = lexer.peek_token();
  }

  debug('reading expression starting "' + token.text + '"');
  var form = retry;
  var readfn;
  // try the dialects from beginning (inner scope) to end (outer scope)...
  for(var i = startingDialect; isretry(form) && i < lexer.dialects.length; i++) {
    var dialect = lexer.dialects[i];
    debug('looking for "' + token.text + '" in ' + dialect.name + ' readtab');
    readfn = findReadfn(dialect.readtab, token)
    if(readfn) {
      form = read_via_readfn(readfn, lexer, token.text);
      if(!form) {
        lexer.error('Invalid response from "' + token.text + '" readtab function in "' +
          dialect.name + '"');
      }
    }
  }

  // if we've tried all the dialects and either didn't find a match,
  // or found a match that returned "reader.retry"...
  if(isretry(form)) {
    // try all the dialects again, this time looking for "__default"
    // note: most likely this will get all the way to core's __default,
    //   but dialect's *can* override __default if they need to, and
    //   could e.g. "selectively" override it by returning reader.retry in
    //   cases where they want core's __default to handle it instead.
    for(var i = startingDialect; isretry(form) && i < lexer.dialects.length; i++) {
      var dialect = lexer.dialects[i];
      debug('looking for "__default" in ' + dialect.name + ' readtab');
      readfn = dialect.readtab !== undefined ? dialect.readtab['__default'] : undefined;
      if(readfn) {
        form = read_via_readfn(readfn, lexer, token.text);
        if(!form) {
          lexer.error('Invalid response for "' + token.text +
            '" returned by __default function in "' + dialect.name + '"');
        }
      }
    }
  }

  // this should never happen (because of __default) but JIC:
  if(!form || isretry(form)) {
    lexer.error('No dialect handled the text starting "' + lexer.snoop(10) + '...');
  }

  return form;
}

function invoke_readfn_overridden_by(overridingDialectName, readFnName, lexer) {

  // find the overriding dialect's index
  var overriding = -1;
  for(var i = 0; overriding === -1 && i < lexer.dialects.length; i++) {
    if(lexer.dialects[i].name === overridingDialectName) {
      overriding = i;
    }
  }

  return read_via_closest_dialect(lexer, {
            startingDialect: overriding+1,
            token : { text: readFnName, category: 'symbol' }
          });
}

function findReadfn(readtab, token) {
  var readfn;

  if(readtab) {
    // first try just the token text (this is typically what is used)
    readfn = readtab[token.text];

    // but ignore inherited properties e.g. "toString" etc.
    if(readfn && !readtab.hasOwnProperty(token.text)) {
      readfn = undefined;
    }

    if(!readfn && token.category) {
      // next try the token text qualified by it's token category
      readfn = readtab[token.text + ':' + token.category];
      if(!readfn && token.category) {
        // finally try the wildcarded token category (e.g. "*:float")
        readfn = readtab['*:' + token.category];
      }
    }
  }
  return readfn;
}

/**
* invoke a "read function" (found in the readtab) to read the
* form and return it.
*
* If a local dialect is assigned, activate the local dialect
* while reading the form, and assign the local dialect to the
* returned form for use by code generation.
*/
function read_via_readfn(readfn, lexer, text) {
  var form;

  // is there a name specified for a "local dialect"?
  if(readfn.dialect) {
    // use_dialect will load the dialect and push it on the dialect stack
    var localdialect = use_dialect(readfn.dialect, lexer, {local: true});

    // (now when the read function is called, any reading *it* does
    // will have the lextab and readtab of the local dialect available)
  }

  // call the read function...
  form = readfn(lexer, text);

  // if we got a form back and there is a local dialect...
  if(readfn.dialect) {
    if(form && !isretry(form)) {
      // save the local dialect's name on the form so that:
      // a. the local dialect can be popped when the end of
      //    the *containing* list is reached.
      // b. code generation can activate the same dialect
      //    when generating the form's code (without them
      //    having to assign the same dialect in the gentab
      //    that they've already assigned here in the readtab).
      form.dialect = readfn.dialect; // note this is the *name*
    }
    else {
      // didn't work out - so the local dialect doesn't apply:
      unuse_dialect(readfn.dialect, lexer);
    }
  }

  return form;
}

/*
GETTING INDIVIDUAL DIALECTS DONT MAKE AS MUCH SENSE SINCE WE'RE
NO LONGER MERGING DIALECTS.
THIS SHOULD BE ABLE TO BE DELETED
// get the current (closest scoped) dialect
// forForm is the form you're needing the dialect for (it is optional)
// if forForm is omitted you're getting the most recently created dialect (period)
// if there are no local dialects the most recent file level dialect is returned
function get_current_dialect(lexer, forForm, named) {
  return lexer.dialects[0];

  trace("get_current_dialect: " + (forForm ? "using form" : "using lexer.currentForm"));
  var currDialect = (forForm ?
                        get_closest_scoped_dialect_for(forForm, named) :
                        get_closest_scoped_dialect_for(lexer.currentForm, named));
  if(!currDialect && lexer.lastReadList) {
    trace("get_current_dialect checking lexer.lastReadList")
    currDialect = get_closest_scoped_dialect_for(lexer.lastReadList, named);
  }
  if(!currDialect) {
    trace("get_current_dialect checking lexer.dialects[0]")
    // no dialect on a form, use the file last #used file level dialect
    if(named) {
      currDialect = lexer.dialects.find(function(dialect) {
        return(dialect.name === named);
      })
      if(!currDialect) {
        console.log("warning: this file is missing a dialect named:", named)
      }
    }
    else {
      currDialect = lexer.dialects[0];
    }
  }
  return currDialect;
}
*/

/*
GETTING INDIVIDUAL DIALECTS DONT MAKE AS MUCH SENSE SINCE WE'RE
NO LONGER MERGING DIALECTS.
THIS SHOULD BE ABLE TO BE DELETED
// find the closest dialect from the startingForm
// you may optionally get a dialect with a specified name
function get_closest_scoped_dialect_for(startingForm, named) {
  if(startingForm) {
    if(startingForm.dialect &&
        (typeof named === "undefined" ||
          startingForm.dialect.name === named))
    {
      return startingForm.dialect;
    }
    else if(startingForm.parent) {
      return get_closest_scoped_dialect_for(startingForm.parent);
    }
  }
  return undefined;
}
*/

/*
OLD DELETE
// read by calling the read fn of the specified readtab entry
// THIS FUNCTION NOW SEEMS SILLY - IT REALLY SHOULD JUST BE A CALL TO THE
// READTAB FUNCTION SHOULDNT IT?  IE THIS FUNCTION COULD/SHOULD GO AWAY!
function read_via_readtab_entry(readfn, lexer, token) {
  // invoke the read function
  var form;
if(typeof entry === 'function') {
  form = readfn(lexer, token.text);
}
else {
console.log('IF YOU NEVER SEE THIS (AND YOU SHOULDNT) THEN CLEAN UP read_via_readtab_entry')
 form = readfn.read(lexer, readfn.match);
}
  // did we get a form back?
  // note: syntax fns return undefined to mean "I don't handle this"
  if(typeof form !== 'undefined') {
// SO *ALL* OF THIS STUFF FEELS MISPLACED!!!  IT SHOULD/COULD
// ALL BE DONE MORE APPROPRIATELY ELSEWHERE??!!!

    // as a convenience add toJSON where it's missing
    // (need to confirm - are we really making use of this anymore?)
    if(form && !form.toJSON) {
      form.toJSON = function() {
        return sl.toJSON(form);
      }
    }

    // KIND OF A HACK - AM STILL HOPING TO CLEAN UP AND ASSIGN THE SOURCE ON ALL FORMS PROPERLY
    if(!form.sourcer) {
      form.sourcer = lexer;
    }

    // why is this not in the read_delimited_list function?  can it go there?
    if(!isretry(form) && !isignorableform(form)) {
      lexer.lastReadFormInList = form;
    }
  }

  return form;
}
*/

/**
* read a list of atoms and/or other lists surrounded by delimiters (), [], etc.
* start is the expected opening delimiter as a string (or an existing start token
* if the opening delimiter has already been read)
* end is the expected end delimiter as a string
* initial is an optional array containing values prepopulated in the list
* separatorRE is an optional RE for "separators" to be skipped e.g. /,/
*/
function read_delimited_list(lexer, start, end, initial, separatorRE) {
    start = start || '(';
    end = end || ')';
    separatorRE = separatorRE || /,+/g;
    var startToken = (start && typeof start === 'string' ? lexer.next_token(start) : start);

    var list = (initial && sl.isList(initial) ? initial : sl.listFromArray(initial || []));
    list.setOpening(startToken);

    // starting a new list
    var token;
    while (!lexer.eos() && (token = lexer.peek_token()) && token && token.text !== end) {
      var nextform = read(lexer);

      // some "directives" don't return an actual form:
      if(!isignorableform(nextform)) {
        list.push(nextform);
      }

      // if they gave a separator (e.g. commas)
      if(separatorRE && lexer.on(separatorRE)) {
        lexer.skip_text(separatorRE); // just skip it
      }
    }
    if (!token || lexer.eos()) {
        lexer.error("Missing \"" + end + "\" ?  (expected \"" + end + "\", got EOF)", startToken);
    }
    var endToken = lexer.next_token(end); // skip the end token
    list.setClosing(endToken);

// IF THIS IS HERE IT HAS TO BE SMARTER - IT WAS ELIMINATING THE TOP LEVEL PAREN wrapper
// (AROUND THE WHOLE FILE) AND CAUSING PROBLEMS
// WOULDNT IT ALSO ELIMINATE A NO-ARG CALL?  SOMETHING LIKE (obj.run) ?
    // we can get extra parens when e.g. the user used parens around
    // an infix expression (which the reader reads as a nested list)
    // if(list.length === 1 && sl.isList(list[0])) {
    //   list = list[0];
    // }

/*
DELETE?
IT CANT BE USED ITS CHECKING FOR THE OLD EXTENSION 'lispy'!!!
DOES THIS ALSO MEAN THE __parenoptional STUFF CAN BE DELETED AS WELL??!!
    // in a lispy file they use parens whereas paren-free in a scripty file
    if(list.length === 1 && sl.isList(list[0])
      && list[0].__parenoptional && lexer.fileext === 'lispy')
    {
      // so here we have to *remove* what's otherwise *extra* parens:
      list = list[0];
    }
*/

// OLD DELETE    lexer.lastReadList = list;

    return list;
}

/**
* pop any local dialects enabled within the scope of the
* provided list.
*
* note:  here we intentionally look just one level down at
*   the *direct* children of the list, since "grandchildren"
*   have scopes of their own that are "popped" separately.
*/
function pop_local_dialects(lexer, list) {
  if(list && list.length > 0) {
    // we go in reverse order since the most recently
    // used (pushed) dialects will be at the end
    for(var i = list.length-1; i >= 0; i--) {
      if(list[i].dialect) {
        unuse_dialect(list[i].dialect, lexer);
      }
    }
  }
}

/**
* in javascript certain parens e.g. around conditions for "if" and
* "while" etc. are *required* as part of the grammar.  This function
* accommodates that by "reaching inside" those parens when they wouldn't
* (in a lispy world) have been needed, or otherwise returns the
* s-expression normally.  Consider e.g.:
*   if(true) {...}
* versus
*   if(x > y) {...}
* in the first case we simply return the atom true, whereas in the second
* case the list (> x y).
*/
function read_wrapped_delimited_list(lexer, start, end, initial, separatorRE) {

  var list = read_delimited_list(lexer, start, end, initial, separatorRE);
  if(list.length === 1) // DEL? &&
// DEL?    (sl.isList(list[0]) || sl.typeOf(list[0]) === 'boolean'))
  {
      // there's an extra nesting level than needed:
      list = list[0];
  }
  return list;
}

/**
* scan some delimited text and get it as a string atom
* lexer.options.omitDelimiters = whether to include the include the delimiters or not
*/
function read_delimited_text(lexer, start, end, options) {
  options = options || {includeDelimiters: true};
  var delimited = lexer.next_delimited_token(start, end, options);
  return sl.atom(delimited);
}

/*
OLD DELETE
function match_syntax_matcher(matcherOrArray, lexer) {
  var entry;
  var matched;
  var matcher = Array.isArray(matcherOrArray) ? matcherOrArray[0] : matcherOrArray;
  if(matcher.match instanceof RegExp || typeof matcher.match === 'string') {
    matched = lexer.on(matcher.match)
  }
  else if(matcher.match instanceof Function) {
    // note that lexer.on does accept a function but there it's expect to
    // check single characters whereas in the matcher it's expected to be
    // a full blown replacement for matching the front of the lexer.
    matched = matcher.match(lexer)
  }
  else {
    lexer.error("Unknown match type in readrules: " + matcher);
  }

  if(matched) {
    entry = {
      match: matched,
      read: matcher.read
    };
  }
  return entry;
}
*/

/**
* Read the content of the specified filename
* into the specified lexer file.  If the file has a .js
* extension a string of the js content is returned,
* otherwise the lispy forms are returned.
*
* Note that if a lexer is provided the dialects currently
* in use *are* applied when lexing/reading the included
* file (consistent with the view that an include treats
* it's contents the same as if it had been "inline").
*/
function read_include_file(filename, lexer) {

  var includedForms;
  var foundFile = false;

  var all_dirs = include_dirs.concat([path.dirname(lexer.filename)]);
  all_dirs = all_dirs.concat([path.dirname(filename)]);

  var fullPath;
  all_dirs.forEach(function(prefix) {
    if (foundFile) {
      return;
    }

    fullPath = prefix + '/' + filename;
    try {
      trace("looking for include file at " + fullPath);
      filename = fs.realpathSync(fullPath);
      foundFile = true;
    } catch (err) {
      // not found - intentional ignore
    }
  });

  if (!foundFile) {
    lexer.error('No such include file: ' + filename);
  }
  trace("the include file was found at " + fullPath);

  // assuming we've gotten the lexer we're reading into...
  if(lexer) {
    if(!lexer.included) {
      lexer.included = [];
    }

    // prevent reading the same include file multiple times
    // (e.g. prevent circular includes)
    if (lexer.included.indexOf(filename) === -1) {
      lexer.included.push(filename);
      var code = fs.readFileSync(filename, "utf-8");
      if(path.extname(filename) === '.js') {
        // this was a javascript file just return the code as a string
        return code;
      }
      // this was a sugar file - transform the code to lispy forms
      includedForms = read_from_source(code, filename, {wrapOuterForm: true, includeFile: true});
    }
  }
  else {
    // no lexer given - read it anyway:
    var code = fs.readFileSync(filename)
    includedForms = read_from_source(code, filename, {wrapOuterForm: true});
  }

  return includedForms;
}

/**
* Get the syntax's keys sorted by priority,
* where "priority" is an optional number they can assign
* the syntax entries, otherwise the length of its key
*/
/*
OLD DELETE
function get_prioritized_matchkeys(syntax) {

  // Provide an easy way to search these from longest to shortest
  var keys = Object.keys(syntax);

  keys = keys.filter(function (value) {
    return(value !== "__default" && value !== "__readdefaulttoken");
  });

  keys.sort(function(a, b) {
    var apri = typeof syntax[a].priority !== 'undefined' ? syntax[a].priority : a.length;
    var bpri = typeof syntax[b].priority !== 'undefined' ? syntax[b].priority : b.length;
    return bpri - apri;
  });

  return keys;
}
*/

// generate a random variable name compatible with languages like javascript
function gen_var_name(seedName) {
  var firstPart = sl.valueOf(seedName).match(/^[\$\_a-zA-Z][\$\_a-zA-Z0-9]+/);
  if(!firstPart) {
    firstPart = "var";
  }

  var numPart = Math.floor((Math.random() * 1000000) + 1);

  return "__" + firstPart + "_" + numPart;
}

/**
* Register a dynamic transform so that we know (unlike most
* transforms) that the specification of transform function,
* precedence level, etc. will be gotten from the form returned
* by the specified syntax handler function - dynamically at
* read time.  optype is one of 'unary' or 'binary'.
*/
function registerDynamicTransform(optype, readfn) {
  readfn.operator = { type: optype, style: 'dynamic'}
}

/**
* Merge one dialect's lookup table (the first argument) with properties
* from the other arguments.
*
* If the first argument has a property that matches a later argument's
* property, the property value turned into an array of the property
* values.
*
* (if it helps, you can think of the array as anologous to a prototype chain,
* and the way the lookup tables merge as a kind of multiple inheritance)
*/
/*
OLD DELETE
function mergeLookupTables() {

  // there are certain keys we don't want to merge
  // (there's places in the code that will blow of up if they are)
  var exclude = [
    "__default",
    "__readdefaulttoken",
    "__matchkeys",
    "__terminatingchars",
    "__add_terminatingchars",
    "__nonterminatingchars",
    "__operators",
    "__operatorsymbols"
  ];

  if(!arguments.length || arguments.length === 0)
    return {};
  var out = arguments[0];
  for(var i=1; i<arguments.length; i++) {
    for(var key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        if(typeof out[key] === 'undefined') {
          out[key] = arguments[i][key];
        }
        else {
          // the out table is overriding another dialect's symbol
          if(exclude.indexOf(key) === -1 && out[key] !== arguments[i][key]) {
            // for the normal keys, we don't just replace them we
            // keep a list of the them all since overrides can
            // (optionally) delegate to previous entries
            var handlerList = [];
            copyToArray(out[key], handlerList);
            copyToArray(arguments[i][key], handlerList);
            out[key] = handlerList;
          }
        }
      }
    }
  }
  return out;
}
*/

// copy from (which might be an array or not) into array toArray
/*
OLD DELETE
function copyToArray(from, toArray) {
  if(Array.isArray(from)) {
    from.forEach(function(val) {
      if(!isAtEnd(val, toArray)) {
        toArray.push(val);
      }
    })
  }
  else {
    if(!isAtEnd(from, toArray)) {
      toArray.push(from);
    }
  }
}

function isAtEnd(val, arr) {
  var atEnd = false;
  if(arr && arr.length > 0) {
    atEnd = (val === arr[arr.length-1]);
  }
  return atEnd;
}
*/

/**
* Terminating characters mark the end of tokens
*
* We infer terminating characters from any of your syntax's
* keys that are single character punctuation symbols (to be more
* precise we look at the *first* char of each of your keys and
* take any that are not alphanumeric).
*
* If this proves incorrect, you can adjust them by entering the
* chararacters in these additional syntax entries:
*   exports.__add_terminatingchars = "...";
*
* Or if you prefer to *completely* specify your terminating
* characters you can specify this alternative syntax entry:
*   exports.__terminatingchars = "...";
*/
/*
OLD DELETE
function findTerminatingChars(syntax, initialChars) {
  var terminatingChars = initialChars || "";
  // did they fully specify their own terminating characters?
  if(syntax.__terminatingchars) {
    // no inference
    for(var i=0;i < syntax.__terminatingchars.length;i++) {
      ch = syntax.__terminatingchars.charAt(i);
      if(terminatingChars.indexOf(ch) === -1) {
        terminatingChars += ch;
      }
    }
  }
  else {
    // attempt to infer a reasonable set of terminating chars
    syntax.__matchkeys.forEach(function(key) {
      if((key !== "__default" && key !== "__readdefaulttoken") &&
        typeof syntax[key] === 'function')
      {
        var firstChar = key.charAt(0);
        if(!/[a-zA-Z0-9]/.test(firstChar)) {
          if(terminatingChars.indexOf(firstChar) === -1) {
            terminatingChars += firstChar;
          }
        }
      }
    });

    // they can also adjust the "inference" via:
    if(syntax.__add_terminatingchars) {
      for(var i=0;i < syntax.__add_terminatingchars.length;i++) {
        ch = syntax.__add_terminatingchars.charAt(i);
        if(terminatingChars.indexOf(ch) === -1) {
          terminatingChars += ch;
        }
      }
    }
  }

  debug("Terminating chars:", terminatingChars);
  return terminatingChars;
}
*/

/**
* When found in the middle of a token, nonterminating
* characters do *not* mark the end of tokens
*
* Examples are things like the question mark in "undefined?"
* and the ">" in the method chaining macro "->".
*
* Note that in general sugarlisp takes a different approach to
* tokenizing than classic lisp in that you enter your terminal
* symbols (keywords etc) in the syntax table and sugarlisp endeavors
* to match the longest one of those it can.  However the grammar
* is "open-ended" in the sense that some symbols are not represented
* (the names of functions or macros, javascript symbols e.g.
* "console" that simply pass through etc).  This is where the
* terminating and non-terminating concepts come into play.
*
* To clarify, for tokens not entered as syntax keys, a "?" or
* ">" will be included in the middle of a token (if they've been
* marked non-terminating) yet they'll be returned by themselves
* when encountered at the start of a token (when they are
* marked as terminating).
*
* Unlike terminating characters, sugarlisp makes no attempt
* to "infer" non-terminating characters.
*
* However nonterminating characters specified in lower dialects
* do merge into higher "mixin" dialects (this is also true for
* terminating characters).
*
* To specify nonterminating characters for your dialect you add
* them in the syntax entry:
*   exports.__nonterminatingchars = "...";
*/
/*
OLD DELETE
function findNonterminatingChars(syntax, initialChars) {
  var nonterminatingChars = initialChars || "";
  // did they specify nonterminating characters?
  if(syntax.__nonterminatingchars) {
    for(var i=0;i < syntax.__nonterminatingchars.length;i++) {
      ch = syntax.__nonterminatingchars.charAt(i);
      if(nonterminatingChars.indexOf(ch) === -1) {
        nonterminatingChars += ch;
      }
    }
  }

  debug("Nonterminating chars:", nonterminatingChars);
  return nonterminatingChars;
}
*/

/**
* You mark a symbol with "reader.unexpected" in your readtab
* if the symbol is read internally by some read function
* without using a readtab entry at all.
*/
function unexpected(lexer) {
  lexer.error("unexpected \"" + lexer.peek_char() + "\" encountered (is something missing before this?)");
}

/**
* A symbol
* Use reader.symbol in their readtab to ensure the lexer
* scans the specified token text correctly as a symbol.
*/
function symbol(lexer, text) {
  var token = lexer.next_token(text);
  return sl.atom(text, {token: token});
}

/**
* A symbol that's aliased to another.
* e.g. We allow them do assignment like either "(set var value)" or
* "(= var value)" by treating "=" as an alias for "set".
* To allow that the symbol table has:
*     exports["="] = reader.symbolAlias("set").
*/
function symbolAlias(aliasFor) {
  return function(lexer, text) {
    var token = lexer.next_token(text);
    return sl.atom(aliasFor, {token: token});
  }
}

/**
* get the "operator spec" for the form (if any).
* this is an object of the form e.g.
*   {
*     type: infix,
*     read: reader.infix2prefix,
*     precedence: 15,
*     options: {altprefix: 'arrowfn'}
*   }
*
* @parm atomOrStr an atom or a symbol string
* @param dialects the "stack" of current dialects
*/
function getOperatorSpecFor(atomOrStr, dialects) {

  var opSpec;

  var atom = typeof atomOrStr !== 'string' ? atomOrStr : undefined;
  var str = typeof atomOrStr === 'string' ? atomOrStr : undefined;
  var sym = str || sl.valueOf(atom);

  // make sure and check the atom first - it takes precedence
  if(atom) {
    // was this form "dynamically" marked as needing to be transformed?
    opSpec = atom.operator;
  }

  if(!opSpec) {
    // no - was it "statically" marked i.e. via it's symbol in a readtab?
    dialects.find(function(dialect) {
      if(dialect.readtab.__operatorsymbols.indexOf(sym) !== -1) {
        var readfn = (!Array.isArray(dialect.readtab.__operators[sym]) ?
                          dialect.readtab.__operators[sym] :
                          dialect.readtab.__operators[sym][0]);
        opSpec = readfn.operator;
        return true;
      }
      return false;
    });
  }

  if(opSpec &&
    !opSpec.infix && !opSpec.prefix && !opSpec.postfix)
  {
    if(opSpec.type) {
      var reformedOpSpec = {};
      reformedOpSpec[opSpec.type] = opSpec;
      opSpec = reformedOpSpec;
    }
    else {
      sl.lexerOf(atom).error("Malformed operator precedence specification for " + sym);
    }
  }

  return opSpec;
}

/**
* In sugarlisp an "operator" refers to a symbol that can be used
* infix/prefix/postfix without parentheses.
*
* By configuring your readtab correctly using reader.x(),
* reader.read() will  rearrange the expressions and return a
* traditional (lispy prefix) s-expression list.
*
* There are two ways to call reader.operator() - one way if the
* operator only supports *one* of infix or prefix or postfix, e.g.
*
* reader.operator('postfix', 'unary', tradfncalltosexpr, 17.5, {altprefix: "fncall("})
*
* The other way takes a single object argument when an operator
* can be used in more than one way, e.g. both prefix and postfix:
*
* reader.operator({
*   prefix: reader.operator('prefix', 'unary', readparenthesizedlist, 1),
*   postfix: reader.operator('postfix', 'binary', tradfncalltosexpr, 17.5)
* });
*
* As you can see the properties of the object are simply reader.operator
* calls in the "first way" described above.
*
* @param optypeOrObj = 'infix', 'prefix', or 'postfix', else an object as above
* @param argtype = 'unary' (single argument) or 'binary' (two argument)
* @param transformfn = function as described below
* @param precedence = "priority" or "binding power" (higher numbers bind more tightly)
* @param opts = options to pass to the transform function
*
* transformfn is the function which reads the necessary forms and
* rearranges them into a lispy (prefix) list.  For infix a transformfn
* expects args like e.g.:
*
*    function infix2prefix(lexer, opSpec, leftForm, operatorForm)
*
* Where the job of the transformfn is to read any rightForm(s) and
* return a lispy list i.e. sl.list(operatorForm, leftForm, rightForm)
*
* A similar example for prefix is:
*
*    function prefixexpr(lexer, opSpec, operatorForm) {
*
* Here the job of the transformfn is to read the rightForm(s)
* and likewise return a lispy list e.g. sl.list(operatorForm, rightForm)
*
* And finally for postfix an example is:
*
*    function postfixexpr(lexer, opSpec, leftForm, operatorForm)
*
* For a truly postfix operator in this case you might not need to read
* any rightForm(s), but you will likely need to reverse the order to
* produce a lispy (prefix) expression i.e. sl.list(operatorForm, leftForm)
*
* Precedence levels set the order these operations get transformed,
* where lower levels are performed first (see
*   e.g. https://www.wikiwand.com/en/Order_of_operations).
*
* The opts are optional - if given they allow you to specify
* options at "setup time" that will be passed into the transformfn
* later.
*/
function operator(optypeOrObj, argtype, transformfn, precedence, opts) {
  opts = opts || {};
  // the read function for all the operators just reads their symbol:
  var readfn = function(lexer, text) {
    // operators e.g. "--" need to return from e.g. "--x" even
    // though the "-" has been defined as a non-terminating
    // character (maybe this can be simplified!!??)
    var token = lexer.next_token(text, {matchPartial: true});
    return sl.atom(text, {token: token});
  };
  if(typeof optypeOrObj === 'string') {
    readfn.operator = {
      type: optypeOrObj,
      argtype: argtype,
      transform: transformfn,
      precedence: precedence,
      assoc: opts.assoc,
      options: opts
    };
  }
  else if(typeof optypeOrObj === 'object') {
    // this is an operator that is e.g. prefix and postfix,
    var opSpecObj = optypeOrObj;
    readfn.operator = {
      infix: (optypeOrObj.infix && optypeOrObj.infix.operator ?
                  optypeOrObj.infix.operator :
                  optypeOrObj.infix),
      prefix: (optypeOrObj.prefix && optypeOrObj.prefix.operator ?
                  optypeOrObj.prefix.operator :
                  optypeOrObj.prefix),
      postfix: (optypeOrObj.postfix && optypeOrObj.postfix.operator ?
                  optypeOrObj.postfix.operator :
                  optypeOrObj.postfix)
    };
  }
  return readfn;
}


/**
* infix operator
*
* in sugarlisp an infix operator is an unparenthesized expression
* of the form e.g. "x op y" which gets translated as if it
* had been been "(op x y)"
*
* The opts.altprefix is optional (and normally not used), but it
* allows the prefix form to use a different name than the infix form. e.g.
* in dialect-x we translate infix "=" e.g.:
*   x = 5;
* into prefix "set":
*   (set x 5)
*/
function infix(precedence, opts) {
  return operator('infix', 'binary', infix2prefix, precedence, opts);
}

function infix2prefix(lexer, opSpec, leftForm, opForm) {
  // To handle right-associative operators like "^", we allow a slightly
  // lower precedence when parsing the right-hand side. This will let an
  // operator with the same precedence appear on the right, which will then
  // take *this* operator's result as its left-hand argument.
  var rightForm = read(lexer,
      opSpec.precedence - (opSpec.assoc === "right" ? 1 : 0));

  if(opSpec.options.altprefix) {
    opForm = utils.clone(opForm);
    opForm.value = opSpec.options.altprefix;
    opForm.text = opSpec.options.altprefix;
  }

  return sl.list(opForm, leftForm, rightForm);
}

/**
* prefix operator
*
* in sugarlisp a prefix operator is an unparenthesized expression
* of the form "<op>x" which gets translated as if it
* had been been "(<op> x)"
*
* The opts.altprefix is optional (and normally not used), but it
* allows the translated prefix form to use a different name than what the
* lexer actually uses - e.g. "!x" could be translated as "(not x)".
*/
function prefix(precedence, opts) {
  return operator('prefix', 'unary', prefix2expr, precedence, opts);
}

function prefix2expr(lexer, opSpec, opForm) {
  var rightForm = read(lexer, opSpec.precedence);

  if(opSpec.options.altprefix) {
    opForm = utils.clone(opForm);
    opForm.value = opSpec.options.altprefix;
    opForm.text = opSpec.options.altprefix;
  }

  return sl.list(opForm, rightForm);
}

/**
* postfix operator
*
* in sugarlisp a postfix operator is an unparenthesized expression
* of the form "x<op>" which gets translated as if it
* had been been "(<op> x)"
*
* Note that (for example) if an operator has both a prefix and postfix
* form, and you wish to transpile them differently you can use
* opts.altprefix to have the translated prefix form use a different
* keyword when the operator is used prefix than when it's used postfix.
*/
function postfix(precedence, opts) {
  return operator('postfix', 'unary', postfix2prefix, precedence, opts);
}

function postfix2prefix(lexer, opSpec, leftForm, opForm) {

  if(opSpec.options.altprefix) {
    opForm = utils.clone(opForm);
    opForm.value = opSpec.options.altprefix;
    opForm.text = opSpec.options.altprefix;
  }

  return sl.list(opForm, leftForm);
}

/**
* reader.parenfree<N> = a parens-free keyword of arity <N>
* options is an optional object containing:
*   "alternate" is a name to look up in the dialect's "keywords"
*       table, if it differs from the keyword they actually use
*       in the lexer code.
*   "parenthesized" is meant for use with keywords such as
*       if/while/switch/etc. which (in javascript and sugarscript
*       syntax) *require* parens around the first expression
*       following the keyword.  It's value should be a number
*       representing the position of the parenthesized expression
*       (e.g. "first expression" = 1)
*   "bracketed" is meant for use with keywords such as
*       if/while/switch/etc. which (in javascript and sugarscript
*       syntax) have optional "{...}" brackets around the body.
*       It's value should be a number representing the position
*       of the bracketed expression (e.g. "second expression" = 2)
*       When used the bracketed expressions are "lifted" up i.e.
*       spliced into the parent list of forms.
*   "validate" an optional function to call after the forms are
*       read.  The function receives the lexer, and the newly
*       read list of forms.
*
* @returns a form list just the same as if they'd entered parens
*       explicitly as a true lispy s-expression.
*/
function parenfree(arity, options) {
  options = options || {};
  return function(lexer) {
    var token = lexer.next_token();
    var fnName = options.alternate || token.text;
    var formlist = sl.list(fnName);
    formlist.setOpening(token);

    while(formlist.length < arity + 1) {
      var nextform;
      if(options.parenthesized && options.parenthesized === formlist.length) {
        // "wrapped" here because something like (true) returns simply "true"
        nextform = read_wrapped_delimited_list(lexer, '(', ')');
      }
      // note brackets are *optional* if there's a single expression body
      else if(options.bracketed && options.bracketed === formlist.length
        && lexer.on('{'))
      {
        nextform = read_delimited_list(lexer, '{', '}');
        formlist.pushFromArray(nextform);
        nextform = undefined;  // we've added the forms so no need to below
      }
      else {
        nextform = read(lexer);
      }

      // some directives" don't return an actual form:
      if(nextform && !isignorableform(nextform)) {
        formlist.push(nextform);
      }
    }

    if(options.validate) {
      options.validate(lexer, formlist);
    }

    // this list was read paren free!
    //   (add metadata useful in case they're an old lisp
    //   hacker and used parens *anyway*)
    formlist.__parenoptional = true;

    // note we don't set the closing token's line/col
    // position - since there *is* no closing paren!
    return formlist;
  }
};

/**
* Reader function to translate binary infix (e.g. "a + b") to prefix (i.e. "+ a b")
* note:  this depends on "look back" to the last form the reader had read
*  within the current list being read.  Note that we may be called with
*  symbol already in prefix position.  In that case we simply return the
*  symbol for the token assuming it's list will read in normally.
*/
/*
DELETE?
function infixtoaltprefix(altfname) {
  return function(lexer, text) {

    var token = lexer.create_token(text);
    lexer.skip_text(text);

    if(!lexer.lastReadFormInList) {
      // already in prefix position since it's first in the list!
      return sl.atom(text, {token: token});
    }

    // the arguments are the prior form then next form...
    // pull in the prior form (which has already been read)
    // we don't *delete* it from parent - that would leave a gap in the array indices!
    // instead we *replace* the prior form with our new binary operation form
    var priorform = lexer.lastReadFormInList;
    var priorformPos;
    var priorParent = priorform.parent;

    // if we don't have an alternate, we assume the operator
    // is what we're assigned to in the syntax table:
    var formlist = sl.list(altfname||text);
    formlist.setOpening(token);

    if(priorParent) {
      priorformPos = priorParent.indexOf(priorform);
      if(priorformPos === -1) {
        lexer.error("could not convert infix \"" + text + "\" to prefix (invalid prior form)");
      }

      formlist.push(priorform);  // note this changes the parent to our new list

      while(!lexer.eos() && formlist.length < 3) {
        var nextform = read(lexer);
        // some directives" don't return an actual form:
        if(!isignorableform(nextform)) {
          formlist.push(nextform);
        }
      }

      // remove the originally read form
      // (since our expression includes it now)
      priorParent.splice(priorformPos,1);
    }
    else {
      lexer.error("could not convert infix \"" + text + "\" to prefix (parent form is required)");
    }
    trace("infixtoprefix returning: " + formlist.toJSON());
    return formlist;
  }
}
*/

/**
* Read functions that just have side effects (e.g. "#use")
* can return "reader.ignore_form" to indicate that there is no
* form to process.
*
* note:  you might expect that returning undefined would be
*   as good - but don't.  Returning undefined is considered
*   an error (since it's so easy to do on accident).
*/
var ignorable_form_key = "___%%SLFORM_IGNORE%%___";
var ignorable_form = sl.atom(ignorable_form_key);
function isignorableform(form) {
  return form && sl.valueOf(form) === ignorable_form_key;
}

/**
* Read functions that just have side effects (e.g. "#use")
* can return "reader.passthru_prelude" to pass comments or
* whitespace that preceded the directive.
*/
function passthru_prelude(tokenOrForm) {
  // the expression returned is a "no-op" represented as (nop)
  // it's only purpose is to have something for the prelude to hang on
  // (note we scrub "(nop)" from the pretty-printed parse trees btw)
  var nop = sl.list("nop");
  if(tokenOrForm && tokenOrForm.prelude) {
    nop.prelude = tokenOrForm.prelude;
  }
  return nop;
}

/**
* Read functions that fail to make sense of their input
* can return "reader.retry" to indicate that they
* would like the reader to try a subsequent (lower
* priority) match.
*
* If no such match is found in the current dialect, then
* lower level dialects will also be tried (which may include
* syntax entries overridden by this dialect).
*
* note:  you might expect that returning undefined would be
*   as good - but don't.  Returning undefined is considered
*   an error (mainly because it's so easy to do on accident).
*/
var retry_key = "___%%SLRETRY%%___";
var retry = sl.atom(retry_key);
function isretry(form) {
  return form && sl.valueOf(form) === retry_key;
}

/**
* Find the first form in the forms tree where predicate returns true.
* predicatefn is a function of the form:
*  function(form, pos, dialect) {
*    return true if found otherwise false
*  }
*
* form is a single form from the forms tree
* pos is the position of that form in it's parent list,
* dialect is the form's closest surrounding dialect
*
* note: this is a depth first tree walk - this corresponds to the natural
*   left-to-right/top-to-bottom order of the original lexer
*/
function finddeep(forms, predicatefn, pos, container, parentDialect) {

  pos = pos || 0;
  parentDialect = parentDialect || get_current_dialect(sl.lexerOf(forms));

  if(Array.isArray(forms)) {
    for (var i = 0, value; i < forms.length; i++) {
      var localDialect = forms[i].dialect || parentDialect;
      value = finddeep(forms[i], predicatefn, i, forms, localDialect);
      if(value) {
        return value;
      }
    }
    return undefined;
  }
  else {
    if(predicatefn(forms, pos, container, parentDialect)) {
      return forms;
    }
  }
  return undefined;

}

// The loaded dialects (we load each dialect just once)
// DELETE exports.dialects = {};

// DELETE exports.getDefaultDialects = getDefaultDialects;

// reading forms
exports.read = read;
exports.read_from_source = read_from_source;
exports.initLexerFor = initLexerFor;
exports.nonlocal_tokens = nonlocal_tokens;
exports.read_include_file = read_include_file;
exports.read_delimited_list = read_delimited_list;
exports.read_wrapped_delimited_list = read_wrapped_delimited_list;
exports.read_delimited_text = read_delimited_text;
exports.invoke_readfn_overridden_by = invoke_readfn_overridden_by;

// dialects
//OLD DELETE exports.get_current_dialect = get_current_dialect;
//OLD DELETE exports.get_closest_scoped_dialect_for = get_closest_scoped_dialect_for;

// other
exports.unexpected = unexpected;
exports.symbol = symbol;
exports.symbolAlias = symbolAlias;
// DELETE exports.applyTreeTransforms = applyTreeTransforms;
exports.operator = operator;
exports.infix = infix;
exports.infix2prefix = infix2prefix;
exports.prefix = prefix;
exports.prefix2expr = prefix2expr;
exports.postfix = postfix;
exports.postfix2prefix = postfix2prefix;
exports.registerDynamicTransform = registerDynamicTransform;

// DELETE exports.infixtoaltprefix = infixtoaltprefix;
// DELETE exports.infixtoprefix = infixtoaltprefix();
exports.ignorable_form = ignorable_form;
exports.isignorableform = isignorableform;
exports.passthru_prelude = passthru_prelude;
exports.retry = retry;
exports.isretry = isretry;
exports.use_dialect = use_dialect;
exports.unuse_dialect = unuse_dialect;
exports.gen_var_name = gen_var_name;
exports.parenfree = parenfree;
exports.finddeep = finddeep;

}).call(this,"/node_modules/sugarlisp-core")
},{"./dialect-loader":26,"./filetypes":27,"./lexer":33,"./sl-types":43,"./transpiler-context":44,"./utils":45,"debug":37,"fs":79,"path":80}],42:[function(require,module,exports){
var sl = require('./sl-types'),
    reader = require('./reader'),
    utils = require('./utils'),
    ctx = require('./transpiler-context');

exports['*:float'] = function(lexer) {
  var token = lexer.next_token(/-?[0-9][0-9.]+/g);
  return sl.atom(parseFloat(token.text,10), {token: token});
};

// integer at start of source
exports['*:integer'] = function(lexer) {
  var token = lexer.next_token(/-?[0-9]+/g);
  return sl.atom(parseInt(token.text,10), {token: token});
};

// core supports simple quoted strings
// (plus supports templated strings with ${} escapes)
function handleSimpleString(lexer, quoteChar) {
  return reader.read_delimited_text(lexer, quoteChar, quoteChar);
};
exports['\''] = handleSimpleString;
exports['\"'] = handleSimpleString;
exports['`'] = handleSimpleString;

// a boolean category token is true or false
exports["true"] = function(lexer) {
  return sl.atom(true, {token: lexer.next_token(), category: 'boolean'});
};
exports["false"] = function(lexer) {
  return sl.atom(false, {token: lexer.next_token(), category: 'boolean'});
};

// a null category token can be "null" or "nil"
exports["null"] = function(lexer) {
  return sl.atom(null, {token: lexer.next_token(), category: 'null'});
};
exports["nil"] = exports["null"];

// ellipses are used in macros and match patterns to match the "rest"
// we are using them es6 style meaning they prefix the argument name
exports['...'] = function(lexer) {
  // we just put it back together as a single atom:
  var ellipsisToken = lexer.skip_token('...');
  var argnameToken = lexer.next_word_token();
  return sl.atom('...' + argnameToken.text, {token: ellipsisToken});
};

// parenthesized list expressions
exports['('] = function(lexer) {
  return reader.read_delimited_list(lexer);
};
// read_delimited_list consumes the ending ")"
// so we don't expect it to be read thru the syntax table
exports[')'] = reader.unexpected;

exports[':'] = reader.unexpected;

exports[','] = reader.unexpected;

// '=' is an alias for 'set'
// (we treat 'get' and 'set' as our core commands for
// manipulating variables - everything else is syntax sugar)
exports['='] = reader.symbolAlias('set');

exports['\\'] = reader.unexpected;

// compiler directives //////////////////////////////////////////////////

/**
* Use a dialect (i.e. "language extension") .
*
* This makes custom syntax and/or code generation available within
* the scope of the used dialect.
*
* The scope can be "file level" or "local".
*
* A "file level" dialect is used with "#use" at the top of a
* source file and it's scope is the entire contents of the file.
*
* A "local dialect" has a scope limited to a "#use-local" expression.
* Compare e.g. to the lisp "let" command which establishes variables
* with a scope constrained within "(let...)".
*
* Note that often local dialects are #use-local'ed implicitly, and in
* combination with a file level dialect, e.g. to use the pattern
* matching dialect you must #use "match" at the top of your file,
* and if/when a "match" keyword is used in that file, that
* implicitly creates a local dialect for the scope of that match
* statement (this is done so that the use of "case" and "default"
* are interpreted appropriately for a "match" as opposed to how
* they're interpreted e.g. in a "switch").
*
* note: the reason things like #use/#use-local and #transpile are
*   defined here in the syntax tables not the keyword ("transpile")
*   tables is simply that it's critical they take effect *early*
*   in the transpile process since they can effect reading (and
*   (we do two passes - a read pass *then* a codegen pass).
*/
function handle_use(lexer, text) {
  var useToken = lexer.skip_token(text);
  var dialectName = reader.read(lexer);
  var dialect = reader.use_dialect(sl.valueOfStr(dialectName), lexer,
                    // "#use-local" = local dialect, #use = file level dialect
                    {local: text === '#use-local'});

  // avoid blank lines in the output when no "on use code" is returned...
  if(dialect && dialect.onusecode && dialect.onusecode.length > 0 ||
    (dialect.onusecode &&
      dialect.onusecode.children && dialect.onusecode.children.length > 0)) {
      // they have some js code to insert at the point of #use
      // since we're a reader we'll return it as the (js..) form:
      var list = sl.list("js", dialect.onusecode);
      list.setOpening(useToken);
      return list;
  }

  // nope - nothing real to return
  // but there could be a "prelude" i.e. comments or whitespace
  // before the "#use" to passthru
  return reader.passthru_prelude(useToken);
};

exports['#use'] = handle_use;
// WHEN I TRIED TO USE SIMPLY "use" FOR LOCAL DIALECTS
// I COULDNT COMPILE THE ECSTATIC.SUGAR FILE JUST
// BECAUSE IT CONTAIN "app.use" IE IT TOOK THE "use"
// IN app.use AS THIS "use"!!!!
// I DIDNT SEE A QUICK FIX OTHER THAN TO RENAME IT SO I DID:
exports['#use-local'] = handle_use;

function handle_unuse(lexer, text) {
  var unuseToken = lexer.skip_token(text);
  var nextToken = lexer.peek_token();
  var dialectName;
  if(nextToken.text === '"' || nextToken.text === "'" ) {
    dialectName = sl.valueOfStr(reader.read(lexer));
  }
  var dialect = reader.unuse_dialect(dialectName, lexer,
                    // "#unuse-local" = local dialect, #unuse = file level dialect
                    {local: text === '#unuse-local'});
  return reader.passthru_prelude(unuseToken);
};

exports['#unuse'] = handle_unuse;
exports['#unuse-local'] = handle_unuse;

// set/override transpile options
// these are the same options you can otherwise set on the command line
// note: this is esp. handy in atom preview where there's no command line
exports['#transpile'] = function(lexer) {
  lexer.skip_text('#transpile');
  // they're expected to give a json options object
  // if a lispy core file that means (object...) otherwise real json {...}
  var optforms = reader.read(lexer);
  if(Array.isArray(optforms) && optforms.length > 0 &&
    sl.typeOf(optforms[0]) === 'symbol' && sl.valueOf(optforms[0]) === 'object') {
    // set these into the transpile options all the files
    // get via the context module
    var options = ctx.evalExpression(optforms);
    utils.mergeOnto(ctx.options.transpile, options);
  }
  else {
    lexer.error("#transpile expects a json object as argument");
  }

  // nothing to generate we've done all that matters
  return reader.ignorable_form;
};

// they can put "#keyword" before a named function in their source
// file to make it available at compile time.  i.e. The function is
// called during compile much as macros are, but it receives and
// returns forms (just a built-in keyword function), and can use
// arbitrary code in creating those returned forms, unlike a macros
// which uses the quote/unquote declarative style.
exports["#keyword"] = function(lexer) {
  lexer.mark_rewind_point();
  lexer.skip_text('#keyword');
  // note that here we read through the reader, ensuring
  // that we get any enhancements to functions that may
  // exist in the active dialects
  var functionForm = reader.read(lexer);
  if(sl.isList(functionForm) &&
    sl.typeOf(functionForm[0]) === 'symbol' &&
    sl.valueOf(functionForm[0]) === "function" &&
    sl.typeOf(functionForm[1]) === 'symbol')
  {
    // this flag is recognized in the transpiler
    // as meaning this function will be eval'ed
    // and registered so it will work at compile
    // time just as if it had been a built-in
    // keyword.
    functionForm.__macrofn = true;
  }
  else {
    lexer.error("#keyword must precede a named function");
  }
  return functionForm;
}

// #if is for conditional code generation
exports['#if'] = reader.parenfree(2, {parenthesized: 1, bracketed: 2});

// #include is an alternative to lispyscript 1's original (include...)
exports['#include'] = reader.parenfree(1);

// #require is for requiring a module at read time (as opposed
// to run time).  It uses the require path as opposed to
// lispy's separate include path.
exports['#require'] = reader.parenfree(1);

/**
* The default read function used when nothing in
* the read table matches the current token.
*/
exports.__default = reader.symbol;

},{"./reader":41,"./sl-types":43,"./transpiler-context":44,"./utils":45}],43:[function(require,module,exports){
/**
* Basic Lispyscript data types.
*
* The Lispyscript data types ("forms") are lists of "atoms"
* and/or other lists.
*/
var utils = require('./utils'),
    ctx = require('./transpiler-context'),
    debug = require('debug')('sugarlisp:core:types');

//// Atoms

/**
* Atoms
*
* Atom can be symbols, strings, numbers, booleans, null.
*
* Note that undefined is not an atom - it is the absence of an atom.
* Note this follows the same rules as JSON - you cannot use
* undefined in JSON.  To represent the symbol undefined existing
* in input source it can be a *symbol* atom whose value is "undefined".
*
* Likewise comments are not atoms (they are passed through separately
* as "preludes" of the forms that they precede).
*
* The atoms come from either:
*  a.  the tokens parsed from the input source file
*  b.  sugarlisp code (functions and macros) generating
*      the output code.
*
* Both types of atoms have a value, retrievable as ls.valueOf(atom)
*
* But for the atoms created from the tokens of the input we
* preserve the token with line and column numbers in order
* to give good error messages and to enable use of source
* maps.
*
* For other atoms created by sugarlisp code and/or macros we
* support "json style" i.e. you can use simple primitives to
* simplify the code.
*
* Note:  this means a single list may hold both primitives
*   and "wrapped" atoms.  Such "heterogeneity" is expected.
*
* Lastly a special note about symbols.  We have currently
* chosen *not* to use the es6 Symbol type for Symbols
* though that could change in the future.
*
* Symbol atoms are represented with javascript strings, and
* are distinguished from symbols by the presence or absence
* of quotes.
*
* i.e. in an expression like:
*
*  (str "a" "b")
*
* The tokenized text is "str", '"a"', and '"b"' where yes the
* token text for a and b *includes* the quotes.
*
* The value of this scheme shows itself when working with
* primitives or serializing expressions to json, since no
* type information is lost when all you have is the "text".
*
* Note:  more elaborate schemes were tried but the other
*  approaches seemed to add complexity without adding any value.
*/

//// factory method

/**
* Convert a value to an atom
* value is a primitive value.
* options are:
*   token - the parsed token that led to this value (if there was one)
*   parent - the parent form to this one.
*/
function atom(value, options) {

  // is this a list or already wrapped atom?
  if(isList(value) || (!isPrimitive(value) && value.__isatom)) {
    // nothing to be done!
    return value;
  }

  // also they can pass just a token if they want
  // (though it better be a string or symbol - we don't type convert)
  if(!options && value && isToken(value)) {
    options = {token: value};
    value = value.text;
  }

  options = options || {};
  var atomized = {};

  // if they gave the token
  if(options.token) {
    // they can override the token category if they choose:
    options.token.category = options.category || options.token.category;

    // just pull the token info right into us:
    utils.mergeInto(atomized, options.token);

    // An end token... (e.g. the end of a list such as (), [], {})
    if(options.tokenType === "end") {
      // gets it's line/col from the "end" versions:
      atomized.line = options.token.endLine;
      atomized.col = options.token.endCol;
      delete atomized.endLine;
      delete atomized.endCol;
    }
  }

  atomized.value = value;
  atomized.parent = options.parent;
  atomized.toString = function() { return toString(atomized); };
  atomized.toQuotedString = function() { return addQuotes(toString(atomized)); };
  atomized.toUnquotedString = function() { return stripQuotes(toString(atomized)); };
  atomized.toJSON = function() { return toJSON(atomized); };
  atomized.error = function(msg, locator) {
      lexerOf(atomized).error(msg, locator || atomized);
  };
  atomized.transform = options.transform;
  atomized.__isatom = true;
  return atomized;
}

/**
* Alternative to "atom" when needing create a string atom.
* This will ensure your string follows our convention of having
* quotes at the beginning and end of the string (without which
* it will be seen as a symbol not a string)
* Can also be used to "promote" e.g. a symbol atom to a string
* atom.
*/
function str(str, options) {
  var strAtom;
  if(typeof str === 'string') {
    if(!isQuotedString(str)) {
      str = '"' + str + '"';
    }
    strAtom = atom(str, options);
  }
  else if(isAtom(str, true)) {
    // already an atom - but ensure that it's a *string* atom
    strAtom = str;
    if(!isQuotedString(strAtom.value)) {
      strAtom.value = '"' + strAtom.value + '"';
      strAtom.text = strAtom.value;
    }
  }
  else {
    throw Error("Attempt to convert unsupported type " + typeof str + " to a string atom");
  }
  return strAtom;
}

//// Important utility methods
//// With atoms, use these instead of "typeof", ".toString", ".valueOf".
//// This is so we have uniform access whether atoms are primitives or
//// "atomized" (wrapped) using the atoms.atom() function.

/**
* Get the primitive value of an atom
*/
function valueOf(atom) {
  return (typeof atom === 'function' || typeof atom === 'object' ) &&
          atom.__isatom ? atom.value : atom;
}

/**
* Get the primitive value of a string *without the surrounding quotes*.
*/
function valueOfStr(atom) {
  return stripQuotes(valueOf(atom));
}

/**
* Get the atom (whether wrapped or primitive) as a string.
*/
function toString(atom) {
  // note: this is intentionally *not* new String(atom)
  //   see e.g. http://www.2ality.com/2012/03/converting-to-string.html
  return String(valueOf(atom));
}

//// Lists

/**
* Create a sugarlisp list.
* the arguments become the list members.
*
* note:  enhanced array approach based Ben Nadel's excellent blog:
*  http://www.bennadel.com/blog/2292-extending-javascript-arrays-while-keeping-native-bracket-notation-functionality.htm
*/
function list() {
  return listFromArray(Array.prototype.slice.call(arguments));
}

/**
* Create a sugarlisp list from a javascript array.
* Optionally, specify the opening and/or closing tokens for the list.
*/
function listFromArray(arr) {

  // note the below inadvertantly connected the input forms to the
  // output generated code forms and caused a problem if anonymous
  // "reactor functions" were used.  But without it - compile times
  // went thru the roof!!
  if(isList(arr)) { return arr; }

  var thelist = [];

  function _wrap(form) {
    var wrapped;
    if(!Array.isArray(form)) {
      wrapped = atom(form);
    }
    else {
//      wrapped = (isList(form) ? arr : listFromArray(form));
      wrapped = listFromArray(form);
    }
    if(!thelist.noparenting) {
      wrapped.parent = thelist;
    }
    return wrapped;
  }

  /**
  * Add the given form to the end of the list.
  * note: this also wraps the form and sets the list as the parent of the item
  */
  thelist.push = function(form) {
    Array.prototype.push.call(this, _wrap(form));
    return this;
  };

  /**
  * Add each element of the array to the end of the list.
  * note: this also wraps the forms and sets the list as the parent of the item
  */
  thelist.pushFromArray = function(arr) {
    arr.forEach(function(elem) {
      thelist.push(elem);
    });
    return this;
  };

  /**
  * Add the given form to the beginning of the list.
  * note: this also wraps the form and sets the list as the parent of the item
  */
  thelist.unshift = function(form) {
    Array.prototype.unshift.call(this, _wrap(form));
    return this;
  };

  /**
  * Add each element of the array to the beginning of the list.
  * note: this also wraps the forms and sets the list as the parent of the item
  */
  thelist.unshiftArray = function(arr) {
    for(var i = arr.length-1; i >= 0; i--) {
      thelist.unshift(arr[i]);
    };
    return this;
  };

  /**
  * Disable the auto-setting of parents as forms are added to the list.
  * This is useful for macros because even though they rearrange forms
  * we don't want the macros themselves winding up in the parent/child
  * relationships that are used for finding locally scoped dialects.
  */
  thelist.disable_parenting = function() {
    thelist.noparenting = true;
  };

  /**
  * Remove the given item from its parent list.
  */
  thelist.remove = function(form) {
    var parent = parentOf(form);
    if(!parent) {
      parent = thelist;
    }
    else {
      if(parent !== thelist) {
        throw Error("Attempt to remove form from a list that was not it's parent");
      }
    }

    var pos = parent.indexOf(form);
    if(pos !== -1) {
      form.parent = undefined;
      delete parent[pos];
    }
    else {
      throw Error("Attempt to remove form from a list which didn't contain it");
    }

    return this;
  };

  thelist.error = function(msg, locator) {
    lexerOf(thelist).error(msg, locator || thelist);
  };

  /**
  * Get the simplified JSON representation of the atoms in this list.
  */
  thelist.toJSON = function() {
    return toJSON(this);
  };

  /**
  * Set parents all the way down this form tree.
  */
  thelist.setParents = function(parent) {

    if(parent) {
      if(this.parent && this.parent !== parent) {
        console.log('warning:  setParents is *changing* an existing parent value??!!');
      }

      this.parent = parent;

    }

    this.forEach(function(form) {
      if(Array.isArray(form) && form.setParents) {
        form.setParents(thelist);
      }
    });
  };

  /**
  * Set the opening line/col for a list from the opening token (e.g. "(")
  * or current position in the Source
  */
  thelist.setOpening = function(tokenOrLexer) {
    this.line = tokenOrLexer.line;
    this.col = tokenOrLexer.col;

    // whitespace or comments that preceded the opening token
    // (e.g. on a () list whitespace or comments that preceded "(")
    this.prelude = tokenOrLexer.prelude;
  }

  /**
  * Set the closing line/col for a list from the closing token (e.g. ")")
  */
  thelist.setClosing = function(tokenOrLexer) {
    this.endLine = tokenOrLexer.line;
    this.endCol = tokenOrLexer.col;

    // whitespace or comments that preceded the end token
    // (e.g. on a () list whitespace or comments that preceded ")")
    this.endPrelude = tokenOrLexer.prelude;
  }

  // did they give an initial arr?
  if(arr && Array.isArray(arr) && arr.length > 0) {
    // wrap the elements and assign parents, etc.
    thelist = fromJSON(arr, thelist);
  }

/*
THIS APPEARS TO BE TRYING TO HELP SET LINE/COL POSITIONS FOR SOURCE
MAPS WHEN A LIST MIGHT HAVE SOME PROGRAM-CREATED TOKENS?  COMMENTED
FOR NOW SINCE WE'RE MOVING FROM THERE EVEN BEING ATOM.LEXER
  var atomwithsource = finddeep(thelist, function(atom) { return atom.lexer; });
  if(atomwithsource) {
    thelist.setOpening(lexerOf(atomwithsource));
  }
*/

  thelist.__islist = true; // is this is a sugarlisp list or just a js array?

  return thelist;
}

/**
* Find the first form in the forms tree where predicate returns true.
* predicatefn is a function of the form:
*  function(form, pos) {
*    return true if found otherwise false
*  }
*
* form is a single form from the forms tree
* pos is the position of that form in it's parent list
*
* note: this is a depth first tree walk - this corresponds to the natural
*   left-to-right/top-to-bottom order of the original source
*/
function finddeep(forms, predicatefn, pos) {
  pos = pos || 0;
  if(Array.isArray(forms)) {
    for (var i = 0, value; i < forms.length; i++) {
      value = finddeep(forms[i], predicatefn, i);
      if(value) {
        return value;
      }
    }
    return undefined;
  }
  else {
    if(predicatefn(forms, pos)) {
      return forms;
    }
  }
  return undefined;
}

//// JSON

/**
* Convert a JSON (value, array, or tree) to a sugarlisp "form"
* (list, atom, etc).
* "into" is optional - it will be populated with the top level forms
* if given.
*/
function fromJSON(json, into) {
  var form;

  // ensure the items are wrapped as atoms (with parents) all the way down
  if(Array.isArray(json)) {
    form = into || list();
    json.forEach(function(elem) {
      form.push(fromJSON(elem));
    });
  }
  else if(isPrimitive(json) || (isToken(json) && !isAtom(json))) {
    form = atom(json);
  }
  else if(isList(json) || isAtom(json)) {
    // nothing to do:
    form = json;
  }
  else {
      throw new Error('Unsupported element type in fromJSON: ' + json +
                  ' (type is \'' + typeof json + '\')');
  }

  return form;
}

/**
* Convert a sugarlisp form to JSON (i.e. js arrays and primitives)
*/
function toJSON(form) {
    if(isList(form)) {
        var json = [];
// DELETE if(!form.formEach) { return json; }
        form.forEach(function(node) {
          var childJSON = toJSON(node);
          // scrub no-op "nop" expressions from the output
          // (nop is mainly just for "prelude" comments to hang on)
          if(!(Array.isArray(childJSON) && childJSON[0] === "nop")) {
            json.push(childJSON);
          }
        })
        return json;
    }
    else if(isAtom(form)) {
       return valueOf(form);
    }
    else {
        throw new Error('Unknown form type in toJSON for node: ' + form);
    }
}

// "pretty print" the simple json of the form tree to a string
function pprintJSON(formJson, opts, indentLevel, priorNodeStr) {
  opts = opts || {};
  opts.spaces = opts.spaces || 2;
  opts.lbracket = opts.lbracket || "[";
  opts.rbracket = opts.rbracket || "]";
  opts.separator = opts.separator || ", ";
  indentLevel = indentLevel || 0;
  var str = ""

  function indentToSpaces(indentLevel) {
    return(!opts.omitTop ? indentLevel * opts.spaces : (indentLevel - 1) * opts.spaces);
  }

  if(Array.isArray(formJson)) {
    var numSpaces = indentToSpaces(indentLevel);
    if(!(opts.omitTop && indentLevel === 0)) {
      // I added these last two checks below specifically for formatting html tags
      // (the length check might adversely effect formatting normal code not sure yet )
      if((priorNodeStr !== '"function"' && priorNodeStr !== 'function') &&
          formJson.length > 0 && formJson[0] !== "attr") {
        str += (priorNodeStr ? "\n" : "") // omit the unecessary *first* "\n"
        str += (priorNodeStr && numSpaces > 0 ? " ".repeat(numSpaces) : "")
      }
      str += opts.lbracket
    }

    if(formJson[0] === "object") {
      // pretty print the key/value pairs of an object
      str += pprintJSON(formJson[0], opts) + opts.separator + "\n";
      for(var i=1; i<formJson.length;i+=2) {
         str += (numSpaces+1 > 0 ? " ".repeat(indentToSpaces(indentLevel+1)) : "") +
                 pprintJSON(formJson[i], opts) + opts.separator +
                 pprintJSON(formJson[i+1], opts, indentLevel + 2, formJson[i]) + (i+2 < formJson.length ? opts.separator : "") + "\n";
      }
    }
    else {
      // pretty print the body of a normal list
      var priorNodeStr;
      formJson.forEach(function(node, i) {
        priorNodeStr = pprintJSON(node, opts, indentLevel + 1, priorNodeStr)
        str += priorNodeStr
        if(i < formJson.length - 1) {
          str += opts.separator
        }
      })
    }
    if(!(opts.omitTop && indentLevel === 0)) {
      str += opts.rbracket
    }
  }
  else if(formJson == null) {
    str += "null";
  }
  else if(typeof formJson === 'string' && !opts.bareSymbols) {
    // I had backslashed single quotes below -
    // but jsonlint rejected so I don't...
    str += ('"' + formJson.replace(/[\\"]/g, '\\$&') + '"')
  }
  else if(formJson.toString) {
    str += formJson.toString();
  }
  else {
    throw new Error('Unknown form type in pprintJSON: ' + formJson + ' (' + typeof formJson + ')');
  }
  return str
}

// "pretty print" lisp s-expressions from the form tree to a string
function pprintSEXP(formJson, opts, indentLevel, priorNodeStr) {
  opts = opts || {};
  opts.lbracket = "(";
  opts.rbracket = ")";
  opts.separator = " ";
  opts.bareSymbols = true;
  return pprintJSON(formJson, opts, indentLevel, priorNodeStr);
}

//// Transpiled Output
//// (represented as a tree of code snippet strings intermixed with atoms)

function generated() {
  return generatedFromArray(Array.prototype.slice.call(arguments));
}

function generatedFromArray(arr) {
  var thelist = listFromArray(arr);

  /**
  * Join a generated code list by interposing sepform between each item
  */
  thelist.join = function(sepform) {

    // we replace the list with the joined list (as does push and unshift!)
    var sepatom = atom(sepform);
    var length = thelist.length;
    for(var i = 1; i < (length * 2) - 1; i += 2) {
      thelist.splice(i, 0, sepatom);
    }

    return thelist;
  };

  function _wrap(form) {
    var wrapped;
    if(!Array.isArray(form)) {
      wrapped = atom(form);
    }
    else {
      wrapped = generatedFromArray(form);
    }
    if(!thelist.noparenting) {
      wrapped.parent = thelist;
    }
    wrapped.__isgenerated = true;
    return wrapped;
  }

  /**
  * Add the given form to the end of the generated code list.
  * note: this also wraps the form and sets the list as the parent of the item
  */
  thelist.push = function(form) {
    Array.prototype.push.call(this, _wrap(form));
    return this;
  };

  /**
  * Add the given form to the beginning of the generated code list.
  * note: this also wraps the form and sets the list as the parent of the item
  */
  thelist.unshift = function(form) {
    Array.prototype.unshift.call(this, _wrap(form));
    return this;
  };

  thelist.toString = function() {

    // Helper to flatten an array of arrays (ls.list, ls.generated, normal arrays)
    // down to a single array
    function _flatten(arr) {
      return arr.reduce(function(a, b) {
        b = Array.isArray(b) ? _flatten(b) : toString(b);
        return a.concat(b);
      }, []);
    }

    return _flatten(this).join('');
  };

  thelist.__isgenerated = true;
  return thelist;
}

/**
 * Returns if the specified form is a generated code
 */
function isGenerated(form) {
  return (form && typeof form === 'object' && form.__isgenerated);
}

//// Methods on lispy forms (apply whether arg is atom or list)

/**
 * Returns if the specified form is a list
 */
function isList(form) {
  return (form && typeof form === 'object' && form.__islist);
}

/**
* Returns if the specified value is an atom
* By default a primitive is considered an atom,
* pass true as the second arg to say it must
* be a *wrapped* primitive.
*/
function isAtom(form, wrapped) {
  // it's an atom if we've tagged it one:
  var is = (typeof form === 'object' && form.__isatom);
  // but it's not if it's a list:
  is = is && !isList(form);
  // by default allow primitives as atoms
  if(!wrapped) {
    is = is || isPrimitive(form);
  }

  return is;
}

/**
 * Returns if the specified value is a token
 * note the we "promote" tokens to atoms, so this means
 * most tokens are also atoms.
 */
function isToken(form) {
  return form.__istoken && form.text;
}

/**
 * Returns if the specified value is a form i.e. a list or atom
 */
function isForm(form) {
  return (isAtom(form) || isList(form));
}

/**
* Return the name of the type of form, one of:
*  "list",
*  "symbol",
*  "string",
*  "number",
*  "boolean",
*  "null"
*/
function typeOf(form) {
  var typename;

  if(isList(form)) {
    typename = "list";
  }
  else if(isAtom(form)) {
    var val = valueOf(form);
    // careful with null cause typeof null === "object"
    if(val !== null) {
      var typename = typeof val;
      if(typename === "string" && !isQuotedString(val)) {
        typename = "symbol";
      }
    }
    else typename = "null";
  }
  return typename;
}

/**
* Get the parent of the form (if one is available)
*/
function parentOf(form) {
  return form.parent;
}

/**
* Get the Lexer that was used to read an atom
* Note:  this was originally a very fancy-pants affair,
*   but it's been simplified since we compile one file
*   at a time, and so there's only ever one Lexer at a
*   time.
*/
function lexerOf(form) {
  return ctx.lexer;
}

//// Assorted Utility Methods (lesser used)

/** Is the value a javascript primitive?
 *  (i.e. that we support as an "unwrapped atom"?)
 */
function isPrimitive(val) {
  return (val === null || [
    "undefined",
    "boolean",
    "number",
    "string",
    "symbol"
  ].indexOf(typeof val) !== -1);
}

/** Is the text a quoted string? */
function isQuotedString(str) {
  var is = false;
  if(typeof str === 'string') {
    var firstChar = str.charAt(0);
    is = (['"', "'", '`'].indexOf(firstChar) !== -1);
  }
  return is;
}

/**
* If atom is a string, which quote character does it use?
* Otherwise returns undefined.
* We support the same string quotes as javascript: ", ', and `
*/
function stringQuoteChar(atom) {
  var str = toString(valueOf(atom));
  var quoteChar;
  if(isQuotedString(value)) {
    quoteChar = value.charAt(0);
  }
  return quoteChar;
}

/**
* strip the quotes from around a string if there are any
* otherwise return the string as given.
* since we are removing the quotes we also unescape quotes
* within the string.
*/
function stripQuotes(text) {
  var sansquotes = text;
  if(isQuotedString(text)) {
    if(text.length === 2) {
        sanquotes = ""; // empty string
    }
    else {
      sansquotes = text.substring(1, text.length-1);
// DELETE?      sansquotes = unescapeQuotes(sansquotes);
    }
  }
  return sansquotes;
}

/**
* add quotes around a string if there aren't any
* otherwise return the string as given.
* since we're adding the quotes we also escape quotes
* within the string.
*/
function addQuotes(text, quoteChar) {
  var withquotes = text;
  if(!isQuotedString(text)) {
    var delim = quoteChar && quoteChar.length === 1 ? quoteChar : '"';
    withquotes = delim + text + delim;
  }
  return withquotes;
}

function escapeQuotes(text) {
  return text.replace(/('|"|`)/g, '\\$1');
}

function unescapeQuotes(text) {
  return text.replace(/\\('|"|`)/g, '$1');
}

function escapeNewlines(text) {
  return text.replace(/\n/g, '\\n');
}

module.exports = {
  atom: atom,
  str: str,
  valueOf: valueOf,
  valueOfStr: valueOfStr,
  toString: toString,
  list: list,
  listFromArray: listFromArray,
  finddeep: finddeep,
  fromJSON: fromJSON,
  toJSON: toJSON,
  pprintJSON: pprintJSON,
  pprintSEXP: pprintSEXP,
  generated: generated,
  generatedFromArray: generatedFromArray,
  isGenerated: isGenerated,
  isList: isList,
  isAtom: isAtom,
  isForm: isForm,
  typeOf: typeOf,
  parentOf: parentOf,
  lexerOf: lexerOf,
  isPrimitive: isPrimitive,
  isQuotedString: isQuotedString,
  stringQuoteChar: stringQuoteChar,
  stripQuotes: stripQuotes,
  addQuotes: addQuotes,
  escapeQuotes: escapeQuotes,
  unescapeQuotes: unescapeQuotes,
  escapeNewlines: escapeNewlines
};

},{"./transpiler-context":44,"./utils":45,"debug":37}],44:[function(require,module,exports){
/**
* The transpiler-context module holds some common flags
* used to communicate between the main "ls" transpiler
* logic and the various syntax/keyword table files that
* collaborate to achieve a compile.
*
* The main transpiler file requires this module and sticks
* the transpiler options specified on the command line
* into it.
*
* The keyword handler functions have this context bound as
* their "this".
*
* They can use the context e.g. to communicate back to the
* main transpiler loop to not add a a semicolon or a "return"
* statement after the statement they've generated by setting
* the "noSemiColon" or "noNewline" flag.
*
* Note that this is a normal module (where modules behave like
* "singletons"), so it's also possible to simply require this
* module to see the current context.
*/

// note: reliably determining where we're running is complicated
//   because the Atom editor appears as both node *and* a browser!
var path;
try {
  path = require('path');
}
catch(e) {
  debug('failed to require "path" (we assume we\'re running in a browser)');
}

module.exports = {
  filename: undefined,
  fileext: undefined,
  lexer: undefined,
  options: { transpile: {} },
  indentSize: 2,
  indent: 6,
  margin: function() { return " ".repeat(this.indent > 0 ? this.index : 0); },
  tabin: function(times) { times = times || 1; this.indent += (this.indentSize * times); },
  tabout: function(times) { times = times || 1; this.indent -= (this.indentSize * times); this.indent = this.indent > 0 ? this.indent : 0; },
  noSemiColon: false,
  noNewline: false,
  noReturn: false,
  semi: function() {
                  var s = (!this.noSemiColon ? ";" : "");
                  this.noSemiColon = false;
                  return s;
                },
  mutators: ["set","++","post++","--","post--","+=","-=","*=","/=","%="],
  beforeCode: [],
  afterCode: [],
  repljsenv: {},
  initialize: function (filename, options) {
    // make options, filename, etc. visible to the various handler functions:
    var ctx = module.exports;
    ctx.options = { transpile: (options || {}) };
    ctx.options.transpile.on = (typeof window === 'undefined' ? "server" : "browser");
    ctx.repljsenv.transpile = ctx.options.transpile;
    ctx.filename = filename;
    ctx.fileext = path.extname(filename);
    ctx.indent = -ctx.indentSize;
  }
};

},{"path":80}],45:[function(require,module,exports){
var slinfo = require('debug')('sugarlisp:core:utils:info');

if (!String.prototype.repeat) {
    String.prototype.repeat = function(num) {
        num = (num >= 0 ? num : 0);
        return new Array(num + 1).join(this)
    }
}

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

// borrowed from https://github.com/paulmillr/Array.prototype.find
if (!Array.prototype.find) {

  function find(predicate) {
    var list = Object(this);
    var length = list.length < 0 ? 0 : list.length >>> 0; // ES.ToUint32;
    if (length === 0) return undefined;
    if (typeof predicate !== 'function' || Object.prototype.toString.call(predicate) !== '[object Function]') {
      throw new TypeError('Array#find: predicate must be a function');
    }
    var thisArg = arguments[1];
    for (var i = 0, value; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) return value;
    }
    return undefined;
  };

  if (Object.defineProperty) {
    try {
      Object.defineProperty(Array.prototype, 'find', {
        value: find, configurable: true, enumerable: false, writable: true
      });
    } catch(e) {}
  }

  if (!Array.prototype.find) {
    Array.prototype.find = find;
  }
}

if (!Array.prototype.contains) {

  function contains(val) {
    return this.indexOf(val) !== -1;
  };

  if (Object.defineProperty) {
    try {
      Object.defineProperty(Array.prototype, 'contains', {
        value: contains, configurable: true, enumerable: false, writable: true
      });
    } catch(e) {}
  }

  if (!Array.prototype.contains) {
    Array.prototype.contains = contains;
  }
}

if (!Array.prototype.findIndex) {

  function findIndex(predicate) {
    var list = Object(this);
    var length = list.length < 0 ? 0 : list.length >>> 0; // ES.ToUint32;
    if (length === 0) return -1;
    if (typeof predicate !== 'function' || Object.prototype.toString.call(predicate) !== '[object Function]') {
      throw new TypeError('Array#findIndex: predicate must be a function');
    }
    var thisArg = arguments[1];
    for (var i = 0, value; i < length; i++) {
      value = list[i];
      if (predicate.call(thisArg, value, i, list)) return i;
    }
    return -1;
  };

  if (Object.defineProperty) {
    try {
      Object.defineProperty(Array.prototype, 'findIndex', {
        value: findIndex, configurable: true, enumerable: false, writable: true
      });
    } catch(e) {}
  }

  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = findIndex;
  }
}

if (!Array.prototype.contains) {

  function contains(val) {
    return this.indexOf(val) !== -1;
  };

  if (Object.defineProperty) {
    try {
      Object.defineProperty(Array.prototype, 'contains', {
        value: contains, configurable: true, enumerable: false, writable: true
      });
    } catch(e) {}
  }

  if (!Array.prototype.contains) {
    Array.prototype.contains = contains;
  }
}


// THIS MERGE STUFF NEEDS TO BE MERGED - ALL THREE SHOULD BE SHORT AND USE
// A COMMON HELPER

/**
* Takes any number of objects and returns one (new) merged object
* note: later properties with the same name as earlier ones
* do *not* replace them (a warning is logged when such
* conflicts are found).
*/
exports.merge = function(){
  var out = {};
  if(!arguments.length)
    return out;
  for(var i=0; i<arguments.length; i++) {
    for(var key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        if(typeof out[key] === 'undefined') {
          out[key] = arguments[i][key];
        }
        else {
          slinfo("Not merging already existing key \"" + key + "\"");
        }
      }
    }
  }
  return out;
}

// merge is also a convenient way to clone an object:
exports.clone = exports.merge;

/**
* Takes any number of objects and merges the properties from later
* ones into the first.
* (otherwise identical to merge above)
*/
exports.mergeInto = function(){
  if(!arguments.length || arguments.length === 0)
    return {};
  var out = arguments[0];
  for(var i=1; i<arguments.length; i++) {
    for(var key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        if(typeof out[key] === 'undefined') {
          out[key] = arguments[i][key];
        }
        else {
          slinfo("Not merging already existing key \"" + key + "\"");
        }
      }
    }
  }
  return out;
}

/**
* Set properties in the first argument from the other arguments
* (in the order of the arguments, later properties win)
*/
exports.mergeOnto = function(){
  if(!arguments.length || arguments.length === 0)
    return {};
  var out = arguments[0];
  for(var i=1; i<arguments.length; i++) {
    for(var key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key)) {
        out[key] = arguments[i][key];
      }
    }
  }
  return out;
}

/**
* Fill undefined properties in the first argument from the other arguments
* (in the order of the arguments, earlier properties win)
*/
exports.mergeUndefined = function(){
  if(!arguments.length || arguments.length === 0)
    return {};
  var out = arguments[0];
  for(var i=1; i<arguments.length; i++) {
    for(var key in arguments[i]) {
      if (arguments[i].hasOwnProperty(key) && typeof out[key] === 'undefined') {
        out[key] = arguments[i][key];
      }
    }
  }
  return out;
}

// the below is based on the answer from Bergi here:
// http://stackoverflow.com/questions/9479046/is-there-any-non-eval-way-to-create-a-function-with-a-runtime-determined-name
exports.anonymousFunction = function(args, body, scope, values) {
  // args is optional (shift *our* args if none given)
  if (typeof args == "string")
    values = scope, scope = body, body = args, args = [];
  if (!Array.isArray(scope) || !Array.isArray(values)) {
    if (typeof scope == "object") {
      // place the object keys in scope
      var keys = Object.keys(scope);
      values = keys.map(function(p) { return scope[p]; });
      scope = keys;
    } else {
      values = [];
      scope = [];
    }
  }
  return Function(scope, "return function(" + args.join(", ") + ") {\n" +
                            body +
                          "\n};").apply(null, values);
}

// Get the file extension (without the ".") otherwise defaultExt
exports.getFileExt = function(filename, defaultExt) {
  var fileext;
  if(filename.indexOf(".") !== -1) {
    fileext = filename.split('.').pop();
  }
  else {
    fileext = defaultExt;
  }
  return fileext
}

},{"debug":37}],46:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
var sl = require('sugarlisp-core/sl-types');
var match = require('sugarlisp-match/pattern-match');
exports["go"] = function() {
  var args = Array.prototype.slice.call(arguments);
  return match(args, function(when) {
    when([
        function(sym) {
          return sym.value === "go";
        },
        match.var("fname", match.slsymbol)
      ],
      function(vars) {
        return (function(fname) {
          return sl.generated([
            "csp.go(", fname, ");"
          ]);
        }).call(this, vars["fname"]);
      }, this);
    when([
        function(sym) {
          return sym.value === "go";
        },
        match.var("goargs", match.sllist)
      ],
      function(vars) {
        return (function(goargs) {
          return match(goargs, function(when) {
            when([
                function(sym) {
                  return sym.value === "begin";
                }
              ],
              function(vars) {
                return (function(body) {
                  return sl.generated([
                    "csp.go(function* () {\n",
                    "  ", this.transpileExpressions(body), "\n",
                    "})"
                  ]);
                }).call(this, vars["_rest"]);
              }, this);
            when([
                match.var("fncall", match.slsymbol)
              ],
              function(vars) {
                return (function(fncall, fnargs) {
                  return sl.generated([
                    "csp.go(", fncall, ",[", fnargs.join(','), "]);"
                  ]);
                }).call(this, vars["fncall"], vars["_rest"]);
              }, this);
            when([
                match.var("any", match.sldefault)
              ],
              function(vars) {
                return (function(any) {
                  return this.error('go expects a body wrapped in {} or a generator function call');
                }).call(this, vars["any"]);
              }, this);
          }, this);
        }).call(this, vars["goargs"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error('go expects a body wrapped in {} or a named generator function');
        }).call(this, vars["any"]);
      }, this);
  }, this)
};
},{"sugarlisp-core/sl-types":43,"sugarlisp-match/pattern-match":67}],47:[function(require,module,exports){

var utils = require('sugarlisp-core/utils');

module.exports = {
  name: "csp",
  onuse: "sugarlisp-csp/usejscsp.js",
  lextab: require('./lextab'),
  readtab: require('./readtab'),
  gentab: utils.merge(require('./gentab'),
                      require('./macros.js'))
};

},{"./gentab":46,"./lextab":48,"./macros.js":49,"./readtab":50,"sugarlisp-core/utils":45}],48:[function(require,module,exports){

module.exports = [
  // matches are tried left to right so "<-alts" before "<-"
  { category: 'symbol', match: [ '<-alts', '<~alts', '<-', '<~', '~>' ] }
];

},{}],49:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
exports["chtake"] = function(forms) {
  var macrodef = ["macro", ["channel"],
    ["yield", [
      [".", "csp", "take"],
      ["~", "channel"]
    ]]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["chput"] = function(forms) {
  var macrodef = ["macro", ["channel", "value"],
    ["yield", [
      [".", "csp", "put"],
      ["~", "channel"],
      ["~", "value"]
    ]]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["~>"] = function(forms) {
  var macrodef = ["macro", ["value", "channel"],
    ["yield", [
      [".", "csp", "put"],
      ["~", "channel"],
      ["~", "value"]
    ]]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["<-alts"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    ["yield", [
      [".", "csp", "alts"],
      ["~", "rest"]
    ]]
  ];
  return this.macroexpand(forms, macrodef);
};
exports["<~alts"] = function(forms) {
  var macrodef = ["macro", ["...rest"],
    ["yield", [
      [".", "csp", "alts"],
      ["~", "rest"]
    ]]
  ];
  return this.macroexpand(forms, macrodef);
};
},{}],50:[function(require,module,exports){
var reader = require('sugarlisp-core/reader'),
    sl = require('sugarlisp-core/sl-types'),
    debug = require('debug')('sugarlisp:csp:readtab');

// go routines
// (can be used lispy style or paren free with {})
exports['go'] = function(lexer, text) {

  // the parsing that follows is only for sugarscript
  if(this.extension === "slisp") {
    return reader.retry;
  }

  var goToken = lexer.next_token('go');
  var goAtom = sl.atom("go", {token: goToken});
  var list = sl.list(goAtom);

  // is it function call style e.g. go(chain(left,right)) ?
  if(lexer.on('(')) {
    list.push(reader.read_wrapped_delimited_list(lexer, '(', ')'));
  }
  else {
    // this handles e.g. go {..}, go funcname, etc.
    list.push(reader.read(lexer));
  }

  list.__parenoptional = true;
  return list;
};


// channel put/take

// go style left arrow
exports['<-'] = reader.operator({
  prefix: reader.prefix(8, {altprefix:'chtake'}),
  infix: reader.infix(7.5, {altprefix:'chput'})
});

// "tadpole" style with two directions
// (to keep them straight remember the channel always goes on the right)

// channel take e.g. var t <~ ch
exports['<~'] = reader.prefix(7.5, {altprefix:'chtake'});

// channel put e.g. "msg" ~> ch
exports['~>'] = reader.infix(7.5);

// examples often use go's simple no-condition for {...}
exports['for'] = function(lexer) {
  // is this the no-condition for {...} ?
  if(lexer.on(/for\s*{/)) {
    // note: The "fors" keyword transpiler is in the "statements"
    //   dialect which they should #use *before* they #use "csp"
    //   because we fall back to them.
    var forToken = lexer.next_token('for');
    var list = sl.list(sl.atom("for", {token: forToken}));
    // push an empty condition - this generates a "for (;;)"
    list.pushFromArray(["","",""]);
    // push the body
    list.push(reader.read_delimited_list(lexer, '{', '}', [sl.atom("begin")]));
    return list;
  }

  // this was not the empty condition for {...}
  // let the next "for" syntax handler down take it:
  return reader.retry;
};

},{"debug":10,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43}],51:[function(require,module,exports){

module.exports = {
  name: "css",
  lextab: require('./lextab'),
  readtab: require('./readtab')
};

},{"./lextab":52,"./readtab":54}],52:[function(require,module,exports){

module.exports = [

  // semicolons delimit css properties
  // note: without this semicolons get treated as comments and cause problems!
  {
    category: 'linecomment',
    match: /\/\//g,
    replace: true
  }

];

},{}],53:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    debug = require('debug')('sugarlisp:css:syntax:debug'),
    trace = require('debug')('sugarlisp:css:syntax:trace');

// read list of css selectors
exports.read_css_rules = function(source, start, end, initial) {
    debug("reading css rule set found inside a <style> tag");
    start = start || '<style>';
    end = end || '</style>';
    var styleToken = source.next_token(start);
    var list = (initial && sl.isList(initial) ? initial :
            sl.list(sl.atom("css-style-tag", {token: styleToken})));
    var nextSelector;
    while (!source.eos() && !source.on(end)) {

      source.skip_whitespace();

      nextSelector = read_css_rule_set(source);

      // some "directives" don't return an actual form:
      if(!reader.isignorableform(nextSelector)) {
        list.push(nextSelector);
      }
    }
    if (source.eos()) {
        source.error("Missing \"" + end + "\" ?  (expected \"" + end + "\", got EOF)", startToken);
    }
    list.setClosing(nextSelector);
    source.next_token(end); // skip the end token
    return list;
}

// read a css rule set consisting of a selector and declaration block
// e.g. "body { color: red; }"
function read_css_rule_set(source) {

  // read the first selector
  // note this function expects source is sitting on the selector
  var selectorToken = source.next_token(/([a-zA-Z0-9]+|([a-zA-Z0-9]+)?\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*|\#[_a-zA-Z]+[a-zA-Z0-9_\-\:\.]+)/g);
  trace('reading css rule set with selector "' + selectorToken.text + '"');
  var list = sl.list("css-selector", selectorToken);

  // the declaration block part i.e. the "{ color: red; }" part is read on it's own
  var stylesForm = reader.read(source);

  // but it better be some styles:
  if(sl.isList(stylesForm) && stylesForm.length > 0 &&
    sl.typeOf(stylesForm[0]) === 'symbol' && sl.valueOf(stylesForm[0]) === 'css') {
      list.push(stylesForm);
  }
  else {
    source.error("CSS selector without style definitions", selectorToken);
  }

  return list;
}

// read css declarations i.e. the "{color: red; }" part of "body { color: red; }"
exports.read_css_declaration_block = function(source) {

  trace("reading the css declaration block for a selector (i.e. that part between {})");

  // we expect to called when source is on the opening {
  var startToken = source.next_token("{");
  var list = sl.list(sl.atom("css", {token: startToken}));

  source.skip_whitespace();
  while(!source.eos() && !source.on('}')) {

    var decl = read_css_declaration(source);
    if(decl && decl.propertyForm && decl.valueForm) {
      list.push(decl.propertyForm);
      list.push(decl.valueForm);
    }

    source.skip_whitespace();
  }
  if (source.eos()) {
      source.error("Missing '" + '}' + "', for CSS style definitions", token);
  }
  var endToken = source.next_token('}');
  list.setClosing(endToken);

  return list;
}

/**
* Read a style declaration and return as
*  { propertyForm: prop, valueForm: value}
*/
function read_css_declaration(source) {

  trace('reading a single css declaration within a block (i.e. a "property: value;")');

  var decl = {};
  var stylePropertyToken = source.till(':');
  var stylePropertySymbol = sl.atom(stylePropertyToken);
  decl.propertyForm = stylePropertySymbol;
  trace('the property is "' + decl.propertyForm.value + '"');


  // colons are an individual char separating the pairs:
  // we just skip the colon lispy doesn't use them
  source.skip_text(":");

  // read the style's value:
  decl.valueForm = read_css_declaration_value(source);
  trace('the value is "' + decl.valueForm.value + '"');

  return decl;
}

/**
* Read a declaration value (which may contain multiple comma separated parts)
* If there are commas it's read into a lispy array, otherwise as a symbol
*/
function read_css_declaration_value(source) {
  var list = sl.list("array");

  // read the style's value:
  // We can't go back thru the top level reader since it's assuming things
  // are selectors - I'm missing some notion of context -
  // so is this where this is worthy of a readtable of it's own?
  //    list.push(reader.read(source));
//  var styleValueToken = source.till(/[\;\}]/g);

  source.skip_whitespace();
  while (!source.eos() && !source.on(/[\;\}]/g)) {
    // we use read so that quoted values versus symbols or
    // even math expressions etc. can be used in style values
    var valueForm = reader.read(source);

    // some "directives" don't return an actual form:
    if(!reader.isignorableform(valueForm)) {
      list.push(valueForm);
    }
  }
  if (source.eos()) {
      source.error('Missing ";" or "}" in style declaration', source);
  }
  if(source.on(';')) {
    source.next_token(';'); // skip the end delimiter
  }

  // if it's an array of one don't make it an array at all
  if(list.length <= 2) {
    return list[1];
  }

  return list;
}

},{"debug":10,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43}],54:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    rfuncs = require('./readfuncs'),
    plusrfuncs = require('sugarlisp-plus/readfuncs');

// WHAT YOU REALLY NEED IS A WAY TO SAY IF YOU SEE <style>
// ENABLE THIS READTABLE ON THE FRONT OF THE LIST OF READTABLES
// other question: likewise the valid compile functions like
// cssselector and css should only be visible in the *scope*
// of the style *expression* (similar to but slightly different
// from how the readtable stuff works)
// other question - how am I converting this to a tag?  this
//   part belongs in the html module which can generate the tag
//   *and* as a side effect also enable this readtable
exports['<style>'] = function(lexer) {
  return rfuncs.read_css_rules(lexer);
};

// THEN LIKEWISE THAT WHEN YOU SEE </style> REMOVE THIS READTABLE
// FROM THE FRONT OF THE LIST OF READTABLES
exports['</style>'] = reader.unexpected;

// style definitions
// HERES ANOTHER EXAMPLE OF MISSING CONTEXT SENSITIVITY
// THIS IS EFFECTIVELY GLOBAL OVERRIDING THE JSON AND
// CODE BLOCK USE OF '{' - IT CANT REMAIN THIS WAY
// READTABLES HAVE TO DYNAMICALLY PLUG INTO THE reader
// WHEN THEY HIT SOME SYNTAX THAT TRIGGERS A TRANSITION
// TO THE SYNTAX FOR THE OTHER "DIALECT", WHEREAS THE
// COMPILE FUNCTIONS SHOULD BE HANDLED MORE LIKE "SCOPES"
// I.E. A DIALECT CAN ADD HANDLER FUNCTIONS THAT ONLY APPLY
// WITHIN THE SCOPE OF ONE (OR ALL) OF *IT'S* EXPRESSIONS
exports['{'] = function(lexer) {
  return rfuncs.read_css_declaration_block(lexer);
};
exports['}'] = reader.unexpected;

exports[','] = reader.unexpected;

exports[';'] = reader.unexpected;

exports['\"'] = function(lexer) {
  // a template string becomes either 'str' or (str...)
  return plusrfuncs.read_template_string(lexer, '"', '"', ['str']);
};

// this is a good reference:  http://www.w3schools.com/css/css_selectors.asp
// (most obviously I've ignored the "Grouping Selectors" part - need to revisit)

// ALSO NOTE I'VE NOT SUPPORTED CSS COMMENTS AS DESCRIBED HERE
// http://www.w3schools.com/css/css_syntax.asp
// RIGHT NOW THEY WOULD WORK BECAUSE THEY LOOK LIKE JAVASCRIPT COMMENTS
// BUT AGAIN - THINGS ARENT RIGHT NOW - I SHOULDNT BE GETTING "LUCKY"
// OR UNLUCKY LIKE THIS WITH THE SYNTAXES MINGLING TOGETHER - IF
// CSS COMMENTS ARE /* .. */ AND NOT // THEN THAT NEEDS TO BE
// EXPLICITLY CODED FOR SO /* .. */ IS ACCEPTED AND // IS AN ERROR

/*
exports.rulesafter = [
  {
    // css selector
    match:
      // this is html elem, elem?.class, #id, or  (need to double check correctness)
      /([a-zA-Z0-9]+|([a-zA-Z0-9]+)?\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*|\#[_a-zA-Z]+[a-zA-Z0-9_\-\:\.]+)/g,
    read:
      function(lexer) {
        return rfuncs.read_selector(lexer);
      }
  }
];
*/

},{"./readfuncs":53,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-plus/readfuncs":71}],55:[function(require,module,exports){
/**
 * Javascript code generation for SugarLisp html
 */

var sl = require('sugarlisp-core/sl-types'),
    lex = require('sugarlisp-core/lexer'),
    reader = require('sugarlisp-core/reader'),
    utils = require('sugarlisp-core/utils'),
    debug = require('debug')('sugarlisp:html:keywords:debug'),
    trace = require('debug')('sugarlisp:html:keywords:trace');

// we generate plain html in "static" mode
// we generate javascript code that creates html strings in "dynamic" mode

// sugarlisp calls this function when a new html dialect is used
exports["__init"] = function(source, dialect) {
   // the default mode differs based on the file extension
   dialect.html_keyword_mode = getDefaultHtmlKeywordMode(source);
},

// an xhtml tag
exports["tag"] = function(forms) {

  // a tag must at the very least have a tag name:
  if (forms.length < 2) {
    forms.error("missing tag name");
  }

  var generated;

  // just popoff "tag" from the front of the expression
  var tagForm = forms.shift();

  // and see if that works as an expression
  // i.e. if the tag name is a function or macro we can call
  // (passthru false means *dont* pass things like e.g.
  //  e.g. "console.log" through to the output code)
  forms[0].value = sl.stripQuotes(sl.valueOf(forms[0]));
  var generated = this.transpileExpression(forms, {passthru: false});
  if(!generated) {
    trace((forms[0] && sl.valueOf(forms[0]) ? sl.valueOf(forms[0]) : "form") +
            " was not a macro or function")
    // add the quotes back
    forms[0].value = sl.addQuotes(sl.valueOf(forms[0]));
    // put "tag" back on the front
    forms.unshift(tagForm);
    generated = renderTag.call(this,forms); // render it to static or dynamic html
  }
  return generated;
}

function renderTag(forms) {
  var generated = sl.generated()

  this.indent += this.indentSize

  var tagName = sl.stripQuotes(sl.valueOf(forms[1]));
  var tagAttributes;
  var tagBody;
  if(forms.length > 2) {
    var formPos = 2;
    if(sl.isList(forms[formPos]) &&
        forms[formPos].length > 0 &&
        sl.valueOf(forms[formPos][0]) === 'attr') {
          tagAttributes = this.transpileExpression(forms[formPos]);
        formPos++;
    }
    if(formPos < forms.length) {
        if(Array.isArray(forms[formPos])) {
          tagBody = this.transpileExpression(forms[formPos]);
        }
        else {
          tagBody = forms[formPos].toString();
        }
    }
  }

  var dyn = (getHtmlKeywordMode(forms) === 'dynamic');
  generated.push(dyn ? ' (\n"\\n' : '\n');
  // delete? generated.push(dyn ? ' (\n"' : '\n');
  generated.push(" ".repeat(this.indent) + "<" + tagName);
  if(tagAttributes) {
    generated.push(tagAttributes);
  }
  if(tagBody) {
    var endTag = '</' + tagName + '>';
    if(dyn) {
      generated.push('>" +');
      generated.push(((typeof tagBody === 'string') ? "\n" + " ".repeat(this.indent+this.indentSize) : ""));
      generated.push(tagBody + ' +\n"\\n');
      generated.push(" ".repeat(this.indent) + endTag + '")');
    }
    else {
      generated.push('>');
      generated.push(((typeof tagBody === 'string') ?
                "\n" + " ".repeat(this.indent+this.indentSize) : ""));
      generated.push((typeof tagBody === 'string' ?
                tagBody.replace(/^[\'\"]|[\'\"]$/g, '') : tagBody) + '\n');
      generated.push(" ".repeat(this.indent) + endTag);
    }
  }
  else {
    if(tagName === "script") {
        // browsers are stupid about <script/>!!
        generated.push("></script>" + (dyn ? '")' : ""));
    }
    else {
      generated.push('/>' + (dyn ? '")' : ""));
    }
  }

  this.indent -= this.indentSize;

  if(!dyn) {
    this.noSemiColon = true;
  }

  return generated;
}

// the attributes of an xhtml tag
exports["attr"] = function(forms) {
    var generated = sl.generated();

    if (forms.length == 1) {
        // no attributes
        return generated;
    }

    this.transpileSubExpressions(forms)

    // if dynamic we have to escape the quotes around strings
    // since this winds up inside a quoted string of html
    var dyn = (getHtmlKeywordMode(forms) === 'dynamic');
    var q = (dyn ? '\\"' : '"');

    for (var i = 1; i < forms.length; i = i + 2) {
      if(sl.typeOf(forms[i+1]) === 'string') {
        generated.push([' ', sl.valueOf(forms[i]), '=' + q, sl.stripQuotes(sl.valueOf(forms[i+1])), q]);
      }
      else {
        generated.push([' ', sl.valueOf(forms[i]), '=' + q + '\" + ', forms[i+1].toString(), ' + \"' + q]);
      }
    }

    return generated;
}

// "tagjoiner" is smart about only emitting "+" in dynamic mode
// (originally we got by using simply "+" before there was static mode)
exports["tagjoiner"] = function(forms) {
    if (forms.length < 3)  {
      forms.error("binary operator requires two or more arguments");
    }

    var generated;
    var dyn = (getHtmlKeywordMode(forms) === 'dynamic');
    this.transpileSubExpressions(forms);

    // get rid of "tagjoiner" so it doesn't pass thru
    forms.shift();

    if(dyn) {
      // '+' joins the html strings in dynamic mode
      var op = sl.generated();
      op.push([" ", "+", " "]);
      generated = sl.generatedFromArray(forms);
      generated.join(op); // inserts "+" between the forms
    }
    else {
      // in static mode we put out the text alone (no "+" and no quotes)
      generated = sl.generated();
      forms.forEach(function(form, i) {
        if(sl.typeOf(form) === 'string') {
          generated.push(sl.valueOf(form).replace(/^\"|\"$/g, ''));
        }
        else {
          generated.push(form);
        }
        if(i < forms.length-1) {
          generated.push(" ");
        }
      })
    }
    return generated;
}

function getHtmlKeywordMode(forms) {
  var dialect = sl.lexerOf(forms).dialects.find(function(dialect) {
	           return dialect.name === "html";
                });
  if(!dialect || dialect.name !== "html") {
    console.log("warning: failed to find an html dialect used in this file");
    return getDefaultHtmlKeywordMode(forms);
  }
  return dialect.html_keyword_mode;
}

function getDefaultHtmlKeywordMode(formsOrLexer) {
  //return "dynamic"; // uncomment for testing
  var lexer;
  if(formsOrLexer instanceof lex.Lexer) {
    lexer = formsOrLexer;
  }
  else {
    lexer = sl.lexerOf(formsOrLexer);
    if(!lexer) {
      console.log("warning:  no lexer found on forms in html keyword handler.");
    }
  }
  return (lexer.filename.indexOf(".lsml") !== -1 ?
                           "static" : "dynamic");
}

},{"debug":10,"sugarlisp-core/lexer":33,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/utils":45}],56:[function(require,module,exports){

module.exports = {
  name: "html",
  lextab: require('./lextab'),
  readtab: require('./readtab'),
  gentab: require('./gentab')
};

},{"./gentab":55,"./lextab":57,"./readtab":59}],57:[function(require,module,exports){
module.exports = [
  // inner html shorthand <<>>
  // might wrap a simple var i.e. <<elem>>, or a dom selector i.e. <<$#elem>>
  {
    category: 'innerhtml',
    match: /<<[\$a-zA-Z\-\_]+[\#a-zA-Z0-9\-\_]*>>/g
  },

  // html start tag
  {
    category: 'starttag',
    match: /<[a-zA-Z\-\_]+[a-zA-Z0-9\-\_]*/g
  },

  // html end tag
  {
    category: 'endtag',
    match: /<\/[a-zA-Z\-\_]+[a-zA-Z0-9\-\_]*>/g
  },

  // we define ">>" as a symbol so the reader stops at the
  // right point when reading e.g. the "elem" in <<elem>>
  {
    category: 'symbol',
    match: />>|\/>|=>|<=|>=|===|==|\$#|##=|#=/g
  },

  {
    category: 'punctuation',
    match: /<|>|\/|=/g
  }
];

},{}],58:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    plusrfuncs = require('sugarlisp-plus/readfuncs');

// parse an html element (when the parser has just encountered the opening "<")
exports.read_html_element = function(source) {

  var openingBracket = source.next_token("<");  // skip the angle bracket

  var list = sl.list(sl.atom("tag", {token: openingBracket}));

  var tagNameToken = source.next_token(/([a-zA-Z0-9\-\_]+)/g);
  list.push(sl.str(tagNameToken.text, {token: tagNameToken}));

  var tagAttributes = exports.read_html_attributes(source);
  if(tagAttributes && tagAttributes.length > 0) {
    list.push(tagAttributes);
  }

  var tagBody;
  if(source.on('>')) {
      var expectedEndTag = '</' + tagNameToken.text + '>';

      // in an lsml page, we may encounter:
      //   <script type="text/sugarlisp">
      // in which case we read the content as lispy code not html
      if(tagNameToken.text === 'script' &&
        ((t = find_attr_value(tagAttributes, 'type')) &&
        t.value === 'text/sugarlisp') &&
        !find_attr_value(tagAttributes, 'src')) {
          // yup it's an inline script tag containing lispy code
          // little hacky - but the output is javascript!
          t.value = 'text/javascript';
          source.skip_token('>'); // skip token also gets following spaces

          // we allow them to use html in this inline sugarlisp,
          // but we need a new dialect that uses the "dynamic" html
          // generation mode (i.e. creating strings of html at run
          // time)
          var dyndialect = reader.use_dialect_module("html", source, {
                rootform: list,
                filelevel: false
          });
          dyndialect.html_keyword_mode = "dynamic";
          tagBody = sl.list();
          // we're missing a return after the script tag:
          tagBody.prelude = "\n\n";
          source.new_dialect(dyndialect, tagBody);

          while (!source.eos() && !source.on(expectedEndTag)) {
            var nextform = reader.read(source);

            // some "directives" don't return an actual form:
            if(!reader.isignorableform(nextform)) {
              tagBody.push(nextform);
            }
          }

          if (source.eos()) {
              source.error('Missing "' + expectedEndTag + '" + tag?', tagNameToken);
          }

          // the top level delimits subexpressions differently
          tagBody.__toplevel = true;
          source.skip_text(expectedEndTag);
      }
      else {
        // the tag's body is treated as if it were an automatically quoted
        // template string, except that other html tags may be there too...

        // not yet sure if the ability to read html tags belongs as an option
        // passed to read_template_string or if it's just a separate function of
        // it's own e.g. read_html_body.  Note that we don't want the body to
        // be an (str...) if the only child is another html tag (despite what
        // the line below suggests)
        var concat = sl.atom('tagjoiner');
        concat.noparens = true;
        tagBody = exports.read_html_body(source, '>', expectedEndTag, [concat]);
      }
  } else if(source.on('/>')) {
    source.skip_text('/>');
    tagBody = [] // empty tag
  }
  else {
    reader.error("Malformed html tag...", source);
  }

  if(tagBody && !(Array.isArray(tagBody) && tagBody.length === 0)) {
    list.push(tagBody);
  }
  return list;
}

exports.read_html_attributes = function(source) {

  // they can use a lispy expression to derive their tag attributes
  // e.g. <div (attr id "mydiv")/>
  // this can be useful in macros, etc.
  if(source.on("(")) {
    return reader.read(source);
  }

  // "attr" is really just a synonym for "object"
  var list = sl.list("attr");
  list.setOpening(source);

  var ch;
  var atLeastOneAttribute = false;
  // the attributes end at either ">" or "/>" ...
  while (!source.eos() && (ch = source.peek_char()) && (ch !== ">" && ch !== "/")) {
    // read the attribute name and add the lispy form:
    list.push(source.next_word_token());
    source.skip_whitespace();

    if(source.on("=")) {
      source.skip_text("=");

      // read the attribute value (which may include ${} placeholders)
      var attrVal = plusrfuncs.read_template_string(source, undefined, undefined, ['+']);
      list.push(attrVal);
    }
    else {
      // it's not common but sometimes in html there's no equals e.g. "<option selected/>"
      list.push(sl.atom(true));
    }

    atLeastOneAttribute = true;
  }
  if (ch !== ">" && ch !== "/") {
      reader.error("Missing end to tag attributes", source);
  }
  if(!atLeastOneAttribute) {
    list.shift();  // return just () not (attr...)
  }
  list.setClosing(source);

  list = plusrfuncs.even_keys_to_list_properties(list);

  // note we have intentionally *not* read the ending ">" or "/>"
  return list;
}

// find the value form with the given name in the attribute forms,
// otherwise undefined
function find_attr_value(attrForms, attrName) {
  var attrVal;
  var attrPos = -1;
  if(attrForms && Array.isArray(attrForms)) {
    attrKey = attrForms.find(function (form, i) {
      attrPos = i;
      return (i % 2 === 1) && form.value === attrName;
    })
    if(attrKey && attrPos+1 < attrForms.length) {
      attrVal = attrForms[attrPos+1];
    }
  }
  return attrVal;
}

// Text in html tags default to being a string, unlike in lispy code
// where they default to being symbols (and strings must be quoted).
// Otherwise lispy expressions must be wrapped in ${}, but html tags
// can be nested normally.
exports.read_html_body = function(source, start, end, initial) {

  var openingBracket = source.next_token(start);
  var strlist = sl.listFromArray(initial || []);
  strlist.setOpening(openingBracket);

  // note we're no longer tokenizing delimited "words"
  // (an html body is text i.e. like a string just without the quotes)
  var text = "";
  source.mark_token_start();

  // scan looking for the ending
  while(!source.eos() && !source.on(end)) {

    // have we hit the start of an ${} escape?
    if(source.on('${')) {
      // add the preceding text
      if(text !== "") {
        text = sl.addQuotes(sl.escapeNewlines(text));
        strlist.push(sl.str(text, {token: source.create_token(text)}));
        text = "";
      }
      source.skip_text("${");
      strlist.push(reader.read(source))
      source.skip_filler();
      source.assert('}',"Missing end for ${");
      source.skip_char("}");
      source.mark_token_start();
    }
    // a tag name starts '<' then alphabetical after that...
    else if(source.on(/<[a-zA-Z\-\_]/g, true)) {
      // add the preceding text
      if(text !== "") {
        text = sl.addQuotes(sl.escapeNewlines(text));
        strlist.push(sl.str(text, {token: source.create_token(text)}));
        text = "";
      }
      // add the child html tag(s):
      strlist.push(exports.read_html_element(source));
    }
    else {
      // it was just normal text (accumulate it till some delimiter is found)
      text += source.next_char();
    }
  }

  // we should be at the end of the template string now
  source.assert(end, "Missing end of html body");
  source.skip_text(end);

  // add any text between last ${} or html tag and the end
  if(text !== "") {
    text = sl.addQuotes(sl.escapeNewlines(text));
    strlist.push(sl.str(text, {token: source.create_token(text)}));
  }

  if(strlist.length === 1) {
    strlist.shift(); // the body was empty - it's *not* a (str...)
  }
  else if(strlist.length === 2) {
    strlist = strlist[1]; // the body was just a single string or html tag
  }

  return strlist;
}

},{"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-plus/readfuncs":71}],59:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    rfuncs = require('./readfuncs');

// inner html shorthand <<>>
// might wrap a simple var i.e. <<elem>>, or a dom selector i.e. <<$#elem>>
exports['*:innerhtml'] = function(lexer) {
  // skip the "<<" brackets
  // note our regex is very specific so no concern over "<<" operator here
  var openingBracketsToken = lexer.skip_token("<<");

  // we generate:
  //   (.innerHTML expr)
  // where expr means what was inside ie. <<expr>>
  var list = sl.list(".innerHTML");
  list.setOpening(openingBracketsToken);

  // read what's inside normally
  list.push(reader.read(lexer));

  // skip the ending brackets
  var closingBrackets = lexer.skip_text(">>");

  return list;
};

// $#element is a convention for referring to DOM elements
// ($# meant to be reminiscent of jquery's $("#element")
exports['$#'] = function(lexer) {
  lexer.skip_text('$#');
  var nextForm = reader.read(lexer);
  var list = sl.list("document.getElementById", sl.str(sl.valueOf(nextForm)));
  list.setOpening(nextForm);
  return list;
}

// this is kind of a hacky way to ensure "read" doesn't misinterpret
// the ending ">>" as an infix right shift operator:
exports['>>'] = reader.postfix(15, {enabled:false});

// start of html tag
exports['*:starttag'] = function(lexer) {
  return rfuncs.read_html_element(lexer);
};

},{"./readfuncs":58,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43}],60:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    utils = require('sugarlisp-core/utils');

exports["match"] = function(forms, macroexpander) {
    var js;

    if (forms.length !== 3) {
      forms.error("match expects something to match followed by a body containing match cases (wrapped in {} or lispy (do..))");
    }

    var matchAgainst = (Array.isArray(forms[1]) ? this.transpileExpression(forms[1]) : forms[1]);

    // match cases are placed in a "do" (or "begin") code block (i.e. {})
    var matchCases = forms[2];
    if(sl.typeOf(matchCases[0]) === 'symbol' &&
      (sl.valueOf(matchCases[0]) === "do" || sl.valueOf(matchCases[0]) === "begin")) {
      matchCases.shift();
    }

    js = sl.generated();
    js.push(["return match(", matchAgainst.toString(), ", function(when) {\n"]);

    this.indent += this.indentSize;
    var that = this;
    matchCases.forEach(function(matchCase) {
      js.push(that.transpileExpression(matchCase));
    });
    this.indent -= this.indentSize;

    js.push([" ".repeat(this.indent),"}, this)"]);

    return js;
}


// "match functions" can match their (otherwise undeclared) array of arguments.
// note: here we intentionally override "function" from core
exports["function"] = function(forms) {
    var js,fName;

    if (forms.length < 2) {
      forms.error("missing arguments:  function declarations require an argument list and function body");
    }

    // the forms includes "function" on the front of the expression:
    var astPos = 1 // so we start 1 not 0
    if(sl.typeOf(forms[astPos]) === 'symbol') {
      // a named function
      fName = forms[1]
      astPos++
    }

    // A match function has no args list it's *just* the body
    if((forms.length - astPos) !== 1) {
      // we don't handle this let a lower dialect take it:
      return undefined;
    }

    // it is a match function (or else it's malformed!)
    var matchBody = forms[astPos];
    var source = forms.sourcer;
    var matchExpr = sl.list("match", "args", forms[astPos]);

    // note: "function" or "function*" below depending on how we were invoked
    js = sl.generated()
    js.push(sl.valueOf(forms[0]) + (fName ? " " + sl.valueOf(fName) : "") + "() {\n")
    this.indent += this.indentSize;
    js.push([" ".repeat(this.indent), "var args = Array.prototype.slice.call(arguments);\n"]);
    js.push([" ".repeat(this.indent), this.transpileExpression(matchExpr)]);
    this.indent -= this.indentSize;
    js.push("\n}");

    if(fName)
      this.noSemiColon = true

    return js;
}

},{"sugarlisp-core/sl-types":43,"sugarlisp-core/utils":45}],61:[function(require,module,exports){

module.exports = {
  name: "match",
  onuse: "sugarlisp-match/usematch.js",
  lextab: require('./lextab'),
  readtab: require('./readtab'),
  gentab: require('./gentab')
};

},{"./gentab":60,"./lextab":62,"./readtab":68}],62:[function(require,module,exports){
module.exports = [

  // the :: symbol separates a match var from it's type
  {
    category: 'symbol',
    match: /\:\:/g
  }

];

},{}],63:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    utils = require('sugarlisp-core/utils'),
    coregentab = require('sugarlisp-core/gentab'),
    debug = require('debug')('sugarlisp:match:matchexpr-keywords:debug'),
    trace = require('debug')('sugarlisp:match:matchexpr-keywords:trace');

exports["case"] = function(forms) {

    if (forms.length < 3) {
      forms.error("match \"case\" expects a match pattern followed by a code block");
    }

    var source = sl.lexerOf(forms);
    var pattern = forms[1];
    var templateBody = forms[2];
    var js = sl.generated();
    var argNames = [];

    js.push([" ".repeat(this.indent),"when("]);

    if(sl.isList(pattern)) {
      // get just the match var names from the pattern
      argNames = (pattern.map(function(patt) {
        var name;
        if(sl.typeOf(patt) === 'symbol' &&
          sl.valueOf(patt) !== 'array' && sl.valueOf(patt) != 'quasiquote') {
          name = sl.valueOf(patt);
        }
        else if(sl.isList(patt) && patt[0] && sl.valueOf(patt[0]) &&
          (sl.valueOf(patt[0]) === '::' || sl.valueOf(patt[0]) === 'match.var')) {
            name = sl.stripQuotes(sl.valueOf(patt[1]));
        }
        return name;
      })).filter(function(name) { return typeof name !== 'undefined'; });

      if(argNames.length > 0) {
        var lastVar = argNames[argNames.length-1];
        if(lastVar.indexOf('...') !== -1) {
          pattern.pop();  // pattern-match module *defaults* to setting _rest
        }
      }

      // transform simple match var patterns as if they'd entered "var::any"
      // note: extra care needed below since map creates a *new* array
      var originalParent = pattern.parent;
      pattern = pattern.map(function(patt) {
        var withMatchType = patt;
        var originalParent = patt.parent;
        if(sl.typeOf(patt) === 'symbol' &&
          sl.valueOf(patt) !== 'array' && sl.valueOf(patt) != 'quasiquote') {
          withMatchType = varMatchingAny(patt);
        }
        else if(sl.typeOf(patt) === 'string') {
          withMatchType = symbolMatching(patt);
        }
        if(!withMatchType.parent) {
          withMatchType.parent = originalParent;
        }
        return withMatchType;
      });
      pattern = Array.isArray(pattern) ? sl.listFromArray(pattern) :  pattern;
      pattern.parent = originalParent;
    }

    var patternSource = sl.isList(pattern) ? this.transpileExpression(pattern) : pattern;
    js.push(patternSource.toString());
    js.push([",\n"," ".repeat(this.indent),"function(vars) {\n"]);
    if(argNames.length > 0) {
      // now we wrap the body to destructure "vars" to the names they expect:
      var matchVarsToArgsFnForm = sl.list("function");
      var argNamesForms = argNames.map(function(name) {
        return sl.atom(name.indexOf('...') === -1 ? name : name.substring(3));
      });
      matchVarsToArgsFnForm.push(sl.listFromArray(argNamesForms));
      matchVarsToArgsFnForm.push(templateBody);
      // let the normal function code template translate this:
// SHOULDNT INDENT GO UP AND DOWN BY ONE AND OTHERWISE BE SCALED AUTOMATICALLY?
      this.indent += this.indentSize;
      var templateFn = coregentab["function"].call(this, matchVarsToArgsFnForm);
      trace("templateFn is:", templateFn.toString());
      // next we invoke the function using run-time arguments
      // and making sure to pass through our "this" (otherwise
      // it's confusing since they don't see these functions in
      // the sugared syntax)
      js.push([' '.repeat(this.indent),'return (',
              templateFn,
            ').call(this, ',matchVarsToArgsFnCallArgsToJs(argNames),');\n']);
      this.indent -= this.indentSize;
    }
    else {
      // no match vars so no need to wrap the template body
      templateBody = sl.isList(templateBody) ? this.transpileExpression(templateBody) : templateBody;
      js.push([' '.repeat(this.indent + this.indentSize), "return ", sl.valueOf(templateBody), ";\n"]);
    }
    js.push([" ".repeat(this.indent), "}, this);\n"]);
    trace('matchCaseToJs returning:', js.toString());
    return js
}

// return forms for a var matching anything
function varMatchingAny(varnameAtom) {
  return sl.list(sl.atom("::", {token: varnameAtom}), varnameAtom, sl.str("any"));
}

// return forms for matching a symbol
// (to distinguish symbols from match var names they are quoted in the patterns)
function symbolMatching(symbolAtom) {
  return sl.list(sl.atom("::", {token: symbolAtom}), symbolAtom, "slsymbol");
}

exports["default"] = function(forms) {
  // "default" is just sugar for a normal case matching anything
  var defaultCaseForm = sl.list("case", defaultMatch(), forms[1]);
  defaultCaseForm.setParents(sl.parentOf(forms));
  return this.transpileExpression(defaultCaseForm);
}

// return forms for the default match
function defaultMatch() {
  var pattern = sl.list("match.var", "\"any\"", "match.sldefault");
  return sl.list("array", pattern);
}

function matchVarsToArgsFnCallArgsToJs(matchVarNames) {
  var js = "";
  matchVarNames.forEach(function(argName, i) {
    if(argName.indexOf('...') !== -1) {
      argName = "_rest";
    }
    js += "vars[\"" + argName + "\"]";
    if(i < (matchVarNames.length-1)) {
      js += ', '
    }
  });
  return js;
}

/**
* the :: match type expression
* note:  this has been transformed by the reader from infix to prefix
*/
exports["::"] = function(forms) {
    var js;
    trace(':: forms:', forms);
    if (forms.length < 3) {
      forms.error("missing arguments:  match type expressions should be of the form var::type");
    }

    if(sl.typeOf(forms[1]) === 'symbol') {
      var varname = sl.valueOf(forms[1]);
      var typename = sl.valueOf(forms[2]);
      if(varname.indexOf("...") !== -1 && typename !== 'slrest') {
        console.warn('var name "' + varname + '" with inappropriate match type of "' + typename + '"');
        typename = 'rest';
      }

      js = sl.generated();
      js.push([this.margin(), "match.var(\"",varname, "\", match.", sl.stripQuotes(typename), ")"]);
    }
    else if(sl.typeOf(forms[1]) === 'string') {
      var str = sl.valueOfStr(forms[1]);
      js = sl.generated();
      js.push(['function(sym) { return sym.value === "', str, '"; }']);
    }

    return js;
 }

},{"debug":10,"sugarlisp-core/gentab":31,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/utils":45}],64:[function(require,module,exports){
var reader = require('sugarlisp-core/reader');

// infix type matching expression (e.g. "atom::lsatom", "list::lslist", etc)
// OLD DELETE exports['::'] = reader.infixtoprefix;
exports['::'] = reader.infix(1.5);

// COPIED THESE DOWN FROM SCRIPTY, NOW THAT I
// CREATE READER.SYMBOLS IN THE SYNTAX TABLE FOR
// KEYWORDS IN A DIALECT OMITTED FROM IT'S SYNTAX
// TABLE (WHICH DOES SEEM LOGICAL) - I'VE WOUND UP
// BREAKING THINGS IF SCRIPTY IS BEING USED,
// BECAUSE MATCH NOW SITS ON *TOP* OF SCRIPTY!!
// SO WITHOUT THE TWO ENTRIES BELOW, RIGHT NOW
// THE PAREN-FREE USE OF CASE AND DEFAULT DON'T
// WORK RIGHT THE SYNTAX HANDLERS FOR CASE AND
// AND DEFAULT DONT EVEN GET CALLED!  IT SEEMS
// LIKE MY ORIGINAL DESIGN WHERE SCRIPTY SAT
// ON *TOP* OF MATCH WAS THE RIGHT ONE?
// ISNT THAT A SIMPLE MATTER OF HAVING SCRIPTY
// EXTEND MATCH IN IT'S INDEX.JS FILE?

// match case/default do not need parens in scripty:
exports['case'] = reader.parenfree(2);
exports['default'] = reader.parenfree(1);

},{"sugarlisp-core/reader":41}],65:[function(require,module,exports){

// Local dialect (syntax and keywords) for just
// the "match" expression alone.  This makes
// the "::" syntax, "case" and "default" local
// to the match dialect rather than global

module.exports = {
  readtab: require('./matchexpr-readtab'),
  gentab: require('./matchexpr-gentab')
};

},{"./matchexpr-gentab":63,"./matchexpr-readtab":64}],66:[function(require,module,exports){
(function (global){
function match(actual, body, thisArg) {
    // If body is not provided, then do a single-case ("irrefutable") match.
    if (typeof body === 'undefined') {
        return {
            // Now that we have the single case, do the match.
            when: function(pattern, template, thisArg) {
                return matchCases(actual, [{
                    pattern: pattern,
                    template: template,
                    thisArg: thisArg
                }]);
            }
        }
    }

    // If body is provided, call it to obtain the array of cases.
    var cases = [];

    if (typeof thisArg === 'undefined')
        thisArg = global;

    body.call(thisArg, function(pattern, template, thisArg) {
        cases.push({
            pattern: pattern,
            template: template,
            thisArg: thisArg
        });
    });

    // Now that we have all the cases, do the match.
    return matchCases(actual, cases);
}

function matchCases(actual, cases) {
    for (var i = 0, n = cases.length; i < n; i++) {
        var c = cases[i];
        try {
            var matches = {};
            matchPattern(c.pattern, actual, matches);
            return c.template
                 ? c.template.call(typeof c.thisArg === 'undefined' ? global : c.thisArg, matches)
                 : matches;
        } catch (e) {
            if (e instanceof MatchError)
                continue;
            throw e;
        }
    }
    throw new MatchError(cases, actual, "no more cases");
}

function MatchError(expected, actual, message) {
    Error.call(this, message);
    if (!('stack' in this))
        this.stack = (new Error).stack;
    this.expected = expected;
    this.actual = actual;
}

MatchError.prototype = Object.create(Error.prototype);

function matchPattern(pattern, actual, matches) {
    if (pattern instanceof Pattern) {
        pattern.match(actual, matches);
    } else if (Array.isArray(pattern)) {
        matchArray(pattern, actual, matches);
    } else if (typeof pattern === 'object') {
        if (!pattern)
            matchNull(actual);
        else if (pattern instanceof RegExp)
            matchRegExp(pattern, actual);
        else
            matchObject(pattern, actual, matches);
    } else if (typeof pattern === 'string') {
        matchString(pattern, actual);
    } else if (typeof pattern === 'number') {
        if (pattern !== pattern)
            matchNaN(actual);
        else
            matchNumber(pattern, actual);
    } else if (typeof pattern === 'boolean') {
        matchBoolean(pattern, actual);
    } else if (typeof pattern === 'function') {
        matchPredicate(pattern, actual);
    } else if (typeof pattern === 'undefined') {
        matchUndefined(actual);
    }
}

function matchNull(actual, matches) {
    if (actual !== null)
        throw new MatchError(null, actual, "not null");
}

function matchArray(arr, actual, matches) {
    if (typeof actual !== 'object')
        throw new MatchError(arr, actual, "not an object");
    if (!actual)
        throw new MatchError(arr, actual, "null");
    var n = arr.length;
    for (var i = 0; i < n; i++) {
        if (!(i in actual))
            throw new MatchError(arr, actual, "no element at index " + i);
        matchPattern(arr[i], actual[i], matches);
    }
    matches._rest = actual.slice(n);
}

var hasOwn = {}.hasOwnProperty;

function matchObject(obj, actual, matches) {
    if (typeof actual !== 'object')
        throw new MatchError(obj, actual, "not an object");
    if (!actual)
        throw new MatchError(obj, actual, "null");
    for (var key in obj) {
        if (!hasOwn.call(obj, key))
            continue;
        if (!(key in actual))
            throw new MatchError(obj, actual, "no property " + key);
        matchPattern(obj[key], actual[key], matches);
    }
}

function matchString(str, actual) {
    if (typeof actual !== 'string')
        throw new MatchError(str, actual, "not a string");
    if (actual !== str)
        throw new MatchError(str, actual, "wrong string value");
}

function matchRegExp(re, actual) {
    if (typeof actual !== 'string')
        throw new MatchError(re, actual, "not a string");
    if (!re.test(actual))
        throw new MatchError(re, actual, "regexp pattern match failed");
}

function matchNumber(num, actual) {
    if (typeof actual !== 'number')
        throw new MatchError(num, actual, "not a number");
    if (actual !== num)
        throw new MatchError(num, actual, "wrong number value");
}

function matchNaN(actual) {
    if (typeof actual !== 'number' || actual === actual)
        throw new MatchError(NaN, actual, "not NaN");
}

function matchPredicate(pred, actual) {
    if (!pred(actual))
        throw new MatchError(pred, actual, "predicate failed");
}

function matchBoolean(bool, actual) {
    if (typeof actual !== 'boolean')
        throw new MatchError(bool, actual, "not a boolean");
    if (actual !== bool)
        throw new MatchError(bool, actual, "wrong boolean value");
}

function matchUndefined(actual) {
    if (typeof actual !== 'undefined')
        throw new MatchError(undefined, actual, "not undefined");
}

function Pattern() {
}

function Var(name, pattern) {
    this._name = name;
    this._pattern = typeof pattern === 'undefined' ? Any : pattern;
}

Var.prototype = Object.create(Pattern.prototype);

Var.prototype.match = function Var_match(actual, matches) {
    matchPattern(this._pattern, actual, matches);
    matches[this._name] = actual;
};

var Any = Object.create(Pattern.prototype);

Any.match = function Any_match(actual) { };

match.var = function(name, pattern) {
    return new Var(name, pattern);
};

match.any = Any;

match.object = function(x) {
    return typeof x === 'object' && x;
}

match.array = Array.isArray;

match.primitive = function(x) {
    return x === null || typeof x !== 'object';
};

match.number = function(x) {
    return typeof x === 'number';
};

match.range = function(start, end) {
    return function(x) {
        return typeof x === 'number' &&
               x >= start &&
               x < end;
    };
};

var floor = Math.floor, abs = Math.abs;

function sign(x) {
    return x < 0 ? -1 : 1;
}

// Implements ECMA-262 ToInteger (ES5 9.4, Draft ES6 9.1.4)
function toInteger(x) {
    return (x !== x)
         ? 0
         : (x === 0 || x === -Infinity || x === Infinity)
         ? x
         : sign(x) * floor(abs(x));
}

match.negative = function(x) {
    return typeof x === 'number' && x < 0;
};

match.positive = function(x) {
    return typeof x === 'number' && x > 0;
};

match.nonnegative = function(x) {
    return typeof x === 'number' && x >= 0;
};

match.minusZero = function(x) {
    return x === 0 && 1/x === -Infinity;
};

match.plusZero = function(x) {
    return x === 0 && 1/x === Infinity;
};

match.finite = function(x) {
    return typeof x === 'number' && isFinite(x);
};

match.infinite = function(x) {
    return typeof x === 'number' && (x === Infinity || x === -Infinity);
};

match.integer = function(x) {
    return typeof x === 'number' && x === toInteger(x);
};

match.int32 = function(x) {
    return typeof x === 'number' && x === (x|0);
};

match.uint32 = function(x) {
    return typeof x === 'number' && x === (x>>>0);
};

match.string = function(x) {
    return typeof x === 'string';
};

match.boolean = function(x) {
    return typeof x === 'boolean';
};

match.null = function(x) {
    return x === null;
};

match.undefined = function(x) {
    return typeof x === 'undefined';
};

match.function = function(x) {
    return typeof x === 'function';
};

function All(patterns) {
    this.patterns = patterns;
}

All.prototype = Object.create(Pattern.prototype);

All.prototype.match = function(actual, matches) {
    // Try all patterns in a temporary scratch sub-match object.
    var temp = {};
    for (var i = 0, n = this.patterns.length; i < n; i++) {
        matchPattern(this.patterns[i], actual, temp);
    }

    // On success, commit all the sub-matches to the real sub-match object.
    for (var key in temp) {
        if (!hasOwn.call(temp, key))
            continue;
        matches[key] = temp[key];
    }
};

match.all = function() {
    return new All(arguments);
};

function Some(patterns) {
    this.patterns = patterns;
}

Some.prototype = Object.create(Pattern.prototype);

Some.prototype.match = function(actual, matches) {
    // Try each pattern in its own temporary scratch sub-match object.
    var temp;
    for (var i = 0, n = this.patterns.length; i < n; i++) {
        temp = {};
        try {
            matchPattern(this.patterns[i], actual, temp);

            // On success, commit the successful sub-matches to the real sub-match object.
            for (var key in temp) {
                if (!hasOwn.call(temp, key))
                    continue;
                matches[key] = temp[key];
            }

            return;
        } catch (e) {
            if (!(e instanceof MatchError))
                throw e;
        }
    }

    throw new MatchError("no alternates matched", actual, this);
};

match.some = function() {
    return new Some(arguments);
};

match.MatchError = MatchError;

match.pattern = Pattern.prototype;

module.exports = match;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],67:[function(require,module,exports){

/**
* This is an (only) slightly extended version of Dave Herman's
* pattern-match module.
*
*    https://github.com/dherman/pattern-match
*
* The match dialect provides some syntax sugar on top of the library e.g.
* the "match type" syntax i.e. "var::type", used for function argument
* pattern matching as well as the more explicit "match" statement which
* follows the pattern-match library's api more closely.
*
* Though no code was used, additional inspiration for these features
* comes from Nate Faubion's very nice "sparkler" library for sweet.js:
*
*   https://github.com/natefaubion/sparkler
*
* The "extensions" to pattern-match here are simply defining predicates
* for matching sugarlisp's s-expression types: lists, atoms, symbols, etc.
* Doing so is allowed for in the pattern-match library (you can easily
* do the same to add predicates for your own types if you like):
*
*    https://github.com/dherman/pattern-match#custom-patterns
*
* Note when using these features to match lispy forms for generating code,
* be sure to use the "sl" versions i.e. match.slstring not match.string,
* match.slnumber not match.number.  The ones with "sl" may be useful in
* other code, just not when matching forms generated by the sugarlisp
* reader.
*
* Note that currently the code generated by sugarlisp simply assumes this
* module has been required and assigned to "match" and will give a
* run-time error if the pattern matching features are used without
* doing so.  Make sure that you require this extended version of the
* library as follows (note the "sugarlisp-match/" gets you this
* version not Dave Herman's original):
*
*    var match = require('sugarlisp-match/pattern-match');
*
*/

var match = require('pattern-match');
var sl = require('sugarlisp-core/sl-types');

match.sllist = Array.isArray;

match.slatom = function(form) {
  return sl.isAtom(form);
};

match.slsymbol = function(form) {
  return sl.typeOf(form) === 'symbol';
};

match.slstring = function(form) {
  return sl.typeOf(form) === 'string';
};

match.slnumber = function(form) {
  return sl.typeOf(form) === 'number';
};

match.slboolean = function(form) {
  return sl.typeOf(form) === 'boolean';
};

match.slnull = function(form) {
  return sl.typeOf(form) === 'null';
};

// sldefault is available as an alternative to match.any
// it really just makes the lispy form look closer to the
// match statement's "default" keyword
match.sldefault = match.any;

// rest is mainly behind the scenes e.g. when you do ...rest
match.slrest = match.any;

module.exports = match;

},{"pattern-match":66,"sugarlisp-core/sl-types":43}],68:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    utils = require('sugarlisp-core/utils'),
    debug = require('debug')('sugarlisp:match:readtab');

// this is a paren free version of the "match" statement syntax
// note they don't have to use the paren free syntax
exports['match'] = function(lexer) {

  // the list form for this match expression
  var list = sl.list();

  var matchToken = lexer.next_token('match');
  var matchAgainstList = reader.read(lexer);
  if(!(Array.isArray(matchAgainstList))) {
    lexer.error("the expression to match must be surrounded by parentheses");
  }
  // the parens are just syntax sugar - reach inside:
  var matchAgainst = matchAgainstList[0];

  list.push(sl.atom("match", {token: matchToken}));
  list.push(matchAgainst);

  // the match cases are expected to be a single form surrounded by {}
  list.push(reader.read(lexer));

  list.__parenoptional = true;

  return list;
};

// match expressions have their own local dialect
// i.e. local syntax such as "::" and local keywords
// e.g. "case" and "default"
exports['match'].dialect = "match/matchexpr";

exports['function'] = function(lexer) {

  var form;

  // Are we really a match function?
  if(on_match_function(lexer)) {
    // yes - enable our local dialect (the reader will pop it
    // when the end of our scope is reached).
    debug('enabling local "matchexpr" for use within match function');
    reader.use_dialect("match/matchexpr", lexer, {local: true});

    // invoke the normal "function" handler:
    form = reader.invoke_readfn_overridden_by('match', 'function', lexer);
  }
  else {
    // use the standard "function" handlers:
    form = reader.retry
  }

  return form;
};

// is the function we're looking at a "match function"?
// (as opposed to a normal function?)
function on_match_function(lexer) {
  var matchFunction = false;

  lexer.mark_rewind_point();
  // the function keyword
  lexer.skip_text('function');

  // an optional name
  if(lexer.on(/[a-zA-Z_$][0-9a-zA-Z_$\.]*/g)) {
    lexer.next_token(/[a-zA-Z_$][0-9a-zA-Z_$\.]*/g);
  }

  // now a match function is followed by a body (only),
  // not arguments then a body
  if(lexer.on('{') || lexer.on('(do')) {
    matchFunction = true;
  }

  lexer.rewind();

  return matchFunction;
}

},{"debug":10,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/utils":45}],69:[function(require,module,exports){

module.exports = {
  name: "plus",
  extends: "core",
  lextab: require('./lextab'),
  readtab: require('./readtab')
};

},{"./lextab":70,"./readtab":72}],70:[function(require,module,exports){

module.exports = [

  // traditional array/object access with name then bracket i.e. arr[(index or prop)]
  // note:  they *must* omit spaces between variable name and the opening bracket
  {
    category: 'bracket-index',
    match: /[a-zA-Z_$][0-9a-zA-Z_$\.]*\[/g
  },

  // "special" symbols that don't require whitespace or punctuation to end them.
  {
    category: 'symbol',
    match: /("""|\.\.\.|\.\.|\b!\b|=>|~@|~|@|\$\{|--|\+\+|\+\=|#\/|\/)/g
  },

  // "punctuation" is special in that it terminates typical symbol tokens
  // (i.e. those read with "get_word_token")
  // note this adds to the punctuation already defined in core
  {
    category: 'punctuation',
    match: /(\[|\]|\{|\}|\.|\:|\+)/g
  }

];

},{}],71:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader');

// read square bracketed array of data
// (square brackets are an alternative to quoting)
exports.read_array = function(source) {
  return reader.read_delimited_list(source, '[', ']', ["array"]);
}

// read object literal
exports.read_objectliteral = function(source, separatorRE) {
  separatorRE = separatorRE || /,+/g;
  var objlist = sl.list("object");
  var token = source.next_token("{");
  objlist.setOpening(token);

  // confirm that we start with a property key i.e. "property:":
  // note: we use next_token here since it doesn't call the reader - performance
  //   would suffer otherwise.  i.e. When there's multiple nested code blocks we
  //   want to *quickly* recognize it's a code block and not an object.
  token = source.next_token(/([a-zA-Z_\$]+[a-zA-Z0-9_\$]*\s*\:|[\'\"\`][^\'\"\`]+[\'\"\`]\s*\:)/g,
          "ambiguous object literal or code block does not start with a property key");
  token.text = token.text.substring(0, token.text.length-1);
  objlist.push(sl.atom(token.text, {token: token}));

  // read the rest of the property keys/values
  while(!source.eos() && !source.on('}')) {
    // read the value for the next property
    var propertyValue = reader.read(source);
    objlist.push(propertyValue);

    // if there's a separator (e.g. commas)
    if(separatorRE && source.on(separatorRE)) {
      source.skip_text(separatorRE); // just skip them
    }

    if(!source.eos() && !source.on('}')) {

      // read the next property key i.e. "property:":
      token = source.next_token(/([a-zA-Z_\$]+[a-zA-Z0-9_\$]*\s*\:|[\'\"\`][^\'\"\`]+[\'\"\`]\s*\:)/g,
              "malformed object literal - was expecting a property key");
      token.text = token.text.substring(0, token.text.length-1);
      objlist.push(sl.atom(token.text, {token: token}));
    }
    source.skip_filler();
  }
  if (source.eos()) {
    source.error("Expected '" + '}' + "', got EOF");
  }
  token = source.next_token('}');
  objlist.setClosing(token);

  // having the object properties available as actual javascript
  // properties on the (object..) list is helpful in the macros esp:
  objlist = exports.even_keys_to_list_properties(objlist);
  return objlist;
}

// convert the keys of the object list to javascript properties
// the object list is the lispy (object...) list where every
// other property is a key followed by it's value.
// the second argument is optional (the properties will be
// assigned on the list itself if it's omitted)
exports.even_keys_to_list_properties = function(objectlist, object) {
  object = object || objectlist;
  for(var i=1; i < objectlist.length; i += 2) {
    if(typeof objectlist[objectlist[i]] === 'undefined') {
      objectlist[objectlist[i]] = objectlist[i+1];
    }
    else {
      //console.log("warning: cannot convert key to already existing property:",
      //  sl.valueOf(objectlist[i]));
    }
  }
  return objectlist;
}

/**
* read a '{' '}' delimited object literal or code block.
* it's an object literal if it's properly constructed with pairs of property keys and values
* otherwise it's a code block which desugars to a lispy (do...) expression
*/
exports.read_objectliteral_or_codeblock = function(source) {
  var list;
  source.mark_rewind_point();
  try {
    // try and read it as an object literal
    list = exports.read_objectliteral(source);
    source.commit_rewind_point();
  }
  catch(e) {
    if(e.message.indexOf("ambiguous") !== -1) {
      // maybe this is a code block?
      source.rewind();
      list = exports.read_codeblock(source, "begin");
    }
    else {
      throw e;  // it was an object literal with a typo
    }
  }
  return list;
}

/**
* read a {...} delimited list known to be a code block
* (as oppsed to an object literal)
* @param as - the lispy function representing the code block
*             (defaults to "do")
*/
exports.read_codeblock = function(source, as) {
  var initial = (as ? [as] : ["do"]);
  var list = reader.read_delimited_list(source, '{', '}', [as]);
  if(sl.list(list) && list.length === 1) {
    // this was actually just an empty {}
    list[0].value = "object";
  }
  return list;
}

/**
* Read a template string enclosed by the start/end delimiters
* start = the open quote character (or undefined to accept " and ')
* end = the closing quote character (or undefined if it should match the open character)
* returned is the LSList form optionally prepended with "initial"
*/
exports.read_template_string = function(source, start, end, initial) {
  var originalLength = initial ? initial.length : 0;
  var strlist = sl.listFromArray(initial || []);
  if(typeof start === 'undefined') {
    var firstCh = source.peek_char();
    if(firstCh === '"' || firstCh === "'") {
      start = firstCh;
    }
    else {
      source.error('Template string without opening \'\"\' or \"\'\"');
    }
  }

  var text = "";
  end = end || start; // sometimes it's the same delimiter on both ends

  // get the prelude before we skip the delimiter
  var prelude = source.get_current_prelude(true);

  // skip the initial delimiter
  source.skip_char(start);

  // mark where the first part of the string (before any "${") starts
  source.mark_token_start();

  // scan looking for the ending
  while(!source.eos() && !source.on(end)) {

    // have we hit the start of an ${} escape?
    if(source.on('${')) {
      // we hit the start of an ${} escape...
      if(text !== "") {
        // add the text preceding the "${"
        text = sl.addQuotes(text, start); // sugarlisp strings include the quotes!
        strlist.push(sl.str(text, {token: source.create_token(text)}));
        text = "";
      }
      source.skip_text("${");
      strlist.push(reader.read(source))
      source.skip_filler();
      source.assert('}',"Missing end for ${");
      source.skip_char("}");
      source.mark_token_start();
    }
    else {
      // it was normal text
      var ch = source.next_char();
      if (ch === "\n") {
        ch = "\\n"; // escape returns
      }
      else if ((ch === "'" || ch === '"') && ch === start) {
        ch = "\\" + ch; // escape quotes that are the same as the delimiter
      }
      else if (ch === "\\") {
         // escape the next character
         text += "\\";
         ch = source.next_char();
      }
      text += ch;
    }
  }

  // we should be at the end of the template string now
  source.assert(end, "Missing end of template string");

  // add any text between last ${} or html tag and the end
  // plus make sure that a simple "" creates an empty string token
  if(text !== "" || (initial && originalLength === strlist.length)) {
    text = sl.addQuotes(text, start); // sugarlisp strings include the quotes!
    strlist.push(sl.str(text, {token: source.create_token(text)}));
  }

  // now we can skip the end delimiter
  source.skip_char(end);
  source.advance_to_next_token();

  // if they're populating e.g. (str...)
  if(originalLength === 1) {
    // did we find anything more?
    if(strlist.length === 1) {
      // nope the template was empty - it's *not* a (str...)
      strlist.shift();
    }
    else if(strlist.length === 2) {
      // there was just a single string so return that not
      // (str "string") which is pointless
      strlist = strlist[1];
    }
  }

  // override the prelude omitting the opening delimiter
  strlist.prelude = prelude;

  return strlist;
}

},{"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43}],72:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    utils = require('sugarlisp-core/utils'),
    ctx = require('sugarlisp-core/transpiler-context'),
    rfuncs = require('./readfuncs');

// the infix dot operator for property lookup
// note that we encourage use of infix dot since it's so familiar
// to javascript programmers i.e. (console.log "hello"), but for
// backward compatibility with lispyscript 1 (and other lisps
// which have similar constructs), this also accepts property prefix
// forms like e.g. (.log console "hello").  Since we normally consider
// . an infix operator though - to get the "property prefix" version
// you *must* omit the space between the "." and the property.  Which
// is to say "(.log console)" represents "console.log", but
// "(. log console)" (note the space after the dot) represents
// "log.console".
//
// lastly notice we leave infix "." as "." but we change dot property
// access to a different prefix "dotprop".  So console.log becomes
// (. console log) but .log console becomes (dotprop log console)

exports['.'] = reader.operator({
  prefix: reader.operator('prefix', 'unary', dotpropexpr, 5),
  infix: reader.operator('infix', 'binary', infixdot2prefix, 19)
});

function dotpropexpr(lexer, opSpec, dotOpForm) {
  var propertyNameToken = lexer.next_token();
  var objectForm = reader.read(lexer, opSpec.precedence);
  return sl.list('dotprop', propertyNameToken, objectForm);
}

function infixdot2prefix(lexer, opSpec, leftForm, opForm) {
  // To handle right-associative operators like "^", we allow a slightly
  // lower precedence when parsing the right-hand side. This will let an
  // operator with the same precedence appear on the right, which will then
  // take *this* operator's result as its left-hand argument.
  var rightForm = reader.read(lexer,
      opSpec.precedence - (opSpec.assoc === "right" ? 1 : 0));

  return sl.list(opForm, leftForm, rightForm);
}

// square bracketed arrays of data
exports['['] = function(lexer) {
  return rfuncs.read_array(lexer);
};
// end brackets are read as token via the function above
// (so they're not expected to be read via the syntax table)
exports[']'] = reader.unexpected;

// traditional array/object access with name then bracket i.e. arr[(index or prop)]
// note:  they *must* omit spaces between variable name and the opening bracket
exports['*:bracket-index'] = function(lexer) {
  var form;
  // note: can't use peek_token below
  //   (since that uses the syntax table that's an infinite loop!)
  var token = lexer.next_delimited_token(undefined, "[");
  if(token) {
    form = sl.list(sl.atom('get', {token: token}),
                      reader.read(lexer),
                      sl.atom(token.text));
    lexer.skip_token("]");
  }
  return form;
};

// javascript object literals
exports['{'] = function(lexer) {
  return rfuncs.read_objectliteral_or_codeblock(lexer);
};
exports['}'] = reader.unexpected;

// templated strings with ${} escapes
// unlike es6 we let them work within all of ', ", or `
// if no ${} are used it winds up a simple string
// but when ${} are used the result is a (str...)
exports['\''] = function(lexer) {
  return rfuncs.read_template_string(lexer, "'", "'", ['str']);
};

exports['\"'] = function(lexer) {
  return rfuncs.read_template_string(lexer, '"', '"', ['str']);
};

// es6 template string literal
exports['`'] = function(lexer) {
  // a template string surrounded in backticks becomes (str...)
  return rfuncs.read_template_string(lexer, "`", "`", ['str']);
};

// arrow functions
// note precedence level less than "=" so e.g. "fn = (x) => x * x" works right
// also note this was originally just exports['=>'] = reader.infix(12.5);
// but the below was done to simplify the generated code and avoid one IIFE
// OLD exports['=>'] = reader.operator(arrowFnTransform, 7.5, 'infix', 'binary');
exports['=>'] = reader.operator('infix', 'binary', arrow2prefix, 7.5);

function arrow2prefix(lexer, opSpec, argsForm, arrowOpForm) {

  var fBody = reader.read(lexer, opSpec.precedence);
  if(sl.isList(fBody) && sl.valueOf(fBody[0]) === 'do') {
    fBody[0].value = "begin";
  }

  return sl.list(arrowOpForm, argsForm, fBody);
}

// regexes in the form #/../
// this is a shorthand for (regex "(regex string)")
// note this is close to javascript's "/" regexes except for starting "#/"
// the initial "#" was added to avoid conflicts with "/"
// (the "#" is optional in *sugarscript* btw)
exports['#/'] = function(lexer, text) {
  // desugar to core (regex ..)
  return sl.list("regex",
                sl.addQuotes(sl.valueOf(reader.read_delimited_text(lexer, "#/", "/",
                  {includeDelimiters: false}))));
}

// Gave unquotes an extra ~ for now while I get them working
// (so they wouldn't break the macros)
exports['~~'] = function(lexer) {
  lexer.skip_text('~~');
  return sl.list('unquote', reader.read(lexer));
};

// coffeescript style @ (alternative to "this.")
exports['@'] = function(lexer) {
  var atToken = lexer.next_token('@');
  var nextForm = reader.read(lexer);
  if(!(sl.typeOf(nextForm) === 'symbol' ||
       (sl.isList(nextForm) &&
        nextForm.length > 0 &&
        sl.typeOf(nextForm[0]) === 'symbol')))
  {
    lexer.error("@ must precede the name of some object member");
  }
  // we return (. this <property>)
  return sl.list(sl.atom('.', atToken), sl.atom('this', atToken), nextForm);
}

// lispy quasiquoted list
// THIS STILL HAS WORK TO DO - IT'S REALLY JUST AN ALIAS FOR [] RIGHT NOW
//
// these use ` like a traditional lisp except they are bookended
// on both ends i.e. `(...)`.  It felt odd to do otherwise because
// all our other (string) quoting follows javascript conventions
// so has them on both ends.
//
// note we *only* support the quasiquoting of lists.
//
// since we also support es6 template string literals which use
// `` to quote them, the paren in `( distinguish a quasiquoted
// list *form* from a standard es6 template *string*.
//
// If people need to quote a *string* that starts with ( they
// should just use '(...)' or "(...)" instead.
//
exports['`('] = function(lexer) {
  return reader.read_delimited_list(lexer, '`(', ')`', ["quasiquote"]);
};
exports[')`'] = reader.unexpected

// this may be temporary it's just an alias for arrays []
// (it should be just a normal quoted list - working on that)
exports['``('] = function(lexer) {
  return reader.read_delimited_list(lexer, '``(', ')``', ["array"]);
};
exports[')``'] = reader.unexpected

// a js code template (javascript string with substitutions) is
// surrounded in triple double-quotes
exports['"""'] = function(lexer) {
  var forms = rfuncs.read_template_string(lexer, '"""', '"""', ['code']);
  // read_template_string converts to a normal string if there's only one:
  if(!sl.isList(forms)) {
    forms = sl.list('code', forms);
  }
  return forms;
};

// a lispy code template (lispy code with substitutions) is
// surrounded in triple single-quotes
exports["'''"] = function(lexer) {
  return reader.read_delimited_list(lexer, "'''", "'''", ["codequasiquote"]);
};

// Gave unquotes an extra ~ for now while I get them working
// (so they wouldn't break the macros)
exports['~~'] = function(lexer) {
  lexer.skip_text('~~');
  return sl.list('unquote', reader.read(lexer));
};

exports['~~@'] = function(lexer) {
  lexer.skip_text('~~@');
  return sl.list('splice-unquote', reader.read(lexer));
};

// note below are higher precedence than '.'
exports['~'] = reader.prefix(19.5);
exports['~@'] = reader.prefix(19.5);

// although basic "word-style" (whitespace) delimiting
// works well in lispy core, declaring symbols explicitly
// avoids problems arising with the syntax sugar of lispy+
exports['!'] = reader.prefix(18, {assoc: "right"});

// ++i and i++
exports['++'] = reader.operator({
  prefix: reader.prefix(17, {assoc:"right", nospace: true}),
  postfix: reader.postfix(18, {altprefix: "post++", nospace: true})
});

// --i and i--
exports['--'] = reader.operator({
  prefix: reader.prefix(17, {assoc:"right", nospace: true}),
  postfix: reader.postfix(18, {altprefix: "post--", nospace: true})
});

// variable_ is a paren free var -
//  this is really just a helper function,
//  it's used by #cell below as well as
//  by "var" in scripty
// NO LONGER USING THIS IN SCRIPTY NOW THAT I SUPPORT multiple
// COMMA SEPARATED VARS - NEED TO SEE IF IT MAKES SENSE TO MERGE
// THEM TOGETHER NOT SURE YET

exports['variable_'] = function(lexer, text) {
  var varToken = lexer.next_token(text);
  var varNameToken = lexer.next_token();
  var varNameSym = sl.atom(varNameToken);

// SEEING IF I CAN SIMPLIFY THIS BACK TO ALLOWING SIMPLE ARRAYS
// MY THOUGHT WAS SIMPLY THAT IMMEDIATELY UPON THE
// READER RECEIVING THE RETURN VALUE FROM CALLING THESE
// SYNTAX FUNCTIONS IT CHECKS IF IT'S GOT AN ARRAY RATHER
// THAN A lists.List TYPE, AND IF SO IT CALLS lists.fromArray()
// TO PROMOTE THE ARRAY TO A LIST.  AS PART OF THAT IT
// IS ALSO GOING TO HAVE TO PROMOTE ALL THE PRIMITIVES TO
// BEING WRAPPED - *IF* I NEED TO ALSO IMMEDIATELY SET
// PARENTS TOO.  BUT IS THAT NEEDED?  COULD I GET BY
// WITH SAYING PARENTS ARE ONLY AVAILABLE IN THE keyword
// FUNCTIONS NOT THE READER FUNCTIONS?  BUT I DO USE PARENTS
// TO FIND SURROUNDING LOCAL DIALECTS RIGHT?  IF THERE any
// WAY THIS COULD HAVE WORKED DIFFERENTLY?  WHAT IF I'D done
// THE "ENVIRONMENT" IDEA LIKE AN INTERPRETER WOULD?  COULD
// THE "DIALECTS" HAVE BEEN TREATED LIKE A VAR IN THE "ENVIRONMENT"
// *INSTEAD* OF ON THE "FORMS"??
  var list = sl.list(sl.atom("var", {token: varToken}), sl.atom(varNameToken));
  // if(lexer.on('=')) {
  //   // it's got an initializer
  //   lexer.skip_text('=');
  //   list.push(reader.read(lexer));
  // }
  // else {
  //   list.push("undefined");
  // }

  return list;
};

// cells can cause reactions when their values change
// a cell can be declared via:
//
//    #cell name
// or
//    #cell name = val
//
// (note right now you can only declare one variable per #cell statement)
exports['#cell'] = function(lexer, text) {
  // #cell is like "var" except it records the var as observable
  // so start by making a normal "var" form list i.e. (var varname...)
  var varForm = exports["variable_"](lexer, text);

  // since sugarlisp doesn't pay attention to the scope of
  // the var statements it transpiles, #cell variable names are
  // considered global to the source file - this list is what's
  // checked by #react to confirm the variable is a cell:
  var varname = sl.valueOf(varForm[1]);
  if(lexer.cells.indexOf(varname) === -1) {
    lexer.cells.push(varname);
  }

  // return the var form so a "var" statement winds up in the output code
  return varForm;
};

// binding assignment works with bindable vars
// invoke the reactor function "after" with #=
// (this is the version I assume would most often be used)
// OLD DELETE exports['#='] = reader.infix(7, {altprefix: "#afterset"});
exports['#='] = reader.infix(7);
// invoke the reactor function "before" with ##=
// OLD DELETE exports['##='] = reader.infix(7, {altprefix: "#beforeset"});
exports['##='] = reader.infix(7);

},{"./readfuncs":71,"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43,"sugarlisp-core/transpiler-context":44,"sugarlisp-core/utils":45}],73:[function(require,module,exports){
// Generated by SugarLisp v0.6.5
var sl = require('sugarlisp-core/sl-types');
var match = require('sugarlisp-match/pattern-match');
exports["ternary"] = function(forms) {
  this.transpileSubExpressions(forms);

  return match(forms, function(when) {
    when([
        function(sym) {
          return sym.value === "ternary";
        },
        match.var("condition", match.any),
        match.var("iftrue", match.any),
        match.var("iffalse", match.any)
      ],
      function(vars) {
        return (function(condition, iftrue, iffalse) {
          return sl.generated([
            "(", condition, " ?\n",
            "    ", iftrue, " :\n",
            "    ", iffalse, ")"
          ]);
        }).call(this, vars["condition"], vars["iftrue"], vars["iffalse"]);
      }, this);
    when([
        match.var("any", match.sldefault)
      ],
      function(vars) {
        return (function(any) {
          return this.error('ternary expects a condition followed by a "then" and an "else" expression');
        }).call(this, vars["any"]);
      }, this);
  }, this);
};
},{"sugarlisp-core/sl-types":43,"sugarlisp-match/pattern-match":67}],74:[function(require,module,exports){
var ctx = require('sugarlisp-core/transpiler-context');

module.exports = {
  name: "sugarscript",
  extends: "plus",
  lextab: require('./lextab'),
  readtab: require('./readtab'),
  gentab: require('./gentab'),
  "__sugarscript_init": function(lexer) {
    // for transpiling statements (as opposed to expressions)
    ctx.options.transpile.statements = true;
    ctx.options.transpile.implicitReturns = true;
  }
};

},{"./gentab":73,"./lextab":75,"./readtab":76,"sugarlisp-core/transpiler-context":44}],75:[function(require,module,exports){

module.exports = [

  // sugarscript allows semicolons as statement terminators like javascript,
  // so we add semicolons as a form of whitespace
  {
    category: 'whitespace',
    match: /[\s;]/g,
    replace: true
  },

  // and we no longer treat semicolons as line comments (like in core):
  {
    category: 'linecomment',
    match: /\/\//g,
    replace: true
  },

  // commas are needed in sugarscript e.g. in something like "var x, y"
  // to know where the unparenthesized-yet-variable-length form ends
  // (whereas in core they're ignored as whitespace)
  {
    category: 'punctuation',
    match: /(\,)/g
  }

];

},{}],76:[function(require,module,exports){
var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader');

// the opening paren is treated as an operator in sugarscript
// A normal parenthesized expression "(x)" is considered a prefix operator
// But when used postfix e.g. "fn(x)" this is understood to be a function
// call read in as an s-expression list of the form "(fn x)".  And likewise
// something more complex e.g. "obj.fn(x)" gets read as "((. obj fn) x)".
//
// Note the reader already understands that spaces *are* significant with postfix
// operators i.e. "fn(x)" will be seen as a call whereas "fn (x)" will not for
// the same reason "i++ j" is not confused with "i ++j".

exports['('] = reader.operator({
  prefix: reader.operator('prefix', 'unary', readparenthesizedlist, 1),
  // 17.5 is lower precedence than '.' and '~' (this is important!)
  postfix: reader.operator('postfix', 'binary', tradfncalltosexpr, 17.5)
});

// this is just a helper for the above
function readparenthesizedlist(lexer, opSpec, openingParenForm) {
  // note since '(' is defined as a prefix operator the '(' has already been read
  // read_delimited_list infers this because we pass openingParenForm below
  return reader.read_delimited_list(lexer, openingParenForm, ')');
}

// NOT SURE WE NEEDED THIS AFTER ALL
// sugarscript (esp) has customized read handlers for paren-free
// "function(", "if(", etc. This "beforeRead" function makes sure
// the reader doesn't treat those as normal function calls.
// function noCustomReader(lexer, opSpec, leftForm) {
//   var retry;
//   var dialect = reader.get_current_dialect(lexer);
//   if(sl.isAtom(leftForm) &&
//     dialect.syntax[leftForm.text] &&
//     !dialect.syntax[leftForm.text] == reader.symbol)
//   {
//     // let the other handlers take it:
//     retry = reader.retry;
//   }
//   return retry;
// }

//  postfix: reader.operator('postfix', 'unary', tradfncalltosexpr, 17.5, {altprefix: "fncall("})

// this is just a helper for the above
// note the reader calls tradfncalltosexpr *after* reading the opening paren
function tradfncalltosexpr(lexer, opSpec, leftForm, openingParenForm) {

// do we really need this?
  // if(opSpec.options.altprefix) {
  //   opForm = utils.clone(opForm);
  //   opForm.value = opSpec.options.altprefix;
  //   opForm.text = opSpec.options.altprefix;
  // }

  // whatever preceded the opening paren becomes the beginning of the list:
  return reader.read_delimited_list(lexer, openingParenForm, ')', [leftForm]);
}

// parenfree function declarations
function handleFuncs(lexer, text) {

  // note we use "text" so we can handle both "function" and "function*"
  var functionToken = lexer.next_token(text);
  var list = sl.list(sl.atom(text, {token: functionToken}));

  // the next form tells if it's a named, anonymous, or match function
  // note the use of next_token here (as oppsed to reader.read) ensures "fn(x)"
  // in e.g. "function fn(x)" isn't read as a *call* i.e. "(fn x)".
  var fName;
  // note here we can only allow valid *javascript* function names
  // (because this ultimately generates real javascript named functions)
  if(lexer.on(/[a-zA-Z_$][0-9a-zA-Z_$\.]*/g)) {
    var token = lexer.next_token(/[a-zA-Z_$][0-9a-zA-Z_$\.]*/g);
    fName = sl.atom(token.text, {token: token});
    list.push(fName);
  }
  // args
  if(lexer.on('(')) {
    var fArgs = reader.read_delimited_list(lexer, '(', ')', undefined);
    list.push(fArgs);
  }
  else if(lexer.on('~')) {
    // a macro declaring a function with unquoted args:
    list.push(reader.read(lexer));
  }
  var fBody;
  if(lexer.on('{')) {
    // read what's inside the curly braces as a (begin..) block:
    fBody = reader.read_delimited_list(lexer, '{', '}', ["begin"]);
    list.push(fBody);
  } else if(lexer.on('(')) {
    fBody = reader.read(lexer);
    list.push(fBody);
  }

  if(!(fName || fBody)) {
    lexer.error("malformed function declaration - missing arguments or body");
  }

  list.__parenoptional = true;
  return list;
};

// named and anonymous functions
exports['function'] = handleFuncs;

// es6 generator functions
exports['function*'] = handleFuncs;

// parenfree yield
exports['yield'] = reader.parenfree(1);
exports['yield*'] = reader.parenfree(1);

// sugarscript lets them omit parens on "export"
exports['export'] = reader.parenfree(2);

// "var" precedes a comma separated list of either:
//    name
// or:
//    name = val
//

exports['var'] = function(lexer, text) {

  var varToken = lexer.next_token(text);
  var list = sl.list(sl.atom("var", {token: varToken}));
  var moreVars = true;
  while(moreVars) {
    var varNameToken = lexer.next_token();
    var validName = /^[a-zA-Z_$][0-9a-zA-Z_$]*$/;
    if (!validName.test(varNameToken.text)) {
      lexer.error("Invalid character in var name", varNameToken);
    }

    var varNameSym = sl.atom(varNameToken);
    list.push(varNameSym);

    if(lexer.on('=')) {
      // it's got an initializer
      lexer.skip_text('=');
      list.push(reader.read(lexer));
    }
    else {
      list.push("undefined");
    }

    moreVars = lexer.on(',');
    if(moreVars) {
      lexer.skip_text(',');
    }
  }

  return list;
};

// paren-free new keyword
// note lispy core expects e.g. (new Date), (new Date "October 13, 1975 11:13")
exports['new'] = function(lexer, text) {
  var newToken = lexer.next_token(text);
  var list = sl.list(sl.atom("new", {token: newToken}));
  var classConstructor = reader.read(lexer);
  // if(sl.isList(classConstructor)) {
  //   // splice the values in
  //   list.pushFromArray(classConstructor);
  // }
  // else {
    // push in the class name
    list.push(classConstructor);
//  }

  return list;
};

// parenfree template declarations
// note:  the "template" overlaps the newer html dialect, but
//   we still support "template" for backward compatibility.
exports['template'] = function(lexer) {

  var templateToken = lexer.next_token('template');
  var list = sl.list(sl.atom("template", {token: templateToken}));

  var tName;
  if(lexer.on(/[a-zA-Z_$][0-9a-zA-Z_$\.]*/g)) {
    var token = lexer.next_token(/[a-zA-Z_$][0-9a-zA-Z_$\.]*/g);
    tName = sl.atom(token.text, {token: token});
    list.push(tName);
  }
  else {
    lexer.error("invalid template name");
  }
  // args
  if(lexer.on('(')) {
    list.push(reader.read(lexer));
  }
  else {
    lexer.error("template arguments should be enclosed in parentheses");
  }

  if(lexer.on('{')) {
    var tBody = reader.read(lexer);
    tBody.forEach(function(expr,i) {
        if(i > 0) {
          list.push(expr);
        }
    });
  }
  else {
    lexer.error("template bodies in sugarscript are enclosed in {}");
  }

  list.__parenoptional = true;
  return list;
};


// parenfree macro declarations
exports['macro'] = function(lexer) {

  var macroToken = lexer.next_token('macro');
  var list = sl.list(sl.atom("macro", {token: macroToken}));

  // the next form tells if it's a named or anonymous macro
  var mName;
  // note here we do allow "lispy names" (i.e. more legal chars than javascript)
  if(lexer.on(/[a-zA-Z_$][0-9a-zA-Z_$\.\?\-\>]*/g)) {
    var token = lexer.next_token(/[a-zA-Z_$][0-9a-zA-Z_$\.\?\-\>]*/g);
    mName = sl.atom(token.text, {token: token});
    list.push(mName);
  }
  // args are surrounded by parens (even in sugarlisp core)
  if(lexer.on('(')) {
    list.push(reader.read(lexer));
  }
  else {
    lexer.error("a macro declaration's arguments should be enclosed in ()");
  }

  // in sugarscript the macro body is wrapped in {...}
  // note this is purely a grammar thing (it is *not* saying every macro is a "do")
  // also note that the reading of the macro body uses whatever dialects are
  // current i.e. the macro body is written in the dialect of the containing file.
  if(lexer.on('{')) {
    list.push(reader.read_wrapped_delimited_list(lexer, '{', '}'));
  }
  else {
    lexer.error("a macro declaration's body should be enclosed in {}");
  }

  list.__parenoptional = true;
  return list;
};

// sugarscript's "cond" and "switch" are paren free but they put {} around the body
// and use case/default in front of each condition
// note: text will be either "cond" or "switch"
/*
DELETE?
handleCondCase = function(lexer, text) {
  var condToken = lexer.next_token(text);
  var list = sl.list(sl.atom(text, {token: condToken}));
  if(text === "case") {
    // switch has the item to match (cond does not)
    // as with javascript - the switch value is wrapped in parens
    list.push(reader.read_wrapped_delimited_list(lexer, '(',')'));
  }
  if(lexer.on('{')) {
    var body = reader.read_delimited_list(lexer, '{', '}');
    if((body.length % 2) === 0) {
      body.forEach(function(caseForm) {
        // the body has pairs:
        if(sl.isList(caseForm)) {
          if(sl.valueOf(caseForm[0]) === 'case') {
            list.push(caseForm[1]);
            list.push(caseForm[2]);
          }
          else if(sl.valueOf(caseForm[0]) === 'default') {
            list.push(sl.atom(true));
            list.push(caseForm[1]);
          }
          else {
            lexer.error('a ' + text + ' expects "case" or "default" in its body');
          }
        }
        else {
          lexer.error('a ' + text + ' expects "case" or "default" in its body');
        }
      })
    }
    else {
      lexer.error("a " + text + " requires an even number of match pairs in it's body");
    }
  }
  else {
    lexer.error("a " + text + " body should be enclosed in {}");
  }

  list.__parenoptional = true;
  return list;
};

exports['cond'] = handleCondCase;
exports['case'] = handleCondCase;
*/

// we're doing cond and case in a *slightly* more javascripty syntax like e.g.
//   cond { (x === 0) "zero"; (x > 0) "positive"; }
// and
//   case(x) { 0 "zero"; 1 "one"; true "other"; }
exports['cond'] = reader.parenfree(1, {
  bracketed: 1,
  validate: function(lexer, forms) {
    // note the forms list *starts* with 'cond' hence the -1:
    if(((forms.length-1) % 2) !== 0) {
      lexer.error("a cond requires an even number of match pairs in it's body");
    }
  }
});

exports['case'] = reader.parenfree(2, {
  parenthesized: 1,
  bracketed: 2,
  validate: function(lexer, forms) {
    // note the forms list *starts* with 'case' and match hence the -2:
    if(((forms.length-2) % 2) !== 0) {
      lexer.error("a case requires an even number of match pairs in it's body");
    }
  }
});

// sugarscript's "match" is paren free except for parens around
// the thing to match (like the parens in "switch", "if", etc)
exports['match'] = function(lexer) {
  var matchToken = lexer.next_token('match');
  var matchAgainstList = reader.read(lexer);
  if(!(sl.isList(matchAgainstList))) {
    lexer.error("the expression to match must be surrounded by parentheses");
  }
  // the parens are just syntax sugar - reach inside:
  var matchAgainst = matchAgainstList[0];

  var list = sl.list(sl.atom("match", {token: matchToken}));
  list.push(matchAgainst);

  // the match cases are expected to be a single form surrounded by {}
  list.push(reader.read(lexer));

  list.__parenoptional = true;
  return list;
};

// match case/default do not need parens in sugarscript:
//exports['case'] = reader.parenfree(2);
//exports['default'] = reader.parenfree(1);

// sugarscript's "try" is paren free
// note: lispy core's treats all but the final catch function as the body
//   but sugarscript requires that a multi-expression body be wrapped in {}
exports['try'] = function(lexer) {
  var tryToken = lexer.next_token('try');
  var tryBody = reader.read(lexer);
  if(!(sl.isList(tryBody))) {
    lexer.error("try expects a body enclosed in () or {}");
  }
  var catchToken = lexer.next_token('catch');
  var catchArgs = reader.read(lexer);
  if(!(sl.isList(catchArgs))) {
    lexer.error("give a name to the exception to catch enclosed in ()");
  }
  var catchBody = reader.read(lexer);
  if(!(sl.isList(catchBody))) {
    lexer.error("the catch body must be enclosed in () or {}");
  }

  var list = sl.list(sl.atom("try", {token: tryToken}));
  list.push(tryBody);
  list.push(sl.list(sl.atom('function'), catchArgs, catchBody));

  list.__parenoptional = true;
  return list;
};

exports['throw'] = reader.parenfree(1);

// assignment
exports['='] = reader.infix(6, {altprefix:"set"});

// the following can be used infix or prefix
// precedence from:  http://www.scriptingmaster.com/javascript/operator-precedence.asp
// since for us higher precedence is a higher (not lower) number, ours are
// 20 - the numbers you see in the table on the page above
exports['*'] = reader.infix(17);
// DELETE exports['/'] = reader.infix(17); // what about regexes !!??
exports['%'] = reader.infix(17);
exports['+'] = reader.infix(16);

// note that right now in sugarscript e.g. "(- 1 5)" gets parsed as "((- 1) 5)"
// have not found an easy fix - ignoring for now (after all they would most likely
// use infix in sugarscript anyway).  Possibly some special case handling is
// needed - though it may be best in the end to *not* support prefix notation
// in sugarscript at all ("simplicity" and "reliability" > "flexibility"!!)
exports['-'] = reader.operator({
  prefix: reader.prefix(18, { assoc: "right" }),
  infix: reader.infix(16)
});

exports[">>"] = reader.infix(15);
exports["<<"] = reader.infix(15);
exports[">>>"] = reader.infix(15);
exports[">"] = reader.infix(14);
exports[">="] = reader.infix(14);
exports["<"] = reader.infix(14);
exports["<="] = reader.infix(14);
exports['==='] = reader.infix(13);
exports['=='] = reader.infix(13);
exports['!='] = reader.infix(13);
exports['!=='] = reader.infix(13);
exports["&&"] = reader.infix(9);
exports["||"] = reader.infix(8);
exports["+="] = reader.infix(7);
exports["-="] = reader.infix(7);
exports["*="] = reader.infix(7);
exports["/="] = reader.infix(7);
exports["%="] = reader.infix(7);
exports["<<="] = reader.infix(7);
exports[">>="] = reader.infix(7);
exports[">>>="] = reader.infix(7);

exports['/'] = reader.operator({
  prefix: reader.operator('prefix', 'unary', regex2expr, 18, { assoc: "right" }),
  infix: reader.infix(17)
});

function regex2expr(lexer, opSpec, openingSlashForm) {
  // desugar to core (regex ..)
  return sl.list("regex",
                sl.addQuotes(sl.valueOf(reader.read_delimited_text(lexer, undefined, "/",
                  {includeDelimiters: false}))));
}

exports["?"] = reader.operator('infix', 'binary', ternary2prefix, 7);

function ternary2prefix(lexer, opSpec, conditionForm, questionMarkForm) {

  var thenForm = reader.read(lexer);
  lexer.skip_token(":");
  var elseForm = reader.read(lexer, opSpec.precedence-1);
  return sl.list("ternary", conditionForm, thenForm, elseForm);
}

// if? expression
exports['if?'] = function(lexer) {
  var ifToken = lexer.next_token('if?');
// OLD DELETE  var condition = reader.read(lexer);

  // as with javascript - the condition is wrapped in parens
  var condition = reader.read_wrapped_delimited_list(lexer, '(',')');

  // if in core *is* an expression (a ternary)
  var list = sl.list(sl.atom("if?", {token: ifToken}));
  list.push(condition);
  list.push(reader.read(lexer));

  // note: if there's an else they *must* use the keyword "else"
  if(lexer.on('else')) {
    // there's an else clause
    lexer.skip_text('else');
    list.push(reader.read(lexer));
  }

  list.__parenoptional = true;
  return list;
};

// statements ///////////////////////////////////////////////////////
// the following are paren-free readers for commands that support use
// of javascript *statements*.  Even "return" is supported.  And yes -
// this is really weird for a "lisp"!

// if statement
exports['if'] = function(lexer) {
  var ifToken = lexer.next_token('if');
  condition = reader.read_wrapped_delimited_list(lexer, '(', ')');

  // note: scripty generates if *statements* - so we use "ifs" (not just "if")
  var list = sl.list(sl.atom("if", {token: ifToken}));
  list.push(condition);

  if(lexer.on('{')) {
    // we use "begin" here to avoid an an IIFE wrapper:
    list.push(reader.read_delimited_list(lexer, '{', '}', [sl.atom('begin')]));
  }
  else {
    // a single form for the true path:
    list.push(reader.read(lexer));
  }

  // note: if there's an else they *must* use the keyword "else"
  if(lexer.on('else')) {
    // there's an else clause
    lexer.skip_text('else');
    if(lexer.on('{')) {
      // we use "begin" here to avoid an an IIFE wrapper:
      list.push(reader.read_delimited_list(lexer, '{', '}', [sl.atom('begin')]));
    }
    else {
      // a single form for the else path:
      list.push(reader.read(lexer));
    }
  }

  list.__parenoptional = true;
  return list;
};

// return
// it's odd to even consider having return in a lisp (where everything
// is an expression).  Yet the statement/expression distinction is
// ingrained in javascript programmers.  And the lack of statements
// makes sugarlisp's generated code more complex (lots of IIFEs) where
// it has to ensure everything can compose as an expression.
exports['return'] = function(lexer) {

  // is this a "return <value>" or a "return;" (i.e. return undefined)?
  // note:  we *require* the semicolon if they're returning undefined
  //   (otherwise they can literally do "return undefined")
  var returnNothing = lexer.on("return;");
  var list = sl.list(sl.atom("return", {token: lexer.next_token('return')}));
  if(!returnNothing) {
    list.push(reader.read(lexer));
  }
  list.__parenoptional = true;
  return list;
};

// for statement
exports['for'] = function(lexer) {

  var forToken = lexer.next_token('for');
  var list = sl.list(sl.atom("for", {token: forToken}));
  if(lexer.on('(')) {
    lexer.skip_text('(');
    // initializer
    list.push(reader.read(lexer));
    // condition
    list.push(reader.read(lexer));
    // final expr
    list.push(reader.read(lexer));
    if(!lexer.on(')')) {
      lexer.error("Missing expected ')'" + lexer.snoop(10));
    }
    lexer.skip_text(')');
    if(lexer.on('{')) {
      list.push(reader.read_delimited_list(lexer, '{', '}', [sl.atom("begin")]));
    }
    else {
      list.push(reader.read(lexer));
    }
  }
  else {
    lexer.error("A for loop must be surrounded by ()");
  }

  list.__parenoptional = true;
  return list;
};

// switch statement
exports['switch'] = function(lexer) {
  var switchToken = lexer.next_token('switch');
  var switchon = reader.read_wrapped_delimited_list(lexer, '(', ')');
  var list = sl.list(sl.atom("switch", {token: switchToken}));
  list.push(switchon);

  if(!lexer.on('{')) {
    lexer.error("The body of a switch must be wrapped in {}");
  }
  lexer.skip_token('{');

  var read_case_body = function(lexer) {
    var body = sl.list(sl.atom("begin"));
    // read up till the *next* case/default or the end:
    while(!lexer.eos() && !lexer.on(/case|default|}/g)) {
      var nextform = reader.read(lexer);
      // some "directives" don't return an actual form:
      if(!reader.isignorableform(nextform)) {
        body.push(nextform);
      }
    }
    return body;
  };

  var token;
  while (!lexer.eos() && (token = lexer.peek_token()) && token && token.text !== '}') {

    // the s-expression is like cond - in pairs:
    // (note the default can't be "true" like cond - switches match *values*)
    var casetoken = lexer.next_token();
    var caseval = casetoken.text === 'case' ?
                    reader.read(lexer) : sl.atom('default');
    if(!lexer.on(":")) {
      lexer.error('Missing ":" after switch case?');
    }
    lexer.skip_token(":");
    list.push(caseval);
    list.push(read_case_body(lexer));
  }
  if (!token || lexer.eos()) {
      lexer.error('Missing "}" on switch body?', switchToken);
  }
  var endToken = lexer.next_token('}'); // skip the '}' token
  list.setClosing(endToken);

  return list;
};

exports['do'] = reader.parenfree(1, {bracketed: 1});

// paren free "while" takes a condition and a body
exports['while'] = reader.parenfree(2, {parenthesized: 1, bracketed: 2});
// paren free "dotimes" takes (var, count) then body
exports['dotimes'] = reader.parenfree(2, {parenthesized: 1, bracketed: 2});
// paren free "each" takes a list/array plus a function called with: each element,
// the position in the list, and the whole list.
exports['each'] = reader.parenfree(2);

},{"sugarlisp-core/reader":41,"sugarlisp-core/sl-types":43}],77:[function(require,module,exports){
// tinix.js
//
// Copyright 2013 - Santosh Rajan - santoshrajan.com
//


if (!Element.prototype.on) Element.prototype.on = Element.prototype.addEventListener

var tinix = function(id) {
    return document.querySelector(id)
}

tinix.version = "0.0.15"

tinix.all = function(id) {
    return document.querySelectorAll(id)
}

tinix.forEach = function(s, f) {
    Array.prototype.forEach.call(this.all(s), f)
}

tinix.map = function(s, f) {
    return Array.prototype.map.call(this.all(s), f)
}

tinix.style = function(s, n, v) {
    this.forEach(s, function(elem) {
       elem.style[n] = v
    })
}

tinix.display = function(s, v) {
    this.style(s, "display", v)
}

tinix.ready = function(f) {
    if (document.readyState == "loading") {
        document.onreadystatechange = function() {
            if (document.readyState == "interactive") f()
        }
    } else {
        f()
    }
}

tinix.getR = function(c) {
    var r = new XMLHttpRequest()
    r.onload = function() {
        if (r.status == 200) {
            if (r.getResponseHeader("Content-Type") == "application/json") {
                c(null, JSON.parse(r.responseText))
            } else {
                c(null, r.responseText)
            }
        } else {
            c(r)
        }
    }
    return r
}

// get(url, callback [,overrideMimeType])
tinix.get = function(u, c, o) {
    var r = this.getR(c)
    r.open("GET", u)
    if (o) {
      r.overrideMimeType(o)
    }
    r.send()
}

// post(url, body, contenttype, callback)
tinix.post = function(u, b, t, c) {
    var r = this.getR(c)
    r.open("POST", u)
    r.setRequestHeader("Content-Type", t)
    r.send(b)
}

// postJSON(url, body, callback)
tinix.postJSON = function(u, b, c) {
    this.post(u, JSON.stringify(b), "application/json", c)
}

// Functional Stuff

tinix.curry = function(fn, numArgs) {
    numArgs = numArgs || fn.length
    return function f(largs) {
        return function() {
            var args = Array.prototype.concat.apply(largs, arguments)
            return args.length === numArgs ? fn.apply(null, args) : f(args)
        }
    }([])
}

tinix.compose = function() {
    var funcs = Array.prototype.slice.call(arguments)
    return function(x) {
        return funcs.reduceRight(function(prev_val, next) {
            return next(prev_val)
        }, x)
    }
}


/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path])
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/
 
tinix.cookies = {
  getItem: function (sKey) {
    return unescape(document.cookie.replace(new RegExp("(?:(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*)|.*"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toGMTString();
          break;
      }
    }
    document.cookie = escape(sKey) + "=" + escape(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = escape(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  }
};

module.exports = tinix


},{}],78:[function(require,module,exports){
module.exports={
  "name": "sugarlisp",
  "description": "The extensible lispy language with a javascript core",
  "keywords": [
    "javascript",
    "language",
    "sugarlisp",
    "sugarscript",
    "lispyscript",
    "compiler",
    "transpiler",
    "interpreter",
    "lisp"
  ],
  "author": "Darren Cruse",
  "contributors": ["Santosh Rajan", "Balaji Rao","Irakli Gozalishvili"],
  "version": "0.6.5",
  "licenses": [
    {
      "type": "MIT",
      "url": "https://raw.github.com/darrencruse/sugarlisp/master/LICENSE"
    }
  ],
  "engines": {
    "node": ">=0.4.0"
  },
  "directories": {
    "lib": "./lib"
  },
  "main": "./lib/engine",
  "bin": {
    "sugar": "./bin/sugar.js",
    "sugardbg": "./bin/sugardbg.js"
  },
  "homepage": "https://github.com/darrencruse/sugarlisp",
  "bugs": "https://github.com/darrencruse/sugarlisp/issues",
  "repository": {
    "type": "git",
    "url": "git://github.com/darrencruse/sugarlisp.git"
  },
  "scripts": {
    "test": "sugar test/test.slisp test/test.js && node test/test.js",
    "prepublish": "sugar src/sugar.slisp lib/sugar.js && sugar src/repl.slisp lib/repl.js && sugar src/require.slisp lib/require.js && browserify -t brfs -u source-map lib/browser.js > lib/sugarlisp-browser-bundle.js && browserify -t brfs -u source-map lib/browser.js -d -p [minifyify --no-map --uglify [ --compress ] ] | gzip > lib/sugarlisp-browser-bundle-min.js.gz && sugar test/test.slisp test/test.js"
  },
  "preferGlobal": true,
  "dependencies": {
    "sugarlisp-async": ">=0.5.3",
    "sugarlisp-core": ">=0.5.6",
    "sugarlisp-css": ">=0.5.1",
    "sugarlisp-csp": ">=0.5.2",
    "sugarlisp-html": ">=0.5.2",
    "sugarlisp-match": ">=0.5.2",
    "sugarlisp-plus": ">=0.5.5",
    "sugarlisp-sugarscript": ">=0.5.6",
    "node-getopt": ">=0.2.3",
    "debug": ">=2.2.0",
    "watch": ">= 0.14.0",
    "source-map": ">= 0.1.40",
    "underscore": "^1.8.2",
    "js-beautify": ">=1.5.10",
    "browserify": ">2.14.1",
    "brfs": ">=1.4.0",
    "minifyify": ">=7.0.3",
    "tinix": ">=0.0.3",
    "loophole": ">=1.0.0"
  }
}

},{}],79:[function(require,module,exports){

},{}],80:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":81}],81:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],82:[function(require,module,exports){
var indexOf = require('indexof');

var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var defineProp = (function() {
    try {
        Object.defineProperty({}, '_', {});
        return function(obj, name, value) {
            Object.defineProperty(obj, name, {
                writable: true,
                enumerable: false,
                configurable: true,
                value: value
            })
        };
    } catch(e) {
        return function(obj, name, value) {
            obj[name] = value;
        };
    }
}());

var globals = ['Array', 'Boolean', 'Date', 'Error', 'EvalError', 'Function',
'Infinity', 'JSON', 'Math', 'NaN', 'Number', 'Object', 'RangeError',
'ReferenceError', 'RegExp', 'String', 'SyntaxError', 'TypeError', 'URIError',
'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape',
'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'undefined', 'unescape'];

function Context() {}
Context.prototype = {};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInContext = function (context) {
    if (!(context instanceof Context)) {
        throw new TypeError("needs a 'context' argument.");
    }
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    var wEval = win.eval, wExecScript = win.execScript;

    if (!wEval && wExecScript) {
        // win.eval() magically appears when this is called in IE:
        wExecScript.call(win, 'null');
        wEval = win.eval;
    }
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
    forEach(globals, function (key) {
        if (context[key]) {
            win[key] = context[key];
        }
    });
    
    var winKeys = Object_keys(win);

    var res = wEval.call(win, this.code);
    
    forEach(Object_keys(win), function (key) {
        // Avoid copying circular objects like `top` and `window` by only
        // updating existing context properties or new properties in the `win`
        // that was only introduced after the eval.
        if (key in context || indexOf(winKeys, key) === -1) {
            context[key] = win[key];
        }
    });

    forEach(globals, function (key) {
        if (!(key in context)) {
            defineProp(context, key, win[key]);
        }
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInNewContext = function (context) {
    var ctx = Script.createContext(context);
    var res = this.runInContext(ctx);

    forEach(Object_keys(ctx), function (key) {
        context[key] = ctx[key];
    });

    return res;
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    var copy = new Context();
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};

},{"indexof":83}],83:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],84:[function(require,module,exports){
var $  = require("tinix");

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

},{"./browser-repl":1,"./engine":2,"sugarlisp-core/dialect-loader":26,"tinix":77}]},{},[84]);
