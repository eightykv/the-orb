void processFB(float quatJ) {
  if (camera_mode == 1) {
    if (moving_fb != 0) {
      Serial.println("s0");
      Serial.println("w0");
      moving_fb = 0;
    }

    if (quatJ > look_threshold_ud || quatJ < (0 - look_threshold_ud)) {
      looking_ud = 0;
    }
    else if (quatJ > 0 && quatJ < look_threshold_ud) {
      looking_ud = 1;
    }
    else if (quatJ < 0 && quatJ > 0 - look_threshold_ud) {
      looking_ud = -1;
    }
    return;
  }
  if (quatJ > 0) {
    // if we're past the threshold and not moving yet, start moving
    if (quatJ < f_threshold && moving_fb != 1) {
      if (moving_fb == -1) {
        Serial.println("s0");
      }
      Serial.println("w1");
      moving_fb = 1;
    }
    // if we're below the threshold and are moving, stop
    if (quatJ >= f_threshold && moving_fb != 0) {
      Serial.println("w0");
      moving_fb = 0;
    }
    // same with sprinting
    if (quatJ < sprint_threshold && sprinting != 1) {
      Serial.println("lAlt");
      sprinting = 1;
    }
    if (quatJ >= sprint_threshold && sprinting != 0) {
      Serial.println("lAlt");
      sprinting = 0;
    }
  }
  else if (quatJ < 0) {
    // if we're past the threshold and not moving yet, start moving
    if (quatJ > b_threshold && moving_fb != -1) {
      Serial.println("s1");
      if (moving_fb == 1) {
        Serial.println("w0");
      }
      moving_fb = -1;
    }
    // if we're below the threshold and are moving, stop
    if (quatJ <= b_threshold && moving_fb != 0) {
      Serial.println("s0");
      moving_fb = 0;
    }
  }
}

void processLR(float quatJ, float quatK) {
  // if quatJ is negative, invert quatK
  if (quatJ < 0) {
    quatK = 0 - quatK;
  }
  
  // if quatJ is positive, negative quatK is right, positive quatK is left
  if (quatK < 0 && quatK < (0 - lr_threshold) && moving_lr != 1) {
    Serial.println("d1");
    moving_lr = 1;
  }
  if (quatK < 0 && quatK >= (0 - lr_threshold) && moving_lr != 0) {
    Serial.println("d0");
    moving_lr = 0;
  }
  // if quatJ is positive, negative quatK is right, positive quatK is left
  if (quatK > 0 && quatK > lr_threshold && moving_lr != -1) {
    Serial.println("a1");
    moving_lr = -1;
  }
  if (quatK > 0 && quatK <= lr_threshold && moving_lr != 0) {
    Serial.println("a0");
    moving_lr = 0;
  }
}

void processLook(float quatJ, float quatI) {
  if (quatJ > 0) {
    quatI = 0 - quatI;
  }
  
  if (quatI < look_threshold && quatI > 0 - look_threshold) {
    looking_lr = 0;
  }
  else if (quatI < 0 - look_threshold && looking_lr != 1) {
    looking_lr = 1;
  }
  else if (quatI > look_threshold && looking_lr != -1) {
    looking_lr = -1;
  }
}
