'use strict';
/**
 * Module dependencies.
 */

var argh = require('argh');
var render = require('./lib/render');
var logger = require('koa-logger');
// var route = require('koa-route');
// var send = require('koa-send');
var serve = require('koa-static');
var compress = require('koa-compress');
var responseTime = require('koa-response-time');
// var views = require('co-views');
var parse = require('co-body');
var koa = require('koa');
var app = koa();
var Primus = require('primus');

require('koa-trie-router')(app);
//
// Now that we've setup our basic server, we can setup our Primus server.
//
var server = require('http').Server(app.callback());
var primus = new Primus(server, { transformer: 'websockets', parser: 'JSON' });

primus.on('connection', function (spark) {
  console.log('new connection');

  spark.on('data', function data(packet) {
    console.log('incoming:', packet);

    //
    // Close the connection.
    //
    if (packet === 'end') spark.end();

    //
    // Echo the responses.
    //
    if (packet.echo) spark.write(packet.echo);

    //
    // Pipe in some data.
    //
    if (packet.pipe) fs.createReadStream(__dirname + '/index.html').pipe(spark, {
      end: false
    });

    //
    // Major server kill;
    //
    if (packet !== 'kill') return;

    primus.write('Spark: '+spark.id +' asked for a full server kill. Server will be killed within 5 seconds');
    setTimeout(process.exit, 5000);
  });
});

primus.library();

//
// Save the compiled file to the hard disk so it can also be distributed over
// cdn's or just be served by something else than the build-in path.
//
primus.save('app/scripts/primus.js');


// "database"

var posts = [];

// middleware

// Best to .use() at the top before any other middleware, to wrap all subsequent middleware.
app.use(responseTime());

// Recommended that you .use() this middleware near the top to "wrap" all subsequent middleware.
app.use(logger());

app.use(app.router);
app.use(compress());
app.use(serve(__dirname + '/app'));

// route middleware

app.get('/', list);
app.get('/post/new', add);
app.get('/post/:id', show);
app.post('/post', create);

app.get('/api', function *api() {
  this.body = { something: 'some else hmmss' };
});

// route definitions

/**
 * Post listing.
 */

function *list() {
  this.body = yield render('list', { posts: posts });
}

/**
 * Show creation form.
 */

function *add() {
  this.body = yield render('new');
}

/**
 * Show post :id.
 */

function *show(id) {
  var post = posts[id];
  if (!post) this.throw(404, 'invalid post id');
  this.body = yield render('show', { post: post });
}

/**
 * Create a post.
 */

function *create() {
  var post = yield parse(this);
  var id = posts.push(post) - 1;
  post.created_at = new Date;
  post.id = id;
  this.redirect('/');
}

// listen

app.listen(3000);
console.log('listening on port ' + 3000);