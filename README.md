# sugarlisp

#### WORK IN PROGRESS - NOT TO BE USED IN PRODUCTION

SugarLisp supports pluggable language "dialects" in the form of npm modules which extend both the syntax, as well as the code generated, by a basic lispy core.

There are currently three "language" dialects and several smaller "mixin" dialects.


### Language Dialects

SugarLisp "language dialects" include:

* [SugarLisp Core](https://github.com/darrencruse/sugarlisp-core) is a minimal lisp that transpiles to javascript.

SugarLisp Core is designed as the AST "assembly language" that all SugarLisp dialects build upon.
It started from (and remains somewhat compatible with) [LispyScript](http://lispyscript.com)

SugarLisp Core files use the extension ".score".

* [SugarLisp Plus](https://github.com/darrencruse/sugarlisp-plus) is a lisp/javascript hybrid.

SugarLisp Plus extends "core" with syntax borrowed from javascript e.g. "[]" for arrays, "{}" for code blocks and JSON style object literals, "=>" for infix arrow functions, etc.  Whereas SugarLisp Core is meant as a building block, SugarLisp Plus is meant as a useable lisp that's easy for programmers coming to lisp from a javascript background.

SugarLisp Plus files use the extension ".slisp".

* [SugarScript](https://github.com/darrencruse/sugarlisp-sugarscript) is a lisp that looks like javascript.

SugarScript uses traditional function call style ("fn(x)" not "(fn x)") and infix operators ("(x + y)" not "(+ x y)").  It's goal is to appeal to javascript programmers by being as close to javascript as possible while retaining the language extensibility afforded by lisp macros.

While SugarScript is young, inspiration comes from e.g. [CGOL](https://www.wikiwand.com/en/CGOL), [Dylan](https://www.wikiwand.com/en/Dylan_(programming_language)), [Rebol](http://www.wikiwand.com/en/Rebol), [Racket](https://www.wikiwand.com/en/Racket_(programming_language)) and [Sweet.js](http://sweetjs.org).

SugarScript files use the extension ".sugar".


### Mixin Dialects

Current SugarLisp "mixin dialects" (in various states of completion) include:

* [match](https://github.com/darrencruse/sugarlisp-match) - adds pattern matching syntax based on [Dave Herman's pattern-match library](https://github.com/dherman/pattern-match)
* [html](https://github.com/darrencruse/sugarlisp-html)  - adds support for inline html (compare to e.g. [Facebook React JSX](https://facebook.github.io/jsx/))
* [css](https://github.com/darrencruse/sugarlisp-css)  - adds support for inline css (compare to e.g. [Less](http://lesscss.org) and [Sass](http://sass-lang.com))
* [async](https://github.com/darrencruse/sugarlisp-async) - paper over differences in callback, promise, generator based asyncronous code
* [csp](https://github.com/darrencruse/sugarlisp-csp)   - go style concurrency based upon [ubulonton's js-csp library](https://github.com/ubolonton/js-csp)


### Installation

    npm install sugarlisp -g


### Running the REPL

    sugar


### Compiling a File

Compile a sugarlisp file to a .js file ("ext" is e.g. ".sugar", ".slisp", or ".score"):

    sugar filename.ext
    
You can also have your files compiled automatically by running (from your project directory):

    sugar --watch
    
See sugar --help for more options.


### Desugaring a File

To see your program desugared to it's SugarLisp Core "assembly language" version do:

    sugar --to core filename.ext filename.score


### Examples

Each of the dialect modules have examples in their respective "examples" directories.

If you're new to sugarlisp check out the examples (many with a big thanks to [LispyScript](http://lispyscript.com)) under [sugarlisp/node_modules/sugarlisp-plus/examples](https://github.com/darrencruse/sugarlisp-plus/tree/master/examples)
    
Or if you're more a javacript kind of person you might prefer to start with the examples at [sugarlisp/node_modules/sugarlisp-sugarscript/examples](https://github.com/darrencruse/sugarlisp-sugarscript/tree/master/examples)
  
