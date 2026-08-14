#include <Wire.h>
#include "Adafruit_MPR121.h"
#include "SparkFun_BNO08x_Arduino_Library.h"


// MPR helper vars
Adafruit_MPR121 mpr = Adafruit_MPR121();
uint16_t last_touched = 0;
uint16_t curr_touched = 0;
#ifndef _BV
#define _BV(bit) (1 << (bit))
#endif

// BNO helper vars
BNO08x bno;
#define BNO08X_ADDR 0x4B
#define BNO08X_INT  -1
#define BNO08X_RST  -1
float f_threshold = 0.96;
float b_threshold = -0.96;
float sprint_threshold = 0.85;
float lr_threshold = 0.2;
float look_threshold = 0.2;

// Piezo helper vars
int piezos[3] = {A0, A1, A2};
int shout_count;
int knock_threshold = 100;

// state vars
int camera_mode = 0;
bool jump_ready = false;
int moving_fb   = 0;
int moving_lr   = 0;
int sprinting   = 0;
int looking_lr  = 0;
int looking_ud  = 0;

// timing vars
int moving_delay = 8;
long lr_clock;
long ud_clock;

long piezo_clock[3];
long shout_delay = 500;
long piezo_debounce = 200;

// temp
int last_knock = true;

void setup() {
  pinMode(2, INPUT_PULLUP);
  Serial.begin(115200);
  
  if (!mpr.begin(0x5A)) {
    Serial.println("MPR121 not found, check wiring?");
  }
  Serial.println("MPR121 found!");
  mpr.setAutoconfig(true);
/*
  while (bno.begin(BNO08X_ADDR, Wire, BNO08X_INT, BNO08X_RST) == false) {
    Serial.println("BNO08x not detected at default I2C address.");
    delay(10);
  }
  Serial.println("BNO08x found!");
  setReports();*/
  
  for (int i = 0; i < 3; i++) {
    piezo_clock[i] = millis();
  }
  
  delay(1000);
}


void setReports(void) {
  Serial.println("Setting desired reports");
  if (bno.enableRotationVector() == true) {
    Serial.println(F("Rotation vector enabled"));
    Serial.println(F("Output in form i, j, k, real, accuracy"));
  } else {
    Serial.println("Could not enable rotation vector");
  }
}

void loop() {
  //processMPR();
  //processBNO();
  processPiezos();
  delay(10);
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
  if (bno.getSensorEvent() == true && bno.getSensorEventID() == SENSOR_REPORTID_ROTATION_VECTOR) {
    float quatI = bno.getQuatI();
    float quatJ = bno.getQuatJ();
    float quatK = bno.getQuatK();

    // forward/back is quatJ
    processFB(quatJ);
    // need quatJ for LR too
    processLR(quatJ, quatK);
    processLook(quatJ, quatI);
  }
  // send moving data every moving_delay ms
  if (looking_lr != 0 && (millis() - lr_clock) >= moving_delay) {
    if (looking_lr == 1) {
      Serial.println('>');
    }
    else {
      Serial.println('<');
    }
    lr_clock = millis();
  }
  if (looking_ud != 0 && (millis() - ud_clock) >= moving_delay) {
    if (looking_ud == 1) {
      Serial.println('^');
    }
    else {
      Serial.println('.');
    }
    ud_clock = millis();
  }
}

void processPiezos() {
  for (int i = 0; i < 3; i++) {
    int knock = analogRead(piezos[i]);
    if (knock > knock_threshold && (millis() - piezo_clock[i]) > piezo_debounce) {
      if (i == 0) {
        Serial.println("click");
      }
      else if (i == 1) {
        Serial.println("rclick");
      }
      else {
        shout_count++;
      }
      piezo_clock[i] = millis();
    }
  }
  
  if (shout_count > 0 && millis() - piezo_clock[2] > shout_delay) {
    shout_count = min(3, shout_count);
    Serial.print('z'); Serial.println(shout_count - 1);
    shout_count = 0;
  }
}
