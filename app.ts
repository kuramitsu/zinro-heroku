/// <reference path="typings/main.d.ts" />

//declare function require(name:string);

var ECT = require('ect');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io:SocketIO.Server = require('socket.io')(server);
var bodyParser = require('body-parser');

var static_url:string = (process.env.STATIC_URL || __dirname);
var port:number = (process.env.PORT || 5000);


// http://qiita.com/sukobuto/items/b0be22bfebd721854e0b
app.engine('ect', ECT({ watch: true, root: `${__dirname}/views`, ext: '.ect' }).render);
app.set('view engine', 'ect');

// app.use(static_url, express.static('/public'));
app.use(express.static(`${__dirname}/public`));
app.use(express.static(`${__dirname}/bower_components`));

// app.use(static_url, express.static('static'));

// http://qiita.com/K_ichi/items/c70bf4b08467717460d5
// https://github.com/expressjs/body-parser
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


// チャット関連
var io_game = io.of('game');


app.get('/', function(request, response) {
  response.render('pages/index');
});
app.get('/chat', function(request, response) {
  response.render('pages/chat');
});



server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
