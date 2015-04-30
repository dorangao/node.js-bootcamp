let nssocket = require('nssocket');
let path = require('path');
let mkdirp = require('mkdirp');
let rimraf = require('rimraf');
let fs = require('fs');
let crypto = require('crypto');
let chokidar = require('chokidar');
var _ = require('lodash-node');
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
const ROOT_DIR = path.resolve(argv.dir);

let files = [];
let isready = false;
let sockets = [];

const FILE_EVENTS_MAP = {
    add: {action: "create", type: "file"},
    change: {action: "update", type: "file"},
    unlink: {action: "delete", type: "file"},
    addDir: {action: "create", type: "dir"},
    unlinkDir: {action: "delete", type: "dir"}
};

let filedata = {
    "action": "create",                        // "update" or "delete"
    "path": "/path/to/file/from/root",
    "type": "dir",                            // or "file"
    "contents": null,                            // or the base64 encoded file contents
    "chksum": null,                    // time of creation/deletion/update
    "lastchksum": null
};


let server = nssocket.createServer(function (socket) {


    sockets.push(socket);

    socket.data('Watch', function (data) {
            let svrcopy = _.clone(data)
            if (files[svrcopy.path] && files[svrcopy.path].chksum && files[svrcopy.path].chksum !== svrcopy.chksum) {
                svrcopy.lastchksum = files[svrcopy.path].chksum;
            } else if (files[svrcopy.path] && files[svrcopy.path].chksum && files[svrcopy.path].chksum === svrcopy.chksum) {
                return;
            }
            notifyOthers(socket, svrcopy);
            console.dir(data);
            let filePath = path.resolve(path.join(ROOT_DIR, data.path));
            //Directory
            if (data.type === 'dir') {
                if (data.action === 'delete') {
                    fs.promise.stat(filePath)
                        .then(stat => {
                            rimraf.promise(filePath);
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
                } else if (!files[data.path] || files[data.path].chksum !== data.chksum) {
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

});

let watcher1 = chokidar.watch(ROOT_DIR, {
    ignoreInitial: false,
    ignored: /[\/\\]\.|node_modules|\.git|___jb_old___|\.bak/
}), watcher2 = chokidar.watch(ROOT_DIR, {
    ignoreInitial: true,
    ignored: /[\/\\]\.|node_modules|\.git|___jb_old___|\.bak/
});

watcher1.on('all', (event, path, stat) => {
    let filepath = path.toString().slice(ROOT_DIR.toString().length);
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
                    return;
                }
            });
    }
});

setTimeout(() => {
    server.listen(SOCKETPORT);
    isready = true;
    console.log('TCP Server is up');
    watcher1.close();
    watcher2.on('all', (event, path, stat) => {
        console.log(event, path);
    });
}, 3000);


function checksum(str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex')
}

function notifyOthers(socket, data) {
    if (!isready)
        return;
    let all = socket === undefined ? true : false;
    sockets.forEach(function (so) {
        if (all || (so !== socket && so.connected))
            so.send('Watch', data);
    });
}
