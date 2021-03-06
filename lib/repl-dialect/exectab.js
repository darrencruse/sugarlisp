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
