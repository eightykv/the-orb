import { SerialPort, ReadlineParser } from 'serialport';
import pkg from 'keysender';
const { Hardware, GlobalHotkey } = pkg;
let sp_connected = false;
let serialport;
let parser;
let width, height;
let posX, posY;

const skyrim = new Hardware("Skyrim Special Edition");
let toggle  = ['w', 'a', 's', 'd'];                     // hold down basic movement keys
let send    = ['space', 'tab', 'lAlt', 'lCtrl', 'escape', 'e', 'r'];   // one-offs
let look    = ['>', '<', '^', '.'];                     // look directions
let mouse   = ["click", "rclick"];                      // for now, can only do short click

// whether this movement is happening
let toggle_keys = { 'w': false, 'a': false, 's': false, 'd': false };

SerialPort.list().then(function (ports) {
  ports.forEach(port => {
    if (port.path.match(/COM[0-9]+/) && !sp_connected) {
      sp_connected = true;
      console.log("Opening port " + port.path);
      serialport = new SerialPort({ path: port.path, baudRate: 115200 });
      parser = new ReadlineParser();
      serialport.pipe(parser);
      parser.on('data', arduinoIn);
    }
  })
  if (!sp_connected) {
    console.error("No valid port found");
  }
});

async function begin() {
  let view = skyrim.workwindow.getView();
  width = view.width;
  height = view.height;
  // track where the mouse currently is. Move to the center of the screen
  posX = width / 2;
  posY = height / 2;
  await skyrim.mouse.moveTo(posX, posY);
  console.log("moved mouse to " + posX + ", " + posY);
}

async function arduinoIn(value) {
  value = value.trim();
  console.log(value);

  // only send keys if we're focused on the Skyrim window
  if (skyrim.workwindow.isOpen() && skyrim.workwindow.isForeground()) {
    if (send.indexOf(value) > -1) {
      await skyrim.keyboard.sendKey(value, 100);
      console.log("sending " + value);
      if (value == "escape") {
        posX = width / 2;
        posY = height / 2;
        await skyrim.mouse.moveTo(posX, posY);
      }
    }
    else if (toggle.indexOf(value[0]) > -1) {
      let key = value[0];
      toggle_keys[key] = value[1] == 1;
      await skyrim.keyboard.toggleKey(key, toggle_keys[key]);
      console.log("toggle " + key + " " + (toggle_keys[key] ? "on" : "off"));
    }
    else if (look.indexOf(value) > -1) {
      switch (value) {
        case '>':
          await skyrim.mouse.moveTo(posX += 2, posY);
          break;
        case '<':
          await skyrim.mouse.moveTo(posX -= 2, posY);
          break;
        case '^':
          await skyrim.mouse.moveTo(posX, ++posY);
          break;
        case '.':
          await skyrim.mouse.moveTo(posX, --posY);
          break;
      }
    }
    else if (mouse.indexOf(value) > -1) {
      await skyrim.mouse.moveTo(posX, posY);
      if (value === "click") {
        await skyrim.mouse.click("left", 100);
      }
      else if (value === "rclick") {
        await skyrim.mouse.click("right", 500);
      }
    }
    else if (value[0] === 'z') {
      //let length = parseInt(value[1]);
      // estimating that a full shout takes one second of keypress; may tweak once I can test this in-game
      // I think this pauses execution of all other key presses until it's done
      //await skyrim.keyboard.sendKey(value, 20 + (500 * length));
      //console.log('z');
    }
    else {
      console.log(value);
    }
  }
}

setTimeout(begin, 500);
