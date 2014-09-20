// Generated by CoffeeScript 1.8.0
(function() {
  var Client, DefaultMediaReceiver, argv, connectChromecast, getCover, getStream, main, mdns, request, startStream, stopStream, util;

  Client = require('castv2-client').Client;

  DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;

  mdns = require('mdns');

  request = require('request');

  util = require('util');

  argv = require('yargs').argv;

  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
  };

  getStream = function(iurl, callback) {
    return request(iurl, function(err, response, body) {
      if (!err && response.statusCode === 200) {
        return callback(JSON.parse(body)[0]);
      } else {
        return callback(null);
      }
    });
  };

  getCover = function(station, callback) {
    var url;
    url = 'http://di.fm/' + station;
    return request(url, function(err, response, body) {
      var base, code, imgUrl;
      if (!err && response.statusCode === 200) {
        base = 'api.audioaddict.com/v1/assets/image/';
        code = body.split(base)[1].split('.png')[0];
        imgUrl = util.format('http://%s%s.png', base, code);
        return callback(imgUrl);
      } else {
        return callback(null);
      }
    });
  };

  connectChromecast = function(callback) {
    var gcast;
    gcast = mdns.createBrowser(mdns.tcp('googlecast'));
    gcast.on('serviceUp', function(service) {
      var host;
      host = service.addresses[0];
      callback(host);
      return gcast.stop();
    });
    return gcast.start();
  };

  stopStream = function(host) {
    var client;
    client = new Client();
    return client.connect(host, function() {
      console.log('connected');
      return client.getSessions(function(_, sessions) {
        return client.join(sessions[0], DefaultMediaReceiver, function(err, player) {
          return player.getStatus(function(_, status) {
            client.stop(player);
            return client.close();
          });
        });
      });
    });
  };

  startStream = function(host, station, surl, imgurl) {
    var client;
    client = new Client();
    client.connect(host, function() {
      var appid;
      console.log('connected');
      appid = '728AF48B';
      DefaultMediaReceiver.APP_ID = appid;
      return client.launch(DefaultMediaReceiver, function(err, player) {
        var media;
        media = {
          contentId: surl,
          contentType: 'audio/mp3',
          streamType: 'LIVE',
          metadata: {
            type: 0,
            metadataType: 3,
            title: "DI.FM " + station.capitalize(),
            images: [
              {
                url: imgurl + "?size=600x600"
              }
            ]
          }
        };
        return player.load(media, {
          autoplay: true
        }, function(err, status) {
          return client.close();
        });
      });
    });
    return client.on('error', function(err) {
      console.log('Error: %s', err.message);
      return client.close();
    });
  };

  main = function(host) {
    var baseUrl, iurl, station;
    station = argv._[0];
    baseUrl = 'http://listen.di.fm';
    if (argv.key) {
      iurl = util.format('%s/%s/%s.json?listen_key=%s', baseUrl, "premium", station, argv.key);
    } else {
      iurl = util.format('%s/%s/%s.json', baseUrl, "public1", station);
    }
    if (argv.stop) {
      return stopStream(host);
    } else {
      return getStream(iurl, function(surl) {
        if (surl) {
          return getCover(station, function(imgurl) {
            if (imgurl) {
              return startStream(host, station, surl, imgurl);
            }
          });
        }
      });
    }
  };

  connectChromecast(main);

}).call(this);
