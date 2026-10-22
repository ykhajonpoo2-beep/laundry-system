#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "NAVANARA_2.4G";
const char* password = "yuthapong0856771876";

const char* serverUrl =
  "https://laundry-system-one.vercel.app";

#define MACHINE_ID 1

const int powerPin = 4;
const int jogA = 5;
const int jogB = 6;
const int tempPin = 7;
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
void pulsePin(int pin, int ms = 300) {
  digitalWrite(pin, HIGH);
  delay(ms);
  digitalWrite(pin, LOW);
}void jogSequence(int count) {

  for (int i = 0; i < count; i++) {

    // A จากก่อน
    digitalWrite(jogB, HIGH);

    delay(100);

    // B จากตาม ขณะ A ยังจากอยู่
    digitalWrite(jogA, HIGH);

    delay(100);

    // B กลับก่อน
    digitalWrite(jogB, LOW);

    delay(100);

    // A กลับทีหลัง
    digitalWrite(jogA, LOW);

    delay(100);
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
  int tempCount,
  int revCount
) {
  Serial.println("POWER");
  pulsePin(powerPin, 250);

  delay(2000);

  Serial.println("JOG");
  jogSequence(jogCount);

  delay(1000);

  Serial.println("TEMP");
  pulseMultiple(tempPin, tempCount);

  delay(1000);

  Serial.println("REV");
  pulseMultiple(revPin, revCount);

  delay(1000);

  Serial.println("START");
  pulsePin(startPin, 250);
}void runProgramByPrice(int price) {
  switch (price) {
    case 20:
      runWashSequence(4, 0, 0);
      startMachine(1800);
      break;

    case 30:
      runWashSequence(12, 0, 0);
      startMachine(2220);
      break;

    case 40:
      runWashSequence(7, 0, 0);
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
  http.setTimeout(5000);
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
  http.setTimeout(5000);
  String url = String(serverUrl) + "/api/machine-done";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body =
  "{\"machineId\":" +
  String(MACHINE_ID) +
  "}";

  int code = http.POST(body);

Serial.print("DONE HTTP=");
Serial.println(code);
  http.end();
}


// 🔥 แจ้ง power
void notifyPower() {
  HTTPClient http;
  http.setTimeout(5000);
  http.begin(String(serverUrl) + "/api/machine-power");
  http.addHeader("Content-Type", "application/json");
  String body =
  "{\"machineId\":" +
  String(MACHINE_ID) +
  "}";

http.POST(body);
  http.end();
}
void notifyStarted(int duration) {
  HTTPClient http;
  http.setTimeout(5000);
  String url = String(serverUrl) + "/api/machine-started";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body = String("{\"machineId\":1,\"duration\":") + duration + "}";

  http.POST(body);
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
  HTTPClient http;
  http.setTimeout(5000);
  String url =
    String(serverUrl) +
    "/api/machine-command?id=" +
String(MACHINE_ID);

  http.begin(url);

  int code = http.GET();
Serial.print("POLL CODE = ");
Serial.println(code);

if (code >= 300 && code < 400) {
  Serial.print("REDIRECT TO: ");
  Serial.println(http.getLocation());
}
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

else if (
 payload.indexOf("\"command\":\"start\"") >= 0
 && !machineRunning
)
{
    Serial.println("START");

    int duration = 1800;

    if (payload.indexOf("\"program\":1") >= 0)
    {
        runProgramByPrice(20);
        duration = 1800;
    }

    else if (payload.indexOf("\"program\":2") >= 0)
    {
        runProgramByPrice(30);
        duration = 2220;
    }

    else if (payload.indexOf("\"program\":3") >= 0)
    {
        runProgramByPrice(40);
        duration = 5400;
    }

    notifyStarted(duration);

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
  http.setTimeout(5000);
  String url = String(serverUrl) + "/api/lid-status";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body = String("{\"machineId\":1,\"closed\":") + (closed ? "true" : "false") + "}";

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
pinMode(revPin, OUTPUT);
pinMode(startPin, OUTPUT);

digitalWrite(powerPin, LOW);
digitalWrite(jogA, LOW);
digitalWrite(jogB, LOW);
digitalWrite(tempPin, LOW);
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
  if (millis() - lastPoll > 1000) {
    lastPoll = millis();
    checkCommand();
  }
if (millis() - lastAlive > 60000) {

  Serial.println("ALIVE");

  lastAlive = millis();
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

// ตรวจเครื่องซักเสร็จ (LDR)
static unsigned long doneHighStart = 0;

if (doneState == HIGH)
{
    if (doneHighStart == 0)
        doneHighStart = millis();

    if (
        millis() - doneHighStart > 3000 &&
        lastDoneState == LOW
    )
    {
        Serial.println("PIN DONE");

        machineRunning = false;
        machinePaused = false;

        notifyMachineDone();
    }
}
else
{
    doneHighStart = 0;
}

lastDoneState = doneState;

  delay(200);
}