let nssocket = require('nssocket');
let path = require('path');
let fs = require('fs');
let mkdirp = require('mkdirp');
let rimraf = require('rimraf');
let crypto = require('crypto');
let chokidar = require('chokidar');
let uuid = require('node-uuid');
let argv = require('yargs')
    .usage('This is Dropbox program - Client\n\nUsage: $0 [options]')
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
const FILE_EVENTS_MAP = {
    add: {action: "create", type: "file"},
    change: {action: "update", type: "file"},
    unlink: {action: "delete", type: "file"},
    addDir: {action: "create", type: "dir"},
    unlinkDir: {action: "delete", type: "dir"}
};

let filedata = {
    "action": "delete",                        // "update" or "delete"
    "path": "/path/to/file/from/root",
    "type": "dir",                            // or "file"
    "contents": null,                            // or the base64 encoded file contents
    "chksum": null                    // time of creation/deletion/update
};


let clientid = uuid.v4();
let files = [];
let ignores = {};
let isready = false;

let socket = new nssocket.NsSocket({
    reconnect: true,
    type: 'tcp4'
});


socket.data('Watch', function (data) {
        console.dir(data);
        if (files[data.path] && files[data.path].chksum && files[data.path].chksum === data.chksum) {
            return;
        }

        let filePath = path.resolve(path.join(ROOT_DIR, data.path));
        //Directory
        if (data.type === 'dir') {
            if (data.action === 'delete') {
                fs.promise.stat(filePath)
                    .then(stat => {
                        ignores[filePath] = true;
                        rimraf.promise(filePath)
                        files[data.path] = undefined;
                    }).catch();
            } else if (data.action === 'create') {
                ignores[filePath] = true;
                mkdirp.promise(filePath);
                files[data.path] = data;
            }
        }
        //File
        else {
            if (data.action === 'delete') {
                fs.promise.stat(filePath)
                    .then(stat => {
                        ignores[filePath] = true;
                        fs.promise.unlink(filePath);
                        files[data.path] = undefined;
                    }).catch();
            } else if (!files[data.path] || files[data.path].chksum !== data.checksum) {


                if (files[data.path] && files[data.path].chksum && data.lastchksum && files[data.path].chksum !== data.lastchksum) {
                    //Save a conflict.
                    fs.promise.rename(filePath, filePath + files[data.path].chksum + '.bak');
                }

                let dir = path.dirname(filePath);
                ignores[dir] = true;
                mkdirp.promise(dir);
                ignores[filePath] = true;
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
    isready = true;

});

chokidar.watch(ROOT_DIR, {ignoreInitial: false, ignored: /[\/\\]\.|node_modules|\.git|___jb_old___|\.bak/})
    .on('all', (event, path, stat) => {
        let filepath = path.toString().slice(ROOT_DIR.toString().length);
        if (ignores[path.toString()] !== undefined) {
            ignores[path.toString()] = undefined;
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
                    let dataStr = data.toString();
                    let chksum = checksum(dataStr);
                    if (files[filepath].chksum === undefined || files[filepath].chksum !== chksum) {
                        files[filepath].chksum = chksum;
                        files[filepath].contents = dataStr;
                        if (isready)
                            socket.send('Watch', files[filepath]);
                        return;
                    }
                });
        }
        if (isready)
            socket.send('Watch', files[filepath]);
    });

setTimeout(() => {
    socket.connect(SOCKETPORT);
    console.log(`TCP Client [${clientid}] is up`);
}, 3000);


function checksum(str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex')
}
