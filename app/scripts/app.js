'use strict';

angular.module('todoKoaApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });

var primus;

function log(name, header, message) {
  var div = document.createElement('div');
  div.className = 'output output-'+ name;

  div.innerHTML = [
    '<h4>'+ header +'</h4>',
    message ? '<p>'+ message +'</p>' : ''
  ].join('');

  document.getElementById('output').appendChild(div);
  window.scroll(0, document.body.offsetHeight);
}

document.getElementById('action').onsubmit = function submit() {
  if (!primus) {
    log('error', 'Not connected', 'You need to press the `connect` button before you can send data');
    return false;
  }

  try { primus.write((Function('return '+ document.getElementById('data').value))()); }
  catch (e) { log('error', 'JavaScript Error', e.message); }

  return false;
};

document.getElementById('connect').onclick = function click() {
  if (primus) primus.end();

  primus = new Primus();

  primus.on('reconnect', function reconnect(opts) {
    log('reconnect', 'Reconnecting', 'We are <strong>scheduling</strong> a new reconnect attempt. This is attempt <strong>'+ opts.attempt +'</strong> and will trigger a reconnect operation in <strong>'+ opts.timeout +'</strong> ms.');
    document.getElementById('connect').innerHTML = 'reconnecting';
  });

  primus.on('reconnect', function reconnect() {
    log('reconnect', 'Reconnect', 'Starting the reconnect attempt, hopefully we get a connection!');
  });

  primus.on('online', function online() {
    log('network', 'Online', 'We have regained control over our internet connection.');
  });

  primus.on('offline', function offline() {
    log('network', 'Offline', 'We lost our internet connection.');
  });

  primus.on('open', function open() {
    log('open', 'Open', 'The connection has been established.');
    document.getElementById('connect').innerHTML = 'connected';
  });

  primus.on('error', function error(err) {
    log('error', 'Erorr', 'An unknown error has occured <code>'+ err.message +'</code>');
  });

  primus.on('data', function incoming(data) {
    log('data', 'Received data', 'string' === typeof data ? data : '<pre><code>'+ JSON.stringify(data, null, 2) +'</code></pre>');
  });

  primus.on('end', function end() {
    log('end', 'End', 'The connection has ended.');
    document.getElementById('connect').innerHTML = 'connect';
  });

  primus.on('close', function end() {
    log('close', 'close', 'We\'ve lost the connection to the server.');
  });
};
