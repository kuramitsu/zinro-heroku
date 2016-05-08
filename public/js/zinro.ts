/// <reference path="../../typings/main.d.ts" />

// declare var homeurl:string;
interface Socket extends SocketIOClient.Socket {
  json: SocketIOClient.Socket;    // なんか定義されてないので追加しとく
}

// Zinro Logic
module ZinroClient {
  type GameState = "廃村" | "村民募集中" | "戦闘中" | "終戦";
  type CombatPhase = "昼" | "吊" | "夜" | "噛";
  export type VillageData = {    // VueとClassを併用するためにデータの階層を1つ作る
    state: GameState;
    phase: CombatPhase;
    timelimit: number;
  }
  export class Village {
    public data: VillageData = {
      state: undefined,
      phase: undefined,
      timelimit: undefined
    };
    constructor() {
      this.initialize();
    };
    public initialize() {
      this.data.state = "廃村";
      this.data.phase = "吊";
      this.data.timelimit = 0;
    }
  }
}

// Zinro View with vue.js
module ZinroView {
  //　外部から参照したいデータとか定義しとく
  interface ZinroVue extends vuejs.Vue {
    data: ZinroClient.VillageData;
  }
  var village = new ZinroClient.Village();
  console.log(village);
  var vm_header = <ZinroVue>(new Vue({
    el: "#navheader",
    data: {
      data: village.data,    // ZinroClient.VillageData
      compiled: false
    },
    computed: {           // ショートカット
      state: function() {
        return this.data.state;
      },
      phase: function() {
        return this.data.pahse;
      },
      timelimit: function() {
        return this.data.timelimit;
      }
    },
    compiled: function() {
      this.compiled = true;
    }
  }));
  console.log(vm_header.data.state);

}



var gState = {
  msgs: []
}


var io_game:Socket = <Socket>io.connect("/game");
io_game.on("villager", function(data) {
  console.log(data);
  gState.msgs.push(data.msg);
})

var vm_chat = new Vue({
  el: "#chattest",
  data: {
    state: gState,
    alltext: ""
  },
  computed: {
    msgs: {
      get: function() {return this.state.msgs;},
      set: function(val) {this.state.msgs = val;}
    }
  },
  methods: {
    sendAll: function() {
      io_game.json.emit("villager", {msg: this.alltext});
      console.log(this.alltext);
    }
  }
})
