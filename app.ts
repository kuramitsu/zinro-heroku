/// <reference path="typings/main.d.ts" />

//declare function require(name:string);

var ECT = require('ect');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var ios:SocketIO.Server = require('socket.io')(server);
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
module Zinro {
  type RoomName = "villager" | "werewolf" | "sharer";
  function getRoomName(key:RoomName):RoomName {  // 型チェック用
    return key;
  }
  var io_game = ios.of('game');
  io_game.on("connection", function(socket) {
    function send_msg(room:RoomName, name:string, msg:string) {
      socket.join(room);
      io_game.to(room).emit(room, {
        name: name,
        msg: msg
      })
    }
    socket.on(getRoomName("villager"), function(data) {
      send_msg("villager", socket.id, data.msg);
    })
  })
}


app.get('/', function(request, response) {
  response.render('pages/zinro');
});
app.get('/chat', function(request, response) {
  response.render('pages/chat');
});



server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
