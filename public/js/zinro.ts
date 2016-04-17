/// <reference path="../../typings/main.d.ts" />


var vm_chat = new Vue({
  el: "#chattest",
  data: {
    alltext: ""
  },
  methods: {
    sendAll: function() {
      console.log(this.alltext);
    }
  }
})
