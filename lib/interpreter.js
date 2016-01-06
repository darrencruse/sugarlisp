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
