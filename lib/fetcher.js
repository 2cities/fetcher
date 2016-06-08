
var cheerio = require('cheerio')
var co = require('co')
var urllib = require('co-urllib')
var url = require('url')
var debug = require('debug')('2cities:fetcher')

const BASE_URL = 'http://www.mohrss.gov.cn/SYrlzyhshbzb/zwgk/gggs/tg/index{number}.html'

/**
 * get publish page's url based on page number
 */
function _getPageUrl(number) {
  if (number == 1) {
    return BASE_URL.replace('{number}', '')
  } else {
    return BASE_URL.replace('{number}', '_' + (number-1))
  }
}

function * _fetchPage(url) {
  var retryCount = 0
  var result = {}

  // console.log('starting fetch ' + url)
  while(retryCount <=3) {
    try {
      result = yield urllib.request(url, {timeout: 3000 + (retryCount + 1) * 10000})
      break
    } catch (e) {
      debug('[ERROR] Fetching url: ' + url)
      debug('[ERROR]   error and retry it again .....' + e)
      retryCount = retryCount + 1
    }
  }

  if (result.status == 200) {
    var data = result.data
    var $ = cheerio.load(data.toString())
    return $
  } else {
    return false
  }
}

function * _fetchLink(pageNum, storeList) {

  var startUrl = _getPageUrl(pageNum)
  var $ = yield _fetchPage(startUrl)

  debug('[INFO] fetching index page: %s', pageNum, startUrl)

  if ($ === false) {
    return false
  }

  var listDom = $(".serviceMainListTabCon").toArray()
  var parsedUrl = url.parse(startUrl)

  listDom.forEach(dom => {
    var title = $(dom).find('a').text()
    var date = $(dom).find('.organMenuTxtLink').text()
    var href = $(dom).find('a').attr('href')

    var link = parsedUrl.resolve(href)

    if (title.indexOf('夫妻两地分居') > -1) {
      storeList.push({
        'page_title': title,
        'pub_date': date,
        'origin_href': href,
        'url': link
      })
    }
  })

  return true
}

/**
 * scan index and return all matched links
 */
function * fetchPublishLinks() {

  var storeList = []
  var startPage = 1
  var gotIt = true

  while (gotIt) {
    gotIt = yield _fetchLink(startPage++, storeList)
  }

  debug('[INFO] ListPageCount:', storeList.length)
  return storeList
}

function * fetchNames(url, pageTitle, year) {
  var $ = yield _fetchPage(url)

  if ($ === false) {
    return false
  }

  var data = []
  var startOrder = -1
  var lastOrder = -1
  var newOrder
  var missOrders = []
  $('tr').toArray().forEach(dom => {
    var tds = $(dom).find('td').toArray()
    var row = []
    tds.forEach(td => {
      row.push($(td).text().trim())
    })


    newOrder = parseInt(row[0])

    if(!isNaN(newOrder) && row[1]) {
      if (startOrder === -1) {
        startOrder = newOrder
      }

      if (lastOrder !== -1 && lastOrder + 1 < newOrder) {
        missOrders.push((lastOrder + 1) + '-' + (newOrder - 1))
      }
      lastOrder = newOrder

      data.push({
        'year': newOrder < startOrder ? year + 1 : year,
        'order': parseInt(row[0]),
        'unit': row[1],
        'applicant': row[2],
        'spouse': row[3],
        'children': row[4] != '' ? row[4] : '-'
      })
    }
  })

  debug(pageTitle + ' - ' + data.length)
  debug(' --- start ' + startOrder)
  debug(' --- end ' + newOrder)
  debug(' --- missed: ' + missOrders.join(', '))

  return {
    pageTitle: pageTitle,
    data: data
  }
}

module.exports = {
  fetchPublishLinks: fetchPublishLinks,
  fetchNames: fetchNames
}
