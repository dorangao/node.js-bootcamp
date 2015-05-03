let path = require('path');
let fs = require('fs');
let https = require('https');
let http = require('http');
let agentkeepalive = require('agentkeepalive');
let request = require('request');
let express = require('express');
let morgan = require('morgan');
let nodeify = require('bluebird-nodeify');
let mime = require('mime-types');
let rimraf = require('rimraf');
let mkdirp = require('mkdirp');
let _ = require('lodash-node');
let archiver = require('archiver');
let unzip = require('unzip');
let dbox = require('./lib/dbox');

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

require('songbird');

const NODE_ENV = process.env.NODE_ENV;
const PORT = process.env.PORT || 8000;
const SSLPORT = process.env.SSLPORT || 8443;
const ROOT_DIR = path.resolve(argv.dir);

let app = express();


if (NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

async () => {

    let privateKey = await fs.promise.readFile('./certs/key.pem');
    let certificate = await fs.promise.readFile('./certs/cert.pem');
    let certOptions = {key: privateKey, cert: certificate};
    let HttpsAgent = agentkeepalive.HttpsAgent,
        agent = new HttpsAgent({keepAlive: true, keepAliveMsecs: 1000}),
        SSLHost = "127.0.0.1:" + SSLPORT;

    https.createServer(certOptions, app).listen(SSLPORT, ()=> console.log(`Listening @ https://127.0.0.1:${SSLPORT}`));
    //same as curl -k to ignore the certificate to allow http redirect
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    http.createServer(function (req, res) {
        req.headers['Host'] = SSLHost;
        let options = {
            headers: req.headers,
            agent: agent,
            url: "https://" + SSLHost + req.url,
            agentOptions: {
                ca: privateKey
            }
        };
        req.pipe(request(options)).pipe(res);

        //on stream closed we can end the request
        res.on('close', function () {
            res.end();
        });
    }).listen(PORT, ()=> console.log(`Listening @ http://127.0.0.1:${PORT}`));

}
();

app.get('*', setFileMeta, sendHeaders, (req, res, next) => {
    async ()=> {
        if (req.isDir) {
            if (!req.headers['x-get-zip']) {
                let files = await dbox.lsR(req.filePath);
                res.body = files.join(",");
                res.json(res.body);
            } else {
                await processDirZip(req, res, next);
            }
            return;
        }

        fs.createReadStream(req.filePath).pipe(res)
    }
    ().catch(next);
    next;
});

app.head('*', setFileMeta, sendHeaders, (req, res) => res.end());

app.delete('*', setFileMeta, (req, res, next) => {
    async ()=> {
        if (!req.stat) return res.send(400, 'Invalid Path');

        if (req.stat.isDirectory()) {
            await rimraf.promise(req.filePath)
        } else await fs.promise.unlink(req.filePath);
        res.end()
    }
    ().catch(next)
});

app.put('*', setFileMeta, setDirDetails, (req, res, next) => {
    async ()=> {
        if (req.stat) return res.send(405, 'File exists');
        await mkdirp.promise(req.dirPath);

        if (!req.isDir) {
            unzip2Dir(req,res);
        } else {
            let output = fs.createWriteStream(req.filePath);
            req.pipe(output);

            output.on('close', function () {
                return res.status(200).send('OK').end();
            });
        }
    }
    ().catch(next)
});

app.post('*', setFileMeta, setDirDetails, (req, res, next) => {
    async ()=> {
        if (!req.stat) return res.send(405, 'File does not exist');
        if (req.isDir || req.stat.isDirectory) return res.send(405, 'Path is a directory');

        await fs.promise.truncate(req.filePath, 0);
        req.pipe(fs.createWriteStream(req.filePath));
        res.end()
    }
    ().catch(next)
});

function setDirDetails(req, res, next) {
    let filePath = req.filePath;
    let endsWithSlash = filePath.charAt(filePath.length - 1) === path.sep;
    let hasExt = path.extname(filePath) !== '';
    req.isDir = endsWithSlash || !hasExt;
    req.dirPath = req.isDir ? filePath : path.dirname(filePath);
    next()
}

function setFileMeta(req, res, next) {
    req.filePath = path.resolve(path.join(ROOT_DIR, req.url));
    if (req.filePath.indexOf(ROOT_DIR) !== 0) {
        res.send(400, 'Invalid path');
        return
    }
    fs.promise.stat(req.filePath)
        .then(stat => req.stat = stat, ()=> req.stat = null)
        .nodeify(next)
}

function sendHeaders(req, res, next) {
    nodeify(async ()=> {
        if (req.stat.isDirectory()) {
            req.isDir = true;
            return
        }
        res.setHeader('Content-Length', req.stat.size);
        let contentType = mime.contentType(path.extname(req.filePath));
        res.setHeader('Content-Type', contentType)
    }(), next
)
}

/**
 * download folder as a zip file
 * */
function processDirZip(req, res, next) {
    async()=> {
        let files = await dbox.lsR(req.filePath);
        let archive = archiver('zip');
        archive.on('error', function (err) {
            console.log('errr');
        });

        let zipName = req.url === '/' ? 'server' : req.url.slice(req.url.lastIndexOf('/'));

        archive.pipe(res);
        for (let i in files) {
            let name = zipName + '/' + files[i];
            archive.append(fs.createReadStream(path.join(req.filePath, files[i])), {name: name});
        }
        archive.finalize();

        res.attachment(zipName + '.zip');
        res.on('close', function () {
            return res.status(200).send('OK').end();
        });

    }
    ();
}

/**
 *  upload a zip file as a folder
 * */
function unzip2Dir(req, res, next) {
    async()=> {

        let extract = unzip.Extract({ path: req.dirPath });
        req.pipe(extract);
        extract.on('close', function () {
            return res.status(200).send('OK').end();
        });

    }
    ().catch(err=>console.log(err.stack));
}
