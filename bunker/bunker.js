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

/**********************************************************
 * Web server stuff (for OBS)
 *********************************************************/
const http = require('http');
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(heartrate);
});
const port = 3000;
const host = 'localhost';
server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});

/**********************************************************
 * Key remapping stuff
 *********************************************************/
const move = {
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
  }
};
const control = {
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
  }
}
const move_keys = move.keys();
const control_keys = control.keys();
const mouse_keys = ["l", "r"];
const game = new Hardware("Amnesia: The Bunker");

let sp_connected = false;
let serialport;
let parser;

let width, height;
let heartrate = 75;
let heartrate_history = [];
let thresholds = [90, 110]; // guess
let override = false;
let override_moves = "";
let spike = false;
let spike_int;

/********** MOVE **********/
// , (forward)
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
// o (back)
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
//a (left)
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
//e (right)
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

/********** CONTROL **********/
// j (crouch)
new GlobalHotkey({
  key: "j",
  mode: "once",
  action() {
    processControl("j", true);
    return true;
  },
  after() {
    processControl("j", false);
  },
});
// k (sprint)
new GlobalHotkey({
  key: "k",
  mode: "once",
  action() {
    processControl("k", true);
    return true;
  },
  after() {
    processControl("k", false);
  },
});
// ' (lean L)
new GlobalHotkey({
  key: "'",
  mode: "once",
  action() {
    processControl("'", true);
    return true;
  },
  after() {
    processControl("'", false);
  },
});
// . (lean R)
new GlobalHotkey({
  key: ".",
  mode: "once",
  action() {
    processControl(".", true);
    return true;
  },
  after() {
    processControl(".", false);
  },
});

/********** MOUSE **********/
// l (left click)
MouseEvents.on("mousedown", event => {
  processMouse(event.button - 1, 1);
});
// r (right click)
MouseEvents.on("mouseup", event => {
  processMouse(event.button - 1, 0);
});

function processMove(key_name, val) {
  // spike interrupts all processes
  if (spike) return;

  if (override || heartrate < thresholds[0]) {
    let move_info = move[key_name];
    game.keyboard.toggleKey(move_info.out, val);
  }
  else if (heartrate <= thresholds[1]) {

  }
  else if (heartrate > thresholds[1]) {

  }
}

function processControl(key_name, val) {
  // During override we can only move and interact
  if (spike || override) return;

  if (heartrate < thresholds[0]) {
    let control_info = control[key_name];
    game.keyboard.toggleKey(control_info.out, val);
  }
  else if (heartrate <= thresholds[1]) {

  }
  else if (heartrate > thresholds[1]) {
    
  }
}

function processMouse(button, val) {
  // spike interrupts all processes
  if (spike) return;

  if (override || heartrate < thresholds[0]) {
    game.keyboard.toggleKey(mouse_keys[button], val);
  }
  else if (heartrate <= thresholds[1]) {

  }
  else if (heartrate > thresholds[1]) {
    
  }
}

function endAllActions() {
  for (let i = 0; i < move_keys; i++) {
    game.keyboard.toggleKey(move[move_keys[i]].out, false);
  }
  for (let i = 0; i < control_keys; i++) {
    game.keyboard.toggleKey(control[control_keys[i]].out, false);
  }
  for (let i = 0; i < mouse_keys; i++) {
    game.keyboard.toggleKey(mouse_keys[i], false);
  }
}

function processSpike() {
  // stop whatever we're doing
  endAllActions();

  rand = Math.random();
  // start swinging
  if (rand < 0.33) {
    console.log("FRANTIC PUNCHING");
    //spike_int = setInterval(() => { game.keyboard.sendKey("l") }, 200);
  }
  // run
  else if (rand < 0.67) {
    console.log("RUNNING");
    game.keyboard.toggleKey("m", true);
  }
  // frozen
  else {
    console.log("FROZEN");
    return;
  }
}

function endSpike() {
  game.keyboard.toggleKey("m", false);
  if (spike_int) clearInterval(spike_int);
}

function begin() {
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
  value = value.trim().split("|");

  if (!ready) {
    console.log(value);
    return;
  }

  heartrate = value[0];
  processHeartrate(heartrate);

  override = value[1];
  override_moves = value[2];
  if (!override) return;

  for (let i = 0; i < move_keys.length; i++) {
    if (override_moves.indexOf(move_keys[i]) > -1) {
      processMove(move_keys[i], true);
    }
    else {
      processMove(move_keys[i], false);
    }
  }
}

function processHeartrate(heartrate) {
  heartrate_history.push(heartrate);
  if (heartrate_history.length === 3) {
    let history_el = heartrate_history.shift();
    let avg = (heartrate_history[0] + heartrate_history[1]) / 2;
    if (avg - history_el > 15) {
      console.log("HEARTRATE SPIKE");
      spike = true;
      processSpike();

      // end spike after 1S
      setTimeout(endSpike, 1000);
    }
  }

  if (heartrate < thresholds[0] && heartrate_history[0] > thresholds[0]) {
    console.log("LEVEL 0");
  }
  if (heartrate > thresholds[0] && heartrate < thresholds[1] && 
      (heartrate_history[0] < thresholds[0] || heartrate_history[0] > thresholds[1])) {
    console.log("LEVEL 1");
  }
  if (heartrate > thresholds[1] && heartrate_history[0] < thresholds[1]) {
    console.log("LEVEL 2");
  }
}

setTimeout(begin, 5000);
