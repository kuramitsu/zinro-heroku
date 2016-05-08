var ZinroClient;
(function (ZinroClient) {
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
    console.log(vm_header.data.state);
})(ZinroView || (ZinroView = {}));
var gState = {
    msgs: []
};
var io_game = io.connect("/game");
io_game.on("villager", function (data) {
    console.log(data);
    gState.msgs.push(data.msg);
});
var vm_chat = new Vue({
    el: "#chattest",
    data: {
        state: gState,
        alltext: ""
    },
    computed: {
        msgs: {
            get: function () { return this.state.msgs; },
            set: function (val) { this.state.msgs = val; }
        }
    },
    methods: {
        sendAll: function () {
            io_game.json.emit("villager", { msg: this.alltext });
            console.log(this.alltext);
        }
    }
});
