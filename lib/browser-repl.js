
// Note that the browser repl uses jquery.terminal
// But we do not bundle jquery in browser-bundle.js due to it's size.
// If you would like to use the browser repl you must link in the relevant
// jquery files and call sugarlisp.enableBrowserRepl() in document ready

if(typeof window !== 'undefined') {

  var transpiler = require("./transpiler")
  var logo = require("./logo-ogre");
  var displayLogo = true; // we display the logo just once

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
            prompt: 'Sugar> ',
            name: 'slrepl',
            width: width,
            height: height,
            enabled: false,
            keypress: function(e) { return !(openCheck(e)); }
        };
        if(showLogo) {
          settings.greetings = [logo(),
            '                              ','SugarLisp v',transpiler.version,'\n'].join('');
        }
        else {
          settings.greetings = 'SugarLisp v' + transpiler.version;
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

    // Are we building up a multiline command?
    var currentCmd = '';

    function compileCmd(command, options) {
      options = options || {};
      options.for = options.for || "browser";
      currentCmd += (command + '\n');
      return transpiler.transpile(currentCmd,"stdin.slml", options);
    }

    function incompleteCmd(command, terminal) {
        terminal.set_prompt('  ...> ');
    }

    function completeCmd(terminal, msg, options) {
        currentCmd = '';
        if(msg) {
          terminal.echo(msg, options);
        }
        terminal.set_prompt('Sugar> ');
    }

    jQuery("#" + replElementId)[replElementId](function(command, terminal) {
       (function() {
         // skip empty commands
         if(/\S/.test(command)) {
           try {
             // "code" command = see generated javascript
             var codeCmd = command.match(/\s*code\s*(.*)/);
             if(codeCmd && codeCmd.length) {
               var jscode = compileCmd(codeCmd[1]);
               completeCmd(terminal, '[[;blue;black]' + jscode + ']');
             }
             else if((parseCmd = command.match(/\s*parse\s*(.*)/)) && parseCmd && parseCmd.length) {
               // printing the parse tree in s-sexpression (rather than json) format
               // for the silly reason that the terminal.echo formatting get's confused otherwise!!
console.log('parsing:', parseCmd[1]);
               var ast = compileCmd(parseCmd[1], {unwrapTopForm: true, to: 'core'});
               completeCmd(terminal, '[[;orange;black]' + ast + ']');
             }
             else {
               var jscode = compileCmd(command);
               jscode = jscode.replace(/require\s*\(/g, 'slrequire(');
               var res = eval.call(window, jscode);
               completeCmd(terminal, '[[;yellow;black]' + res + ']');
             }
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

  // currently sugarlisp is the only public module that's nicely requireable
  // without a "./" prefix - so just make the browser repl available off it:
  transpiler.enableBrowserRepl = enableBrowserRepl;

}
