/**
 * Faz o build e publicação no repositorio
 */
const fs = require('fs');
const cpExec = require('child_process').exec;

function exec(command, callback) {
   callback = callback || function () { };
   
   return new Promise(function (accept, reject) {
      console.log('[' + command + ']');
      const com = cpExec(command);

      com.stdout.on('data', function (data) {
         console.log(data.toString());
      });

      com.stderr.on('data', function (data) {
         console.error(data.toString());
      });

      com.on('exit', function (code, signal) {
         if (signal) {
            reject({
               code: code,
               signal: signal
            });
            callback(code);
         } else {
            accept({
               code: code,
               signal: signal
            });
            callback(null, signal);
         }
      });
   });
}

var package = JSON.parse(fs.readFileSync(__dirname + '/package.json'));

exec('npm run-script build')
   // publicação
   // .then(publish.bind(undefined, 'web'))
   // .then(publish.bind(undefined, 'react'))
   // .then(publish.bind(undefined, 'node'))
   // commit e push
   .then(exec.bind(undefined, 'git add --all', null))
   .then(exec.bind(undefined, 'git commit -m "Publicação da versão v' + package.version + '"', null))
   .then(exec.bind(undefined, 'git push', null))
   .then(exec.bind(undefined, 'git tag v' + package.version, null))
   .then(exec.bind(undefined, 'git push --tags', null))
   .catch(err => {
      console.error(err);
   })
   ;

function publish(suffix) {

   package.main = 'dist/' + suffix + '.js';
   package.name = 'websocket-pubsub' + (suffix === 'node' ? '' : ('-' + suffix));

   let peerDependencies;

   if (suffix === 'node') {
      peerDependencies = {
         "ws": "^5.2.1"
      };
   } else if (suffix === 'react') {
      peerDependencies = {
         "react-native": "*"
      };
   }

   package.peerDependencies = peerDependencies;

   fs.writeFileSync(__dirname + '/package.json', JSON.stringify(package, null, 3));

   console.log('Publicando artefato: ' + package.name + '@' + package.version);

   return exec('npm publish');

   // publish.on('err', function (err) {
   //    console.log('err', err);
   //    throw err;
   // });
}
