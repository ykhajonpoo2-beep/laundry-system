#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"


const char* serverUrl =
  "https://laundry-system-one.vercel.app";

#define MACHINE_ID 5

const int powerPin = 4;
const int jogA = 5;
const int jogB = 6;
const int tempPin = 7;
const int rinsePin = 8;
const int revPin = 15;
const int startPin = 16;
const int machineDonePin = 17;
const int lidPin = 18; // เซ็นเซอร์ฝา
bool machineRunning = false;
bool machinePaused = false;
bool lastDoneState = LOW;
unsigned long washEndTime = 0;
unsigned long lastPoll = 0; 
unsigned long lastAlive = 0;
unsigned long lastDoneTrigger = 0;
unsigned long remainingTime = 0;
struct ProgramConfig {
  int durationSeconds;
  int jog;
  int rinse;
  int temp;
  int rev;
};

// ค่าเริ่มต้น JOG / TEMP / REV ตามที่ยืนยัน
const ProgramConfig washer9[] = {
  {1020, 4,  0, 0, 3},  // 1 ซักด่วน น้ำเย็น 17 นาที
  {1140, 4,  0, 2, 3},  // 2 ซักด่วน น้ำอุ่น 22 นาที
  {3600, 12, 0, 2, 0},  // 3 ซักทั่วไป น้ำเย็น 60 นาที
  {4200, 12, 0, 0, 0},  // 4 ซักทั่วไป น้ำอุ่น 70 นาที
  {4800, 12, 0, 1, 0},  // 5 ซักทั่วไป น้ำร้อน 80 นาที
  {960,  7,  0, 0, 5},  // 6 ล้าง ปั่นหมาด 16 นาที
  {4800, 6,  0, 0, 0}   // 7 ล้างเครื่อง 80 นาที
};

const ProgramConfig washer15_id5[] = {
  {2700, 5, 0, 0, 0},   // 1 ซักด่วน น้ำอุ่น 45 นาที
  {3600, 1, 4, 2, 4},   // 2 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 1, 4, 0, 4},   // 3 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 1, 4, 1, 4},   // 4 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 4, 3, 0, 0}    // 5 ผ้านวม น้ำเย็น 60 นาที
};

const ProgramConfig washer15_id6[] = {
  {2700, 5, 0, 0, 0},   // 1 ซักด่วน น้ำอุ่น 45 นาที
  {3600, 1, 0, 0, 0},   // 2 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 1, 0, 1, 1},   // 3 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 1, 0, 2, 2},   // 4 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 4, 0, 0, 0}    // 5 ผ้านวม น้ำเย็น 60 นาที
};

const ProgramConfig washer25[] = {
  {2700, 4, 0, 0, 3},    // 1 ซักด่วน น้ำอุ่น 45 นาที
  {3600, 1, 0, 2, 3},    // 2 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 12, 0, 2, 0},   // 3 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 4, 0, 0, 3},    // 4 ซักทั่วไป น้ำเย็น 60 นาที
  {3600, 1, 0, 2, 3}     // 5 ผ้านวม น้ำเย็น 60 นาที
};

const ProgramConfig dryer9[] = {
  {1800, 2, 0, 0, 0},     // 1 อบด่วน 30 นาที
  {5400, 1, 0, 0, 0},     // 2 อบทั่วไป 90 นาที
  {10800, 14, 0, 0, 0}    // 3 อบผ้านวม 180 นาที
};

ProgramConfig getProgramConfig(int machineId, int programId) {
  if (machineId >= 1 && machineId <= 4 &&
      programId >= 1 && programId <= 7) {
    return washer9[programId - 1];
  }

  if (machineId == 5 && programId >= 1 && programId <= 5) {
    return washer15_id5[programId - 1];
  }

  if (machineId == 6 && programId >= 1 && programId <= 5) {
    return washer15_id6[programId - 1];
  }

  if (machineId >= 7 && machineId <= 8 &&
      programId >= 1 && programId <= 5) {
    return washer25[programId - 1];
  }

  if (machineId >= 9 && machineId <= 12 &&
      programId >= 1 && programId <= 3) {
    return dryer9[programId - 1];
  }

  return {0, 0, 0, 0, 0}; // โปรแกรมไม่ถูกต้อง
}
void pulsePin(int pin, int ms = 300) {
  digitalWrite(pin, HIGH);
  delay(ms);
  digitalWrite(pin, LOW);
}void jogSequence(int count) {

  for (int i = 0; i < count; i++) {

    // A จากก่อน
    digitalWrite(jogB, HIGH);

    delay(150);

    // B จากตาม ขณะ A ยังจากอยู่
    digitalWrite(jogA, HIGH);

    delay(150);

    // B กลับก่อน
    digitalWrite(jogB, LOW);

    delay(150);

    // A กลับทีหลัง
    digitalWrite(jogA, LOW);

    delay(150);
  }
}void pulseMultiple(
  int pin,
  int count
) {
  for (int i = 0; i < count; i++) {
    pulsePin(pin, 250);
    delay(500);
  }
}void runWashSequence(
  int jogCount,
  int rinseCount,
  int tempCount,
  int revCount
) {
  Serial.println("POWER");
  pulsePin(powerPin, 250);

  delay(3000);

  Serial.println("JOG");
  jogSequence(jogCount);

  delay(1000);

  Serial.println("RINSE");
  pulseMultiple(rinsePin, rinseCount);

  delay(1000);

  Serial.println("TEMP");
  pulseMultiple(tempPin, tempCount);

  delay(1000);

  Serial.println("REV");
  pulseMultiple(revPin, revCount);

  delay(1000);

  Serial.println("START");
  pulsePin(startPin, 250);
}bool overrunAlertSent = false;
bool finishReported = false;
bool finishPending = false;
unsigned long lastDoneNotifyAttempt = 0;
int currentProgramId = 0;

void startMachine(int duration) {
  Serial.println("START MACHINE");

  machineRunning = true;
  machinePaused = false;

  remainingTime = (unsigned long)duration * 1000UL;
  washEndTime = millis() + remainingTime;

  overrunAlertSent = false;
  finishReported = false;
  finishPending = false;
  lastDoneNotifyAttempt = 0;
}
bool runProgramById(int programId) {
  ProgramConfig cfg = getProgramConfig(MACHINE_ID, programId);

  if (cfg.durationSeconds <= 0) {
    Serial.println("INVALID MACHINE OR PROGRAM");
    return false;
  }

  Serial.printf(
    "MACHINE %d PROGRAM %d\n",
    MACHINE_ID, programId
  );

  Serial.printf(
    "DURATION=%d JOG=%d RINSE=%d TEMP=%d REV=%d\n",
    cfg.durationSeconds, cfg.jog, cfg.rinse, cfg.temp, cfg.rev
  );

  runWashSequence(cfg.jog, cfg.rinse, cfg.temp, cfg.rev);

  startMachine(cfg.durationSeconds);
  return true;
}
// ----------------------


// ----------------------


// ----------------------
void clearCommand(const String& ackCommand) {
  HTTPClient http;
  http.setTimeout(5000);

  String url = String(serverUrl) + "/api/machine-command";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp32-token", ESP32_API_TOKEN);

  String body =
    "{\"machineId\":" + String(MACHINE_ID) +
    ",\"command\":\"none\"" +
    ",\"ackCommand\":\"" + ackCommand + "\"}";

  int code = http.POST(body);

  Serial.print("ACK ");
  Serial.print(ackCommand);
  Serial.print(" HTTP=");
  Serial.println(code);

  http.end();
}

// ----------------------
bool notifyMachineDone() {
  HTTPClient http;
  http.setTimeout(5000);

  String url = String(serverUrl) + "/api/machine-done";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp32-token", ESP32_API_TOKEN);

  String body =
    "{\"machineId\":" +
    String(MACHINE_ID) +
    "}";

  int code = http.POST(body);

  Serial.print("DONE HTTP=");
  Serial.println(code);

  http.end();

  return code == 200;
}

// 🔥 แจ้ง power
void notifyPower() {
  HTTPClient http;
  http.setTimeout(5000);

  http.begin(String(serverUrl) + "/api/machine-power");

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp32-token", ESP32_API_TOKEN);

  String body =
    "{\"machineId\":" + String(MACHINE_ID) + "}";

  int code = http.POST(body);

  Serial.print("POWER HTTP=");
  Serial.println(code);

  http.end();
}

void notifyStarted(int duration) {
  HTTPClient http;
  http.setTimeout(5000);

  String url = String(serverUrl) + "/api/machine-started";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp32-token", ESP32_API_TOKEN);

  String body =
    "{\"machineId\":" + String(MACHINE_ID) +
    ",\"duration\":" + String(duration) + "}";

  int code = http.POST(body);

  Serial.print("STARTED HTTP=");
  Serial.println(code);

  http.end();
}
void notifyPaused() {
  HTTPClient http;
  http.setTimeout(5000);
  String url = String(serverUrl) + "/api/machine-paused";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body =
  "{\"machineId\":" +
  String(MACHINE_ID) +
  "}";

http.POST(body);

  http.end();
}
void notifyResume() {
  HTTPClient http;
  http.setTimeout(5000);
  String url = String(serverUrl) + "/api/machine-resume";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body =
  "{\"machineId\":" +
  String(MACHINE_ID) +
  "}";

http.POST(body);

  http.end();
}
// ----------------------
void checkCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.setTimeout(5000);

  String url =
    String(serverUrl) +
    "/api/machine-command?id=" +
    String(MACHINE_ID);

    http.begin(url);

  // ส่ง Token เพื่อยืนยันตัวตนกับ Backend
  http.addHeader("x-esp32-token", ESP32_API_TOKEN);

  int code = http.GET();

  Serial.print("POLL CODE = ");
  Serial.println(code);

  if (code != 200) {
    http.end();
    return;
  }

  String payload = http.getString();

  http.end();

  Serial.print("SERVER RESPONSE = ");
  Serial.println(payload);

  // ----------------------
  // POWER
  // ----------------------
  if (payload.indexOf("\"command\":\"power\"") >= 0) {
    Serial.println("POWER COMMAND");

    // Manual POWER pulse
    pulsePin(powerPin, 800);

    // Clear all previous machine cycle states
    machineRunning = false;
    machinePaused = false;
    washEndTime = 0;
    remainingTime = 0;

    overrunAlertSent = false;
    finishReported = false;
    finishPending = false;
    lastDoneNotifyAttempt = 0;

    currentProgramId = 0;

    Serial.println("POWER: MACHINE STATE RESET");

    notifyPower();

    clearCommand("power");
  }

  // ----------------------
  // START BUTTON
  // ----------------------
  else if (
    payload.indexOf("\"command\":\"start-button\"") >= 0
  ) {
    Serial.println("START BUTTON COMMAND");

    bool lidClosed = digitalRead(lidPin) == HIGH;

    if (!lidClosed) {
      Serial.println("ERROR: LID OPEN");
      clearCommand("start-button");
      return;
    }

    if (!machineRunning && !machinePaused) {
      pulsePin(startPin, 250);
      Serial.println("START BUTTON PULSE DONE");
    }

    clearCommand("start-button");
  }

  // ----------------------
  // START PROGRAM
  // ----------------------
  else if (
    payload.indexOf("\"command\":\"start\"") >= 0 &&
    !machineRunning &&
    !machinePaused
  ) {
    Serial.println("START PROGRAM COMMAND");

    bool lidClosed = digitalRead(lidPin) == HIGH;

    if (!lidClosed) {
      Serial.println("ERROR: LID OPEN");
      clearCommand("start");
      return;
    }

    int programId = 0;

    int pos = payload.indexOf("\"program\":");

    if (pos >= 0) {
      int start = pos + 10;

      while (
        start < payload.length() &&
        payload[start] == ' '
      ) {
        start++;
      }

      programId = payload.substring(start).toInt();
    }

    Serial.print("PROGRAM ID = ");
    Serial.println(programId);

    ProgramConfig cfg =
      getProgramConfig(MACHINE_ID, programId);

    if (cfg.durationSeconds <= 0) {
      Serial.println("INVALID PROGRAM");
      clearCommand("start");
      return;
    }

    if (runProgramById(programId)) {
      currentProgramId = programId;

      notifyStarted(cfg.durationSeconds);

      Serial.println("PROGRAM STARTED");

      clearCommand("start");
    }
  }

  // ----------------------
  // PAUSE
  // ----------------------
  else if (
    payload.indexOf("\"command\":\"pause\"") >= 0
  ) {
    Serial.println("PAUSE COMMAND");

    if (machineRunning && !machinePaused) {
      unsigned long now = millis();

      remainingTime =
        washEndTime > now
          ? washEndTime - now
          : 0;

      pulsePin(startPin, 800);

      machineRunning = false;
      machinePaused = true;

      Serial.print("REMAINING TIME = ");
      Serial.println(remainingTime);
    }

    clearCommand("pause");
  }

  // ----------------------
  // RESUME
  // ----------------------
  else if (
    payload.indexOf("\"command\":\"resume\"") >= 0
  ) {
    Serial.println("RESUME COMMAND");

    if (machinePaused) {
      pulsePin(startPin, 800);

      machineRunning = true;
      machinePaused = false;

      washEndTime = millis() + remainingTime;

      Serial.println("TIMER RESUMED");
    }

    clearCommand("resume");
  }
}

// ----------------------
void checkFinish() {
  // ตรวจสอบ Timer และ LDR เฉพาะขณะที่เครื่องกำลังทำงาน
  if (machineRunning && !machinePaused) {

    // รอจน Timer หมด
    if (millis() >= washEndTime) {

      int ldrState = digitalRead(machineDonePin);

      // LOW = เครื่องยังทำงาน
      if (ldrState == LOW) {
        if (!overrunAlertSent) {
          Serial.println("WARNING: MACHINE OVERTIME");
          overrunAlertSent = true;
          Serial.println("OVERTIME ALERT");
        }

        return;
      }

      // HIGH = เครื่องหยุดทำงานแล้ว
      if (ldrState == HIGH && !finishPending && !finishReported) {
        Serial.println("MACHINE DONE");

        machineRunning = false;
        machinePaused = false;
        remainingTime = 0;

        finishPending = true;
      }
    }
  }

  // Retry แจ้งเครื่องเสร็จทุก 10 วินาที
  if (finishPending && !finishReported) {

    if (
      lastDoneNotifyAttempt == 0 ||
      millis() - lastDoneNotifyAttempt >= 10000UL
    ) {
      lastDoneNotifyAttempt = millis();

      Serial.println("SENDING MACHINE DONE");

      if (notifyMachineDone()) {
        finishReported = true;
        finishPending = false;

        Serial.println("MACHINE DONE CONFIRMED");
      } else {
        Serial.println("DONE NOTIFY FAILED - RETRY IN 10 SECONDS");
      }
    }
  }
}

bool lastLidState = true;

void sendLidStatus(bool closed) {
  HTTPClient http;
  http.setTimeout(5000);

  String url = String(serverUrl) + "/api/lid-status";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-esp32-token", ESP32_API_TOKEN);

  String body =
    "{\"machineId\":" + String(MACHINE_ID) +
    ",\"closed\":" + String(closed ? "true" : "false") + "}";

  int code = http.POST(body);

  Serial.print("LID HTTP=");
  Serial.println(code);

  http.end();
}

// ----------------------
void setup() {
  static unsigned long lastDebug = 0;

if (millis() - lastDebug > 5000) {
  Serial.println("LOOP RUNNING");
  lastDebug = millis();
}
  Serial.begin(115200);

pinMode(powerPin, OUTPUT);
pinMode(jogA, OUTPUT);
pinMode(jogB, OUTPUT);
pinMode(tempPin, OUTPUT);
pinMode(rinsePin, OUTPUT);
pinMode(revPin, OUTPUT);
pinMode(startPin, OUTPUT);

digitalWrite(powerPin, LOW);
digitalWrite(jogA, LOW);
digitalWrite(jogB, LOW);
digitalWrite(tempPin, LOW);
digitalWrite(rinsePin, LOW);
digitalWrite(revPin, LOW);
digitalWrite(startPin, LOW);

  pinMode(machineDonePin, INPUT_PULLDOWN);
  pinMode(lidPin, INPUT_PULLUP);
bool closed =
  digitalRead(lidPin) == HIGH;

lastLidState = closed;

WiFi.begin(ssid,password);

while (WiFi.status() != WL_CONNECTED) {
  delay(500);
}

sendLidStatus(closed);
Serial.println("SETUP DONE");
  Serial.println("\nWiFi connected");
  Serial.println(WiFi.localIP());
}

// ----------------------
void loop() {
  if (WiFi.status() != WL_CONNECTED) {

  Serial.println("WiFi Lost");

  WiFi.disconnect();

  WiFi.begin(ssid, password);

  delay(1000);

  return;
}
  if (millis() - lastPoll > 3000) {
    lastPoll = millis();
    checkCommand();
  }
if (millis() - lastAlive > 60000) {

  Serial.println("ALIVE");

  lastAlive = millis();
}

int doneState = digitalRead(machineDonePin);
int lidState = digitalRead(lidPin);

// ส่งสถานะฝา
bool closed = (lidState == HIGH);

if (closed != lastLidState) {
  sendLidStatus(closed);
  lastLidState = closed;
}

Serial.print("DONE PIN = ");
Serial.println(doneState);

Serial.print("LID PIN = ");
Serial.println(lidState);

checkFinish();

  delay(200);
}