let path = require('path');
let fs = require('fs');
let https = require('https');
let http = require('http');
let request = require('request');
let express = require('express');
let morgan = require('morgan');
let nodeify = require('bluebird-nodeify');
let mime = require('mime-types');
let rimraf = require('rimraf');
let mkdirp = require('mkdirp');
let argv = require('yargs')
    .default('dir', process.cwd())
    .argv;

require('songbird');

const NODE_ENV = process.env.NODE_ENV;
const PORT = process.env.PORT || 8000;
const SSLPORT = process.env.SSLPORT || 8443;
const ROOT_DIR = path.resolve(argv.dir);

let app = express();

app.use(morgan('dev'))
app.use(function (req, res, next) {
    console.log(req.headers);
    next();
});

let privateKey = await fs.promise.readFile('certs/key.pem');
let certificate = await fs.promise.readFile('certs/cert.pem');
let options = {key: privateKey, cert: certificate};

https.createServer(options, app).listen(SSLPORT, ()=> console.log(`Listening @ https://127.0.0.1:${SSLPORT}`));

http.createServer(function (req, res) {
    req.headers['Host'] = "127.0.0.1:" + SSLPORT;
    let agentkeepalive = require('agentkeepalive'),
        HttpsAgent = agentkeepalive.HttpsAgent,
        agent = new HttpsAgent({keepAlive: true, keepAliveMsecs: 10000});
    let options = {
        agent:agent,
        headers: req.headers,
        url: "https://127.0.0.1:" + SSLPORT + req.url,
        agentOptions: {
            ca: await fs.promise.readFile('certs/key.pem')
        }
    };
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    let destinationResponse = req.pipe(request(options));
    destinationResponse.pipe(res);
}).listen(PORT, ()=> console.log(`Listening @ http://127.0.0.1:${PORT}`));

app.get('*', setFileMeta, sendHeaders, (req, res) => {
    if (res.body) {
        res.json(res.body);
        return
    }
    fs.createReadStream(req.filePath).pipe(res)
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

        if (!req.isDir) req.pipe(fs.createWriteStream(req.filePath));
        res.end()
    }
    ().catch(next)
});

app.post('*', setFileMeta, setDirDetails, (req, res, next) => {
    async ()=> {
        if (!req.stat) return res.send(405, 'File does not exist');
        if (req.isDir || req.stat.isDirectory()) return res.send(405, 'Path is a directory');

        fs.promise.truncate(req.filePath, 0);
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
        return;
    }
    fs.promise.stat(req.filePath)
        .then(stat => req.stat = stat, ()=> req.stat = null)
        .nodeify(next)
}

function sendHeaders(req, res, next) {
    nodeify(async ()=> {
        if (req.stat.isDirectory()) {
            let files = await fs.promise.readdir(req.filePath);
            res.body = JSON.stringify(files);
            res.setHeader('Content-Length', res.body.length);
            res.setHeader('Content-Type', 'application/json');
            return;
        }

        res.setHeader('Content-Length', req.stat.size);
        let contentType = mime.contentType(path.extname(req.filePath));
        res.setHeader('Content-Type', contentType)
    }(), next
)
};