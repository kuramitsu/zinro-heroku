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
var io_game = io.of('game');
app.get('/', function (request, response) {
    response.render('pages/index');
});
server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
