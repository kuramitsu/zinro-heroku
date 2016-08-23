/// <reference path="typings/main.d.ts" />
/// <reference path="zinro.d.ts" />

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
  class Villager {
    public key:string;
    public name:string;
    public role:Role;
    public alive: boolean;
    // public votetargets
    constructor(key:string, name:string, role:Role) {
      this.key = key;
      this.name = name;
      this.role = role;
      this.alive = true;
    };
    public getStatus(zinrokey:string):VillagerStatus {
      return {
        name: this.name,
        alive: this.alive,
        role: (zinrokey == this.key) ? this.role : null
      }
    }
  }
  class Village {
    private state: VillageState;
    private phase: CombatPhase;
    private timelimit: number;
    private villagers: Array<Villager>;
    private keymap: {[key:string]:Villager};
    private namemap: {[key:string]:Villager};

    //private villagers
    public msgtbl:MessageTable = {
      villager: [],
      werewolf: [],
      sharer: []
    };
    private io:SocketIO.Namespace;

    constructor(public name:string, public admin:string, public setting:VillageSetting) {
      setting.name = name;
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
        });
        socket.on("status", function(data:VillageStatusRequest) {
          console.log(data);
          var status = $$.getStatus(data.key);
          console.log(status);
          socket.json.emit("status", status);
        });
      })
    };
    private clearMessageTable() {
      this.msgtbl.villager = [];
      this.msgtbl.werewolf = [];
      this.msgtbl.sharer = [];
    }
    public getStatus(zinrokey:string):VillageStatus {
      return {
        name: this.name,
        state: this.state,
        phase: this.phase,
        timelimit: this.timelimit,
        admin: (zinrokey == this.admin) ? true : false,
        setting: this.setting
      }
    };
    public getVillager(key):Villager {
      // todo
      var v:Villager = new Villager("", "takuma", "村人");
      return v;
    };
    public addVillager(key:string, name:string):Villager {
      if (this.keymap.hasOwnProperty(key) || this.namemap.hasOwnProperty(name)) {
        return null;
      }
      let role:Role = this.getRole();
      if (!role) {
        return null;
      }
      let v:Villager = new Villager(key, name, role);
      this.villagers.push(v);
      this.keymap[key] = v;
      this.namemap[name] = v;
      return v;
    };
    public getRole():Role {
      return "村人";
    };
    public checkChatUser(room:RoomName, villager:Villager):boolean {
      // ユーザーに発言権があるか確認する
      if (room == "villager") {
          return true;
      }
      return false;
    };
    private getTimestamp():number {
      let dd = new Date();
      return dd.getTime();
    };
    public sayInRoom(room:RoomName, zinrokey:string, text:string):Boolean {
      let v = this.getVillager(zinrokey);
      if (this.checkChatUser(room, v) && text) {
        let messages:Array<ReceivedMessage> = this.msgtbl[room];
        let new_msg:ReceivedMessage = {
          msgid: messages.length,
          timestamp: this.getTimestamp(),
          name: v.name,
          text: text
        };
        messages.push(new_msg);
        return true;
      }
      return false;
    }
  }


  type CountryStatusRequest = {
    key: string;
  }
  type CountryStatus = {   // クライアントに返すデータ
    name: string;
    villages: Array<VillageStatus>;  // villageがnullのとき
  }

  class Country {
    private villages:Array<Village>;
    private namemap:{[key:string]:Village};    // name => village
    private io:SocketIO.Namespace;

    constructor(public name:string) {
      this.initialize();
    };
    public initialize() {
      this.villages = [];
      this.namemap = {};
      this.initSocket();
    };
    private initSocket() {
      var $$:Country = this;
      $$.io = ios.of(`/countries/${this.name}`);
      $$.io.on("connection", function(socket) {
        socket.on("status", function(data:SendMessageData) {
          console.log(data);
          var status = $$.getCountryStatus(data.key);
          console.log(status);
          socket.json.emit("status", status);
        })
      })
    };
    public addVillage(name:string, admin:string, setting:VillageSetting):Village {
      if (this.namemap.hasOwnProperty(name)) { return null; }
      var village:Village = new Village(name, admin, setting);
      this.villages.push(village);
      this.namemap[name] = village;
      return village;
    }
    public deleteVillage(name:string, admin:string) {
      var village:Village = this.namemap[name];
      if (village.admin == admin) {
        delete this.namemap[name];
        let idx = this.villages.indexOf(village);
        if (idx >= 0) {
            this.villages.splice(idx, 1);
        }
      }
    }
    public getVillageStatuses(key:string):Array<VillageStatus> {
      var statuses:Array<VillageStatus> = [];
      for (let i=0, len=this.villages.length; i < len; i++) {
        var v:Village = this.villages[i];
        statuses.push(v.getStatus(key));
      }
      return statuses
    }
    public getCountryStatus(key:string):CountryStatus {
      return {
        name: this.name,
        villages: this.getVillageStatuses(key)
      };
    }
  }
  var country = new Country("人狼国");

  var setting:VillageSetting = {
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
  }
  country.addVillage("素人村", "", setting);
  country.addVillage("一般村", "", setting);
  country.addVillage("玄人村", "", setting);
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
