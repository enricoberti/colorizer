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
  path = require('path');

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
  var lessColorsForNearestLibrary = {};

  if (lessColorDeclarations) {
    console.log(('Loaded ' + lessColorDeclarations.length + ' color variables').green);

    lessColorDeclarations.forEach(function (color) {
      var c = mapLessDeclaration(color);
      lessColorsForNearestLibrary[c[0]] = c[1];
    });
    var nearestColor = require('nearest-color').from(lessColorsForNearestLibrary);

    if (args[0].indexOf('#') == 0){
      var nearest = nearestColor('#' + fillShorthand(args[0].substr(1)));
      console.log('\t', args[0].red, '=>', nearest.value.magenta, nearest.name.green);
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
              var nearest = nearestColor(matches[0]);

              var table = "<table width='600' style='margin-top: 5px'><tr><td width='200' style='font-family: monospace; text-align: center; background-color: " + matches[0] + "; color: " + getContrastYIQ(matches[0].substr(1)) + "; height: 30px'>" + matches[0] + "</td><td width='200' style='font-family: monospace; text-align: center; background-color: " + nearest.value + "; color: " + getContrastYIQ(nearest.value.substr(1)) + "; height: 30px'>" + nearest.name + "</td></tr>"
              fs.appendFile('result.html', table, function (err) {
              });
              console.log('\t', matches[0].red, '=>', nearest.value.magenta, nearest.name.green);
              console.log('--')
            }
            if (args[1] == null || args[1] !== '--preview') {
              var result = data.replace(hexColorRegex(), function ($1) {
                return path.extname(file) === '.less' ? nearestColor($1).name : nearestColor($1).value;
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
