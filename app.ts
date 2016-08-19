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
  type SendMessageData = {
    village: string,
    room: RoomName;
    key: string;
    text: string;
  }
  type ReceivedMessage = {
    msgid: number;
    name: string;
    text: string;
  };
  type ReceivedMessageData = {
    room: RoomName,
    messages: Array<ReceivedMessage>
  };
  type MessageTable = {
    villager: Array<ReceivedMessage>;
    werewolf: Array<ReceivedMessage>;
    sharer: Array<ReceivedMessage>;
  };

  // 村の状態
  type GameState = "廃村" | "村民募集中" | "戦闘中" | "終戦";
  type CombatPhase = "昼" | "吊" | "夜" | "噛";
  type VillageStatus = {    // VueとClassを併用するためにデータの階層を1つ作る
    state: GameState;
    phase: CombatPhase;
    timelimit: number;
  }
  type Role = "村人" | "人狼" | "占い師" | "狂人"  | "狩人" | "霊能者" | "共有者" | "妖狐"
  class Villager {
    public alive: boolean;
    // public votetargets
    constructor(public name:string, public role:Role) {
      this.alive = true;
    };
  }
  class Village {
    private state: GameState;
    private phase: CombatPhase;
    private timelimit: number;
    //private villagers
    public msgtbl:MessageTable = {
      villager: [],
      werewolf: [],
      sharer: []
    };
    private io:SocketIO.Namespace;

    constructor(public name:string) {
      this.initialize();
    };
    public initialize() {
      this.state = "廃村";
      this.phase = "吊";
      this.timelimit = 0;
      this.clearMessageTable();
      this.initSocket();
    };
    private initSocket() {
      var $$:Village = this;
      $$.io = ios.of(`/villages/${this.name}`);
      $$.io.on("connection", function(socket) {
        function send_messages(room:RoomName) {
          socket.join(room);
          let messages:Array<ReceivedMessage> = $$.msgtbl[room];
          let data:ReceivedMessageData = {
            room: room,
            messages: messages
          }
          $$.io.to(room).emit("message", data);
        }
        socket.on("message", function(data:SendMessageData) {
          console.log(data);
          let room = data.room;   //
          let key = data.key;     // ブラウザごとに保存されたユニークな値
          let text = data.text;
          if ($$.sayInRoom(room, key, text)) {
            send_messages(room);
          }
        })
      })
    };
    private clearMessageTable() {
      this.msgtbl.villager = [];
      this.msgtbl.werewolf = [];
      this.msgtbl.sharer = [];
    }
    public getStatus():VillageStatus {
      return {
        state: this.state,
        phase: this.phase,
        timelimit: this.timelimit
      }
    };
    public getVillager(key):Villager {
      // todo
      var v:Villager = new Villager("takuma", "村人");
      return v;
    };
    public checkChatUser(room:RoomName, villager:Villager):boolean {
      // ユーザーに発言権があるか確認する
      if (room == "villager") {
          return true;
      }
      return false;
    };
    public sayInRoom(room:RoomName, zinrokey:string, text:string):Boolean {
      let v = this.getVillager(zinrokey);
      if (this.checkChatUser(room, v)) {
        let messages:Array<ReceivedMessage> = this.msgtbl[room];
        let new_msg:ReceivedMessage = {
          msgid: messages.length,
          name: v.name,
          text: text
        };
        messages.push(new_msg);
        return true;
      }
      return false;
    }
  }
  class Country {
    private vtbl:{[key:string]:Village};
    constructor(public name:string) {
      this.vtbl = {};
    };
    public addVillage(name:string):Village {
      if (this.vtbl.hasOwnProperty(name)) { return null; }
      this.vtbl[name] = new Village(name);
      return this.vtbl[name];
    }
    public deleteVillage(name:string) {
      delete this.vtbl[name];
    }
  }
  var country = new Country("日本");
  country.addVillage("なかよし村");
}

app.get('/', function(request, response) {
  response.render('pages/zinro');
});
//app.get('/chat', function(request, response) {
//  response.render('pages/chat');
//});



server.listen(port, function () {
    var port = server.address().port;
    console.log('Example app listening port %s', port);
});
