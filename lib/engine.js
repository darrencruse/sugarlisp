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
