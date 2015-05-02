let nssocket = require('nssocket');
let path = require('path');
let fs = require('fs');
let mkdirp = require('mkdirp');
let rimraf = require('rimraf');
let chokidar = require('chokidar');
let uuid = require('node-uuid');
let checksum = require('checksum');
let dbox = require('./lib/dbox');
let BinaryClient = require('binaryjs').BinaryClient;

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
        },
        master: {
            alias: 'm',
            description: "Running Mode, if specified, will mornitor the changes and publish, \n\n" +
            "other wise will not pubish changes",
            boolean: true,
            default: false
        }
    })
    .example('bode $0 -m -d <clientrootdir>')
    .example('bode $0 -d <clientrootdir>')
    .epilog('for more information visit https://github.com/dorangao/node.js-bootcamp')
    .argv;

require('songbird');

const SOCKETPORT = process.env.SOCKETPORT || 4949;
let wsserverUrl = "ws://localhost:9000";
const ROOT_DIR = path.resolve(argv.dir);

let clientid = uuid.v4();
let files = [];
let isMaster = argv.master;
let isReady = false;
let socket = new nssocket.NsSocket({
    reconnect: true,
    type: 'tcp4'
});
const FILE_EVENTS_MAP = {
    add: {action: "create", type: "file"},
    change: {action: "update", type: "file"},
    unlink: {action: "delete", type: "file"},
    addDir: {action: "create", type: "dir"},
    unlinkDir: {action: "delete", type: "dir"}
};


let filedata = {
    action: "delete",                        // "create", "update" or "delete"
    path: "/path/to/file/from/root",
    type: "dir",                            // or "file"
    chksum: null,                   // hash of the file according to contents,support binary as well
    clientid: clientid
};

socket.data('Watch', function (data) {
        if (data.clientid === clientid)
            return;
        let filePath = path.resolve(path.join(ROOT_DIR, data.path));
        //Directory
        if (data.type === 'dir') {
            if (data.action === 'delete') {
                fs.promise.stat(filePath)
                    .then(stat => {
                        rimraf.promise(filePath)
                        delete files[data.path];
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
                        console.log(filePath)
                        fs.promise.unlink(filePath);
                        delete files[data.path];
                    }).catch();
            } else if (!files[data.path] || files[data.path].chksum !== data.checksum) {
                if (files[data.path] && files[data.path].chksum && data.lastchksum && files[data.path].chksum !== data.lastchksum) {
                    //Save a conflict.
                    let bakFileName = filePath + files[data.path].chksum + '.bak';
                    console.log(`File Confliction -- Please check backup [${bakFileName}]`);
                    fs.promise.rename(filePath, bakFileName);
                }
                let dir = path.dirname(filePath);
                mkdirp.promise(dir);
                let wsclient = new BinaryClient(wsserverUrl);
                wsclient.on('open', function () {
                        dbox.cli_download(wsclient, ROOT_DIR, data.path);
                    }
                );
                files[data.path] = data;
            }
        }
    }
);
socket.data('Upload', function (data) {
        let wsclient = new BinaryClient(wsserverUrl);
        wsclient.on('open', function () {
                dbox.cli_upload(wsclient, ROOT_DIR, data.path);
            }
        );
    }
)
;

socket.on('start', function () {
    console.log('start');
    isReady = true;
});

chokidar.watch(ROOT_DIR, {ignoreInitial: false, ignored: /[\/\\]\.|node_modules|\.git|___jb_old___|\.bak/})
    .on('all', (event, path, stat) => {
        console.log(event, path);
        let filepath = path.toString().slice(ROOT_DIR.toString().length);
        filedata.action = FILE_EVENTS_MAP[event].action;
        filedata.type = FILE_EVENTS_MAP[event].type;
        filedata.path = filepath;
        files[filepath] = filedata;
        if (stat && filedata.type === 'file') {
            async ()=> {
                try {
                    let chksum = await checksum.promise.file(path);
                    console.log(chksum);
                    if (files[filepath].chksum === undefined || files[filepath].chksum !== chksum) {
                        files[filepath].chksum = chksum;
                        if (isReady && isMaster)
                            socket.send('Watch', files[filepath]);
                    }
                } catch (e) {
                    console.log(e.stack)
                }
            }
            ()
        } else if (isReady && isMaster)
            socket.send('Watch', files[filepath]);
    });

setTimeout(() => {
    socket.connect(SOCKETPORT);
    console.log(`TCP Client [${clientid}] is up`);
}, 3000);
