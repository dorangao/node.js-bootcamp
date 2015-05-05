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

const PORT = process.env.PORT || 8000;
let wsserverUrl = "ws://localhost:"+PORT;
const ROOT_DIR = path.resolve(argv.dir);

let clientid = uuid.v4();
let files = [];
let wsclient = new BinaryClient(wsserverUrl);
let isMaster = argv.master;
let isReady = false;
const FILE_EVENTS_MAP = {
    add: {action: "create", type: "file"},
    change: {action: "update", type: "file"},
    unlink: {action: "delete", type: "file"},
    addDir: {action: "create", type: "dir"},
    unlinkDir: {action: "delete", type: "dir"}
};


let filedata = {
    action: "delete",                        // "create", "update" or "delete"
    name: "/path/to/file/from/root",
    type: "dir",                            // or "file"
    chksum: null,                   // hash of the file according to contents,support binary as well
    clientid: clientid
};

chokidar.watch(ROOT_DIR, {ignoreInitial: false, ignored: /[\/\\]\.|node_modules|\.git|___jb_old___|\.bak/})
    .on('all', (event, path, stat) => {
        console.log(event, path);
        let filepath = path.toString().slice(ROOT_DIR.toString().length);
        filedata.action = FILE_EVENTS_MAP[event].action;
        filedata.type = FILE_EVENTS_MAP[event].type;
        filedata.name = filepath;
        filedata.size = stat ? stat.size : 0;
        files[filepath] = filedata;
        if (stat && filedata.type === 'file') {
            async ()=> {
                try {
                    let chksum = await checksum.promise.file(path);
                    console.log(chksum);
                    if (files[filepath].chksum === undefined || files[filepath].chksum !== chksum) {
                        files[filepath].chksum = chksum;
                        if (isReady && isMaster)
                            dbox.watch(wsclient, files[filepath]);
                    }
                } catch (e) {
                    console.log(e.stack)
                }
            }
            ()
        } else if (isReady && isMaster)
            dbox.watch(wsclient, files[filepath]);
    });


wsclient.on('open', function () {
        isReady = true;
        wsclient.on('stream', function (stream, meta) {
            switch (meta.event) {
                case 'cli-watch':
                    processCliWatch(wsclient, meta);
                    break;
                case 'cli-upload':
                    dbox.cli_upload(wsclient, meta, ROOT_DIR);
                    break;
                default:
                    stream.write("No Route for the request:" + JSON.stringify(meta));
                    console.dir(meta);
            }
        });


    }
);

wsclient.on('close', function () {
        console.log('server is down.')
        process.exit(1);
    }
);

function processCliWatch(client, meta) {
    if (meta.clientid === clientid)
        return;
    let filePath = path.resolve(path.join(ROOT_DIR, meta.name));
    //Directory
    if (meta.type === 'dir') {
        if (meta.action === 'delete') {
            fs.promise.stat(filePath)
                .then(stat => {
                    rimraf.promise(filePath)
                    delete files[meta.name];
                }).catch();
        } else if (meta.action === 'create') {
            ignores[filePath] = true;
            mkdirp.promise(filePath);
            files[meta.name] = meta;
        }
    }
    //File
    else {
        if (meta.action === 'delete') {

            fs.promise.stat(filePath)
                .then(stat => {
                    console.log(filePath)
                    fs.promise.unlink(filePath);
                    delete files[meta.name];
                }).catch();
        } else if (!files[meta.name] || files[meta.name].chksum !== meta.checksum) {
            if (files[meta.name] && files[meta.name].chksum && meta.lastchksum && files[meta.name].chksum !== meta.lastchksum) {
                //Save a conflict.
                let bakFileName = filePath + files[meta.name].chksum + '.bak';
                console.log(`File Confliction -- Please check backup [${bakFileName}]`);
                fs.promise.rename(filePath, bakFileName);
            }
            let dir = path.dirname(filePath);
            mkdirp.promise(dir);
            dbox.cli_download(client, meta, ROOT_DIR);
            files[meta.name] = meta;
        }
    }

}
