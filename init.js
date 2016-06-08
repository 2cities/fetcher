
var co = require('co')
var mongo = require('mongodb').MongoClient
var crypto = require('crypto')
var debug = require('debug')('2cities:fetcher')

var config = require('./lib/config')
var fetcher = require('./lib/fetcher')



co(function * () {
  var db = yield mongo.connect(config.MONGO_URL, {w: -1})
  var pubList = yield fetcher.fetchPublishLinks()

  var publish = db.collection('publish')
  var user = db.collection('user')

  // insert pubList to database
  //  - fetcher every pages and save all names into database

  yield pubList.map(function(item) {
    var year = /[^年]*年/.exec(item.page_title)[0].replace('年', '')
    var pageTitle = /.*年.*月/.exec(item.page_title)[0]
    debug('[%s] - %s', year, pageTitle)

    year = parseInt(year)

    var hash = crypto.createHash('sha1')
    item._id = hash.update(item.page_title).digest('hex')
    item.count = 0
    item.year = year
    var url = item.url

    return function * () {
      var result = yield fetcher.fetchNames(url, pageTitle, year)
      if (result !== false) {
        var data = result.data
        for(var i = 0; i < data.length; i++) {
          var row = data[i]
          row.publish_id = item._id
          row.year = item.year
          row.batch = pageTitle
          yield user.insert(row)
        }
      }
      yield publish.insert(item)
    }
  })

  /*

  for(var j = 0; j < pubList.length; j++) {
    var item = pubList[j]

    var year = /[^年]*年/.exec(item.page_title)[0].replace('年', '')
    var pageTitle = /.*年.*月/.exec(item.page_title)[0]

    debug('[%s] - %s', year, pageTitle)

    year = parseInt(year)

    var hash = crypto.createHash('sha1')
    item._id = hash.update(item.page_title).digest('hex')
    item.count = 0
    item.year = year

    var url = item.url
    var result = yield fetcher.fetchNames(url, pageTitle, year)

    if (result !== false) {
      var data = result.data
      for(var i = 0; i < data.length; i++) {
        var row = data[i]
        row.publish_id = item._id
        row.year = item.year
        row.batch = pageTitle
        yield user.insert(row)
      }
    }
    yield publish.insert(item)
  }

  */

  yield db.close()
}).catch(function (err) {
  console.log('------------------------------------------')
  console.log(err)
  console.log(err.stack)
  console.log('------------------------------------------')
})
