/*jslint node:true, vars:true, bitwise:true, unparam:true */
/*jshint unused:true */
// Leave the above lines for propper jshinting
//Type Node.js Here :)

var m      = require('mraa');
var lcd    = require('jsupm_i2clcd');                                                                                                         
var awsIot = require('aws-iot-device-sdk');  
var upmled = require('jsupm_grove');
var moment = require('moment');      

// Define paramerters to publish a message                                                                                                     
var device = awsIot.device({
    keyPath: '/home/root/.node_app_slot/certs/privatekey.pem',
    certPath: '/home/root/.node_app_slot/certs/cert.pem',
    caPath: '/home/root/.node_app_slot/certs/rootca.crt',
    clientId: 'edison_pub_client',
    region: 'ap-northeast-1'                                                                                                                   
});    


// Define paramerters for Shadow
var thingShadows = awsIot.thingShadow({
    keyPath: '/home/root/.node_app_slot/certs/privatekey.pem',
    certPath: '/home/root/.node_app_slot/certs/cert.pem',
    caPath: '/home/root/.node_app_slot/certs/rootca.crt',
    clientId: 'edison_shadow_client',
    region: 'ap-northeast-1'
});

// Initialize sensors and devices    
var myLED = new upmled.GroveLed(8);
var analogPin0 = new m.Aio(0);
var myLCD      = new lcd.Jhd1313m1(6, 0x3E, 0x62);
var clearStr   = "                         ";

// Initial state
var topic = 'edison/illuminance';     
var defaultState = {"state":{"desired":{"led":"off"},"reported":{"led": "off"}}};
var thingName = 'edison';
var clientTokenUpdate;

// Publish Illuminance data
device.on('connect', function() {
    console.log('Connected to Message Broker.');
    
    // Loop every 1 sec
    setInterval(function() {
        
        // Retrieve sensor data
        var value = analogPin0.read();
        
        // Display sensed analog data on LCD
        myLCD.setColor(0, 255, 0);
        myLCD.setCursor(0,0);
        myLCD.write(clearStr);
        myLCD.setCursor(0,0);
        myLCD.write("DATA: " + value);        
        
        // Compose records
        var record = {
            "device": "edison",
            "sensor": "illuminance",
            "timestamp": moment().toISOString(),
            "value": value
        };
        // Serialize record to JSON format and publish a message
        var message = JSON.stringify(record);
        console.log("Publish: " + message);
        device.publish(topic, message);
    }, 1000);
});                           


// Connect to shadow
thingShadows
.on('connect', function() {
  console.log('connected to awsiot.');
  thingShadows.register(thingName);
    myLCD.setColor(0, 255, 0);
    myLCD.setCursor(0,0);
    myLCD.write(clearStr);
    myLCD.setCursor(0,0);
    myLCD.write("TURNED OFF");      
    myLED.off();
  setTimeout( function() {
    clientTokenUpdate = thingShadows.update(thingName, defaultState);
  }, 2000);
});

// Get current status after event has triggered
thingShadows
.on('status', function(thingName, stat, clientToken, stateObject) {
  console.log('received ' + stat + ' on ' + thingName + ': ' + JSON.stringify(stateObject));
});

// Get delta (diff between desired and reported) status
thingShadows
.on('delta', function(thingName, stateObject) {
  console.log('received delta '+' on ' + thingName + ': ' + JSON.stringify(stateObject));
    
  // Turun on LED if delta status of LED is "on"
  if(stateObject.state.led == 'on'){
    console.log('======Turn on LED======');
    updatedState = {"state":{"reported":{"led": "on"}}};
    console.log(JSON.stringify(updatedState));
    myLCD.setColor(0, 255, 0);
    myLCD.setCursor(0,0);
    myLCD.write(clearStr);
    myLCD.setCursor(0,0);
    myLCD.write("TURNED ON");        
    myLED.on();
    clientTokenUpdate = thingShadows.update(thingName, updatedState);
    console.log('========================\n\n');
  }
});

    
    