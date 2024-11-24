// var turf = require("@turf/turf")

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

async function getRoute(routePlanningLocations) {
    const versionNumber = "1";
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
    const first_main_leg = route.legs[0].points
    const coordinates = first_main_leg.map(dict => Object.values(dict));
    var routeLine = turf.lineString(coordinates)
    var buffered = turf.buffer(routeLine, 0.038, { units: "kilometers" });
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

async function getRouteRankings(routes) {
    console.log("Number of Routes: " + routes["routes"].length);
    const currentDate = new Date();
    const currentHour = currentDate.getHours();
    var stats = await getAccidentStats();
    var statAccPerAadt =  stats[0]["avg_acc"] / stats[0]["avg_aadt"];

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

    var routeRankings = [];
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

        if (travelTerm == 1) {
            var trafficText = "This route is currently the fastest at " + X + " seconds. ";
        } else {
            var trafficText = "This route will take " + X + " seconds, " + (X-minTravelTime) + " seconds longer than the fastest route. ";
        }
        if (Y > 0) {
            trafficText += "The route is " + relTraffic.toFixed(2) + "% slower than usual, due to " + Y + " seconds of traffic along " + L + " meters. ";
        }

        var accidents = await getAccidentsOnRoute(routes["routes"][i]);
        var collisionsHr = accidents.filter(collision => {
            var collisionDate = new Date(collision["Date and Time"]);
            var collisionHour = collisionDate.getHours();
            return collisionHour === currentHour;
        });
        var fatalCollisions = accidents.filter(collision => {
            var sev = collision["KABCO Severity"];
            return sev === "(K) Fatal Injury";
        });

        var accidentsSeg = await getAccidentsOnRouteByRouteSegments(routes["routes"][i]);
        var avgAcc = 0;
        var avgAadt = 0;
        for (let i = 0; i < accidentsSeg.length; i++) {
            var seg = accidentsSeg[i];
            avgAcc += Number(seg["total_accidents"]);
            avgAadt += Number(seg["aadt"]);
        }
        avgAcc = avgAcc / accidentsSeg.length;
        avgAadt = avgAadt / accidentsSeg.length;
        var accPerAadt =  avgAcc / avgAadt;
        var collTerm = Math.tanh((statAccPerAadt - accPerAadt) / statAccPerAadt);

        var K = 100 * fatalCollisions.length / accidents.length;
        var fatTerm = Math.tanh((0.7 - K) / 0.7);

        var expHrCol = accidents.length / 24;
        var actHrCol = collisionsHr.length;
        var M = (expHrCol - actHrCol) / expHrCol;
        var moreDanger = M < 0;

        var safetyIndex = (collTerm + fatTerm + M) / 3;

        var safetyText = "The likelihood of a collision occurring on this route is " + (accPerAadt/statAccPerAadt).toFixed(2) + " times the average. ";
        if (collTerm * fatTerm < 0) {
            safetyText += "However, ";
        } else {
            safetyText += "Additionally, ";
        }
        safetyText += "the likelihood of a collision on this route being fatal is " + (K/0.7).toFixed(2) + " times the average. ";
        if (moreDanger) {
            safetyText += "This time of day is more dangerous, being " + (-100 * M).toFixed(2) + "% more prone to crashes."
        } else {
            safetyText += "This time of day is less dangerous, being " + (100 * M).toFixed(2) + "% less prone to crashes."
        }

        console.log("Traffic Index: " + trafficIndex);
        console.log("Safety Index: " + safetyIndex);

        var routeIndex = 0.8*trafficIndex + 0.2*safetyIndex;
        var routeText = trafficText + safetyText;
        console.log("Route Index: " + routeIndex);
        console.log("Route Text: " + routeText);
        routeRankings.push({"index": routeIndex, "text_summary": routeText});        
    }
    return routeRankings;
}

async function getBestRoute(routes, rankings) {
    var maxIndex = -1;
    var loc = -1;

    for (let i = 0; i < rankings.length; i++) {
        if (rankings[i]["index"] > maxIndex) {
            loc = i;
        }
    }

    return {"route": routes["routes"][loc], "index": rankings[loc]["index"], "text_summary": rankings[loc]["text_summary"]}
}

async function getAccidentStats() {
  try {
      const response = await fetch(`http://localhost:3000/collisionsAggAADT`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Stats/:', data);
      return data;
    } catch (error) {
      console.error('Error fetching stats:', error);
  }
}

async function getAccidentsOnRouteByHour(route) {
    const first_main_leg = route.legs[0].points
    const coordinates = first_main_leg.map(dict => Object.values(dict));
    var routeLine = turf.lineString(coordinates)
    var buffered = turf.buffer(routeLine, 0.038, { units: "kilometers" });
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
        console.log('Collisions By Hour:', data);
        return data;
      } catch (error) {
        console.error('Error fetching collisions:', error);
      }
}

async function getAccidentsOnRouteByDayOfWeek(route) {
    const first_main_leg = route.legs[0].points
    const coordinates = first_main_leg.map(dict => Object.values(dict));
    var routeLine = turf.lineString(coordinates)
    var buffered = turf.buffer(routeLine, 0.038, { units: "kilometers" });
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
        console.log('Collisions By Day of Week:', data);
        return data;
      } catch (error) {
        console.error('Error fetching collisions:', error);
      }
}

async function getAccidentsOnRouteByRouteSegments(route) {
    const first_main_leg = route.legs[0].points
    const coordinates = first_main_leg.map(dict => Object.values(dict));
    var routeLine = turf.lineString(coordinates)
    var buffered = turf.buffer(routeLine, 0.038, { units: "kilometers" });
    var geom = JSON.stringify(buffered.geometry)
    try {
        const response = await fetch(`http://localhost:3000/collisionsByRouteSegment`, {
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
        console.log('Collisions By Route Segment By Hour/:', data);
        return data;
      } catch (error) {
        console.error('Error fetching collisions:', error);
      }
}

export {getRoute, getAccidentsOnRoute, getTrafficFlowSegment, getAccidentsOnRouteByHour, getAccidentsOnRouteByRouteSegments, getAccidentsOnRouteByDayOfWeek};





