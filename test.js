'use strict';
/* global describe: true, before: true, after: true, it: true */

var http = require('http');
var assert = require('assert');

var restClient = require('./index');

function api() {
  var req = restClient({
    url: 'http://localhost:1337',
    version: '~1'
  }, {
    headers: { 'X-API-Token': 'token' }
  });

  return {
    about: req.get('/about'),
    categories: req.resource('/categories'),
    articles: req.resource('/articles', function (member, collection) {
      return {
        comments: member.resource('/comments'),
        latest: collection.get('/latest')
      };
    }),
    tags: req.prefix('/tags', function (prefix) {
      return {
        all: prefix.get('/'),
        articles: prefix.get('/:id/articles')
      };
    })
  };
}

function server(callback) {
  var svr = http.createServer();
  svr.listen(1337, callback);
  return svr;
}

describe('json-rest-client', function () {
  before(function (done) {
    this.api = api();
    this.server = server(done);
  });

  after(function () {
    this.server.close();
  });

  it('maps REST actions into methods', function () {
    var articles;

    articles = this.api.articles();
    assert('create' in articles, '.articles().create is missing.');
    assert('all'    in articles, '.articles().all is missing.');

    articles = this.api.articles(42);
    assert('show'   in articles, '.articles(:id).show is missing.');
    assert('update' in articles, '.articles(:id).update is missing.');
    assert('remove' in articles, '.articles(:id).remove is missing.');
  });

  it('maps custom actions into methods', function () {
    assert('about' in this.api, '.about is missing.');
  });

  it('performs the requests using default client options', function (done) {
    this.server.once('request', function (req) {
      try {
        assert.equal(req.headers['x-api-token'], 'token');
      } catch (e) { return done(e); }
      done();
    });

    this.api.articles().all();
  });

  it('performs a request for a custom action', function (done) {
    this.server.once('request', function (req) {
      try {
        assert.equal(req.method, 'GET');
        assert.equal(req.url, '/about');
      } catch (e) { return done(e); }
      done();
    });

    this.api.about();
  });

  it('performs the requests on member routes of nested resources', function (done) {
    this.server.once('request', function (req) {
      try {
        assert.equal(req.method, 'POST');
        assert.equal(req.url, '/articles/42/comments');
      } catch (e) { return done(e); }
      done();
    });

    this.api.articles(42).comments().create({name: 'Troll', comment: 'First!'});
  });

  it('performs the requests on collection routes of nested resources', function (done) {
    this.server.once('request', function (req) {
      try {
        assert.equal(req.method, 'GET');
        assert.equal(req.url, '/articles/latest');
      } catch (e) { return done(e); }
      done();
    });

    this.api.articles().latest();
  });

  it('exports restify errors', function () {
    assert(restClient.errors, '.errors is not present.');
  });
});
