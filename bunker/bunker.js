const { SerialPort, ReadlineParser } = require('serialport');
const { Hardware, GlobalHotkey } = require('keysender');
const MouseEvents = require("global-mouse-events");
/*
 * Fear level 0: normal gameplay
 * Fear level 1: random input delay up to 0.5s; might move mouse slightly; might randomly crouch
 * Fear level 2: might ignore inputs; might move mouse significantly; might randomly crouch or sprint
 * Spike: might start shooting, might sprint in a random direction, might freeze
 * 
 * Icewater overrides, but can only move (sprint) and use items
 */

let sp_connected = false;
let serialport;
let parser;

let width, height;
let heartrate;
let thresholds = [80, 100, 110]; // guess
let move = {
  ",": {
    out: "m",
    type: "move f"
  },
  "o": {
    out: "v",
    type: "move b"
  },
  "a": {
    out: "w",
    type: "move l"
  },
  "e": {
    out: "z",
    type: "move r"
  },
  "j": {
    out: "d",
    type: "crouch"
  },
  "k": {
    out: "h",
    type: "sprint"
  },
  "'": {
    out: "t",
    type: "lean l"
  },
  ".": {
    out: "n",
    type: "lean r"
  },
};

new GlobalHotkey({
  key: ",",
  mode: "hold",
  action() {
    processMove(",", true);
    return true;
  },
  after() {
    processMove(",", false);
  },
});

new GlobalHotkey({
  key: "o",
  mode: "hold",
  action() {
    processMove("o", true);
    return true;
  },
  after() {
    processMove("o", false);
  },
});

new GlobalHotkey({
  key: "a",
  mode: "hold",
  action() {
    processMove("a", true);
    return true;
  },
  after() {
    processMove("a", false);
  },
});

new GlobalHotkey({
  key: "e",
  mode: "hold",
  action() {
    processMove("e", true);
    return true;
  },
  after() {
    processMove("e", false);
  },
});

new GlobalHotkey({
  key: "j",
  mode: "once",
  action() {
    processMove("j", true);
    return true;
  },
  after() {
    processMove("j", false);
  },
});

new GlobalHotkey({
  key: "k",
  mode: "once",
  action() {
    processMove("k", true);
    return true;
  },
  after() {
    processMove("k", false);
  },
});

new GlobalHotkey({
  key: "'",
  mode: "once",
  action() {
    processMove("'", true);
    return true;
  },
  after() {
    processMove("'", false);
  },
});

new GlobalHotkey({
  key: ".",
  mode: "once",
  action() {
    processMove(".", true);
    return true;
  },
  after() {
    processMove(".", false);
  },
});

function processMove(key_name, val) {
  console.log(key_name);
  let move_info = move[key_name];
  game.keyboard.toggleKey(move_info.out, val);
}

MouseEvents.on("mousedown", event => {
  processMouse(event.button, 1);
});

MouseEvents.on("mouseup", event => {
  processMouse(event.button, 0);
});

function processMouse(button, val) {
  if (button === 1) {
    console.log("mouse");
  }
  else if (button == 2) {

  }
}

const game = new Hardware("Amnesia: The Bunker");
function begin() {
  console.log("begin. game: " + JSON.stringify(game));
  if (game.workwindow.isOpen() && game.workwindow.isForeground()) {
    let view = game.workwindow.getView();
    console.log("Game detected. Aspect ratio: " + view.width + " x " + view.height);
    width = view.width;
    height = view.height;
    ready = true;
    console.log("ready");
  }
}

/**********************************************************
 * Arduino stuff
 *********************************************************/
SerialPort.list().then(function (ports) {
  ports.forEach(port => {
    if (port.path.match(/COM[0-9]+/) && !sp_connected) {
      sp_connected = true;
      console.log("Opening port " + port.path);
      serialport = new SerialPort({ path: port.path, baudRate: 9600 });
      parser = new ReadlineParser();
      serialport.pipe(parser);
      parser.on('data', arduinoIn);
    }
  })
  if (!sp_connected) {
    console.error("No valid port found");
  }
});

async function arduinoIn(value) {
  value = value.trim();

  if (!ready) {
    console.log(value);
    return;
  }

  
}

setTimeout(begin, 5000);
