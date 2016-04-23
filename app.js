var ECT = require('ect');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser');
var static_url = (process.env.STATIC_URL || __dirname);
var port = (process.env.PORT || 5000);
app.engine('ect', ECT({ watch: true, root: __dirname + "/views", ext: '.ect' }).render);
app.set('view engine', 'ect');
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/bower_components"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var Zinro;
(function (Zinro) {
    function getRoomName(key) {
        return key;
    }
    var io_game = io.of('game');
    io_game.on("connection", function (socket) {
        function send_msg(room, name, msg) {
            socket.join(room);
            io_game.to(room).emit(room, {
                name: name,
                msg: msg
            });
        }
        socket.on(getRoomName("villager"), function (data) {
            send_msg("villager", socket.id, data.msg);
        });
    });
})(Zinro || (Zinro = {}));
app.get('/', function (request, response) {
    response.render('pages/index');
});
app.get('/chat', function (request, response) {
    response.render('pages/chat');
});
server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
