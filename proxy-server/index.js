let http = require('http');
let request = require('request');
let argv = require('yargs')
    .usage('This is my first awesome Node.js program\n\nUsage: $0 [options]'
    + '\nIt supports support change log level via client request header: x-log-level'
    + '\nor forward to the destination url which specified in request header: x-destination-url'
    + 'And it displays the server log in console with different colors according to log level'
    + '\n\nEcho Server listens on 8000 and will echo bach all the request received including body and headers.'
    + '\nProxy Server listens on 8001 and can forward to specified destination')
    .help('help').alias('help', 'h')
    .version('1.0.0', 'version').alias('version', 'V')
    .options({
        loglevel: {
            alias: 'll',
            description: "Log level: debug, info, warn, error",
            requiresArg: true,
            default: 'debug'
        },
        logfile: {
            alias: 'lf',
            description: "<filename> Input file name to save logs ",
            requiresArg: true
        },
        url: {
            alias: 'u',
            description: "default destination url for proxy server; it will override <host>:<port>",
            requiresArg: true
        },
        host: {
            alias: 't',
            default: '127.0.0.1',
            description: "default destination host for proxy server",
            requiresArg: true
        },
        port: {
            alias: 'p',
            description: "default destination port for proxy server",
            requiresArg: true
        },
        exec: {
            alias: 'e',
            description: "Process Proxy",
            requiresArg: true
        }
    })
    .example('bode index.js \n bode index.js --logleve warn \n bode index.js --logfile /home/sams/tmp/proxy.log')
    .epilog('for more information visit https://github.com/dorangao/node.js-bootcamp/tree/master/proxy-server')
    .argv;

//Process - proxy
if (argv.exec) {
    require('child_process').spawn(argv.exec, argv._, {stdio: 'inherit'});
    process.exit(0);
}

let scheme = 'http://';
let port = argv.port || argv.host === '127.0.0.1' ? 8000 : 80;
let destinationUrl = argv.url || scheme + argv.host + ':' + port;
let logger = (new require('./lib/Logger'))(argv.loglevel, argv.logfile);

http.createServer((req, res) => {

    logger.debug('Echo Request:' + JSON.stringify(req.headers));
    logger.debug(req);

    for (let header in req.headers)
        res.setHeader(header, req.headers[header]);

    req.pipe(res);
}).listen(8000);


http.createServer((req, res) => {
    if (req.headers['x-log-level'])
        logger.updateloglevel(req.headers['x-log-level']);

    logger.warn('Proxy Request:' + JSON.stringify(req.headers));
    logger.warn(req);

    let url = destinationUrl;
    if (req.headers['x-destination-url'])
        url = req.headers['x-destination-url'];

    let options = {
        headers: req.headers,
        url: url + req.url
      };
    logger.error(' Proxy Destination Url:' + options.url);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let destinationResponse = req.pipe(request(options));
    logger.info(destinationResponse);
    destinationResponse.pipe(res);
}).listen(8001);
