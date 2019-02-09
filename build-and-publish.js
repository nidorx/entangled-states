/**
 * Faz o build e publicação no repositorio
 */
const fs = require('fs');
const exec =  require('child_process').exec;

console.log('[npm run-script build]');
const build = exec('npm run-script build');

build.stdout.on('data', function (data) {
   console.log(data.toString());
});

build.stderr.on('data', function (data) {
   console.warn(data.toString());
});

build.on('exit', function (code, signal) {
   const versions = ['web', 'react', 'node'];
   let index = 0;
   const next = function () {
      let version = versions[index++];

      var package = JSON.parse(fs.readFileSync(__dirname + '/package.json'));
      package.main = 'dist/' + version + '.js';
      package.name = 'websocket-pubsub' + (version === 'node' ? '' : ('-' + version));

      let peerDependencies;

      if (version === 'node') {
         peerDependencies = {
            "ws": "^5.2.1"
         };
      } else if (version === 'react') {
         peerDependencies = {
            "react-native": "*"
         };
      }

      package.peerDependencies = peerDependencies;

      fs.writeFileSync(__dirname + '/package.json', JSON.stringify(package, null, 3));

      console.log('[npm publish] ' + package.name + '@' + package.version);

      const publish = exec('npm publish');

      publish.stdout.on('data', function (data) {
         console.log(data.toString());
      });

      publish.stderr.on('data', function (data) {
         console.warn(data.toString());
      });
      

      publish.on('exit', function (code, signal) {
         if (index < versions.length) {
            console.log(arguments);
            next();
         }
      });

      publish.on('err', function (err) {
         console.log('err', err);
         throw err;
      });
   }

   next();
});



