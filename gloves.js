const { SerialPort, ReadlineParser } = require('serialport');
const { util } = require('util');
const { Hardware, GlobalHotkey } = require('keysender');
const { Actionify } = require("@lucyus/actionify");
let sp_connected = false;
let serialport;
let parser;
let width, height;
let posX, posY;
let ready = false;

/* 
 * x    y   z    i m r p a v
 * 039 -014 0034 0 0 0 0 0 1
 * 
 * 
 */

let x, y, z, i, m, r, p, a, t = 0, u = 0;
let moving_fb = 0, moving_lr = 0, move_dir = 0, strafe_dir = 0, leaning = 0;
let last_i, last_m, last_r, last_p, last_x = 0, last_y = 0, last_a = 0;
let start_x = 0, start_y = 0, start_y1 = 0, start_y2 = 0, start_y3 = 0, start_z = 0, start_z1 = 0, start_z2 = 0;
let action = false;

const game = new Hardware("Dishonored");
SerialPort.list().then(function (ports) {
  ports.forEach(port => {
    if (port.path.match(/COM[0-9]+/) && !sp_connected) {
      sp_connected = true;
      console.log("Opening port " + port.path);
      serialport = new SerialPort({ path: port.path, baudRate: 57600 });
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
  let view = game.workwindow.getView();
  console.log(view);
  width = view.width;
  height = view.height;
  // track where the mouse currently is. Move to the center of the screen
  posX = width / 2;
  posY = height / 2;
  Actionify.mouse.move(posX, posY);
  console.log("moved mouse to " + posX + ", " + posY);
  ready = true;
  console.log("ready");
}

async function arduinoIn(value) {
  value = value.trim();

  if (!ready) {
    console.log(value);
    return;
  }

  // only send keys if we're focused on the game window
  if (game.workwindow.isOpen() && game.workwindow.isForeground()) {
    value = value.split(' ');
    value = value.map((i) => Number(i));
    x = value[0];
    y = value[1];
    z = value[2];
    i = value[3];
    m = value[4];
    r = value[5];
    p = value[6];
    a = value[7];
    t = value[8];

    processLook();
    processForwardBack();
    processLeftRight();
    processAction();
    processSave();

    if (a && !last_a) {
      last_a = a;
      await game.keyboard.sendKey('j');
      console.log("sneak");
    }
    else if (!a && last_a) {
      last_a = a;
      await game.keyboard.sendKey('j');
      console.log("stop sneak");
    }

    last_x = x;
    last_y = y;

    last_i = i;
    last_m = m;
    last_r = r;
    last_p = p;

    last_a = a;
  }
}

async function processForwardBack() {
  if (i) {
    if (!last_i) {
      console.log("start");
      start_y = y;
      move_dir = 0;
    }
    let diff = y - start_y;

    if (diff < -8 && moving_fb === 0/* && move_dir >= 0*/) {
      console.log("moving f");
      await game.keyboard.toggleKey(',', true);
      move_dir = 1;
      moving_fb = 1;
    }
    else if (diff >= -4 && moving_fb === 1 && move_dir === 1) {
      console.log("stop moving f");
      await game.keyboard.toggleKey(',', false);
      moving_fb = 0;
    }
    else if (diff > 8 && moving_fb === 0/* && move_dir <= 0*/) {
      console.log("moving b");
      await game.keyboard.toggleKey('o', true);
      move_dir = -1;
      moving_fb = 1;
    }
    else if (diff <= 4 && moving_fb === 1 && move_dir === -1) {
      console.log("stop moving b");
      await game.keyboard.toggleKey('o', false);
      moving_fb = 0;
    }
  }
  // if we've released i (i false, last_i true) and we're moving, stop
  else if (last_i && moving_fb) {
    console.log("stop moving f or b");
    if (move_dir === 1) {
      await game.keyboard.toggleKey(',', false);
    }
    else if (move_dir === -1) {
      await game.keyboard.toggleKey('o', false);
    }
    moving_fb = 0;
  }
  else if (!i && move_dir != 0) {
    move_dir = 0;
  }
}

async function processLeftRight() {
  if (i) {
    if (!last_i) {
      console.log("start strafe");
      start_z = z;
      strafe_dir = 0;
    }

    let diff = z - start_z;

    if (diff < -16 && moving_lr === 0/* && strafe_dir >= 0*/) {
      console.log("moving r");
      await game.keyboard.toggleKey('e', true);
      strafe_dir = 1;
      moving_lr = 1;
    }
    else if (diff >= -8 && moving_lr === 1 && strafe_dir === 1) {
      console.log("stop moving r");
      await game.keyboard.toggleKey('e', false);
      moving_lr = 0;
    }
    else if (diff > 16 && moving_lr === 0/* && strafe_dir <= 0*/) {
      console.log("moving l");
      await game.keyboard.toggleKey('a', true);
      strafe_dir = -1;
      moving_lr = 1;
    }
    else if (diff <= 8 && moving_lr === 1 && strafe_dir === -1) {
      console.log("stop moving l");
      await game.keyboard.toggleKey('a', false);
      moving_lr = 0;
    }
  }
  // if we've released i (i false, last_i true) and we're moving, stop
  else if (last_i && moving_lr) {
    console.log("stop moving r or l");
    if (strafe_dir === 1) {
      await game.keyboard.toggleKey('e', false);
    }
    else if (strafe_dir === -1) {
      await game.keyboard.toggleKey('a', false);
    }
    moving_lr = 0;
  }
  else if (!i && strafe_dir != 0) {
    strafe_dir = 0;
  }
}

async function processAction() {
  if (r) {
    if (!last_r) {
      start_y1 = y;
      start_z1 = z;
    }
    let diff = y - start_y1;

    if (diff < -16 && leaning === 0) {
      console.log("space");
      await game.keyboard.sendKey("space");
      start_y1 = y;
    }
    else if (diff > 16 && !u && leaning === 0) {
      console.log("start u");
      await game.keyboard.toggleKey('u', true);
      u = true;
    }
    else if (diff <= 8 && u) {
      console.log("stop u");
      await game.keyboard.toggleKey('u', false);
      u = false;
    }

    diff = start_z1 - z;
    if (leaning === 0) {
      if (diff > 16) {
        console.log("lean r");
        await game.keyboard.toggleKey('.', true);
        leaning = 1;
        start_z1 = z;
      }
      else if (diff < -16) {
        console.log("lean l");
        await game.keyboard.toggleKey('\'', true);
        leaning = -1;
        start_z1 = z;
      }
    }
    else {
      if (diff < -2 && leaning === 1) {
        console.log("stop lean r");
        await game.keyboard.toggleKey('.', false);
        leaning = 0;
      }
      else if (diff > 2 && leaning === -1) {
        console.log("stop lean l");
        await game.keyboard.toggleKey('\'', false);
        leaning = 0;
      }
    }
  }
  else if (last_r) {
    if (u) {
      console.log("stop u");
      await game.keyboard.toggleKey('u', false);
      u = false;
    }
    if (leaning !== 0) {
      console.log("stop lean");
      await game.keyboard.toggleKey((leaning === 1 ? '.' : '\''), false);
      leaning = 0;
    }
  }
}

async function processLook() {
  if (t === 2 && !m && !r) {
    let diff = x - last_x;
    if (Math.abs(diff) > 100) {
      return;
    }
    if (Math.abs(diff) > 4) {
      posX += diff;
      game.mouse.moveTo(posX, posY);
    }
  }
  else if (m) {
    if (m && !last_m) {
      start_x = x;
      start_y2 = y;
    }

    let diff = x - start_x;
    let changed = false;
    if (Math.abs(diff) > 100) {
      start_x = x;
      return;
    }
    if (Math.abs(diff) > 2) {
      changed = true;
      posX += diff * 8;
      start_x = x;
    }

    diff = y - start_y2;
    if (Math.abs(diff) > 2 && !i) {
      changed = true;
      posY -= diff;
      if (posY < 0) {
        posY = 0;
      }
      if (posY > height) {
        posY = height;
      }
      start_y2 = y;
    }

    if (changed) {
      await Actionify.mouse.move(posX, posY, {
        motion: "linear", //TODO try arc
        delay: 80,
        steps: "auto"
      }); 
    }
  }
}

setTimeout(begin, 5000);

async function processSave() {
  if (p) {
    if (!last_p) {
      start_y3 = y;
      start_z2 = z;
      action = false;
    }
    let diff = y - start_y3;
    last_p = p;

    if (!action) {
      if (diff < -16) {
        console.log("esc");
        await game.keyboard.sendKey("escape");
        action = true;
        return;
      }
      else if (diff > 16) {
        console.log("quicksave");
        await game.keyboard.sendKey("f5");
        action = true;
        return;
      }

      diff = start_z2 - z;
      if (diff > 16) {
        console.log("quickload");
        await game.keyboard.sendKey("f9");
        action = true;
      }
    }
  }
}