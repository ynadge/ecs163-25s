const w = document.querySelector("svg").clientWidth;
const h = 2000;

let m = {top: 10, right: 30, bottom: 70, left: 60},
    gW = w - m.left - m.right,
    bHeight = 400,
    gH = bHeight - m.top - m.bottom;

const svg = d3.select("svg");
const group = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

d3.csv("ds_salaries.csv").then(d => {
    const grouped = d3.rollup(d,
        v => d3.mean(v, d => +d.salary_in_usd),
        d => d.employee_residence);

    let out = [];
    for (let [k, v] of grouped) {
        out.push({ c: k, s: v });
    }

    const x = d3.scaleBand()
        .domain(out.map(d => d.c))
        .range([0, gW])
        .padding(0.15);

    const y = d3.scaleLinear()
        .domain([0, d3.max(out, d => d.s)])
        .range([gH, 0]);

    group.append("g")
        .attr("transform", `translate(0,${gH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    group.append("g").call(d3.axisLeft(y));

    group.selectAll("rect")
        .data(out)
        .enter()
        .append("rect")
        .attr("x", d => x(d.c))
        .attr("y", d => y(d.s))
        .attr("width", x.bandwidth())
        .attr("height", d => gH - y(d.s))
        .attr("fill", "#67a");

    group.append("text")
        .attr("x", gW/2)
        .attr("y", gH + m.bottom - 5)
        .text("Country");

    group.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -m.left + 15)
        .attr("x", -gH/2)
        .text("USD Salary");
});

d3.csv("ds_salaries.csv").then(raw => {
    const bins = d3.scaleQuantile()
        .domain(raw.map(r => +r.salary_in_usd))
        .range(['L', 'M', 'H', 'VH']);

    const levels = Array.from(new Set(raw.map(r => r.experience_level)));
    const ranges = ['L', 'M', 'H', 'VH'];
    let mat = [];

    levels.forEach(l => {
        ranges.forEach(r => {
            mat.push({
                lvl: l,
                bin: r,
                val: raw.filter(e => e.experience_level === l && bins(+e.salary_in_usd) === r).length
            });
        });
    });

    const g2 = svg.append("g").attr("transform", `translate(${m.left},${bHeight + 80})`);
    const hH = 400;

    const x2 = d3.scaleBand().domain(levels).range([0, gW]).padding(0.01);
    const y2 = d3.scaleBand().domain(ranges).range([0, hH]).padding(0.01);
    const c2 = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, d3.max(mat, d => d.val)]);

    g2.append("g").attr("transform", `translate(0,${hH})`).call(d3.axisBottom(x2));
    g2.append("g").call(d3.axisLeft(y2));

    g2.selectAll("rect")
        .data(mat)
        .enter()
        .append("rect")
        .attr("x", d => x2(d.lvl))
        .attr("y", d => y2(d.bin))
        .attr("width", x2.bandwidth())
        .attr("height", y2.bandwidth())
        .attr("fill", d => c2(d.val))
        .attr("stroke", "gray");

    g2.selectAll("text.cell")
        .data(mat)
        .enter()
        .append("text")
        .attr("x", d => x2(d.lvl) + x2.bandwidth()/2)
        .attr("y", d => y2(d.bin) + y2.bandwidth()/2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text(d => d.val)
        .style("font-size", "11px");
});

d3.csv("ds_salaries.csv").then(raw => {
    const g3 = svg.append("g").attr("transform", `translate(${m.left},${bHeight + 600})`);
    const sh = 400;

    const aggs = d3.rollup(raw,
        v => v.length,
        d => d.work_year,
        d => d.job_title);

    let yrs = [...new Set(raw.map(d => d.work_year))].sort();
    let jobs = [...new Set(raw.map(d => d.job_title))];

    const jobCount = d3.rollup(raw, v => v.length, d => d.job_title);
    jobs = Array.from(jobCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(d => d[0]);

    let d_stacked = [];
    for (let y of yrs) {
        let o = { year: +y };
        jobs.forEach(j => {
            o[j] = aggs.get(y)?.get(j) || 0;
        });
        d_stacked.push(o);
    }

    const x = d3.scaleLinear().domain([d3.min(yrs), d3.max(yrs)]).range([0, gW]);
    const y = d3.scaleLinear().domain([0, d3.max(d_stacked, r => d3.sum(jobs, j => r[j] || 0))]).range([sh, 0]);
    const color = d3.scaleOrdinal().domain(jobs).range(d3.schemeTableau10);

    const stack = d3.stack().keys(jobs).offset(d3.stackOffsetWiggle);
    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveCardinal);

    g3.selectAll("path")
        .data(stack(d_stacked))
        .enter()
        .append("path")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.85);

    g3.append("g")
        .attr("transform", `translate(0,${sh})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    
    const leg = g3.append("g").attr("transform", `translate(0, ${sh + 40})`);
    jobs.forEach((j, i) => {
        const row = leg.append("g").attr("transform", `translate(${i * 140},0)`);
        row.append("rect").attr("width", 14).attr("height", 14).attr("fill", color(j));
        row.append("text").attr("x", 20).attr("y", 10).text(j).style("font-size", "10px");
    });

    g3.append("rect")
        .attr("width", gW)
        .attr("height", sh)
        .attr("fill", "none")
        .attr("stroke", "black");
});
