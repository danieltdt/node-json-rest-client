json-rest-client
================

Declarative REST client.

## API

### restClient(clientOptions, requestOptions)

Initialize a REST client using [restify](https://www.npmjs.org/package/restify).

`clientOptions` are passed to `restify.createJsonClient`. The only additional
option that is not passed to `restify` is `clientOptions.prefix`. This option
allow you to define a base path for your api (i.e. `/api/v1`).

`requestOptions` are passed to every request (`get`, `post`, etc).

Returns a `rest` object. Check Usage for more info.

## Usage

```javascript
var rest = require('json-rest-client')({
  url: 'http://api.server',
  version: '~1'
}, {
  headers: {'x-api-token': 'abcdef'}
});

var api = {
  home: rest.get('/'),
  articles: rest.resource('/articles', function (member, collection) {
    return {
      comments: member.resource('/comments'),
      publish: member.post('/publish'),
      latest: collection.get('/latest')
    };
  })
};

module.exports = api;
```

It will create methods for the following urls:

* GET     /
* GET     /articles
* POST    /articles
* GET     /articles/latest
* GET     /articles/:id
* PUT     /articles/:id
* DELETE  /articles/:id
* POST    /articles/:id/publish
* GET     /articles/:article_id/comments
* POST    /articles/:article_id/comments
* GET     /articles/:article_id/comments/:id
* PUT     /articles/:article_id/comments/:id
* DELETE  /articles/:article_id/comments/:id

and they are accessible as:

```
api.articles().all();
api.articles(1).publish();
api.articles(2).comments().create({name: 'me', comment: 'Hahaha, cool stuff.'});
api.articles(2).comments(1).show();
api.articles(2).comments(1).update({comment: 'I changed my mind.'});
api.articles(2).comments(1).remove();
```

All those methods returns a promise.
