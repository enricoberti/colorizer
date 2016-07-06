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

function getLessDeclarations(input) {
  return input.match(/@[\w-_]+:\s*.*;[\/.]*/gm);
}

function mapLessDeclaration(declaration) {
  var parts = declaration.split(':'),
    key = parts.shift(),
    value = parts.join(':').replace(/^\s+|;$/gm, '');
  return [key, value];
}

console.log('Welcome to colorizer!'.rainbow);

var args = process.argv.slice(2);
if (args.length == 0) {
  console.log('Usage: node index.js PATH_TO_YOUR_FOLDER [--preview]')
}
else {
  console.log('Starting...');

  var text = fs.readFileSync('colors.less', 'utf8');
  var lessColorDeclarations = getLessDeclarations(text);
  var lessColors = {};

  if (lessColorDeclarations) {

    console.log(('Loaded ' + lessColorDeclarations.length + ' color variables').green);

    lessColorDeclarations.forEach(function (color) {
      var c = mapLessDeclaration(color);
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
            console.log('\t', matches[0].red, '=>', near.name.green, near.value.magenta);
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