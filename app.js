var ECT = require('ect');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var ios = require('socket.io')(server);
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
    var Villager = (function () {
        function Villager(name, role) {
            this.name = name;
            this.role = role;
            this.alive = true;
        }
        ;
        return Villager;
    }());
    var Village = (function () {
        function Village(name) {
            this.name = name;
            this.msgtbl = {
                villager: [],
                werewolf: [],
                sharer: []
            };
            this.initialize();
        }
        ;
        Village.prototype.initialize = function () {
            this.state = "廃村";
            this.phase = "吊";
            this.timelimit = 0;
            this.clearMessageTable();
            this.initSocket();
        };
        ;
        Village.prototype.initSocket = function () {
            var $$ = this;
            $$.io = ios.of("/villages/" + this.name);
            $$.io.on("connection", function (socket) {
                function send_messages(room) {
                    socket.join(room);
                    var messages = $$.msgtbl[room];
                    var data = {
                        room: room,
                        messages: messages
                    };
                    $$.io.to(room).emit("message", data);
                }
                socket.on("message", function (data) {
                    console.log(data);
                    var room = data.room;
                    var key = data.key;
                    var text = data.text;
                    if ($$.sayInRoom(room, key, text)) {
                        send_messages(room);
                    }
                });
            });
        };
        ;
        Village.prototype.clearMessageTable = function () {
            this.msgtbl.villager = [];
            this.msgtbl.werewolf = [];
            this.msgtbl.sharer = [];
        };
        Village.prototype.getStatus = function () {
            return {
                state: this.state,
                phase: this.phase,
                timelimit: this.timelimit
            };
        };
        ;
        Village.prototype.getVillager = function (key) {
            var v = new Villager("takuma", "村人");
            return v;
        };
        ;
        Village.prototype.checkChatUser = function (room, villager) {
            if (room == "villager") {
                return true;
            }
            return false;
        };
        ;
        Village.prototype.sayInRoom = function (room, zinrokey, text) {
            var v = this.getVillager(zinrokey);
            if (this.checkChatUser(room, v)) {
                var messages = this.msgtbl[room];
                var new_msg = {
                    msgid: messages.length,
                    name: v.name,
                    text: text
                };
                messages.push(new_msg);
                return true;
            }
            return false;
        };
        return Village;
    }());
    var Country = (function () {
        function Country(name) {
            this.name = name;
            this.vtbl = {};
        }
        ;
        Country.prototype.addVillage = function (name) {
            if (this.vtbl.hasOwnProperty(name)) {
                return null;
            }
            this.vtbl[name] = new Village(name);
            return this.vtbl[name];
        };
        Country.prototype.deleteVillage = function (name) {
            delete this.vtbl[name];
        };
        return Country;
    }());
    var country = new Country("日本");
    country.addVillage("なかよし村");
})(Zinro || (Zinro = {}));
app.get('/', function (request, response) {
    response.render('pages/zinro');
});
server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
