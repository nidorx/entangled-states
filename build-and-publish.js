/**
 * Faz o build e publicação no repositorio
 */
const fs = require('fs');
const { exec } = require('child_process');

const build = exec('npm run-script build');

build.stdout.on('data', function (data) {
   console.log(data.toString());
});

build.on('exit', function (code, signal) {
   const versions = ['web', 'react', 'node'];
   let index = 0;
   const next = function () {
      let version = versions[index++];

      var package = JSON.parse(fs.readFileSync(__dirname + '/package.json'));
      package.main = 'dist/' + version + '.js';
      package.name = 'websocket-pubsub' + (version === 'node' ? '' : ('-' + version));
      fs.writeFileSync(__dirname + '/package.json', JSON.stringify(package, null, 3));

      const publish = exec('npm publish');

      publish.stdout.on('data', function (data) {
         console.log(data.toString());
      });

      publish.on('exit', function (code, signal) {
         if (index < versions.length) {
            next();
         }
      });
   }

   next();
});



