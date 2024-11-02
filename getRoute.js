const baseURL = "api.tomtom.com";
const versionNumber = "1";
const apiKey = "";

// need >=2 locations. Values: colon-delimited generalizedLocations.
// A location or a circle.
const routePlanningLocations = "52.5160,13.3779:50.8503,4.3517:48.8566,2.3522";

const contentType = "json";
const alternativeRoutes = 3;
const alternativeType = "betterRoute";
const minDeviationDistance = 100; //meters
const minDeviationTime = 60; //seconds
const vehicleMaxSpeed = 120; //km/h
const vehicleLength = 5; //meters
const travelMode = "car";

//https://{baseURL}/routing/{versionNumber}/calculateRoute/{routePlanningLocations}/{contentType}?key={Your_API_Key}
async function getRoute() {
    const url = `https://${baseURL}/routing/${versionNumber}/calculateRoute/${routePlanningLocations}/json?key=${apiKey}`;
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
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
            console.log("Route found!");
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

getRoute();
