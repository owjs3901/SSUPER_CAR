#include <SoftwareSerial.h>
#include <AFMotor.h>
AF_DCMotor motor_L(1);              // 모터드라이버 L293D  1: M1에 연결,  4: M4에 연결
AF_DCMotor motor_R(4);

SoftwareSerial hc06(2, 3);

void setup() {
  // turn on motor
  motor_L.setSpeed(200);              // 왼쪽 모터의 속도
  motor_L.run(RELEASE);
  motor_R.setSpeed(200);              // 오른쪽 모터의 속도
  motor_R.run(RELEASE);

  Serial.begin(9600);              // PC와의 시리얼 통신속도
  hc06.begin(9600);
  Serial.println("Eduino Smart Car Start!");
}

bool go = false;

void loop() {
  int val1 = digitalRead(A0);    // 라인센서1
  int val2 = digitalRead(A5);    // 라인센서2


  Serial.print(val1);
  Serial.println(val2);



  if (hc06.available()) {
        go = hc06.read() == '1';
  }
  if(go)
    if (val1 && val2) {                  // 직진
      motor_L.run(FORWARD);
      motor_R.run(FORWARD);
    }
    else if (val1 == 0 && val2 == 1) {              // 우회전
      motor_L.run(FORWARD);
      motor_R.run(RELEASE);
    }
    else if (val1 == 1 && val2 == 0) {              // 좌회전
      motor_L.run(RELEASE);
      motor_R.run(FORWARD);
    }
    else{              // 정지
      motor_L.run(RELEASE);
      motor_R.run(RELEASE);
    }
  else{
    motor_L.run(RELEASE);
    motor_R.run(RELEASE);
  }

}
