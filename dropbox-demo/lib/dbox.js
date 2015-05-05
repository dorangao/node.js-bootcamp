/**
 * Manages uploading and streaming of files.
 */

let fs = require('fs');
let path = require('path');
let filesize = require('filesize');
let checksum = require('checksum');
let _ = require('lodash-node');
require('songbird');

module.exports = {
    watch: watch,
    notifyOthers: notifyOtherClients,
    request_cli_upload: request_cli_upload,
    cli_upload: cli_upload,
    upload: upload,
    cli_download: cli_download,
    download: download,
    lsR: lsR
};

// Recursive function to list all the files given an
async function lsR(dirPath, prefix) {
    let promises = [];
    let names = [];
    prefix = prefix || "";
    for (let name of await fs.promise.readdir(dirPath)) {
        let fullpath = path.resolve(path.join(dirPath, name));
        let stat = await fs.promise.stat(fullpath);
        if (stat.isDirectory())
            promises.push(lsR(fullpath, path.join(prefix, name)));
        else
            names.push(path.join(prefix, name));
    }
    return names.concat(_.flatten(await Promise.all(promises)))
}

function emit(client, event, meta, stream) {
    stream = stream || {};
    meta = meta || {};
    meta.event = event;
    return client.send(stream, meta);
}

function watch(client, meta) {
    emit(client, 'watch', meta);
}

function request_cli_upload(client, meta) {
    emit(client, 'cli-upload', meta);
}

function notifyOtherClients(bs, client, meta) {
    console.dir(meta);
    _.forIn(bs.clients, function (cli) {
        if (cli !== client)
            emit(cli, 'cli-watch', meta);
    });
}

function cli_upload(client, meta, dirPath) {
    async () => {
        let filePath = path.resolve(path.join(dirPath, meta.name));
        let fileStream = await fs.createReadStream(filePath, {
            'flags': 'r'
        })
        console.log("Upload [" + meta.name + "] begin!");
        //be care about the local variable and global variable.
        let stream = emit(client, 'upload', meta, fileStream)
        let tx = 0;
        stream.on('data', function (data, err) {
            var msg = "not changed";

            if (data.end) {
                msg = "Upload [" + filesize(meta.size) + "] complete!";
            } else if (data.rx) {
                msg = "Upload " + Math.round(100 * (tx += data.rx * 100)) / 100 + '%';
            } else {
                msg = err;
            }
            console.log(msg);
        });
    }
    ()
}

function upload(stream, meta, dirPath, cb) {
    let filePath =
        path.join(dirPath, meta.name);

    let fileStream =
        fs.createWriteStream(filePath);

    stream.pipe(fileStream);

    stream.on('data', function (data) {
        stream.write({rx: data.length / meta.size});
    });
    stream.on('end', function () {
        stream.write({end: true});
        cb;
    });
}

function cli_download(client, meta, dirPath) {
    let filePath = path.resolve(path.join(dirPath, meta.name));
    let fileStream = fs.createWriteStream(filePath);
    //be care about the local variable and global variable.
    let stream = emit(client, 'download', {name: meta.name})
    let totalSize = meta.size;
    console.log("Download [" + filePath + "] begin!");
    stream.pipe(fileStream);
    let tx = 0;
    stream.on('data', function (data, err) {
        var msg = "not changed";
        if (data) {
            let rx = data.length / totalSize;
            msg = "Download " + Math.round(100 * (tx += 100 * rx)) / 100 + '%';
        } else {
            msg = err;
        }
        console.log(msg);
    });
    stream.on('end', function () {
        console.log("Download [" + filesize(totalSize) + "] complete!");
    });
}

function download(stream, meta, dirPath) {
    async () => {
        let filePath = path.resolve(path.join(dirPath, meta.name));
        let stat = await fs.promise.stat(filePath)
        let fileStream = await fs.createReadStream(filePath, {
            'flags': 'r'
        });
        fileStream.pipe(stream);
    }
    ();
}