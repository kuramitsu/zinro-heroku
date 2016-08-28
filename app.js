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
    var zroles = [
        '村人', '占い師', '狂人', '狩人', '霊能者', '共有者',
        '人狼',
        '妖狐'
    ];
    var zroletbl = {
        '村人': {
            family: '人',
            camp: '人',
            divination: '村人'
        },
        '占い師': {
            family: '人',
            camp: '人',
            divination: '村人'
        },
        '狂人': {
            family: '人',
            camp: '人',
            divination: '村人'
        },
        '狩人': {
            family: '人',
            camp: '人',
            divination: '村人'
        },
        '霊能者': {
            family: '人',
            camp: '人',
            divination: '村人'
        },
        '共有者': {
            family: '人',
            camp: '人',
            divination: '村人'
        },
        '人狼': {
            family: '人',
            camp: '人',
            divination: '村人'
        },
        '妖狐': {
            family: '人',
            camp: '人',
            divination: '村人'
        }
    };
    function isInteger(o) {
        if (typeof o == "number" && parseInt(o) === o)
            return true;
        return false;
    }
    function isString(o, minlen) {
        if (minlen === void 0) { minlen = 0; }
        if (typeof o == "string" && o.length >= minlen)
            return true;
        return false;
    }
    function isBoolean(o) {
        if (typeof o == "boolean")
            return true;
        return false;
    }
    function validVillageSetting(s) {
        var wolfnum = s.rolenum.人狼;
        var humannum = 0;
        for (var i = 0, len = zroles.length; i < len; i++) {
            var role = zroles[i];
            if (zroletbl[role].family == "人")
                humannum += 1;
        }
        var errors = [];
        if (!isString(s.name))
            errors.push("nameの型が不正");
        if (!isInteger(s.daytime))
            errors.push("daytimeの型が不正");
        if (!isInteger(s.nighttime))
            errors.push("nighttimeの型が不正");
        if (!isInteger(s.hangtime))
            errors.push("hangtimeの型が不正");
        if (!isInteger(s.bitetime))
            errors.push("bitetimeの型が不正");
        if (!isInteger(s.endtime))
            errors.push("endtimeの型が不正");
        if (s.rolenum) {
            for (var i = 0, len = zroles.length; i < len; i++) {
                var role = zroles[i];
                if (!isInteger(s.rolenum[role]))
                    errors.push("rolenumの型が不正");
            }
        }
        else {
            errors.push("rolenumの型が不正");
        }
        if (!isBoolean(s.firstnpc))
            errors.push("firstnpcの型が不正");
        if (!isBoolean(s.roledeath))
            errors.push("roledeathの型が不正");
        if (!isBoolean(s.zombie))
            errors.push("zombieの型が不正");
        if (errors.length > 0) {
            console.log(errors);
            return false;
        }
        if (!s.name)
            errors.push("村の名前がありません。");
        if (wolfnum < 1)
            errors.push("人狼がいません。");
        if (humannum <= wolfnum + 1)
            errors.push("人間が少なすぎます。");
        if (s.daytime < 1)
            errors.push("昼の時間が短すぎます。");
        if (s.nighttime < 1)
            errors.push("夜の時間が短すぎます。");
        if (s.hangtime < 1)
            errors.push("吊る時間が短すぎます。");
        if (s.bitetime < 1)
            errors.push("噛む時間が短すぎます。");
        if (errors.length > 0) {
            console.log(errors);
            return false;
        }
        return true;
    }
    var Villager = (function () {
        function Villager(key, name, role) {
            this.key = key;
            this.name = name;
            this.role = role;
            this.alive = true;
        }
        ;
        Villager.prototype.getStatus = function (zinrokey) {
            return {
                name: this.name,
                alive: this.alive,
                role: (zinrokey == this.key) ? this.role : null
            };
        };
        return Villager;
    }());
    var Village = (function () {
        function Village(country, name, adminkey, setting) {
            this.country = country;
            this.name = name;
            this.adminkey = adminkey;
            this.setting = setting;
            this.msgtbl = {
                villager: [],
                werewolf: [],
                sharer: []
            };
            setting.name = name;
            this.initialize();
        }
        ;
        Village.prototype.initialize = function () {
            this.state = "廃村";
            this.phase = "吊";
            this.timelimit = 0;
            this.villagers = [];
            this.keymap = {};
            this.namemap = {};
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
                socket.on("status", function (data) {
                    console.log(data);
                    var village_status = $$.getStatus(data.key);
                    console.log(village_status);
                    socket.json.emit("status", village_status);
                    var villager = $$.keymap[data.key];
                    if (villager) {
                        var villager_status = villager.getStatus(data.key);
                        socket.json.emit("villager_status", villager_status);
                    }
                });
                socket.on("buildVillage", function (data) {
                    console.log(data);
                    if ($$.state == "廃村" && validVillageSetting(data.setting)) {
                        $$.adminkey = data.key;
                        $$.setting = data.setting;
                        $$.state = "村民募集中";
                        $$.timelimit = 300;
                        var status = $$.getStatus(data.key);
                        $$.io.json.emit("status", status);
                        var country_status = $$.country.getCountryStatus("");
                        console.log(country_status);
                        $$.country.io.json.emit("status", country_status);
                    }
                });
                socket.on("joinVillage", function (data) {
                    var villager = $$.addVillager(data.key, data.name);
                    if (villager) {
                        var villager_status = villager.getStatus(data.key);
                        socket.json.emit("villager_status", villager_status);
                        var village_status = $$.getStatus("");
                        $$.io.json.emit("status", village_status);
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
        Village.prototype.getVillagerStatuses = function () {
            var statuses = [];
            for (var i = 0, len = this.villagers.length; i < len; i++) {
                var villager = this.villagers[i];
                var status_1 = villager.getStatus("");
                statuses.push(status_1);
            }
            return statuses;
        };
        Village.prototype.getAdminName = function () {
            var admin = this.getVillager(this.adminkey);
            if (admin) {
                return admin.name;
            }
            return "";
        };
        ;
        Village.prototype.getStatus = function (zinrokey) {
            return {
                name: this.name,
                state: this.state,
                phase: this.phase,
                villagers: this.villagers,
                timelimit: this.timelimit,
                admin: this.getAdminName(),
                setting: this.setting
            };
        };
        ;
        Village.prototype.getVillager = function (key) {
            var v = new Villager("", "takuma", "村人");
            return v;
        };
        ;
        Village.prototype.addVillager = function (key, name) {
            if (!key || !name) {
                return null;
            }
            if (this.keymap.hasOwnProperty(key) || this.namemap.hasOwnProperty(name)) {
                return null;
            }
            var role = this.getRole();
            if (!role) {
                return null;
            }
            var v = new Villager(key, name, role);
            this.villagers.push(v);
            this.keymap[key] = v;
            this.namemap[name] = v;
            return v;
        };
        ;
        Village.prototype.getRole = function () {
            return "村人";
        };
        ;
        Village.prototype.checkChatUser = function (room, villager) {
            if (room == "villager") {
                return true;
            }
            return false;
        };
        ;
        Village.prototype.getTimestamp = function () {
            var dd = new Date();
            return dd.getTime();
        };
        ;
        Village.prototype.sayInRoom = function (room, zinrokey, text) {
            var v = this.getVillager(zinrokey);
            if (this.checkChatUser(room, v) && text) {
                var messages = this.msgtbl[room];
                var new_msg = {
                    msgid: messages.length,
                    timestamp: this.getTimestamp(),
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
            this.initialize();
        }
        ;
        Country.prototype.initialize = function () {
            this.villages = [];
            this.namemap = {};
            this.initSocket();
        };
        ;
        Country.prototype.initSocket = function () {
            var $$ = this;
            $$.io = ios.of("/countries/" + this.name);
            $$.io.on("connection", function (socket) {
                socket.on("status", function (data) {
                    console.log(data);
                    var status = $$.getCountryStatus(data.key);
                    console.log(status);
                    socket.json.emit("status", status);
                });
            });
        };
        ;
        Country.prototype.addVillage = function (name, admin, setting) {
            if (this.namemap.hasOwnProperty(name)) {
                return null;
            }
            var country = this;
            var village = new Village(country, name, admin, setting);
            this.villages.push(village);
            this.namemap[name] = village;
            return village;
        };
        Country.prototype.deleteVillage = function (name) {
            var village = this.namemap[name];
            delete this.namemap[name];
            var idx = this.villages.indexOf(village);
            if (idx >= 0) {
                this.villages.splice(idx, 1);
            }
        };
        Country.prototype.getVillageStatuses = function (key) {
            var statuses = [];
            for (var i = 0, len = this.villages.length; i < len; i++) {
                var v = this.villages[i];
                statuses.push(v.getStatus(key));
            }
            return statuses;
        };
        Country.prototype.getCountryStatus = function (key) {
            return {
                name: this.name,
                villages: this.getVillageStatuses(key)
            };
        };
        return Country;
    }());
    var country = new Country("人狼国");
    var setting = {
        name: "",
        daytime: 180,
        nighttime: 60,
        hangtime: 10,
        bitetime: 10,
        endtime: 600,
        rolenum: {
            村人: 1,
            人狼: 1,
            占い師: 1,
            狂人: 1,
            狩人: 0,
            霊能者: 0,
            共有者: 0,
            妖狐: 0
        },
        firstnpc: true,
        roledeath: true,
        zombie: true
    };
    country.addVillage("素人村", "", setting);
    country.addVillage("一般村", "", setting);
    country.addVillage("玄人村", "", setting);
})(Zinro || (Zinro = {}));
app.get('/', function (request, response) {
    response.render('pages/zinro');
});
server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
