'use strict';

var restify = require('restify');
var bluebird = require('bluebird');

module.exports = restClient;

restClient.errors = restify.errors;

function restClient(clientOptions, requestOptions) {
  var client = restify.createJsonClient(clientOptions || {});
  var clientAsync;
  var request;

  clientAsync = bluebird.promisifyAll(client);
  request = new Request(clientAsync, requestOptions || {});

  return request;
}

function Request(client, defaults, prefix) {
  this.client = client;

  this.get  = buildRequest('get', client, defaults, prefix);
  this.del  = buildRequest('del', client, defaults, prefix);
  this.head = buildRequest('head', client, defaults, prefix);
  this.post = buildRequest('post', client, defaults, prefix);
  this.put  = buildRequest('put', client, defaults, prefix);

  this.prefix = buildPrefixedRequest(this, defaults, prefix);
  this.resource = buildResourceRequest(this, defaults, prefix);
}

function buildRequest(method, client, defaults, prefix) {
  var req = function request(path) {
    return function performRequest(/* entity_or_options, options */) {
      var options;
      var entity;
      var parsed;
      var args;

      if (acceptsEntity(method)) {
        entity = arguments[0];
        options = merge(defaults, arguments[1] || {});
        args = [options, entity];
      } else {
        options = merge(defaults, arguments[0] || {});
        args = [options];
      }

      parsed = parsePath(prefix, path, void 0, options.params);

      options.path = parsed.path;
      return client[method + 'Async'].apply(client, args).spread(reorderRequestFulfillment);
    };
  };

  return req;
}

function buildPrefixedRequest(request, defaults, currentPrefix) {
  return function prefixedRequest(prefix, fn) {
    return function performPrefixedRequest(id, params) {
      var parsed = parsePath(currentPrefix, prefix, id, params);
      var req = new Request(request.client, defaults, parsed.path);

      return (fn ? fn(req) : {});
    };
  };
}

function buildResourceRequest(request, defaults, prefix) {
  return function resourceRequest(path, fn) {
    return function performResourceRequest(id, params) {
      var parsed = parsePath(prefix, path, id, params);
      var collectionRequest;
      var memberRequest;
      var fullPath;
      var links;
      var req;

      params = parsed.params;
      fullPath = parsed.path;
      memberRequest = new Request(request.client, defaults, fullPath + '/' + params.id);
      collectionRequest = new Request(request.client, defaults, fullPath);

      req = {member: memberRequest, collection: collectionRequest};
      links = (fn ? fn(req.member, req.collection) : {});

      if (params.id) {
        return merge({
          show:   request.get(path + '/' + params.id),
          update: request.put(path + '/' + params.id),
          remove: request.del(path + '/' + params.id)
        }, links);
      } else {
        return merge({
          create: request.post(path),
          all:    request.get(path)
        }, links);
      }
    };
  };
}

// Helper functions

function acceptsEntity(method) {
  return method === 'post' || method === 'put';
}

function reorderRequestFulfillment(req, res, obj) {
  return [obj, req, res];
}

function parsePath(prefix, path, id, params) {
  var fullPath;

  params = (params || {});

  if (!('id' in params)) params.id = id;

  fullPath = (String(prefix || '') + path).replace(/(:[^\/]+)\/?/ig, function (_, name) {
    return params[name.slice(1)];
  });

  return {
    path: fullPath,
    params: params
  };
}

function merge() {
  var extensions = Array.prototype.slice.apply(arguments);
  var merged = Object.create(null);

  for (var i = 0, l = extensions.length; i < l; i++) {
    for (var k in extensions[i]) {
      if (has(extensions[i], k)) {
        if (k in merged && 'object' === typeof merged[k]) {
          merged[k] = merge(merged[k], extensions[i][k]);
        } else {
          merged[k] = extensions[i][k];
        }
      }
    }
  }

  return merged;
}

function has(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
