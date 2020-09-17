// helloworld_webos_service.js
// is simple service, based on low-level luna-bus API

var pkgInfo = require('./package.json');
var Service = require('webos-service');
var pmloglib = require('pmloglib'); // For use pmlog, pmlog is wirted /var/log/messages

var service = new Service(pkgInfo.name); // Create service by service name on package.json
var context = new pmloglib.Context("helloService"); // Create context of pmlog
var greeting = "Hello, World!";

// a method that always returns the same value
service.register("hello", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "/hello");
    console.log("In hello callback");
    var name = message.payload.name ? message.payload.name : "World"

    message.respond({
        returnValue: true,
        Response: "Hello, " + name + "!"
    });
});

// set some state in the service
service.register("config/setGreeting", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "/config/setGreeting");
    console.log("In setGreeting callback");
    if (message.payload.greeting) {
        greeting = message.payload.greeting;
    } else {
        message.respond({
            returnValue: false,
            errorText: "argument 'greeting' is required",
            errorCode: 1
        });
    }
    message.respond({
        returnValue: true,
        greeting: greeting
    });
});

// call another service
service.register("locale", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "/locale");
    console.log("locale callback");
    service.call("luna://com.webos.service.settingsservice/getSystemSettings", {"key":"localeInfo"}, function(m2) {
        context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "com.webos.service.settingsservice/getSystemSettings");
        var response = "You appear to have your locale set to: " + m2.payload.settings.localeInfo.locales.UI;
        console.log(response);
        message.respond({message: response});
    });
});

// handle subscription requests
var interval;
var subscriptions = {};
var x = 1;
function createInterval() {
    if (interval) {
        return;
    }
    context.log(pmloglib.LOG_INFO, "create_interval",{}, "create interval");
    console.log("create new interval");
    interval = setInterval(function() {
        sendResponses();
    }, 1000);
}

// send responses to each subscribed client
function sendResponses() {
    context.log(pmloglib.LOG_INFO, "send_response",{}, "send_response");
    console.log("Sending responses, subscription count=" + Object.keys(subscriptions).length);
    for (var i in subscriptions) {
        if (subscriptions.hasOwnProperty(i)) {
            var s = subscriptions[i];
            s.respond({
                returnValue: true,
                event: "beat " + x
            });
        }
    }
    x++;
}

// listen for requests, and handle subscriptions via implicit event handlers in call
// to register
service.register("heartbeat", function(message) {
    var uniqueToken = message.uniqueToken;
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, ""+ pkgInfo.name + "/heartbeat");
    console.log("heartbeat callback, uniqueToken: " + uniqueToken + ", token: " + message.token);
    message.respond({event: "beat"});
    if (message.isSubscription) {
        subscriptions[uniqueToken] = message;
        if (!interval) {
            createInterval();
        }
    }
},
function(message) {
    var uniqueToken = message.uniqueToken;
    console.log("Canceled " + uniqueToken);
    delete subscriptions[uniqueToken];
    var keys = Object.keys(subscriptions);
    if (keys.length === 0) {
        console.log("no more subscriptions, canceling interval");
        clearInterval(interval);
        interval = undefined;
    }
});

// EventEmitter-based API for subscriptions
// note that the previous examples are actually using this API as well, they're
// just setting a "request" handler implicitly
var heartbeat2 = service.register("heartbeat2");
heartbeat2.on("request", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "/heartbeat2/request");
    console.log("heartbeat callback");
    message.respond({event: "beat"});
    if (message.isSubscription) {
        subscriptions[message.uniqueToken] = message;
        if (!interval) {
            createInterval();
        }
    }
});
heartbeat2.on("cancel", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "/heartbeat2/cancel");
    console.log("Canceled " + message.uniqueToken);
    delete subscriptions[message.uniqueToken];
    var keys = Object.keys(subscriptions);
    if (keys.length === 0) {
        console.log("no more subscriptions, canceling interval");
        clearInterval(interval);
        interval = undefined;
    }
});

service.register("ping", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "/ping");
    console.log("Ping! setting up activity");
    var methodName = "luna://" + pkgInfo.name + "/pong";
    var activitySpec = {
        "activity": {
            "name": "My Activity", //this needs to be unique, per service
            "description": "do something", //required
            "background": true,    // can use foreground or background, or set individual properties (see Activity Specification below, for details)
            "persist": true,       // this activity will be persistent across reboots
            "explicit": true,      // this activity *must* be completed or cancelled explicitly, or it will be re-launched until it does
            "callback": {          // what service to call when this activity starts
                "method": methodName, // URI to service
                "params": {        // parameters/arguments to pass to service
                }
            }
        },
        "start": true,             // start the activity immediately when its requirements (if any) are met
        "replace": true,           // if an activity with the same name already exists, replace it
        "subscribe": false         // if "subscribe" is false, the activity needs to be adopted immediately, or it gets canceled
    };
    service.call("luna://com.webos.service.activitymanager/create", activitySpec, function(reply) {
        context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "com.webos.service.activitymanager/create");
        var activityId = reply.payload.activityId;
        console.log("ActivityId = " + activityId);
        message.respond({msg: "Created activity "+ activityId});
    });
});

service.register("pong", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "/pong");
    console.log("Pong!");
    console.log(message.payload);
    message.respond({message: "Pong"});
});

service.register("/do/re/me", function(message) {
    context.log(pmloglib.LOG_INFO, "SERVICE_METHOD_CALLED",{}, "" + pkgInfo.name + "//do/re/me");
    message.respond({verses:[
        {doe: "a deer, a female deer"},
        {ray: "a drop of golden sun"},
        {me: "a name I call myself"}
    ]});
});
