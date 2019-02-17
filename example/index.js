const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

const Actions = require('entangled-states').Actions;
const Publishers = require('entangled-states').Publishers;
const PubSubServer = require('entangled-states').PubSubServer;


const PUBLIC_DIR = path.join(__dirname, '/public');

if (!fs.existsSync(PUBLIC_DIR)) {
   fs.mkdirSync(PUBLIC_DIR);
}

/**
 * In memory DataStore, use MongoDB, NeDB, Sequelize or create a new
 */
class Datastore {

   constructor(){
      this.SEQUENCE = 1;
      this.ROWS = [];
   }

   match(query, row) {
      for (var attr in query) {
         if (!query.hasOwnProperty(attr)) {
            continue;
         }
         if (!row.hasOwnProperty(attr)) {
            return false;
         }
         if (query[attr] !== row[attr]) {
            return false;
         }
      }
      // Match
      return true;
   }

   insert(data, callback) {
      setTimeout(() => {
         data._id = this.SEQUENCE++;
         this.ROWS.push(data);
         callback(data);
      });
   }

   find(query, projection, callback) {
      setTimeout(() => {
         const rows = this.ROWS.filter(this.match.bind(this, query));
         callback(null, rows);
      });
   };

   findOne(query, projection, callback) {
      setTimeout(() => {
         const row = this.ROWS.find(this.match.bind(this, query));
         callback(null, row);
      });
   };

   update(query, data, options, callback) {
      this.find(query, (err, rows) => {
         if (err) {
            return callback(err);
         }

         rows.forEach(row => {
            for (var attr in data) {
               if (!data.hasOwnProperty(attr)) {
                  continue;
               }

               row[attr] = data[attr];
            }
         });

         const numberOfUpdated = rows.length;
         callback(null, numberOfUpdated);
      });
   };
}

/**
 * As base de dados da aplicação
 */
const DB = {
   GROUPS: new Datastore(),
   USERS: new Datastore(),
   MESSAGES: new Datastore(),
   /**
    * Logs as the last messages sent to each topic
    */
   TOPICS: new Datastore()
};

//-------------------------------------------------------------
// Publishers
//-------------------------------------------------------------
Publishers.create({
   topic: 'groups',
   queries: [
      {
         store: DB.GROUPS
      }
   ]
});

// messages by group _id
Publishers.create({
   topic: 'messages',
   idRequired: true,
   queries: [
      {
         store: DB.MESSAGES,
         query: { groupId: '$id' },
      }
   ]
});

//-------------------------------------------------------------
// Actions
//-------------------------------------------------------------
Actions.register('createGroup', (data, ws, accept, reject) => {
   if (data.name.trim() === '') {
      return reject('Group Name is required.');
   }

   DB.GROUPS.insert({ name: data.name }, (err, newDoc) => {
      if (err) {
         return reject(err);
      }

      accept();

      // Publish to all subscribers of topic
      Publishers.publish('groups');
   });
});

Actions.register('sendMessage', (data, ws, accept, reject) => {
   DB.USERS.insert({ groupId: data.groupId, message: data.message }, (err, newDoc) => {
      if (err) {
         return reject(err);
      }

      accept();

      // Publish to all subscribers of topic
      Publishers.publish('messages', data.groupId);
   });
});


//-------------------------------------------------------------
// Aplication
//-------------------------------------------------------------
const app = express();

const server = http.createServer(app);

app.use('/', express.static(PUBLIC_DIR));

//initialize the PubSub server instance
new PubSubServer(server)/

//start our server
server.listen(process.env.PORT || 3000, () => {
   console.log(`Server started, port ${process.env.PORT || 3000}`);
});
