let request = require('request');
let fs = require('fs');
let filesize = require('filesize');
let path = require('path');
let argv = require('yargs')
    .usage('This is Dropbox Program - Simple Client\n\nUsage: $0 [options]')
    .help('help').alias('help', 'h')
    .version('1.0.0', 'version').alias('version', 'V')
    .options({
        method: {
            alias: 'X',
            description: "The method [HEAD,GET, PUT, POST, DELETE]",
            requiresArg: true,
            default: 'GET'
        },
        header: {
            alias: 'H',
            description: "Specify specific key:paire",
            requiresArg: true
        },
        localfile: {
            alias: 'l',
            description: "Local File to Upload or save",
            requiresArg: true
        },
        remotefile: {
            alias: 'r',
            description: "The remote file/folder to download or upload",
            requiresArg: true,
            required: true
        },
        data: {
            alias: 'd',
            description: "the data to publish",
            requiresArg: true
        }
    })
    .example('bode $0 -l <local file> -r <remote file/folder> -X PUT')
    .epilog('for more information visit https://github.com/dorangao/node.js-bootcamp')
    .argv;

let method = argv.method.toUpperCase();

let options = {
    method: method,
    headers: [],
    url: "http://127.0.0.1:8000/" + argv.remotefile
};

let stdout = process.stdout;

switch (method) {
    case 'HEAD':
        request(options, function (err, resp, body) {
            console.log('\n------Response ----\n');
            console.dir(resp.headers);
        });
        break;
    case 'GET':
        if (argv.localfile) {
            let output = fs.createWriteStream(argv.localfile);
            if (argv.header) {
                let vals = argv.header.split(':');
                options.headers[vals[0]] = [vals[1]];
            }
            let res = request(options);
            res.pipe(output);
            let tx = 0;
            res.on('data', function (data) {
                tx += data.length;
                console.log("Received --[" + filesize(tx) + "]");
            });
            output.on('close', function () {
                console.log("Download [" + argv.localfile + "]--[" + filesize(tx) + "] complete!")
            })
        } else {
            request(options, function (err, resp, body) {
                console.log('\n----  Response ----\n');
                console.dir(resp.headers);
                console.log('\n----  Body     ----\n');
                console.log(resp.body);
            });
        }
        break;
    case 'PUT':
        if(argv.data){
            let req = request(options, function (err, resp, body) {
                console.log('\n----  Response ----\n');
                console.dir(resp.headers);
                console.log('\n----  Body     ----\n');
                console.log(resp.body);
            });
            req.write(argv.data);

        }else if(argv.localfile) {
            let input = fs.createReadStream(argv.localfile);
            let req = request(options);
            input.pipe(req);
            let tx = 0;
            input.on('data', function (data) {
                tx += data.length;
                console.log("Upload --[" + filesize(tx) + "]");
            });
            input.on('close', function () {
                console.log("Upload [" + argv.localfile + "]--[" + filesize(tx) + "] complete!");
            });
        }else {
            console.log('Please specify data or local file path.');
        }
        break;
    case 'POST':
        if(argv.data){
            let req = request(options, function (err, resp, body) {
                console.log('\n----  Request  ----\n');
                console.dir(resp.request.headers);
                console.log('\n----  Response ----\n');
                console.dir(resp.headers);
                console.log('\n----  Body     ----\n');
                console.log(resp.body);
            });
            req.write(argv.data);

        }else if(argv.localfile) {
            let input = fs.createReadStream(argv.localfile);
            let req = request(options);
            input.pipe(req);
            let tx = 0;
            input.on('data', function (data) {
                tx += data.length;
                console.log("Upload --[" + filesize(tx) + "]");
            });
            input.on('close', function () {
                console.log("Upload [" + argv.localfile + "]--[" + filesize(tx) + "] complete!");
            });
        }else {
            console.log('Please specify data or local file path.');
        }
        break;
    case 'DELETE':
        request(options, function (err, resp, body) {
            console.log('\n------Response ----\n');
            console.dir(resp.headers);
        });
        break;
    default:
        console.log('Please give a valid http method[HEAD,GET, PUT, POST, DELETE]');
}