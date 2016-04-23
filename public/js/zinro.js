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
