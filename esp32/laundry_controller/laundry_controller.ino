#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "Maepha_2.4G";
const char* password = "0933871156";

const char* serverUrl =
  "https://laundry-system-one.vercel.app";

const int powerPin = 5;
const int jogA = 18;
const int jogB = 19;
const int tempPin = 21;
const int revPin = 22;
const int startPin = 23;
const int machineDonePin = 4;
const int lidPin = 15; // เซ็นเซอร์ฝา
bool machineRunning = false;
bool machinePaused = false;
unsigned long washEndTime = 0;
unsigned long lastPoll = 0;
unsigned long lastDoneTrigger = 0;
unsigned long remainingTime = 0;
void pulsePin(int pin, int ms = 300) {
  digitalWrite(pin, HIGH);
  delay(ms);
  digitalWrite(pin, LOW);
}void jogSequence(int count) {
  for (int i = 0; i < count; i++) {
    pulsePin(jogA, 150);
    delay(120);

    pulsePin(jogB, 150);
    delay(180);
  }
}void pulseMultiple(
  int pin,
  int count
) {
  for (int i = 0; i < count; i++) {
    pulsePin(pin, 200);
    delay(250);
  }
}void runWashSequence(
  int jogCount,
  int tempCount,
  int revCount
) {
  Serial.println("POWER");
  pulsePin(powerPin, 400);

  delay(500);

  Serial.println("JOG");
  jogSequence(jogCount);

  delay(300);

  Serial.println("TEMP");
  pulseMultiple(tempPin, tempCount);

  delay(300);

  Serial.println("REV");
  pulseMultiple(revPin, revCount);

  delay(300);

  Serial.println("START");
  pulsePin(startPin, 400);
}void runProgramByPrice(int price) {
  switch (price) {
    case 20:
      runWashSequence(1, 0, 0);
      startMachine(1800);
      break;

    case 30:
      runWashSequence(2, 1, 0);
      startMachine(2220);
      break;

    case 40:
      runWashSequence(3, 1, 1);
      startMachine(5400);
      break;
  }
}
// ----------------------


// ----------------------
void startMachine(int duration) {
  Serial.println("START MACHINE");

  machineRunning = true;
  washEndTime =
    millis() + (duration * 1000);
}

// ----------------------
void clearCommand() {
  HTTPClient http;

  String url = String(serverUrl) + "/api/machine-command";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"machineId\":1,\"command\":\"none\"}";

  http.POST(body);
  http.end();
}

// ----------------------
void notifyMachineDone() {
  HTTPClient http;

  String url = String(serverUrl) + "/api/machine-done";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"machineId\":1}";

  http.POST(body);
  http.end();
}


// 🔥 แจ้ง power
void notifyPower() {
  HTTPClient http;
  http.begin(String(serverUrl) + "/api/machine-power");
  http.addHeader("Content-Type", "application/json");
  http.POST("{\"machineId\":1}");
  http.end();
}
void notifyStarted(int duration) {
  HTTPClient http;

  String url = String(serverUrl) + "/api/machine-started";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body = String("{\"machineId\":1,\"duration\":") + duration + "}";

  http.POST(body);
  http.end();
}
void notifyPaused() {
  HTTPClient http;

  String url = String(serverUrl) + "/api/machine-paused";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  http.POST("{\"machineId\":1}");

  http.end();
}
void notifyResume() {
  HTTPClient http;

  String url = String(serverUrl) + "/api/machine-resume";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  http.POST("{\"machineId\":1}");

  http.end();
}
// ----------------------
void checkCommand() {
  HTTPClient http;

  String url =
    String(serverUrl) +
    "/api/machine-command?id=1";

  http.begin(url);

  int code = http.GET();

  Serial.print("POLL CODE = ");
  Serial.println(code);

  if (code == 200) {
    String payload = http.getString();
  Serial.println(payload);

 if (payload.indexOf("\"command\":\"power\"") >= 0) {
  Serial.println("POWER");
 pulsePin(powerPin, 800);

notifyPower();   // 🔥 ตัวนี้แหละที่ขาด

clearCommand();
}

else if (payload.indexOf("\"command\":\"start\"") >= 0) {
  Serial.println("START");

  int price = 20;

  if (payload.indexOf("\"program\":30") >= 0) price = 30;
  if (payload.indexOf("\"program\":40") >= 0) price = 40;

  runProgramByPrice(price);

  int duration = 1800;
  if (price == 30) duration = 2220;
  if (price == 40) duration = 5400;

  notifyStarted(duration);  // 🔥 ต้องมี

  machineRunning = true;
  machinePaused = false;

  clearCommand();
}

else if (payload.indexOf("\"command\":\"pause\"") >= 0) {
  Serial.println("PAUSE");

  pulsePin(startPin, 800);

  machineRunning = false;
  machinePaused = true;

  notifyPaused();   // ✅ เพิ่มบรรทัดนี้

  clearCommand();
}

else if (payload.indexOf("\"command\":\"resume\"") >= 0) {
  Serial.println("RESUME");

  pulsePin(startPin, 800);

  machineRunning = true;
  machinePaused = false;

  notifyResume();   // ✅ เพิ่ม

  clearCommand();
}

else if (payload.indexOf("\"command\":\"resume\"") >= 0) {
  pulsePin(startPin, 800);

  machineRunning = true;
  machinePaused = false;

  clearCommand();
}
  }

  http.end(); // ✅ ปิดตรงนี้ (นอก if)
}

// ----------------------
void checkFinish() {
  if (machineRunning && millis() >= washEndTime) {
    Serial.println("WASH DONE");

    machineRunning = false;
    remainingTime = 0;

    notifyMachineDone();
  }
}
bool lastLidState = true;

void sendLidStatus(bool closed) {
  HTTPClient http;

  String url = String(serverUrl) + "/api/lid-status";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body = String("{\"machineId\":1,\"closed\":") + (closed ? "true" : "false") + "}";

  http.POST(body);
  http.end();
}
// ----------------------
void setup() {
  Serial.begin(115200);

pinMode(powerPin, OUTPUT);
pinMode(jogA, OUTPUT);
pinMode(jogB, OUTPUT);
pinMode(tempPin, OUTPUT);
pinMode(revPin, OUTPUT);
pinMode(startPin, OUTPUT);

digitalWrite(powerPin, LOW);
digitalWrite(jogA, LOW);
digitalWrite(jogB, LOW);
digitalWrite(tempPin, LOW);
digitalWrite(revPin, LOW);
digitalWrite(startPin, LOW);

  pinMode(machineDonePin, INPUT_PULLUP);
   pinMode(lidPin, INPUT_PULLUP);
  WiFi.begin(ssid, password);

  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.println(WiFi.localIP());
}

// ----------------------
void loop() {
  if (millis() - lastPoll > 1000) {
    lastPoll = millis();
    checkCommand();
  }

  checkFinish();
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

// ตรวจเครื่องซักเสร็จ
if (
    doneState == LOW &&
    millis() - lastDoneTrigger > 3000
) {
  Serial.println("PIN DONE");

  machineRunning = false;

  notifyMachineDone();

  lastDoneTrigger = millis();
}

  delay(200);
}