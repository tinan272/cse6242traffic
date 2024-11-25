import {
    getRoute,
    getAccidentsOnRoute,
    getTrafficFlowSegment,
    getAccidentsOnRouteByHour,
    getAccidentsOnRouteByRouteSegments,
    getAccidentsOnRouteByDayOfWeek,
    getRouteRankings,
    getBestRoute,
    convertAddressToCoordinates,
} from "./getRoute.js";

import { clearBarChart, createBarChart } from "./createHourlyBarChart.js";
import { addRoute, showLegend, createMap, drawSegments, resetMap } from "./getMap.js";

async function main(pointA, pointB) {
    try {
        // var pointA = "34.00635229451376,-84.42516328702436"
        // var pointB = "34.0533754844467,-84.45465522830254"
        let routePlanningLocations = `${pointA}:${pointB}`;
        var flowData = await getTrafficFlowSegment();
        const routeData = await getRoute(routePlanningLocations);
        var accidentsBySegments = await getAccidentsOnRouteByRouteSegments(
            routeData["routes"][0]
        );
        const routeRankings = await getRouteRankings(routeData);
        const bestRoute = await getBestRoute(routeData, routeRankings);
        console.log("Best Route: ", bestRoute);
        var div = document.getElementById("recText");
        div.innerHTML = bestRoute.text_summary;

        var accidentsByHour = await getAccidentsOnRouteByHour(
            routeData["routes"][0]
        );
        var accidentsByDOW = await getAccidentsOnRouteByDayOfWeek(
            routeData["routes"][0]
        );
        createBarChart(accidentsByHour);
        addRoute(accidentsBySegments, pointA, pointB);
        drawSegments(accidentsBySegments)
        // for (const segment of accidentsBySegments) {
        //     const geoJsonString = segment["geojson"];
        //     const segment_dict = JSON.parse(geoJsonString);
        //     const coordinateX = segment_dict["coordinates"][0][0];
        //     const coordinateY = segment_dict["coordinates"][0][segment_dict["coordinates"][0].length - 1];
        //     var pointX = `${coordinateX[0]},${coordinateX[1]}`
        //     var pointY = `${coordinateY[0]},${coordinateY[1]}`
        //     console.log(pointY)
        //     ([], pointX, pointY)
        // }
    } catch (error) {
        console.error("Error in main execution:", error);
    }
}

const form = document.getElementById("input");
createMap();
showLegend();

form.addEventListener("submit", async function (event) {
    // Prevent the default form submission behavior
    event.preventDefault();

    resetMap();
    clearBarChart();
    // Capture the form data
    const formData = new FormData(form);

    // Convert form data into an object
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    console.log(data);
    let streetNumA = encodeURIComponent(data["streetNumA"]);
    let streetNameA = encodeURIComponent(data["streetNameA"]);
    let streetNumB = encodeURIComponent(data["streetNumB"]);
    let streetNameB = encodeURIComponent(data["streetNameB"]);

    console.log("getting coordinates....");
    if (streetNumA === undefined) {
        streetNumA = encodeURIComponent("225");
        streetNameA = encodeURIComponent("North Avenue");
    }
    if (streetNumB === undefined) {
        streetNumB = encodeURIComponent("1000");
        streetNameB = encodeURIComponent("Robert E. Lee Blvd");
    }
    const coordinatesA = await convertAddressToCoordinates(streetNumA, streetNameA);
    const coordinatesB = await convertAddressToCoordinates(streetNumB, streetNameB);
    var pointA = coordinatesA["lat"] + "," + coordinatesA["lon"];
    var pointB = coordinatesB["lat"] + "," + coordinatesB["lon"];
    if (pointA === undefined) {
        pointA = "34.00635229451376,-84.42516328702436";
    }
    if (pointB === undefined) {
        pointB = "34.0533754844467,-84.45465522830254";
    }
    console.log(pointA)
    console.log(pointB)
    // Process the data using a function
    main(pointA, pointB);
});

// // Execute the main function
// main();
