"use strict";

const express = require("express");
const bodyParser = require("body-parser");

const restService = express();

restService.use(
  bodyParser.urlencoded({
    extended: true
  })
);

restService.use(bodyParser.json());
var myActualTemp = '0';
var myDesiredTemp = '0';
var myThermostatName = 'no name';
var furnaceStatus = '';

var fs = require('fs');

var accesskey = '';
console.log("accesskey:"+accesskey);

var refresh_token = '';
console.log("refresh_token:"+refresh_token);

var refreshTimer = null;
function refreshTimerStart(){
	refreshTimer = setInterval(function(){refreshKeys()} , 1800000);
}
var apikey = '';
var request = require('request');

//setInterval(function() {
//	 console.log("keeping alive");
//	 request('https://echo-service10.herokuapp.com/echo', function (error, response, body) {
//	  //if (!error && response.statusCode == 200) {
//		 console.log(body);
//	  //}
//	});
//}, 300000); // every 5 minutes (300000)



function refreshKeys(){
	
	  console.log("refreshKeys start");
	  console.log("refresh_token:"+refresh_token);
	  //console.log("apikey:"+apikey);
	  
	  var options = {
			  uri: 'http://73.185.136.87:8081/SampleLDAPWeb/HomeAutomation?action=refreshKeys',
			  method: 'POST',
			  headers: {
			      'Authorization': 'Basic ' + new Buffer(process.env.myID + ':' + process.env.myPW).toString('base64')
			   }
	  };	  
	  
	  function callback(error, response, body) {
		  var info = JSON.parse(body);
		  console.log("body of refreshtoken response:"+body);
		  
		  accesskey = info.access_token;
		  console.log("new accesskey:"+accesskey);
		  
		  refresh_token = info.refresh_token;
		  console.log("new refresh_token:"+refresh_token);
	  }
	  request(options, callback);	  
}

restService.post("/echo", function(req, res) {
	
	console.log("myObject :"+req.body.result.parameters);
	console.log("myObject :"+req.body.result.parameters.myObject);
	var myObject = req.body.result.parameters.myObject;
	var myAction = req.body.result.parameters.myAction;
	var speech =	req.body.result &&
					req.body.result.parameters &&
					req.body.result.parameters.echoText
					? req.body.result.parameters.echoText
							: "Seems like some problem. Speak again please.";
	  console.log("myObject:"+myObject);
	  console.log("myAction:"+myAction);
  if(myObject.toUpperCase() == 'THERMOSTAT' && myAction.toUpperCase() =='STATUS' ){
  
	  
	  apikey = req.body.result.parameters.mykey;
	  //console.log("apikey:"+apikey);

	  console.log("accesskey:"+accesskey);
	  console.log("refresh_token:"+refresh_token);
	  
	  if(refresh_token ==''){
		  //refresh_token = req.body.result.parameters.refreshtoken;
		  //console.log("refresh_token from request:"+refresh_token);
		  refreshKeys();
		  refreshTimerStart();
		  
		  return res.json({
			    speech: "check again",
			    displayText: "check again",
			    source: "webhook-echo-sample"
		  });
	  } else{
	  
		  console.log("calling thermostat with accesskey:"+accesskey);
		  var options = {
				  //url: 'https://api.ecobee.com/1/thermostat?format=json&body={"selection":{"selectionType":"registered","selectionMatch":"","includeEquipmentStatus":true}}',
				  url: 'https://api.ecobee.com/1/thermostat?format=json&body={"selection":{"selectionType":"registered","selectionMatch":"","includeRuntime":true,"includeEquipmentStatus":true}}',
				  headers: {
				    'Content-Type': 'text/json',
				    'Authorization': 'Bearer '+accesskey
				  }
		  };
				 
		  function callback(error, response, body) {
			  
			  if(response.statusCode == 500){
				  console.log("Looks like authentication has expired. trying to get new refresh token and access token.");
	
				  
				  return res.json({
					    speech: "check again",
					    displayText: "check again",
					    source: "webhook-echo-sample"
				  });
				  			  
				  
			  }else if (!error && response.statusCode == 200) {
				  //console.log("body:"+body);
				  
				  var info = JSON.parse(body);
				  
				  console.log("name:"+info.thermostatList[0].name);
				  console.log("actualTemp:"+info.thermostatList[0].runtime.actualTemperature);
				  console.log("desiredTemp:"+info.thermostatList[0].runtime.desiredHeat);
				  console.log(info.thermostatList[0].name);
				  
				  myDesiredTemp = (info.thermostatList[0].runtime.desiredHeat)/10;
				  myActualTemp = (info.thermostatList[0].runtime.actualTemperature)/10;
				  myThermostatName = info.thermostatList[0].name;
				  
				  console.log("equipmentStatus:"+info.thermostatList[0].equipmentStatus);
				  furnaceStatus = info.thermostatList[0].equipmentStatus;
				  var respFurnaceStatus = ''; 
				  if(furnaceStatus == ''){
					  respFurnaceStatus = "The furnace is currently switched Off and not heating.";
				  }else{
					  respFurnaceStatus = "The furnace is currently switched ON and heating.";
				  }
				  //console.log(info.forks_count + " Forks");
				  return res.json({
					    speech: "I checked your thermostat. The current temperature is "+myActualTemp+" degrees faranhite. " +
					    		"	The temperature is set to "+myDesiredTemp+" degrees faranhite." +
					    				respFurnaceStatus,
					    displayText: "I checked your thermostat. The current temperature is "+myActualTemp+" degrees faranhite. " +
			    		"	The temperature is set to "+myDesiredTemp+" degrees faranhite." +
	    				respFurnaceStatus,
					    source: "webhook-echo-sample"
				  });
			  }
			  
			  
		  }
				 
		  request(options, callback);	  
		  
	//	  return res.json({
	//		    speech: "I checked your thermostat. The current temperature is "+myActualTemp+" degrees faranhite. The temperature is set to "+myActualTemp+" degrees faranhite.",
	//		    displayText: "checked my thermostat",
	//		    source: "webhook-echo-sample"
	//	  });
	  }
	  
  }else if(speech == 'switch my light'){
	  
	  const http = require('http');
	  console.log("using id:"+process.env.myID);
	  var options = {
			   host: '73.185.136.87',
			   port: 8081,
			   path: '/SampleLDAPWeb/HomeAutomation?action=UpdateOffice',
			   // authentication headers
			   headers: {
			      'Authorization': 'Basic ' + new Buffer(process.env.myID + ':' + process.env.myPW).toString('base64')
			   }   
			};
			//this is the call
//			request = http.get(options, function(res){
//			   var body = "";
//			   res.on('data', function(data) {
//			      body += data;
//			   });
//			   res.on('end', function() {
//			    //here we have the full response, html or json object
//			      console.log(body);
//			   })
//			   res.on('error', function(e) {
//			      onsole.log("Got error: " + e.message);
//			   });
//			});
			
	  
	  
	  
	  
	  
	  //*****************************Working NON BASIC AUTH CODE START ************************

	  http.get(options, (resp) => {
	    let data = '';

	    // A chunk of data has been recieved.
	    resp.on('data', (chunk) => {
	      data += chunk;
	    });

	    // The whole response has been received. Print out the result.
	    resp.on('end', () => {
	      //console.log("end:"+JSON.parse(data));
	      //var  
	      console.log("received from server:"+data);
	      var jsonData= JSON.parse(data);
	      console.log("received from server displayText:"+jsonData.displayText);
	      return res.json({
			    speech: jsonData.speech,
			    displayText: jsonData.displayText,
			    source: "webhook-echo-sample"
		  });
//	      
	    });
	    

	  }).on("error", (err) => {
	    console.log("Error: " + err.message);
	  });
	  
	  //*****************************Working NON BASIC AUTH CODE END ************************
	  
	  
  }else if(speech == 'switch on my porch light' || speech == 'switch off my porch light'){
	  
	  const http = require('http');
	  console.log("using id:"+process.env.myID);
	  var path='';
	  if(speech == 'switch on my porch light'){
		  path= '/SampleLDAPWeb/HomeAutomation?action=PorchON';
	  }else{
		  path= '/SampleLDAPWeb/HomeAutomation?action=PorchOFF';
	  }
	  var options = {
			   host: '73.185.136.87',
			   port: 8081,
			   path: path,
			   // authentication headers
			   headers: {
			      'Authorization': 'Basic ' + new Buffer(process.env.myID + ':' + process.env.myPW).toString('base64')
			   }   
			};
			//this is the call
//			request = http.get(options, function(res){
//			   var body = "";
//			   res.on('data', function(data) {
//			      body += data;
//			   });
//			   res.on('end', function() {
//			    //here we have the full response, html or json object
//			      console.log(body);
//			   })
//			   res.on('error', function(e) {
//			      onsole.log("Got error: " + e.message);
//			   });
//			});
			
	  
	  
	  
	  
	  
	  //*****************************Working NON BASIC AUTH CODE START ************************

	  http.get(options, (resp) => {
	    let data = '';

	    // A chunk of data has been recieved.
	    resp.on('data', (chunk) => {
	      data += chunk;
	    });

	    // The whole response has been received. Print out the result.
	    resp.on('end', () => {
	      //console.log("end:"+JSON.parse(data));
	      //var  
	      console.log("received from server:"+data);
	      var jsonData= JSON.parse(data);
	      console.log("received from server displayText:"+jsonData.displayText);
	      return res.json({
			    speech: jsonData.speech,
			    displayText: jsonData.displayText,
			    source: "webhook-echo-sample"
		  });
//	      
	    });
	    

	  }).on("error", (err) => {
	    console.log("Error: " + err.message);
	  });
	  
	  //*****************************Working NON BASIC AUTH CODE END ************************
	  
	  
  }else{
	  return res.json({
	    speech: speech,
	    displayText: speech,
	    source: "webhook-echo-sample"
	  });
  }
});

restService.post("/audio", function(req, res) {
  var speech = "";
  switch (req.body.result.parameters.AudioSample.toLowerCase()) {
    //Speech Synthesis Markup Language 
    case "music one":
      speech =
        '<speak><audio src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
      break;
    case "music two":
      speech =
        '<speak><audio clipBegin="1s" clipEnd="3s" src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
      break;
    case "music three":
      speech =
        '<speak><audio repeatCount="2" soundLevel="-15db" src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
      break;
    case "music four":
      speech =
        '<speak><audio speed="200%" src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio></speak>';
      break;
    case "music five":
      speech =
        '<audio src="https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg">did not get your audio file</audio>';
      break;
    case "delay":
      speech =
        '<speak>Let me take a break for 3 seconds. <break time="3s"/> I am back again.</speak>';
      break;
    //https://www.w3.org/TR/speech-synthesis/#S3.2.3
    case "cardinal":
      speech = '<speak><say-as interpret-as="cardinal">12345</say-as></speak>';
      break;
    case "ordinal":
      speech =
        '<speak>I stood <say-as interpret-as="ordinal">10</say-as> in the class exams.</speak>';
      break;
    case "characters":
      speech =
        '<speak>Hello is spelled as <say-as interpret-as="characters">Hello</say-as></speak>';
      break;
    case "fraction":
      speech =
        '<speak>Rather than saying 24+3/4, I should say <say-as interpret-as="fraction">24+3/4</say-as></speak>';
      break;
    case "bleep":
      speech =
        '<speak>I do not want to say <say-as interpret-as="bleep">F&%$#</say-as> word</speak>';
      break;
    case "unit":
      speech =
        '<speak>This road is <say-as interpret-as="unit">50 foot</say-as> wide</speak>';
      break;
    case "verbatim":
      speech =
        '<speak>You spell HELLO as <say-as interpret-as="verbatim">hello</say-as></speak>';
      break;
    case "date one":
      speech =
        '<speak>Today is <say-as interpret-as="date" format="yyyymmdd" detail="1">2017-12-16</say-as></speak>';
      break;
    case "date two":
      speech =
        '<speak>Today is <say-as interpret-as="date" format="dm" detail="1">16-12</say-as></speak>';
      break;
    case "date three":
      speech =
        '<speak>Today is <say-as interpret-as="date" format="dmy" detail="1">16-12-2017</say-as></speak>';
      break;
    case "time":
      speech =
        '<speak>It is <say-as interpret-as="time" format="hms12">2:30pm</say-as> now</speak>';
      break;
    case "telephone one":
      speech =
        '<speak><say-as interpret-as="telephone" format="91">09012345678</say-as> </speak>';
      break;
    case "telephone two":
      speech =
        '<speak><say-as interpret-as="telephone" format="1">(781) 771-7777</say-as> </speak>';
      break;
    // https://www.w3.org/TR/2005/NOTE-ssml-sayas-20050526/#S3.3
    case "alternate":
      speech =
        '<speak>IPL stands for <sub alias="indian premier league">IPL</sub></speak>';
      break;
  }
  return res.json({
    speech: speech,
    displayText: speech,
    source: "webhook-echo-sample"
  });
});

restService.post("/video", function(req, res) {
  return res.json({
    speech:
      '<speak>  <audio src="https://www.youtube.com/watch?v=VX7SSnvpj-8">did not get your MP3 audio file</audio></speak>',
    displayText:
      '<speak>  <audio src="https://www.youtube.com/watch?v=VX7SSnvpj-8">did not get your MP3 audio file</audio></speak>',
    source: "webhook-echo-sample"
  });
});

restService.post("/slack-test", function(req, res) {
  var slack_message = {
    text: "Details of JIRA board for Browse and Commerce",
    attachments: [
      {
        title: "JIRA Board",
        title_link: "http://www.google.com",
        color: "#36a64f",

        fields: [
          {
            title: "Epic Count",
            value: "50",
            short: "false"
          },
          {
            title: "Story Count",
            value: "40",
            short: "false"
          }
        ],

        thumb_url:
          "https://stiltsoft.com/blog/wp-content/uploads/2016/01/5.jira_.png"
      },
      {
        title: "Story status count",
        title_link: "http://www.google.com",
        color: "#f49e42",

        fields: [
          {
            title: "Not started",
            value: "50",
            short: "false"
          },
          {
            title: "Development",
            value: "40",
            short: "false"
          },
          {
            title: "Development",
            value: "40",
            short: "false"
          },
          {
            title: "Development",
            value: "40",
            short: "false"
          }
        ]
      }
    ]
  };
  return res.json({
    speech: "speech",
    displayText: "speech",
    source: "webhook-echo-sample",
    data: {
      slack: slack_message
    }
  });
});

restService.listen(process.env.PORT || 8000, function() {
  console.log("Server up and listening");
});
