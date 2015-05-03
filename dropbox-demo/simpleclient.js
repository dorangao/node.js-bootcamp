let request = require('request');
let fs = require('fs');
let filesize = require('filesize');
let path = require('path');
let argv = require('yargs')
    .usage('This is Dropbox program - Simple Client\n\nUsage: $0 [options]')
    .help('help').alias('help', 'h')
    .version('1.0.0', 'version').alias('version', 'V')
    .options({
        method: {
            alias: 'X',
            description: "The method GET or PUT",
            requiresArg: true,
            default: 'GET'
        },
        localzip: {
            alias: 'l',
            description: "Local File to Upload or save",
            requiresArg: true,
            required: true
        },
        remotedir: {
            alias: 'r',
            description: "The remote file/folder to download or upload",
            requiresArg: true,
            required: true
        }
    })
    .example('bode $0 -l <localZipfileName> -r <remote Director> -X GET')
    .epilog('for more information visit https://github.com/dorangao/node.js-bootcamp')
    .argv;

let localZip = argv.localzip;
let remoteDir = argv.remotedir;
let method = argv.method;

let headers = [];
headers['x-get-zip'] = true;
let options = {
    method: method,
    headers: headers,
    url: "http://127.0.0.1:8000/" + remoteDir
};

switch (method) {
    case 'GET':
        let output = fs.createWriteStream(localZip);
        let res = request(options);
        res.pipe(output);
        let tx = 0;
        res.on('data', function (data) {
            tx += data.length;
            console.log("Received --[" + filesize(tx) + "]");
        });
        output.on('close', function () {
            console.log("Download [" + localZip + "]--[" + filesize(tx) + "] complete!")
        });
        break;
    case 'PUT':
         let input = fs.createReadStream(localZip);
        let req=request(options);
        input.pipe(req);
        let tx = 0;
        input.on('data', function (data) {
            tx += data.length;
            console.log("Upload --[" + filesize(tx) + "]");
        });
        input.on('close', function () {
            console.log("Upload [" + localZip + "]--[" + filesize(tx) + "] complete!");
        });
        break;
    default:
        console.log('Only GET, PUT supported');
}