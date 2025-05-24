// Load and process the CSV data
d3.csv("data/mxmh_survey_results.csv").then(data => {
    // Clean and preprocess data
    data.forEach(d => {
        d["Hours per day"] = +d["Hours per day"] || 0;
        d.Anxiety = +d.Anxiety || 0;
        d.Depression = +d.Depression || 0;
        d.Insomnia = +d.Insomnia || 0;
        d.OCD = +d.OCD || 0;
    });

    // Global state for selected genre
    let selectedGenre = null;

    // Bar Chart (Overview)
    function drawBarChart(data) {
        const margin = { top: 40, right: 20, bottom: 50, left: 60 };
        const width = 1200 - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        // Aggregate data by favorite genre
        const genreCounts = d3.rollup(data, v => v.length, d => d["Fav genre"]);
        const genreData = Array.from(genreCounts, ([genre, count]) => ({ genre, count }));

        // Set up SVG
        const svg = d3.select("#bar-chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Scales
        const x = d3.scaleBand()
            .domain(genreData.map(d => d.genre))
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(genreData, d => d.count)])
            .nice()
            .range([height, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10);

        // Bars
        svg.selectAll(".bar")
            .data(genreData)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.genre))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.count))
            .attr("fill", d => color(d.genre))
            .on("click", function(event, d) {
                // Update selected genre and trigger updates
                selectedGenre = selectedGenre === d.genre ? null : d.genre;
                d3.selectAll(".bar").attr("opacity", 0.5);
                d3.select(this).attr("opacity", 1);
                updateParallelCoordinates();
                updateStackedBar();
            })
            .attr("opacity", 0.5);

        // Axes
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        svg.append("g")
            .call(d3.axisLeft(y));

        // Axis labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom - 10)
            .style("text-anchor", "middle")
            .text("Favorite Genre");

        svg.append("text")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 20)
            .attr("transform", "rotate(-90)")
            .style("text-anchor", "middle")
            .text("Number of Respondents");

        // Legend
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 100}, 10)`);

        legend.append("text")
            .text("Click a bar to filter");
    }

    // Parallel Coordinates Plot (Advanced, Focus View)
    function drawParallelCoordinates(data) {
        const margin = { top: 40, right: 20, bottom: 30, left: 20 };
        const width = 580 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const dimensions = ["Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];
        const y = {};
        dimensions.forEach(dim => {
            y[dim] = d3.scaleLinear()
                .domain(d3.extent(data, d => d[dim])).nice()
                .range([height, 0]);
        });

        // Base x-scale (will be adjusted during zoom)
        const xBase = d3.scalePoint()
            .domain(dimensions)
            .range([0, width]);

        const color = d3.scaleOrdinal(d3.schemeCategory10);

        // SVG
        const svg = d3.select("#parallel-coordinates")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        // Create a group for zooming/panning
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Path generator (updated dynamically during zoom)
        function path(d, x = xBase) {
            return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
        }

        // Lines
        const lines = g.selectAll(".line")
            .data(data)
            .enter()
            .append("path")
            .attr("class", "line")
            .attr("d", d => path(d))
            .style("fill", "none")
            .style("stroke", d => color(d["Fav genre"]))
            .style("opacity", 0.2);

        // Axes
        const dimensionGroups = g.selectAll(".dimension")
            .data(dimensions)
            .enter()
            .append("g")
            .attr("class", "dimension")
            .attr("transform", d => `translate(${xBase(d)})`);

        dimensionGroups.append("g")
            .attr("class", "axis")
            .each(function(d) { d3.select(this).call(d3.axisLeft(y[d])); })
            .append("text")
            .style("text-anchor", "middle")
            .attr("y", -9)
            .text(d => d);

        // Pan and Zoom
        const zoom = d3.zoom()
            .scaleExtent([0.5, 2]) // Allow zooming from 0.5x to 2x
            .translateExtent([[0, 0], [width, height]]) // Constrain panning
            .on("zoom", zoomed);

        svg.call(zoom);

        function zoomed(event) {
            const t = d3.transition().duration(750); // Smooth transition for zoom

            // Update x-scale based on zoom transform
            const x = xBase.copy().range([0, width].map(d => event.transform.applyX(d)));

            // Update group transform (for panning and scaling)
            g.transition(t)
                .attr("transform", `translate(${event.transform.x + margin.left},${margin.top}) scale(${event.transform.k}, 1)`);

            // Update lines
            lines.transition(t)
                .attr("d", d => path(d, x));

            // Update axis positions
            dimensionGroups.transition(t)
                .attr("transform", d => `translate(${x(d)})`);
        }

        // Legend
        g.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 150}, 10)`)
            .append("text")
            .text("Drag to pan, scroll to zoom");

        // Update function (for genre filtering)
        function update() {
            const filteredData = selectedGenre ? data.filter(d => d["Fav genre"] === selectedGenre) : data;
            const t = d3.transition().duration(750);

            lines.data(filteredData, d => d.Timestamp)
                .transition(t)
                .style("opacity", d => filteredData.includes(d) ? 0.2 : 0)
                .attr("d", d => path(d));

            dimensions.forEach(dim => {
                y[dim].domain(d3.extent(filteredData, d => d[dim])).nice();
                g.selectAll(".dimension .axis")
                    .filter(d => d === dim)
                    .transition(t)
                    .call(d3.axisLeft(y[dim]));
            });
        }

        return update;
    }

    // Stacked Bar Chart (Focus View)
    function drawStackedBar(data) {
        const margin = { top: 40, right: 20, bottom: 30, left: 60 };
        const width = 580 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const genres = ["Classical", "Country", "EDM", "Folk", "Hip hop", "Jazz", "K pop", "Latin", "Metal", "Pop", "R&B", "Rap", "Rock"];
        const frequencies = ["Never", "Rarely", "Sometimes", "Very frequently"];

        // SVG
        const svg = d3.select("#stacked-bar")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(genres)
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain(frequencies)
            .range(["#d3d3d3", "#a9a9a9", "#696969", "#000000"]);

        // Update function
        function update() {
            const filteredData = selectedGenre ? data.filter(d => d["Fav genre"] === selectedGenre) : data;

            // Aggregate frequency data
            const stackData = genres.map(genre => {
                const counts = { genre };
                frequencies.forEach(freq => {
                    counts[freq] = d3.sum(filteredData, d => d[`Frequency [${genre}]`] === freq ? 1 : 0);
                });
                return counts;
            });

            const stack = d3.stack().keys(frequencies);
            const stackedData = stack(stackData);

            y.domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))]).nice();

            const layer = svg.selectAll(".layer")
                .data(stackedData)
                .join("g")
                .attr("class", "layer")
                .attr("fill", d => color(d.key));

            layer.selectAll("rect")
                .data(d => d)
                .join("rect")
                .attr("x", d => x(d.data.genre))
                .attr("width", x.bandwidth())
                .transition()
                .duration(750)
                .attr("y", d => y(d[1]))
                .attr("height", d => y(d[0]) - y(d[1]));

            svg.selectAll(".x-axis")
                .data([null])
                .join("g")
                .attr("class", "x-axis")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            svg.selectAll(".y-axis")
                .data([null])
                .join("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(y));

            // Axis labels
            svg.selectAll(".x-label")
                .data([null])
                .join("text")
                .attr("class", "x-label")
                .attr("x", width / 2)
                .attr("y", height + margin.bottom - 10)
                .style("text-anchor", "middle")
                .text("Genres");

            svg.selectAll(".y-label")
                .data([null])
                .join("text")
                .attr("class", "y-label")
                .attr("x", -height / 2)
                .attr("y", -margin.left + 20)
                .attr("transform", "rotate(-90)")
                .style("text-anchor", "middle")
                .text("Number of Respondents");

            // Legend
            const legend = svg.selectAll(".legend")
                .data([null])
                .join("g")
                .attr("class", "legend")
                .attr("transform", `translate(${width - 100}, 10)`);

            legend.selectAll("rect")
                .data(frequencies)
                .join("rect")
                .attr("x", 0)
                .attr("y", (d, i) => i * 20)
                .attr("width", 10)
                .attr("height", 10)
                .attr("fill", d => color(d));

            legend.selectAll("text")
                .data(frequencies)
                .join("text")
                .attr("x", 15)
                .attr("y", (d, i) => i * 20 + 9)
                .text(d => d);
        }

        return update;
    }

    // Initialize visualizations
    drawBarChart(data);
    const updateParallelCoordinates = drawParallelCoordinates(data);
    const updateStackedBar = drawStackedBar(data);

    // Initial updates
    updateParallelCoordinates();
    updateStackedBar();
}).catch(error => {
    console.error("Error loading the CSV file:", error);
});