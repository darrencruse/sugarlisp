var sl = require('sugarlisp-core/sl-types'),
    reader = require('sugarlisp-core/reader'),
    utils = require('sugarlisp-core/utils');
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

  jscodestr = jscodestr.trim();

  // if it's a function or an object literal
  // wrap it in parens...
  if(jscodestr.indexOf("function") !== -1 ||
     jscodestr.substr(0,1) === '{') {
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
