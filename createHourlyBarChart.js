import { getRoute, getAccidentsOnRouteByHour } from "./getRoute.js";

async function createBarChart(accidentsByHour) {
    // Dimensions
    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    // SVG container
    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const barRouteData = accidentsByHour;

    // Scales
    const x = d3.scaleBand()
        .domain(barRouteData.map(d => d.hour))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(barRouteData, d => parseFloat(d.accident_prop) * 100)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    // Bars
    svg.selectAll(".bar")
        .data(barRouteData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.hour))
        .attr("y", d => y(parseFloat(d.accident_prop) * 100))
        .attr("fill", "#34A853")
        .attr("width", x.bandwidth())
        .attr("height", d => y(0) - y(parseFloat(d.accident_prop) * 100));
    
    svg.append("text")
        .attr("x", (width / 2))             
        .attr("y", (margin.top / 2) + 5)
        .attr("text-anchor", "middle")  
        .style("font-size", "16px") 
        .style("text-decoration", "underline")  
        .text("Accident Rate On Route By Hour");
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2) // Center horizontally
        .attr("y", height - 5) // Position below the X-axis
        .text("Hour of the Day");
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)") // Rotate the text
        .attr("x", -height / 2) // Center vertically (negative because of rotation)
        .attr("y", 10) // Position to the left of the Y-axis
        .text("Accident Percentage (%)");
    console.log("bar chart done");
}

function clearBarChart() {
    var chart = document.getElementById("chart")
    if (chart.hasChildNodes()) {
        chart.firstElementChild.remove()
    }
}

export {createBarChart, clearBarChart};