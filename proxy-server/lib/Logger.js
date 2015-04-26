var Logger = function (level, logfile) {
    var logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        },
        currentLogLevel = level || logLevels.debug,// default log level. One of: debug, info, warn or error. Applied to transports File and Console
        winston = require('winston'),
        json = false,   // JSON is required for querying logs. Useful for live.
        config = {
            levels: logLevels,
            colors: {
                debug: 'blue',
                info: 'green',
                warn: 'yellow',
                error: 'red'
            }
        },
        _logger = new (winston.Logger)({
            transports: [
                new (winston.transports.Console)({
                    colorize: true,
                    level: Object.keys(config.levels)[config.levels.debug]
                })
            ],
            levels: config.levels
        });

    if (logfile) {
        console.log(logfile);
        _logger.remove(winston.transports.Console).add(winston.transports.File, {
            filename: logfile,
            json: json,
            level: Object.keys(config.levels)[config.levels.debug]
        })
    }

    var stream = require('stream');

    // Wrap original loggers in order to filter log level according to the one we set dynamically
    function log() {
        var level = arguments[0];
        if (config.levels[level] >= config.levels[currentLogLevel]) {
            var value = arguments[1];
            if (value !== null && typeof value === 'object' && typeof value.pipe === 'function') {
                value.pipe(getstream(level));
            } else {
                _logger.log.apply(_logger, arguments);
            }
            return true
        }
        return false
    }

    var target = {logLevels: Object.keys(logLevels)};

    target.logLevels.forEach(function (level) {

        target[level] = function () {
            // build argument list (level, msg, ... [string interpolate], [{metadata}], [callback])
            var args = [level].concat(Array.prototype.slice.call(arguments));
            log.apply(this, args);
        };
    });
    var through = require('through');

    function getstream(level) {
        var ts = through(), actual = [];

        ts.on('data', actual.push.bind(actual));
        ts.on('end', function () {
            var msg = actual.toString();
            if (msg) {
                log(level, msg);
            }
        });
        return ts;
    }

    function updateloglevel(level) {
        currentLogLevel = level;
    }

    target.updateloglevel = updateloglevel;
    target.log = log;
    target._logger = _logger;
    return target;
};


module.exports = Logger;
