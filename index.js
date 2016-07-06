var CHANGE_VARIABLES_EXTENSIONS = [
  '.js',
  '.css',
  '.less',
  '.mako'
];

var FORCE_SKIPPED_EXTENSIONS = [
  '.min.js',
];


require('colors');
var fs = require('fs');
var hexColorRegex = require('hex-color-regex')
var path = require('path');
var colorDiff = require('color-diff');

function getLessDeclarations(input) {
  return input.match(/@[\w-_]+:\s*.*;[\/.]*/gm);
}

function mapLessDeclaration(declaration) {
  var parts = declaration.split(':'),
    key = parts.shift(),
    value = parts.join(':').replace(/^\s+|;$/gm, '');
  return [key, value];
}

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

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

console.log('Welcome to colorizer!'.rainbow);

try {
  fs.unlinkSync('result.html');
}
catch (e){}

var args = process.argv.slice(2);
if (args.length == 0) {
  console.log('Usage: node index.js PATH_TO_YOUR_FOLDER [--preview]')
}
else {
  console.log('Starting...');

  var text = fs.readFileSync('colors.less', 'utf8');
  var lessColorDeclarations = getLessDeclarations(text);
  var lessColors = {};
  var lessColorsPalette = [];

  if (lessColorDeclarations) {

    console.log(('Loaded ' + lessColorDeclarations.length + ' color variables').green);

    lessColorDeclarations.forEach(function (color) {
      var c = mapLessDeclaration(color);
      lessColorsPalette.push(hexToRgb(c[1]));
      lessColors[c[0]] = c[1];
    });
    var nearestColor = require('nearest-color').from(lessColors);

    var finder = require('findit')(args[0]);

    finder.on('directory', function (dir, stat, stop) {
      var base = path.basename(dir);
      if (base === '.git' || base === 'node_modules') stop()
    });

    finder.on('file', function (file) {
      var baseName = path.basename(file);
      var readIt = false;
      CHANGE_VARIABLES_EXTENSIONS.forEach(function(ext){
        if (baseName.toLowerCase().indexOf(ext) > -1){
          readIt = true;
        }
      });
      FORCE_SKIPPED_EXTENSIONS.forEach(function(ext){
        if (baseName.toLowerCase().indexOf(ext) > -1){
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
          while(matches = re.exec(data)) {
            if (matches.index === re.lastIndex) {
              re.lastIndex++;
            }
            var near = nearestColor(matches[0]);
            var nearest = colorDiff.closest(hexToRgb(matches[0]), lessColorsPalette);

            var table = "<table width='600' style='margin-top: 5px'><tr><td width='200' style='background-color: "+matches[0]+"; height: 30px'></td><td width='200' style='background-color: "+near.value+"; height: 30px'></td><td width='200' style='background-color: "+rgbToHex(nearest)+"; height: 30px'></td></tr>"
            fs.appendFile('result.html', table, function (err) {

            });
            console.log('\t', matches[0].red, '=>', near.value.magenta, near.name.green);
            console.log('\t', matches[0].red, '=>', rgbToHex(nearest).blue);
            console.log('--')
          }
          if (args[1] == null || args[1] !== '--preview'){
            var result = data.replace(hexColorRegex(), function($1){ return nearestColor($1).value; });
            fs.writeFile(file, result, 'utf8', function(err) {
              if (err) {
                return console.log(err);
              };
            });
          }
        });
      }
    });
  }
}
