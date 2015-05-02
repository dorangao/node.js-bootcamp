let nssocket = require('nssocket');
let path = require('path');
let mkdirp = require('mkdirp');
let rimraf = require('rimraf');
let fs = require('fs');
let chokidar = require('chokidar');
let checksum = require('checksum');
var _ = require('lodash-node');
var http = require('http');
var BinaryServer = require('binaryjs').BinaryServer;
let dbox = require('./lib/dbox');
// Serve client side statically
let express = require('express');
let app = express();
let uuid = require('node-uuid');

let argv = require('yargs')
    .usage('This is Dropbox program - Server\n\nUsage: $0 [options]')
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
let nodeify = require('bluebird-nodeify');
require('songbird');

const SOCKETPORT = process.env.SOCKETPORT || 4949;
const WSPORT = process.env.WSPORT || 9000;

const ROOT_DIR = path.resolve(argv.dir);
let serverid = uuid.v4();
let files = [];
let sockets = [];

const FILE_EVENTS_MAP = {
    add: {action: "create", type: "file"},
    change: {action: "update", type: "file"},
    unlink: {action: "delete", type: "file"},
    addDir: {action: "create", type: "dir"},
    unlinkDir: {action: "delete", type: "dir"}
};

let filedata = {
    action: "create",                        // "update" or "delete"
    path: "/path/to/file/from/root",
    type: "dir",                            // or "file"
    chksum: null,
    lastchksum: null

};

let server = nssocket.createServer(function (socket) {

    sockets.push(socket);
    socket.data('Watch', function (data) {

            let filePath = path.resolve(path.join(ROOT_DIR, data.path));
            //Directory
            if (data.type === 'dir') {
                if (data.action === 'delete') {
                    fs.promise.stat(filePath)
                        .then(stat => {
                            rimraf.promise(filePath);
                            delete files[data.path];
                            notifyOthers(socket, data);
                        }).catch();
                } else if (data.action === 'create') {
                    mkdirp.promise(filePath);
                    files[data.path] = data;
                    notifyOthers(socket, data);
                }

            }
            //File
            else {
                if (data.action === 'delete') {
                    fs.promise.stat(filePath)
                        .then(stat => {
                            fs.promise.unlink(filePath);
                            files[data.path] = undefined;
                            notifyOthers(socket, data);
                        }).catch();

                } else if (!files[data.path] || files[data.path].chksum !== data.chksum) {
                    mkdirp.promise(path.dirname(filePath));
                    if (files[data.path])
                        data.lastchksum = files[data.path].chksum;
                    files[data.path] = data;
                    socket.send('Upload', {path: data.path})
                }
            }
        }
    );

});

chokidar.watch(ROOT_DIR, {
    atomic: true,
    ignoreInitial: false,
    ignored: /[\/\\]\.|node_modules|\.git|___jb_old___|\.bak/
}).on('all', (event, path, stat) => {
    let filepath = path.toString().slice(ROOT_DIR.toString().length);
    console.log(event, path);
    filedata.action = FILE_EVENTS_MAP[event].action;
    filedata.type = FILE_EVENTS_MAP[event].type;
    filedata.path = filepath;
    files[filepath] = filedata;
    if (stat && filedata.type === 'file') {
        async ()=> {
            try {
                let chksum = await checksum.promise.file(path);
                if (files[filepath].chksum === undefined || files[filepath].chksum !== chksum) {
                    files[filepath].chksum = chksum;
                    console.log(chksum);
                }
            } catch (e) {
                console.log(e.stack)
            }
        }
        ()
    }
});

setTimeout(() => {
    server.listen(SOCKETPORT);
    console.log('TCP Server is up');
}, 3000);


let wsserver = http.createServer(app);
var bs = BinaryServer({server: wsserver});


bs.on('connection', function (client) {
    client.on('stream', function (stream, meta) {
        switch (meta.event) {
            case 'download':
                dbox.download(client, meta, ROOT_DIR);
                break;
            case 'upload':
                dbox.upload(stream, meta, ROOT_DIR, notifyOthers(null, files[meta.name]));
                break;
            default:
                stream.write("No Route for the request:" + JSON.stringify(meta));
                console.dir(meta);
        }
    });
});

wsserver.listen(WSPORT);
console.log('File Server is up.');


function notifyOthers(socket, data) {
    sockets.forEach(function (so) {
        if ((_.isEmpty(socket) || so !== socket) && so.connected)
            so.send('Watch', data);
    });
}
