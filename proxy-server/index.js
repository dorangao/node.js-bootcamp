let http = require('http')
let fs = require('fs')
let request = require('request')
let argv = require('yargs')
    .default('host', '127.0.0.1')
    .argv
let scheme = 'http://'
let port = argv.port || argv.host === '127.0.0.1' ? 8000 : 80

let destinationUrl = argv.url || scheme + argv.host + ':' + port
let logStream = argv.logfile ? fs.createWriteStream(argv.logfile) : process.stdout

http.createServer((req, res) => {
    logStream.write('\n Echo Request:\n' + JSON.stringify(req.headers))

    for (let header in req.headers)
        res.setHeader(header, req.headers[header])

    req.pipe(res)
    req.pipe(logStream, {end: false})
}).listen(8000)


http.createServer((req, res) => {
    logStream.write('\n Proxy Request:\n' + JSON.stringify(req.headers))
    req.pipe(logStream, {end: false})

    let url = destinationUrl
    if (req.headers['x-destination-url'])
        url = req.headers['x-destination-url']

    let options = {
        headers: req.headers,
        url: url + req.url
    }
    logStream.write('\n Proxy Destination Url:\n' + options.url)
    let destinationResponse = req.pipe(request(options))
    destinationResponse.pipe(res)
    destinationResponse.pipe(logStream, {end: false})
}).listen(8001)
