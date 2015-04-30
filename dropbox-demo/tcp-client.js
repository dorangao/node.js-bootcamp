let path = require('path');
let fs = require('fs');
let mkdirp = require('mkdirp');
let rimraf = require('rimraf');
let crypto = require('crypto');
let chokidar = require('chokidar');
let argv = require('yargs')
    .usage('This is Dropbox program\n\nUsage: $0 [options]'
    + '\nIt supports support change log level via client request header: x-log-level'
    + '\nor forward to the destination url which specified in request header: x-destination-url'
    + 'And it displays the server log in console with different colors according to log level'
    + '\n\nEcho Server listens on 8000 and will echo bach all the request received including body and headers.'
    + '\nProxy Server listens on 8001 and can forward to specified destination')
    .help('help').alias('help', 'h')
    .version('1.0.0', 'version').alias('version', 'V')
    .options({
        dir: {
            alias: 'd',
            description: "The client root directory",
            requiresArg: true,
            default: process.cwd()
        }
    })
    .example('bode $0 --dir <clientrootdir>')
    .epilog('for more information visit https://github.com/dorangao/node.js-bootcamp')
    .argv;

require('songbird');

const SOCKETPORT = process.env.SOCKETPORT || 4949;
const ROOT_DIR = path.resolve(argv.dir);
let nssocket = require('nssocket');
const FILE_EVENTS_MAP = {
    add: {action: "create", type: "file"},
    change: {action: "update", type: "file"},
    unlink: {action: "delete", type: "file"},
    addDir: {action: "create", type: "dir"},
    unlinkDir: {action: "delete", type: "dir"}
};

let files = [];

let ignores = {};

var socket = new nssocket.NsSocket({
    reconnect: true,
    type: 'tcp4'
});



socket.data('Watch', function (data) {
        console.dir(data);
        ignores[data.path] = true;
        let filePath = path.resolve(path.join(ROOT_DIR, data.path));
        //Directory
        if (data.type === 'dir') {
            if (data.action === 'delete') {
                fs.promise.stat(filePath)
                    .then(stat => {
                        rimraf.promise(filePath)
                        files[data.path] = undefined;
                    }).catch();
            } else if (data.action === 'create') {
                mkdirp.promise(filePath);
                files[data.path] = data;
            }
        }
        //File
        else {
            if (data.action === 'delete') {
                fs.promise.stat(filePath)
                    .then(stat => {
                        fs.promise.unlink(filePath);
                        files[data.path] = undefined;
                    }).catch();
            } else if (!files[data.path] || files[data.path].chksum !== data.checksum) {
                mkdirp.promise(path.dirname(filePath));
                fs.promise.writeFile(filePath, data.contents)
                    .then(() => {
                        data.contents = null;
                        files[data.path] = data;
                    }).catch();
            }
        }
    }
);

socket.on('start', function () {
    // The socket will emit this event periodically
    // as it attempts to reconnect
    //
    console.dir('start');
    chokidar.watch(ROOT_DIR, {ignoreInitial: true, ignored: /[\/\\]\.|node_modules|\.git|___jb_old___/})
        .on('all', (event, path, stat) => {
            let filepath = path.toString().slice(ROOT_DIR.toString().length);
            if(ignores[filepath] !== undefined)
            {
                ignores[filepath] == undefined;
                return;
            }
            console.log(event, path);
            filedata.action = FILE_EVENTS_MAP[event].action;
            filedata.type = FILE_EVENTS_MAP[event].type;
            filedata.path = filepath;
            files[filepath] = filedata;
            if (stat && filedata.type === 'file') {
                fs.promise.readFile(path)
                    .then(data => {
                        let chksum = checksum(data);
                        if (files[filepath].chksum === undefined || files[filepath].chksum !== chksum) {
                            files[filepath].chksum = chksum;
                            files[filepath].contents = data;
                            socket.send('Watch', files[filepath]);
                            files[filepath].contents = null;
                            return;
                        }
                    });
            }
            socket.send('Watch', files[filepath]);
        });

});


let filedata = {
    "action": "delete",                        // "update" or "delete"
    "path": "/path/to/file/from/root",
    "type": "dir",                            // or "file"
    "contents": null,                            // or the base64 encoded file contents
    "chksum": null                    // time of creation/deletion/update
};

socket.connect(SOCKETPORT);


function checksum(str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex')
}
