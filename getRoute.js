var turf = require("@turf/turf")

// necessary for any call
const baseURL = "api.tomtom.com";
const apiKey = "1oagwNbn8O0EP4H2ERrtOL4McRxQtAWi";

async function fetchAPI(url) {
    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(
                `HTTP error! status: ${response.status} ${response.statusText}`
            );
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch data:", error.message);
        throw error;
    }
}

async function getRoute() {
    const versionNumber = "1";
    const routePlanningLocations =
        "34.00635229451376,-84.42516328702436:34.0533754844467,-84.45465522830254"; // need >=2 locations. Values: colon-delimited generalizedLocations.
    const contentType = "json";
    const alternativeRoutes = 3;
    const alternativeType = "betterRoute";
    const minDeviationDistance = 100; //meters
    const minDeviationTime = 60; //seconds
    const vehicleMaxSpeed = 120; //km/h
    const vehicleLength = 5; //meters
    const travelMode = "car";
    const url = `https://${baseURL}/routing/${versionNumber}/calculateRoute/${routePlanningLocations}/json?key=${apiKey}`;
    try {
        const data = await fetchAPI(url);
        if (data.routes && data.routes.length > 0) {
            console.log("------RETRIEVE ROUTES------");
            console.log("Main Route Summary:", data.routes[0].summary);
            const mainRoute = data.routes[0];
            console.log(mainRoute)
            console.log(
                "Total Distance (meters):",
                mainRoute.summary.lengthInMeters
            );
            console.log(
                "Travel Time (seconds):",
                mainRoute.summary.travelTimeInSeconds
            );
            return data;
        } else {
            console.log("No route data found in response.");
            return null;
        }
    } catch (error) {
        console.error("Failed to get route:", error.message);
        throw error;
    }
}

// real time observed speeds and travel times for all key roads in a network.
async function getTrafficFlowSegment() {
    const versionNumber = "4";
    const trafficStyle = "absolute"; // "absolute" = given absolute speed values, "relative"=free-flow speed, "reduced-sensitivity" = reduces effect of minor changes in flow
    const trafficZoom = "10"; // 0..22
    const trafficFormat = "json";
    const trafficPoint = "33.74793040982444,-84.38614391867895"; //long,lag
    const trafficUnit = "MPH"; //or kmph
    const url = `https://${baseURL}/traffic/services/${versionNumber}/flowSegmentData/${trafficStyle}/${trafficZoom}/${trafficFormat}?key=${apiKey}&point=${trafficPoint}`;
    try {
        const data = await fetchAPI(url);
        if (data && data.flowSegmentData) {
            console.log("------TRAFFIC FLOW DATA------");
            console.log("Traffic Flow Data:", data.flowSegmentData);
            console.log("Current Speed:", data.flowSegmentData.currentSpeed);
            console.log("Free Flow Speed:", data.flowSegmentData.freeFlowSpeed);
            console.log(
                "Current Travel Time:",
                data.flowSegmentData.currentTravelTime
            );
            console.log(
                "Free Flow Travel Time:",
                data.flowSegmentData.freeFlowTravelTime
            );
            return data;
        } else {
            console.log("No traffic flow data found in response.");
            return null;
        }
    } catch (error) {
        console.error("Failed to get traffic flow data:", error.message);
        throw error;
    }
}

// Returns Accidents 
async function getAccidentsOnRoute(route) {
    const data = route.routes
    const main = data[0]
    const first_main_leg = main.legs[0].points
    console.log(first_main_leg)
    const coordinates = first_main_leg.map(dict => Object.values(dict));
    var routeLine = turf.lineString(coordinates)
    var buffered = turf.buffer(routeLine, 0.038, { units: "kilometers" });
    console.log(buffered)
    var geom = JSON.stringify(buffered.geometry)
    try {
        const response = await fetch(`http://localhost:3000/collisions`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: geom
        });
    
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const data = await response.json();
        console.log('Collisions:', data);
        return data;
      } catch (error) {
        console.error('Error fetching collisions:', error);
      }
}

async function routeSelection(routes, accidents, accidentsHourly) {
    console.log(routes["routes"][0]["summary"]);
    const currentDate = new Date();
    const currentHour = currentDate.getHours();

    var minTravelTime;
    for (let i = 0; i < routes["routes"].length; i++) {
        if (i == 0) {
           minTravelTime = routes["routes"][i]["summary"]["travelTimeInSeconds"];
        } else {
            if (minTravelTime > routes["routes"][i]["summary"]["travelTimeInSeconds"]) {
                minTravelTime = routes["routes"][i]["summary"]["travelTimeInSeconds"];
            }
        }
    }

    for (let i = 0; i < routes["routes"].length; i++) {
        var X = routes["routes"][i]["summary"]["travelTimeInSeconds"];
        var Y = routes["routes"][i]["summary"]["trafficDelayInSeconds"];
        var L = routes["routes"][i]["summary"]["trafficLengthInMeters"];
        var R = routes["routes"][i]["summary"]["lengthInMeters"];

        var travelTerm = minTravelTime / X;
        var relTraffic = Y / (X - Y);
        var beta = 1 + (L / R);
        var trafficTerm = 1 + Math.log10(1-(beta * relTraffic));
        var trafficIndex = (travelTerm + trafficTerm) / 2;

        console.log(trafficIndex)

    }
    
    var timelyCollisions = accidents.filter(collision => {
        var collisionDate = new Date(collision["Date and Time"]);
        var collisionHour = collisionDate.getHours();
        return collisionHour === currentHour;
    });
    var fatalCollisions = accidents.filter(collision => {
        var sev = collision["KABCO Severity"];
        return sev === "(K) Fatal Injury";
    });
    var K = 100* fatalCollisions.length / accidents.length;
    var expHrCol = accidents.length / 24;
    var actHrCol = timelyCollisions.length;
    var M = (100 * (actHrCol - expHrCol) / expHrCol).toFixed(2);
    var moreDanger = M > 0;
    
    console.log("K: "+K);
    console.log("M: "+M);
    console.log(moreDanger);
}

async function getAccidentsOnRouteByHour(route) {
    const data = route.routes
    const main = data[0]
    const first_main_leg = main.legs[0].points
    console.log(first_main_leg)
    const coordinates = first_main_leg.map(dict => Object.values(dict));
    var routeLine = turf.lineString(coordinates)
    var buffered = turf.buffer(routeLine, 0.038, { units: "kilometers" });
    console.log(buffered)
    var geom = JSON.stringify(buffered.geometry)
    try {
        const response = await fetch(`http://localhost:3000/collisionsByHour`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: geom
        });
    
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const data = await response.json();
        console.log('Collisions By Hour/:', data);
        return data;
      } catch (error) {
        console.error('Error fetching collisions:', error);
      }
}

async function getAccidentsOnRouteByDayOfWeek(route) {
    const data = route.routes
    const main = data[0]
    const first_main_leg = main.legs[0].points
    console.log(first_main_leg)
    const coordinates = first_main_leg.map(dict => Object.values(dict));
    var routeLine = turf.lineString(coordinates)
    var buffered = turf.buffer(routeLine, 0.038, { units: "kilometers" });
    console.log(buffered)
    var geom = JSON.stringify(buffered.geometry)
    try {
        const response = await fetch(`http://localhost:3000/collisionsByDayOfWeek`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: geom
        });
    
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        const data = await response.json();
        console.log('Collisions By Day of Week/:', data);
        return data;
      } catch (error) {
        console.error('Error fetching collisions:', error);
      }
}


async function main() {
    try {
        var flowData = await getTrafficFlowSegment();
        const routeData = await getRoute();
        const accidentData = await getAccidentsOnRoute(routeData);
        var accidentsByHour = await getAccidentsOnRouteByHour(routeData);
        var accidentsByDOW = await getAccidentsOnRouteByDayOfWeek(routeData);
        await routeSelection(routeData, accidentData, accidentsByHour);
    } catch (error) {
        console.error("Error in main execution:", error);
    }
}

// Execute the main function
main();


