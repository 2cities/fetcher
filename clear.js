
var co = require('co')
var mongo = require('mongodb')
var debug = require('debug')('2cities:fetcher')

var config = require('./lib/config')



co(function * () {
  var db = yield mongo.connect(config.MONGO_URL, {w: -1})

  var publish = db.collection('publish')
  var user = db.collection('user')

  yield publish.remove({})
  yield user.remove({})

  yield db.close()
}).catch(function (err) {
  console.log('------------------------------------------')
  console.log(err)
  console.log(err.stack)
  console.log('------------------------------------------')
})
