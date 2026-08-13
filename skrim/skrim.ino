#include <Wire.h>
#include "Adafruit_MPR121.h"

#ifndef _BV
#define _BV(bit) (1 << (bit))
#endif

// MPR helper vars
Adafruit_MPR121 mpr = Adafruit_MPR121();
uint16_t last_touched = 0;
uint16_t curr_touched = 0;

// BNO helper vars

// Piezo helper vars
int piezos[3] = {A0, A1, A2};
int shout_count;

// state vars
int camera_mode = 0;
bool jump_ready = false;
int moving_lr = 0;
int moving_ud = 0;


// timing vars
int moving_delay = 8;
long lr_clock;
long ud_clock;

long shout_clock;
long shout_delay = 500;
long shout_debounce = 200;

// temp
int last_knock = true;

void setup() {
  pinMode(2, INPUT_PULLUP);
  Serial.begin(9600);

  
  if (!mpr.begin(0x5A)) {
    Serial.println("MPR121 not found, check wiring?");
    while (1);
  }
  Serial.println("MPR121 found!");
  mpr.setAutoconfig(true);

  shout_clock = millis();
}

void loop() {
  processMPR();
  processBNO();
  processPiezos();
}

void processMPR() {
  curr_touched = mpr.touched();

  for (int i = 0; i < 4; i++) {
    if ((curr_touched & _BV(i)) && !(last_touched & _BV(i)) ) {
      // if both eyes, open the menu
      if ((i == 0 || i == 1) &&
          (curr_touched & _BV(0)) &&
          (curr_touched & _BV(1))) {
        Serial.println("tab");
      }
      // yellow
      else if (i == 0) {
        Serial.println('r');
      }
      // green
      else if (i == 1) {
        camera_mode = 1;
      }
      // blue/white
      else if (i == 2 || i == 3) {
        jump_ready = true;
      }
    }
    if (!(curr_touched & _BV(i)) && (last_touched & _BV(i)) ) {
      if (i == 1) {
        camera_mode = 0;
      }
      else if (i == 2 || i == 3) {
        if (jump_ready && 
            !(curr_touched & _BV(2)) &&
            !(curr_touched & _BV(3))) {
          Serial.println("space");
          jump_ready = false;
        }
      }
    }
  }

  last_touched = curr_touched;
}

void processBNO() {

  // send moving data every moving_delay ms
  if (moving_lr > 0 && (millis() - lr_clock) >= moving_delay) {
    if (moving_lr == 1) {
      Serial.println('>');
    }
    else {
      Serial.println('<');
    }
    lr_clock = millis();
  }
  if (moving_ud > 0 && (millis() - ud_clock) >= moving_delay) {
    if (moving_ud == 1) {
      Serial.println('^');
    }
    else {
      Serial.println('.');
    }
    ud_clock = millis();
  }
}

void processPiezos() {
  int knock = digitalRead(2);

  if ((knock != last_knock && !knock) && (millis() - shout_clock >= shout_debounce)) {
    shout_count++;
    shout_clock = millis();
  }
  if (shout_count > 0 && millis() - shout_clock > shout_delay) {
    shout_count = min(3, shout_count);
    Serial.print('z'); Serial.println(shout_count - 1);
    shout_count = 0;
  }

  last_knock = knock;
}
