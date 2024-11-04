// necessary for any call
const baseURL = "api.tomtom.com";
const apiKey = "9lTwMNvzhAXnKc8vUUfDRu3zMmLvAj0K";

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
        "52.5160,13.3779:50.8503,4.3517:48.8566,2.3522"; // need >=2 locations. Values: colon-delimited generalizedLocations.
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
    const trafficPoint = "52.41072,4.84239"; //long,lag
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

getTrafficFlowSegment();
getRoute();
