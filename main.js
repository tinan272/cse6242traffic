import { getRoute, getAccidentsOnRoute, getTrafficFlowSegment, getAccidentsOnRouteByHour,
    getAccidentsOnRouteByRouteSegments, getAccidentsOnRouteByDayOfWeek, getRouteRankings, getBestRoute } from "./getRoute.js";
import { createBarChart } from "./createHourlyBarChart.js";

async function main(pointA, pointB) {
    try {
        // var pointA = "34.00635229451376,-84.42516328702436"
        // var pointB = "34.0533754844467,-84.45465522830254"
        let routePlanningLocations = `${pointA}:${pointB}`
        var flowData = await getTrafficFlowSegment();
        const routeData = await getRoute(routePlanningLocations);
        const routeRankings = await getRouteRankings(routeData);
        const bestRoute = await getBestRoute(routeData, routeRankings);
        console.log("Best Route: ", bestRoute);
        var div = document.getElementById('recText');
        div.innerHTML = bestRoute.text_summary;
        
        var accidentsByHour = await getAccidentsOnRouteByHour(routeData["routes"][0]);
        var accidentsByDOW = await getAccidentsOnRouteByDayOfWeek(routeData["routes"][0]);
        var accidentsBySegments = await getAccidentsOnRouteByRouteSegments(routeData["routes"][0]);
        createBarChart(accidentsByHour);
    } catch (error) {
        console.error("Error in main execution:", error);
    }
}

const form = document.getElementById('input');

form.addEventListener('submit', function(event) {
    // Prevent the default form submission behavior
    event.preventDefault();
  
    // Capture the form data
    const formData = new FormData(form);
  
    // Convert form data into an object
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });
    console.log(data)
    var pointA = data[pointA]
    var pointB = data[pointB]
     if (pointA === undefined) {
        pointA = "34.00635229451376,-84.42516328702436"
    }
     if (pointB === undefined) {
        pointB = "34.0533754844467,-84.45465522830254"
    }
    // Process the data using a function
    main(pointA, pointB);
  });

// // Execute the main function
// main();