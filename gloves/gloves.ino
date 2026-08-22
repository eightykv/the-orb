// Needed for I2C chips
#include <Wire.h>

// For the BNO055
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <utility/imumaths.h>

// BNO055
#define BNO055_SAMPLERATE_DELAY_MS (100)
Adafruit_BNO055 bno = Adafruit_BNO055(55);

// For right hand (BNO055 orientation sensor)
float x, y, z;          // Absolute orientation data in X, Y and Z
float l_x, l_y, l_z;    // Linear acceleration data in X, Y and Z
float l_y_trig = 5.0;   // Threshold for acceleration trigger in the Y direction
bool l_y_bin = false;   // Whether the acceleration trigger has been tripped
int at = 0;             // Output var for acceleration trigger
long ms;                // Clock
int vox;                // A 3-way switch, used to be mapped to vocal effects
// Sensor vars
sensors_event_t event;
imu::Vector<3> lin_accel;

// For left hand (4 flex sensors: index, middle, ring, pinky)
double diff = 35;                   // Difference from calibration that counts as "on"
double p_diff = 30;                 // Pinky needs a lower diff in my experience
boolean calibrate;                  // Indicates to run the calibration routine (true in the beginning)
double i_cal, m_cal, r_cal, p_cal;  // The calibrated, baseline values of each sensor
double i, m, r, p, i_bin, m_bin, r_bin, p_bin = 0;  // Needed for multistep processing
// Output data
byte output_table[4] = {0x00, 0x10, 0x20, 0x30};
int x_out, y_out, z_out;
char output_arr[64];

void setup() {
  Serial.begin(57600);

  /* Initialise the sensor */
  if(!bno.begin())
  {
    /* There was a problem detecting the BNO055 ... check your connections */
    Serial.println("Ooops, no BNO055 detected ... Check your wiring or I2C ADDR!");
    while(1);
  }
  else {
    Serial.println("BNO setup complete");
  }
  bno.setExtCrystalUse(true);  

  // Give it a minute to resolve
  delay(1000);

  // Set up input pins
  pinMode(A0, INPUT);
  pinMode(A1, INPUT);
  pinMode(A2, INPUT);
  pinMode(A3, INPUT);
  pinMode(4, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);

  // Indicates we need to calibrate
  calibrate = true;
}

void loop() {
  // Get a new sensor event
  //if(count % 2 == 0) {
  bno.getEvent(&event);
  lin_accel = bno.getVector(Adafruit_BNO055::VECTOR_LINEARACCEL);
  //}

  // Process linear acceleration data
  l_x = abs(lin_accel.x());
  l_y = abs(lin_accel.y());
  l_z = abs(lin_accel.z());
  l_y_bin = l_y > l_y_trig;

  /*  Acceleration trigger:
   *  If linear acceleration in Y exceeds a particular threshold, it acts as
   *  a trigger that stays on until I repeat the gesture to turn it off.
   */
  if(l_y_bin) {
    if(!at && millis() - ms >= 500) {
      at = 127;
      digitalWrite(5, HIGH); // LEDs on 5 and 6 let me monitor the state of this variable
      digitalWrite(6, HIGH);
      ms = millis();
    }
    else {
      if(millis() - ms >= 500) {
        at = 0;
        digitalWrite(5, LOW);
        digitalWrite(6, LOW);
        ms = millis();
      }
    }
  }

  // Absolute orintation data
  x_out = round(event.orientation.x);
  y_out = round(event.orientation.y);
  z_out = round(event.orientation.z);

  // Index, Middle, Ring and Pinky flex sensor data
  i = (analogRead(A0));
  m = (analogRead(A1));
  r = (analogRead(A2));
  p = (analogRead(A3));

  // If we've gotta calibrate, do it here
  // Not in setup because eventually I want to be able to force a recalibration
  // in some other way
  double calVal[4];
  if(calibrate) {
    i_cal = i;
    m_cal = m;
    r_cal = r;
    p_cal = p;
    cal(calVal);
    calibrate = false;
  }

  // Transform raw data into binary gate values
  i_bin = i < (i_cal - diff) ? 1.0 : 0.0;
  m_bin = m < (m_cal - diff) ? 1.0 : 0.0;
  r_bin = r < (r_cal - diff) ? 1.0 : 0.0;
  p_bin = p < (p_cal - p_diff) ? 1.0 : 0.0;

  // Transform into integers
  // Yeah, there's a way more elegant way to do this
  int at_flag = 0;
  int i_flag = 0;
  int m_flag = 0;
  int r_flag = 0;
  int p_flag = 0;
  
  if(at)    { at_flag = 1; }
  if(i_bin) { i_flag = 1; }
  if(m_bin) { m_flag = 1; }
  if(r_bin) { r_flag = 1; }
  if(p_bin) { p_flag = 1; }

  // Read from switch
  int d3 = digitalRead(3);
  int d4 = digitalRead(4);
  int v_flag = 1;
  if (d3 == 0) {
    v_flag = 2;
  }
  if (d4 == 0) {
    v_flag = 0;
  }
  sprintf(output_arr, "%03d %04d %04d %d %d %d %d %d %d", x_out, y_out, z_out, i_flag, m_flag, r_flag, p_flag, at_flag, v_flag);
  Serial.println(output_arr);
  
  delay(100);
}


// Calibration routine -- average current values for 1s
void cal(double* calVal) {
  Serial.println("Calibrating flex sensors...");
  for (int j = 0; j < 100; j++ ) {
    i_cal = (i_cal + analogRead(A0))/2;
    m_cal = (m_cal + analogRead(A1))/2;
    r_cal = (r_cal + analogRead(A2))/2;
    p_cal = (p_cal + analogRead(A3))/2;
    delay(10);
  }
  calibrate = false;
  Serial.println("Finished calibration");
}
