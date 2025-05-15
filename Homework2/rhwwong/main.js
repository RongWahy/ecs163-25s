// Load the CSV data
d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    // Data preprocessing
    rawData.forEach(d => {
        d.Age = +d.Age || 0; // Convert to number, default to 0 if missing
        d["Hours per day"] = +d["Hours per day"] || 0;
        d.Anxiety = +d.Anxiety || 0;
        d.Depression = +d.Depression || 0;
        d.Insomnia = +d.Insomnia || 0;
        d.OCD = +d.OCD || 0;
    });

    // Filter out invalid rows (e.g., missing critical data)
    const data = rawData.filter(d => d.Anxiety >= 0 && d.Depression >= 0 && d.Insomnia >= 0 && d.OCD >= 0 && d["Fav genre"]);

    // Bar Chart: Average Mental Health Scores
    const mentalHealthKeys = ["Anxiety", "Depression", "Insomnia", "OCD"];
    const barData = mentalHealthKeys.map(key => ({
        condition: key,
        average: d3.mean(data, d => d[key])
    }));

    const barSvg = d3.select("#bar-chart")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 250);

    const barWidth = document.getElementById("bar-chart").clientWidth;
    const barHeight = 250;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const xBar = d3.scaleBand()
        .domain(mentalHealthKeys)
        .range([margin.left, barWidth - margin.right])
        .padding(0.1);

    const yBar = d3.scaleLinear()
        .domain([0, 10])
        .range([barHeight - margin.bottom, margin.top]);

    const colorBar = d3.scaleSequential()
        .domain([0, 10])
        .interpolator(d3.interpolateBlues);

    barSvg.selectAll(".bar")
        .data(barData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xBar(d.condition))
        .attr("y", d => yBar(d.average))
        .attr("width", xBar.bandwidth())
        .attr("height", d => barHeight - margin.bottom - yBar(d.average))
        .attr("fill", d => colorBar(d.average));

    // Axes
    barSvg.append("g")
        .attr("transform", `translate(0,${barHeight - margin.bottom})`)
        .call(d3.axisBottom(xBar))
        .selectAll("text")
        .style("font-size", "12px");

    barSvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yBar))
        .selectAll("text")
        .style("font-size", "12px");

    // Axis labels
    barSvg.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight - 5)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Mental Health Condition");

    barSvg.append("text")
        .attr("x", -barHeight / 2)
        .attr("y", margin.left - 35)
        .attr("transform", "rotate(-90)")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Average Score");

    // Legend for Bar Chart
    const legendBar = barSvg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${barWidth - margin.right - 100}, ${margin.top})`);

    const legendScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, 100]);

    const legendAxis = d3.axisBottom(legendScale).ticks(5);

    legendBar.selectAll(".legend-rect")
        .data(d3.range(0, 10, 0.1))
        .enter()
        .append("rect")
        .attr("x", d => legendScale(d))
        .attr("y", 0)
        .attr("width", 100 / 100)
        .attr("height", 10)
        .attr("fill", d => colorBar(d));

    legendBar.append("g")
        .attr("transform", "translate(0, 10)")
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", "10px");

    legendBar.append("text")
        .attr("x", 50)
        .attr("y", -5)
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .text("Score");

    // Pie Chart: Favorite Genre Distribution
    const genreCounts = d3.rollup(data, v => v.length, d => d["Fav genre"]);
    const pieData = Array.from(genreCounts, ([genre, count]) => ({ genre, count }));

    const pieSvg = d3.select("#pie-chart")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 350);

    const pieWidth = document.getElementById("pie-chart").clientWidth;
    const pieHeight = 350;
    const radius = Math.min(pieWidth, pieHeight) / 2 - 40;

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const pieG = pieSvg.append("g")
        .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2})`);

    const colorPie = d3.scaleOrdinal()
        .domain(pieData.map(d => d.genre))
        .range(d3.schemeCategory10);

    pieG.selectAll(".arc")
        .data(pie(pieData))
        .enter()
        .append("path")
        .attr("class", "arc")
        .attr("d", arc)
        .attr("fill", d => colorPie(d.data.genre));

    // Legend for Pie Chart
    const legendPie = pieSvg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${pieWidth - 100}, 20)`);

    legendPie.selectAll(".legend-item")
        .data(pieData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendPie.selectAll(".legend-item")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => colorPie(d.genre));

    legendPie.selectAll(".legend-item")
        .append("text")
        .attr("x", 15)
        .attr("y", 10)
        .style("font-size", "12px")
        .text(d => d.genre);

    // Dendrogram: Mental Health Clustering
    // Sample 100 respondents for performance
    const sampleData = data.slice(0, 100);

    const dendroSvg = d3.select("#dendrogram")
        .append("svg")
        .attr("width", "100%")
        .attr("height", 350);

    const dendroWidth = document.getElementById("dendrogram").clientWidth;
    const dendroHeight = 350;
    const dendroMargin = { top: 20, right: 120, bottom: 30, left: 120 };

    // Prepare data for clustering
    const clusterData = sampleData.map(d => ({
        name: `Respondent_${sampleData.indexOf(d)}`,
        values: [d.Anxiety, d.Depression, d.Insomnia, d.OCD]
    }));

    // Compute distance matrix (Euclidean distance)
    const distanceMatrix = clusterData.map(d1 =>
        clusterData.map(d2 => {
            return Math.sqrt(d1.values.reduce((sum, v, i) => sum + Math.pow(v - d2.values[i], 2), 0));
        })
    );

    // Hierarchical clustering
    const cluster = d3.cluster()
        .size([dendroHeight - dendroMargin.top - dendroMargin.bottom, dendroWidth - dendroMargin.left - dendroMargin.right]);

    const hierarchy = d3.hierarchy(d3.linkage(distanceMatrix, "complete"))
        .sum(d => d.value || 0);

    cluster(hierarchy);

    const dendroG = dendroSvg.append("g")
        .attr("transform", `translate(${dendroMargin.left}, ${dendroMargin.top})`);

    // Links
    dendroG.selectAll(".link")
        .data(hierarchy.descendants().slice(1))
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d => {
            return `M${d.y},${d.x}C${d.parent.y + 100},${d.x} ${d.parent.y + 100},${d.parent.x} ${d.parent.y},${d.parent.x}`;
        })
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    // Nodes
    const colorDendro = d3.scaleSequential()
        .domain([0, 10])
        .interpolator(d3.interpolateBlues);

    dendroG.selectAll(".node")
        .data(hierarchy.descendants())
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("cx", d => d.y)
        .attr("cy", d => d.x)
        .attr("r", 4)
        .attr("fill", d => {
            if (d.data.name) {
                const index = parseInt(d.data.name.split("_")[1]);
                return colorDendro(sampleData[index].Anxiety);
            }
            return "#555";
        });

    // Legend for Dendrogram
    const legendDendro = dendroSvg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${dendroWidth - 100}, ${dendroMargin.top})`);

    const legendDendroScale = d3.scaleLinear()
        .domain([0, 10])
        .range([0, 100]);

    const legendDendroAxis = d3.axisBottom(legendDendroScale).ticks(5);

    legendDendro.selectAll(".legend-rect")
        .data(d3.range(0, 10, 0.1))
        .enter()
        .append("rect")
        .attr("x", d => legendDendroScale(d))
        .attr("y", 0)
        .attr("width", 100 / 100)
        .attr("height", 10)
        .attr("fill", d => colorDendro(d));

    legendDendro.append("g")
        .attr("transform", "translate(0, 10)")
        .call(legendDendroAxis)
        .selectAll("text")
        .style("font-size", "10px");

    legendDendro.append("text")
        .attr("x", 50)
        .attr("y", -5)
        .style("text-anchor", "middle")
        .style("font-size", "10px")
        .text("Anxiety Score");

}).catch(error => {
    console.error("Error loading CSV:", error);
});