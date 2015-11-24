# sugarlisp
The extensible lisp-to-javascript transpiler

#### WORK IN PROGRESS - NOT TO BE USED IN PRODUCTION

SugarLisp supports pluggable language "dialects" in the form of npm modules which extend both the syntax, as well as the code generation, of a basic lispy core.

There are currently two "language" dialects and several smaller "mixin" dialects.

[SugarLisp Core](https://github.com/darrencruse/sugarlisp-core) is a simple lisp designed to be easy for javascript programmers to understand.
It is derived from (and remains largely compatible with) [LispyScript](http://lispyscript.com)

All language extensions desugar their syntax to [SugarLisp Core](https://github.com/darrencruse/sugarlisp-core) (which can be thought of as the AST for the other dialects).

SugarScript is another "language" dialect which wraps SugarLisp behind a javascript-like syntax.

Additional "mixin" dialects include:

* [match](https://github.com/darrencruse/sugarlisp-match) - adds pattern matching syntax based on [Dave Herman's pattern-match library](https://github.com/dherman/pattern-match)
* [html](https://github.com/darrencruse/sugarlisp-html)  - adds support for inline-html (compare e.g. to [Facebook React JSX](https://facebook.github.io/jsx/))
* [async](https://github.com/darrencruse/sugarlisp-async) - paper over differences in callback, promise, generator based asyncronous code
* [csp](https://github.com/darrencruse/sugarlisp-csp)   - go style concurrency based upon [ubulonton's js-csp library](https://github.com/ubolonton/js-csp)
* [statements](https://github.com/darrencruse/sugarlisp-statements) - sugarlisp is expressions-only, this adds support for statements and "return"

(expect this readme to be greatly expanded soon!)

