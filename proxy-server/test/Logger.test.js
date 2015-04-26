var chai = require('chai');
var sinonChai = require('sinon-chai');
var sinon = require('sinon');
var fs = require('fs');
chai.should();
chai.use(sinonChai);
var expect = chai.expect;

var Logger = require('../lib/Logger');
var tmpFile = '/tmp/proxy01.log'
var str = 'Hello';
var Logger = require('../lib/Logger');
var logger = new Logger('debug', tmpFile);
var spy, stub;

describe('Test Logger - String', function () {

    beforeEach(function () {
        //Set up
        spy = sinon.spy();
        stub = sinon.stub(logger._logger, 'log', spy);
    });

    afterEach(function () {
        // Cleanup
        stub.restore();
        spy.reset();
    });

    it('Test debug', function () {
        logger.debug(str);
        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWith('debug',str);
    });

    it('Test info', function () {
        logger.info(str);
        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWith('info',str);
    });

    it('Test debug', function () {
        logger.warn(str);
        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWith('warn',str);
    });

    it('Test debug', function () {
        logger.error(str);
        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWith('error',str);
    });

});

