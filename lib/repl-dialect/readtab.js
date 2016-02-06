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
