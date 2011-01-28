var sys = require('sys')
  , http = require('http')
  , querystring = require('querystring')
  , emitter = require('events').EventEmitter;

function trim(s) {return s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');}

function C2DM(config) {
	if (config) {
		if ('user' in config)
			this.user = config.user;
		if ('password' in config)
			this.password = config.password;
		this.source = 'source' in config ? config.source : 'node-c2dm-client';
		this.token = 'token' in config ? config.token : null;
	} else {
		throw Error('No config given.');
	}
	this.loginClient = new http.createClient(443, 'www.google.com', true);
	this.c2dmClient = http.createClient(443, 'android.apis.google.com', true);
	//this.c2dmClient = http.createClient(80, 'android.apis.google.com');
};

sys.inherits(C2DM, emitter);

exports.C2DM = C2DM;

C2DM.prototype.captureToken = function(err, token) {
	this.token = token;
};

C2DM.prototype.login = function(cb) {
	var self = this;
	this.on('token', this.captureToken);

	if (cb) this.on('token', cb);

	var postData = {
		Email: this.user,
		Passwd: this.password,
		accountType: 'HOSTED_OR_GOOGLE',
		source: this.source,
		service: 'ac2dm'
	};

	var request = this.loginClient.request('POST', '/accounts/ClientLogin', {
		'Content-Type': 'application/x-www-form-urlencoded'
	});
	request.end(querystring.stringify(postData));
	request.on('response', function(res) {
		var data = '';
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			var idx = data.indexOf('Auth=');
			if (idx < 0) {
				self.emit('token', data, null);
			} else {
				data = trim(data).replace('Auth=', 'auth=');
				self.emit('token', null, data.substring(idx));
			}
		});
	});
};

C2DM.prototype.send = function(packet, cb) {
	var self = this;
	if (cb) this.on('sent', cb);

	var postData = querystring.stringify(packet);
	var headers = {
		'Connection': 'keep-alive',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Content-length': postData.length,
		'Authorization': 'GoogleLogin ' + this.token
	};

	var request = this.c2dmClient.request('POST', '/c2dm/send', headers);
	request.end(postData);
	request.on('response', function(res) {
		var data = '';
		res.on('data', function(chunk) {
			data += chunk;
		});
		res.on('end', function() {
			var idx = data.indexOf('id=');
			if (idx < 0) {
				self.emit('sent', data, null);
			} else {
				self.emit('sent', null, data.substring(idx));
			}
		});
	});
};