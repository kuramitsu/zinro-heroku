var ZinroClient;
(function (ZinroClient) {
    function randomString(len) {
        var c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var cl = c.length;
        var r = "";
        for (var i = 0; i < len; i++) {
            r += c[Math.floor(Math.random() * cl)];
        }
        return r;
    }
    ;
    function getZinrokey() {
        var zinrokey = localStorage.getItem("zinrokey");
        if (!zinrokey) {
            var timekey = new Date().getTime().toString(16);
            var randomkey = randomString(16);
            zinrokey = timekey + randomkey;
            localStorage.setItem("zinrokey", zinrokey);
        }
        return zinrokey;
    }
    var zinrokey = getZinrokey();
    var ChatComponent = Vue.extend({
        template: "\n      <div>\n        <form @submit.prevent.stop=\"sendMessage()\" role=\"form\">\n          <div class=\"input-group\">\n            <input type=\"text\" class=\"form-control\" v-model=\"text\">\n            <span class=\"input-group-btn\">\n              <button type=\"submit\" class=\"btn btn-primary\">\u6295\u7A3F</button>\n            </span>\n          </div>\n        </form>\n      </div>\n      <div v-for=\"msg in msgs | orderBy 'msgid' -1\" track-by=\"msgid\">\n        [[msg.name]]\n        <pre>[[msg.text]]</pre>\n      </div>\n    ",
        props: {
            village: String,
            room: String,
            msgs: Array
        },
        data: function () {
            return {
                text: ""
            };
        },
        methods: {
            sendMessage: function () {
                var msg = {
                    village: this.village,
                    room: this.room,
                    key: zinrokey,
                    text: this.text
                };
                this.$dispatch('sendMessage', msg);
                this.text = "";
            }
        }
    });
    var msgtbl = {
        villager: [],
        werewolf: []
    };
    var io_game = io.connect("/villages/なかよし村");
    io_game.on("message", function (data) {
        console.log(data);
        msgtbl[data.room] = data.messages;
    });
    var AbandonedView = Vue.extend({
        template: "\n      <div>\n        <a>\u6751\u3092\u4F5C\u3063\u3066\u304F\u3060\u3055\u3044...</a>\n      </div>\n    ",
    });
    var VillagerChatView = Vue.extend({
        components: { "chat": ChatComponent },
        template: '<chat :village="village" room="villager" :msgs="msgs"></chat>',
        props: { village: String },
        data: function () { return { msgtbl: msgtbl }; },
        computed: {
            msgs: function () { return this.msgtbl.villager; }
        }
    });
    var vm_zinro = new Vue({
        el: "#zinrochat",
        components: {
            "chat": ChatComponent,
            "Abandoned": AbandonedView,
            "VillagerChat": VillagerChatView
        },
        data: {
            village: "なかよし村",
            currentView: 'VillagerChat'
        },
        events: {
            sendMessage: function (msg) {
                io_game.json.emit("message", msg);
                console.log(msg);
            }
        }
    });
    var Village = (function () {
        function Village() {
            this.data = {
                state: undefined,
                phase: undefined,
                timelimit: undefined
            };
            this.initialize();
        }
        ;
        Village.prototype.initialize = function () {
            this.data.state = "廃村";
            this.data.phase = "吊";
            this.data.timelimit = 0;
        };
        return Village;
    }());
    ZinroClient.Village = Village;
})(ZinroClient || (ZinroClient = {}));
var ZinroView;
(function (ZinroView) {
    var village = new ZinroClient.Village();
    console.log(village);
    var vm_header = (new Vue({
        el: "#navheader",
        data: {
            data: village.data,
            compiled: false
        },
        computed: {
            state: function () {
                return this.data.state;
            },
            phase: function () {
                return this.data.pahse;
            },
            timelimit: function () {
                return this.data.timelimit;
            }
        },
        compiled: function () {
            this.compiled = true;
        }
    }));
    vm_header.$log("data");
    console.log(vm_header.data.state);
})(ZinroView || (ZinroView = {}));
