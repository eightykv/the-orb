import { SerialPort, ReadlineParser } from 'serialport';
import pkg from 'keysender';
const { Hardware, GlobalHotkey } = pkg;
let sp_connected = false;
let serialport;
let parser;
let width, height;
let posX, posY;

const skyrim = new Hardware("Skyrim Special Edition");
let toggle = ['w', 'a', 's', 'd'];
let send    = ['space', 'tab', 'alt', 'e', 'r', 'c'];
let look    = ['>', '<', '^', '.'];
let mouse = ["click", "rclick"];

let toggle_keys = { 'w': false, 'a': false, 's': false, 'd': false };

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

async function begin() {
  let view = skyrim.workwindow.getView();
  width = view.width;
  height = view.height;
  posX = width / 2;
  posY = height / 2;
  await skyrim.mouse.moveTo(posX, posY);
  console.log("moved mouse to " + posX + ", " + posY);
}

async function arduinoIn(value) {
  value = value.trim();
  console.log(value);

  if (skyrim.workwindow.isOpen() && skyrim.workwindow.isForeground()) {
    if (toggle.indexOf(value) > -1) {
      toggle_keys[value] = !toggle_keys[value];
      await skyrim.keyboard.toggleKey(value, keys[value]);
    }
    else if (send.indexOf(value) > -1) {
      await skyrim.keyboard.sendKey(value, 50);
    }
    else if (look.indexOf(value) > -1) {
      switch (value) {
        case '>':
          await skyrim.mouse.moveTo(++posX, posY);
          break;
        case '<':
          await skyrim.mouse.moveTo(--posX, posY);
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
      if (value === "click") {
        await skyrim.mouse.click();
      }
      else if (value === "rclick") {
        await skyrim.mouse.click("right");
      }
    }
    else if (value[0] === 'z') {
      let length = parseInt(value[1]);
      // estimating that a full shout takes one second of keypress; may tweak once I can test this in-game
      await skyrim.keyboard.sendKey(value, 20 + (500 * length));
    }
  }
}

setTimeout(begin, 500);
