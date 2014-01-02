'use strict';
/**
 * Module dependencies.
 */

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

var primus = new Primus(app, {/* options */});
primus.on('connection', function (spark) {
  console.log('connection has the following headers', spark.headers);
  console.log('connection was made from', spark.address);
  console.log('connection id', spark.id);

  spark.on('data', function (data) {
    console.log('received data from the client', data);

    //
    // Always close the connection if we didn't receive our secret imaginary
    // handshake.
    //
    if ('foo' !== data.secrethandshake) spark.end();
    spark.write({ foo: 'bar' });
    spark.write('banana');
  });

  spark.write('Hello world');
});

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
console.log('listening on port 3000');