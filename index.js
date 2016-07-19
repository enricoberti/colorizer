var CHANGE_VARIABLES_EXTENSIONS = [
  '.js',
  '.css',
  '.less',
  '.mako'
];

var FORCE_SKIPPED_EXTENSIONS = [
  '.min.js',
];


var consoleColors = require('colors'),
  fs = require('fs'),
  hexColorRegex = require('hex-color-regex'),
  path = require('path'),
  colorDiff = require('color-diff');

function getLessDeclarations(input) {
  return input.match(/@[\w-_]+:\s*.*;[\/.]*/gm);
}

function mapLessDeclaration(declaration) {
  var parts = declaration.split(':'),
    key = parts.shift(),
    value = parts.join(':').replace(/^\s+|;$/gm, '');
  return [key, value];
}

function fillShorthand(hex){
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });
  return hex;
}

function hexToRgb(hex) {
  hex = fillShorthand(hex);
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    R: parseInt(result[1], 16),
    G: parseInt(result[2], 16),
    B: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(obj) {
  return "#" + ((1 << 24) + (obj.R << 16) + (obj.G << 8) + obj.B).toString(16).toUpperCase().slice(1);
}

function getContrastYIQ(hex) {
  hex = fillShorthand(hex);
  var r = parseInt(hex.substr(0, 2), 16);
  var g = parseInt(hex.substr(2, 2), 16);
  var b = parseInt(hex.substr(4, 2), 16);
  var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'black' : 'white';
}

console.log('Welcome to colorizer!'.rainbow);

try {
  fs.unlinkSync('result.html');
}
catch (e) {
}

var args = process.argv.slice(2);
if (args.length == 0) {
  console.log('Usage: node index.js PATH_TO_YOUR_FOLDER [--preview]')
  console.log('or')
  console.log('node index.js HEX_YOU_WANT_TO_CONVERT')
}
else {
  console.log('Starting...');

  var text = fs.readFileSync('colors.less', 'utf8');

  var lessColorDeclarations = getLessDeclarations(text);
  var lessColorsPalette = [];
  var lessColorsDeclarative = {};

  if (lessColorDeclarations) {
    console.log(('Loaded ' + lessColorDeclarations.length + ' color variables').green);

    lessColorDeclarations.forEach(function (color) {
      var c = mapLessDeclaration(color);
      lessColorsPalette.push(hexToRgb(c[1]));
      lessColorsDeclarative[c[0]] = c[1];
    });

    function getVariableFromValue(val) {
      for (var key in lessColorsDeclarative) {
        if (lessColorsDeclarative.hasOwnProperty(key)) {
          if (lessColorsDeclarative[key] === val){
            return key;
          }
        }
      }
      return 'Not found.';
    }

    if (args[0].indexOf('#') == 0){
      var nearest = colorDiff.closest(hexToRgb('#' + fillShorthand(args[0].substr(1))), lessColorsPalette);
      console.log('\t', args[0].red, '=>', rgbToHex(nearest).magenta, getVariableFromValue(rgbToHex(nearest)).green);
    }

    else {
      var finder = require('findit')(args[0]);

      finder.on('directory', function (dir, stat, stop) {
        var base = path.basename(dir);
        if (base === '.git' || base === 'node_modules') stop()
      });

      finder.on('file', function (file) {
        var baseName = path.basename(file);
        var readIt = false;
        CHANGE_VARIABLES_EXTENSIONS.forEach(function (ext) {
          if (baseName.toLowerCase().indexOf(ext) > -1) {
            readIt = true;
          }
        });
        FORCE_SKIPPED_EXTENSIONS.forEach(function (ext) {
          if (baseName.toLowerCase().indexOf(ext) > -1) {
            readIt = false;
          }
        });
        if (readIt) {
          fs.readFile(file, 'utf8', function (err, data) {
            if (err) {
              return console.log(err);
            }

            var matches;
            var re = hexColorRegex();
            console.log(file);
            while (matches = re.exec(data)) {
              if (matches.index === re.lastIndex) {
                re.lastIndex++;
              }
              var nearest = colorDiff.closest(hexToRgb(matches[0]), lessColorsPalette);

              var table = "<table width='600' style='margin-top: 5px'><tr><td width='200' style='font-family: monospace; text-align: center; background-color: " + matches[0] + "; color: " + getContrastYIQ(matches[0].substr(1)) + "; height: 30px'>" + matches[0] + "</td><td width='200' style='font-family: monospace; text-align: center; background-color: " + rgbToHex(nearest) + "; color: " + getContrastYIQ(rgbToHex(nearest).substr(1)) + "; height: 30px'>" + getVariableFromValue(rgbToHex(nearest)) + "</td></tr>"
              fs.appendFile('result.html', table, function (err) {
              });
              console.log('\t', matches[0].red, '=>', rgbToHex(nearest).magenta, getVariableFromValue(rgbToHex(nearest)).green);
              console.log('--')
            }
            if (args[1] == null || args[1] !== '--preview') {
              var result = data.replace(hexColorRegex(), function ($1) {
                var nearest = colorDiff.closest(hexToRgb($1), lessColorsPalette);
                return path.extname(file) === '.less' ? getVariableFromValue(rgbToHex(nearest)) : rgbToHex(nearest);
              });
              fs.writeFile(file, result, 'utf8', function (err) {
                if (err) {
                  return console.log(err);
                }
                ;
              });
            }
          });
        }
      });
    }
  }
}
