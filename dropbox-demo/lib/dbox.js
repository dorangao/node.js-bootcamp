/**
 * Manages uploading and streaming of files.
 */

let fs = require('fs');
let path = require('path');
let mime = require('mime-types');
let filesize = require('filesize');
let checksum = require('checksum');
require('songbird');

module.exports = {
    upload: upload,
    download: download,
    cli_upload: cli_upload,
    cli_download: cli_download
};


function download(client, meta, dirPath) {
    async () => {
        let filePath = path.resolve(path.join(dirPath, meta.name));
        let stat = await fs.promise.stat(filePath)
        let fileStream = await fs.createReadStream(filePath, {
            'flags': 'r',
            'bufferSize': 4 * 1024
        });
        client.send(fileStream, {size: stat.size});
    }
    ();
}

function upload(stream, meta, dirPath,cb,data) {
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

function cli_download(client, dirPath, fileName) {
    async () => {
        let stream = client.createStream({
            event: 'download',
            name: fileName
        });
        let tx = 0;
        client.on('stream', function (stream, meta) {
            let filePath = path.resolve(path.join(dirPath, fileName));
            let fileStream = fs.createWriteStream(filePath);
            let totalSize = meta.size;
            console.log("Download [" + fileName + "] begin!");
            stream.pipe(fileStream);
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
                client.destroy();
            });
        })
    }
    ()
}

function cli_upload(client, dirPath, fileName) {
    async () => {
        let filePath = path.resolve(path.join(dirPath, fileName));
        let stat = await fs.promise.stat(filePath);
        let totalSize = stat.size;
        let fileStream = await fs.createReadStream(filePath, {
            'flags': 'r',
            'bufferSize': 4 * 1024
        })
        let contentType = mime.contentType(path.extname(filePath));
        console.log("Upload [" + fileName + "] begin!");
        let stream = client.send(fileStream, {
            event: 'upload',
            size: totalSize,
            name: fileName,
            type: contentType
        });
        let tx = 0;
        stream.on('data', function (data, err) {
            var msg = "not changed";

            if (data.end) {
                msg = "Upload [" + filesize(totalSize) + "] complete!";
                client.destroy();
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