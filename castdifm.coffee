#!/usr/bin/env node

Client                = require('castv2-client').Client
DefaultMediaReceiver  = require('castv2-client').DefaultMediaReceiver
mdns                  = require 'mdns'
request               = require 'request'
util                  = require 'util'
argv                  = require('yargs').argv

String.prototype.capitalize = () ->
    return this.charAt(0).toUpperCase() + this.slice(1)

getStream = (iurl, callback) ->
    request iurl, (err, response, body) ->
        if !err && response.statusCode == 200
            callback JSON.parse(body)[0]
        else
            callback null

getCover = (station, callback) ->
    url = 'http://di.fm/' + station
    request url, (err, response, body) ->
        if !err && response.statusCode == 200
            base = 'api.audioaddict.com/v1/assets/image/'
            code = body.split(base)[1].split('.png')[0]
            imgUrl = util.format 'http://%s%s.png', base, code
            callback(imgUrl)
        else
            callback(null)

connectChromecast = (callback) ->
    gcast = mdns.createBrowser(mdns.tcp('googlecast'))
    gcast.on 'serviceUp', (service) ->
        host = service.addresses[0]
        callback(host)
        gcast.stop()
    gcast.start()

stopStream = (host) ->
    client = new Client()
    client.connect host, () ->
        console.log 'connected'
        client.getSessions (_, sessions) ->
            client.join sessions[0], DefaultMediaReceiver, (err, player) ->
                player.getStatus (_, status ) -> 
                    #player.stop()
                    client.stop player
                    client.close()

startStream = (host, station, surl, imgurl) ->
    client = new Client()
    client.connect host, () ->
        console.log 'connected'

        client.launch DefaultMediaReceiver, (err, player) ->
            media = {
                contentId: surl,
                contentType: 'audio/mp3',
                streamType: 'LIVE',

                metadata: {
                type: 0,
                metadataType: 3,
                title: ("DI.FM " + station.capitalize()),
                images: [
                    { url: imgurl + "?size=600x600" }
                ]}       
            }

            player.load media, {autoplay:true}, (err, status) -> 
                client.close()

    client.on 'error', (err) ->
        console.log 'Error: %s', err.message
        client.close()

main = (host) -> 
    station = argv._[0]
    baseUrl = 'http://listen.di.fm'

    if argv.key
        iurl = util.format '%s/%s/%s.json?listen_key=%s', 
            baseUrl, "premium", station, argv.key
    else
        iurl = util.format '%s/%s/%s.json', 
            baseUrl, "public1", station

    if argv.stop
        stopStream host
    else
        getStream iurl, (surl) ->
            if surl
                getCover station, (imgurl) ->
                    if imgurl
                        startStream host, station, surl, imgurl

connectChromecast main
