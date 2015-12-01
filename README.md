# sugarlisp
The extensible lisp-to-javascript transpiler

#### WORK IN PROGRESS - NOT TO BE USED IN PRODUCTION

SugarLisp supports pluggable language "dialects" in the form of npm modules which extend both the syntax, as well as the code generation, of a basic lispy core.

There are currently two "language" dialects and several smaller "mixin" dialects.

[SugarLisp Core](https://github.com/darrencruse/sugarlisp-core) is a simple lisp designed to be easy for javascript programmers to understand.

SugarLisp Core started from (and remains fairly compatible with) [LispyScript](http://lispyscript.com)

All language extensions desugar their syntax to SugarLisp Core.  It can be thought of as the AST for the other dialects.

SugarScript is another "language" dialect which wraps SugarLisp behind a javascript-like syntax.

Additional "mixin" dialects include:

* [match](https://github.com/darrencruse/sugarlisp-match) - adds pattern matching syntax based on [Dave Herman's pattern-match library](https://github.com/dherman/pattern-match)
* [html](https://github.com/darrencruse/sugarlisp-html)  - adds support for inline-html (compare e.g. to [Facebook React JSX](https://facebook.github.io/jsx/))
* [async](https://github.com/darrencruse/sugarlisp-async) - paper over differences in callback, promise, generator based asyncronous code
* [csp](https://github.com/darrencruse/sugarlisp-csp)   - go style concurrency based upon [ubulonton's js-csp library](https://github.com/ubolonton/js-csp)

### Installation

    npm install sugarlisp -g

### Running the REPL

    sugar

### Compiling a File

Compile a sugarlisp file:

    sugar filename.slisp
    
Compile a sugarscript file:

    sugar filename.sugar
    
You can have your files compiled automatically by running:

    sugar --watch
    
See sugar --help for more options.

### Examples

Each of the dialect modules have examples in their respective "examples" directories.

If you're new to sugarlisp check out the examples (many with a big thanks to [LispyScript](http://lispyscript.com)) under [sugarlisp/node_modules/sugarlisp-core/examples](https://github.com/darrencruse/sugarlisp-core/tree/master/examples)
    
Or if you're more a javacript kind of person you might prefer to start with the examples at [sugarlisp/node_modules/sugarlisp-sugarscript/examples](https://github.com/darrencruse/sugarlisp-sugarscript/tree/master/examples)
  
