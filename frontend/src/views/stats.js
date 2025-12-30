// src/views/stats.ts
let reactionChart = null; // Global to hold Chart.js instance
let colorAvgChart = null;
let hourAvgChart = null;
let histogramChart = null;
// This function builds the “Statistics” screen and sets up the stats view
function renderStats(container, sessionHistory) {
    container.innerHTML = `
    <div id="freeplayLayout">

      <!-- ===== LEFT COLUMN: Two vertical panels ===== -->
      <div id="leftColumnContainer">
        <!-- Top Panel: Filters (takes most of the space) -->
        <div id="filtersPanel">
          <h3>Filters</h3>

          <!-- No inner .stats-section-box — everything direct and plain -->
          <label class="stats-label">Test Type</label>
          <select id="filterType">
            <option value="all">All Tests</option>
            <option value="Freeplay Visual">Freeplay Visual</option>
            <option value="Freeplay Audio">Freeplay Audio</option>
            <option value="Session Visual">Session Visual</option>
          </select>

          <label class="stats-label">Graph View</label>
          <select id="graphView">
            <option value="all">All Trials</option>
            <option value="session">By Session (avg)</option>
            <option value="day">By Day (avg)</option>
            <option value="week">By Week (avg)</option>
          </select>

          <label class="stats-label">Show Last X Sessions</label>
          <select id="showLast">
            <option value="all">All</option>
            <option value="1">Last 1</option>
            <option value="3">Last 3</option>
            <option value="5">Last 5</option>
            <option value="10">Last 10</option>
            <option value="15">Last 15</option>
            <option value="25">Last 25</option>
            <option value="45">Last 45</option>
            <option value="50">Last 50</option>
            <option value="90">Last 90</option>
            <option value="100">Last 100</option>
            <option value="135">Last 135</option>
            <option value="225">Last 225</option>
            <option value="450">Last 450</option>
          </select>

          <label class="stats-label">Date Range</label>
          <div class="date-grid">
            <input type="date" id="filterFrom">
            <input type="date" id="filterTo">
          </div>

          <div style="margin: 16px 0;">
            <input type="checkbox" id="removeOutliers">
            <label for="removeOutliers" class="stats-label" style="display: inline; margin-left: 8px;">
              Remove Outliers (>0.5 STD)
            </label>
          </div>

          <button id="resetFiltersBtn">Reset Filters</button>
        </div>

        <!-- Bottom Panel: Data Management (smaller, at bottom, no inner box) -->
        <div id="dataManagementPanel">
          <h3>Data Management</h3>

          <button id="exportCsvBtn">Export to CSV</button>
          <button id="clearHistoryBtn">Clear All History</button>
        </div>
      </div>

      <!-- Middle and Right panels -->
      <div id="mainPanel">
        <h3>Stats Overview</h3>
        <canvas id="reactionChart"></canvas>
        <div id="statsSummary"></div>
        

        <canvas id="colorAvgChart"></canvas>
        <canvas id="hourAvgChart"></canvas>
        <canvas id="histogramChart"></canvas>
        



      </div>

      <div id="historyPanel">
        <h3>Session History</h3>
        <div id="historyContent"></div>
      </div>
    </div>
  `;
    // Load Chart.js CDN (only once)
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => setupStats(sessionHistory);
        document.head.appendChild(script);
    }
    else {
        setupStats(sessionHistory);
    }
    // Load stats-specific CSS (prevent duplicates)
    if (!document.querySelector('link[href="styles/stats.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'styles/stats.css';
        document.head.appendChild(link);
    }
    const mainPanel = document.getElementById('mainPanel');
    mainPanel.classList.add('mainPanel');
    mainPanel.style.flex = '1';
    mainPanel.style.alignItems = 'center';
    mainPanel.style.justifyContent = 'flex-start';
    mainPanel.style.gap = '0px';
}
function setupStats(originalHistory) {
    const statsSummary = document.getElementById('statsSummary');
    const historyContent = document.getElementById('historyContent');
    const chartCanvas = document.getElementById('reactionChart');
    const exportBtn = document.getElementById('exportCsvBtn');
    const clearBtn = document.getElementById('clearHistoryBtn');
    const filterType = document.getElementById('filterType');
    const graphView = document.getElementById('graphView');
    const showLast = document.getElementById('showLast');
    const filterFrom = document.getElementById('filterFrom');
    const filterTo = document.getElementById('filterTo');
    const removeOutliers = document.getElementById('removeOutliers');
    const resetBtn = document.getElementById('resetFiltersBtn');
    const updateDisplay = () => {
        let filtered = [...originalHistory];
        // Filter by type
        if (filterType.value !== 'all') {
            filtered = filtered.filter(e => e.type === filterType.value);
        }
        // Filter by date range
        if (filterFrom.value) {
            const fromDate = new Date(filterFrom.value);
            filtered = filtered.filter(e => new Date(e.timestamp) >= fromDate);
        }
        if (filterTo.value) {
            const toDate = new Date(filterTo.value);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(e => new Date(e.timestamp) <= toDate);
        }
        // Sort chronologically (oldest first for plotting)
        let sortedChronological = [...filtered].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        // === NEW: Outlier filtering per test type ===
        let dataForGraphAndStats = sortedChronological;
        if (removeOutliers.checked) {
            const typeStats = {};
            const typeGroups = {};
            // Group results by type
            sortedChronological.forEach(entry => {
                if (!typeGroups[entry.type])
                    typeGroups[entry.type] = [];
                typeGroups[entry.type].push(...entry.results);
            });
            // Helper to compute median
            const median = (arr) => {
                const s = [...arr].sort((a, b) => a - b);
                const mid = Math.floor(s.length / 2);
                return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
            };
            for (const type in typeGroups) {
                const times = typeGroups[type];
                const med = median(times);
                const mean = times.reduce((a, b) => a + b, 0) / times.length;
                const variance = times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
                const std = Math.sqrt(variance);
                typeStats[type] = { median: med, std };
            }
            ;
            // Filter entries: remove outlier trials per type
            dataForGraphAndStats = sortedChronological.map(entry => {
                const { median, std } = typeStats[entry.type] || { median: 0, std: 0 };
                const threshold = 0.5 * std;
                const filteredTrials = entry.results.filter(rt => rt >= median - threshold && rt <= median + threshold);
                return { ...entry, results: filteredTrials };
            }).filter(entry => entry.results.length > 0);
        }
        // === NOW apply "Show Last N" after outliers ===
        if (showLast.value !== 'all') {
            const N = parseInt(showLast.value);
            dataForGraphAndStats = dataForGraphAndStats.slice(-N);
        }
        // Empty state
        if (dataForGraphAndStats.length === 0) {
            statsSummary.innerHTML = '<p style="text-align: center; opacity: 0.7;">No sessions match the current filters.</p>';
            historyContent.innerHTML = '<p style="text-align: center; opacity: 0.7;">No history to display</p>';
            if (reactionChart)
                reactionChart.destroy();
            return;
        }
        // === Use dataForGraphAndStats for everything ===
        // Build stats box under chart
        const allResults = dataForGraphAndStats.flatMap(e => e.results);
        const totalTrials = allResults.length;
        const overallAvg = totalTrials > 0
            ? (allResults.reduce((a, b) => a + b, 0) / totalTrials).toFixed(1)
            : '0.0';
        const overallMedian = totalTrials > 0
            ? (() => {
                const s = [...allResults].sort((a, b) => a - b);
                const mid = Math.floor(s.length / 2);
                return s.length % 2 ? s[mid].toFixed(1) : ((s[mid - 1] + s[mid]) / 2).toFixed(1);
            })()
            : '0.0';
        const overall25 = parseFloat(percentile(allResults, 0.75)).toFixed(1);
        const overall75 = parseFloat(percentile(allResults, 0.25)).toFixed(1);
        const overall95 = parseFloat(percentile(allResults, 0.05)).toFixed(1);
        const overallStd = totalTrials > 0
            ? (() => {
                const mean = allResults.reduce((a, b) => a + b, 0) / totalTrials;
                const variance = allResults.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / totalTrials;
                return Math.sqrt(variance).toFixed(1);
            })()
            : '0.0';
        const overallMin = totalTrials > 0 ? Math.min(...allResults).toFixed(1) : 'N/A';
        const overallMax = totalTrials > 0 ? Math.max(...allResults).toFixed(1) : 'N/A';
        // Set statsSummary HTML
        statsSummary.innerHTML = `
        <div class="stats-box">
            <div class="stats-item">
            <div class="stats-label">Trials</div>
            <div class="stats-value">${totalTrials}</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">Average</div>
            <div class="stats-value">${overallAvg} ms</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">Std</div>
            <div class="stats-value">${overallStd} ms</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">Slowest</div>
            <div class="stats-value">${overallMax} ms</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">Q1</div>
            <div class="stats-value">${overall25} ms</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">Median</div>
            <div class="stats-value">${overallMedian} ms</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">Q3</div>
            <div class="stats-value">${overall75} ms</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">95%</div>
            <div class="stats-value">${overall95} ms</div>
            </div>
            <div class="stats-item">
            <div class="stats-label">Fastest</div>
            <div class="stats-value">${overallMin} ms</div>
            </div>
        </div>
    `;
        // === Render history list (newest first) ===
        const sortedReverse = [...dataForGraphAndStats].reverse();
        historyContent.innerHTML = sortedReverse.map(entry => renderHistoryEntry(entry)).join('');
        // Graph uses filteredResults → change to dataForGraphAndStats
        let filteredResults = dataForGraphAndStats; // ← rename or just use dataForGraphAndStats below
        // === Plot the graph ===
        if (reactionChart)
            reactionChart.destroy();
        if (colorAvgChart)
            colorAvgChart.destroy();
        if (hourAvgChart)
            hourAvgChart.destroy();
        if (histogramChart)
            histogramChart.destroy();

        let datasets = [];
        let labels = [];
        const view = graphView.value;
        const grouped = {};
        if (view === 'all') {
            let trialIndex = 1;
            dataForGraphAndStats.forEach(entry => {
                if (!grouped[entry.type])
                    grouped[entry.type] = [];
                entry.results.forEach(rt => {
                    grouped[entry.type].push({ x: trialIndex++, y: rt });
                });
            });
        }
        else {
            const groups = {};
            dataForGraphAndStats.forEach(entry => {
                const entryDate = new Date(entry.timestamp);
                let key = '';
                if (view === 'session')
                    key = entry.timestamp;
                if (view === 'day')
                    key = entryDate.toISOString().slice(0, 10);
                if (view === 'week') {
                    const weekStart = new Date(entryDate);
                    weekStart.setDate(entryDate.getDate() - entryDate.getDay());
                    key = weekStart.toISOString().slice(0, 10);
                }
                if (!groups[key]) {
                    groups[key] = { times: [], type: entry.type, date: entryDate };
                }
                groups[key].times.push(...entry.results);
            });
            Object.values(groups).forEach(group => {
                if (!grouped[group.type])
                    grouped[group.type] = [];
                const avg = group.times.reduce((a, b) => a + b, 0) / group.times.length;
                grouped[group.type].push({ x: grouped[group.type].length, y: avg });
            });
        }
        reactionChart = new window.Chart(chartCanvas, {
            type: 'scatter',
            data: {
                datasets: Object.keys(grouped).map(type => ({
                    label: type,
                    data: grouped[type],
                    backgroundColor: getColorForType(type),
                    borderColor: getColorForType(type), // line color
                    showLine: true, // ← CONNECT POINTS
                    spanGaps: false, // 👈 prevents jumping gaps
                    pointRadius: view === 'all' ? 4 : 7,
                    tension: 0.25 // optional smoothing
                }))
            },
            options: {
                maintainAspectRatio: true,
                aspectRatio: 3,
                devicePixelRatio: window.devicePixelRatio,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: 'white', font: { size: 16 } }
                    },
                    title: {
                        display: true,
                        text: '  Reaction Times (ms)',
                        color: 'white',
                        align: 'start',
                        fullWidth: true,
                        font: { size: 20 },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: view === 'all' ? 'Trial Number' :
                                view === 'session' ? 'Session' :
                                    view === 'day' ? 'Day' :
                                        view === 'week' ? 'Week' : 'Time Period',
                            color: '#f0f0f0',
                            font: {
                                size: 14,
                                weight: 'normal'
                            },
                            padding: { top: 10 }
                        },
                        ticks: {
                            color: '#f0f0f0',
                            font: {
                                size: 14
                            },
                            stepSize: 1, // ← Minimum step = 1 (forces integers)
                            autoSkip: true, // ← Allows larger steps when crowded
                            maxRotation: 0, // ← No rotation allowed
                            minRotation: 0 // ← Forces horizontal labels
                        },
                        grid: { color: '#212121' }
                    },
                    y: {
                        reverse: true,
                        ticks: {
                            
                            color: '#f0f0f0',
                            font: {
                                size: 16
                            }
                        },
                        grid: { color: '#212121' },
                        beginAtZero: false
                    }
                }
            }
        });
        // AVERAGE BY STIMULUS COLOR CHART
        const stimulusMap = {};
        dataForGraphAndStats.forEach(entry => {
            if (!entry.stimulusColor)
                return;
            if (!stimulusMap[entry.stimulusColor])
                stimulusMap[entry.stimulusColor] = [];
            stimulusMap[entry.stimulusColor].push(...entry.results);
        });
        const stimulusLabels = Object.keys(stimulusMap);
        const stimulusAverages = stimulusLabels.map(color => {
            const vals = stimulusMap[color];
            return vals.reduce((a, b) => a + b, 0) / vals.length;
        });

        const Lower_25 = stimulusLabels.map(color => percentile(stimulusMap[color], 0.25));
        const Upper_75 = stimulusLabels.map(color => percentile(stimulusMap[color], 0.75));
        const mid50 = stimulusLabels.map(color => percentile(stimulusMap[color], 0.50));

        // AVERAGE BY HOUR OF THE DAY
        // AVERAGE, MEDIAN, LOWER & UPPER QUARTILES BY HOUR
        const hourMap = {};
        dataForGraphAndStats.forEach(entry => {
            const hour = new Date(entry.timestamp).getHours();
            if (!hourMap[hour])
                hourMap[hour] = [];
            hourMap[hour].push(...entry.results);
        });
        const hourLabels = Object.keys(hourMap).sort((a, b) => +a - +b);
        // Helper to calculate median / percentile
        function percentile(arr, q) {
            const sorted = [...arr].sort((a, b) => a - b);
            const pos = (sorted.length - 1) * q;
            const base = Math.floor(pos);
            const rest = pos - base;
            if (sorted[base + 1] !== undefined) {
                return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
            }
            else {
                return sorted[base];
            }
        }
        // Compute all three stats
        const hourLower5 = hourLabels.map(h => percentile(hourMap[+h], 0.05));
        const hourLower25 = hourLabels.map(h => percentile(hourMap[+h], 0.25));
        const hourMedian = hourLabels.map(h => percentile(hourMap[+h], 0.5));
        const hourUpper75 = hourLabels.map(h => percentile(hourMap[+h], 0.75));

        function withAlpha(color, alpha = 0.2) {
            // Create a temporary canvas to convert any color to RGB
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }


        // Floating IQR data for the chart
        const floatingIQRData = stimulusLabels.map((color, i) => [
            Lower_25[i],
            Upper_75[i]
        ]);




        // Render Stimulus Color Chart
        colorAvgChart = new window.Chart(document.getElementById('colorAvgChart'), {
            type: 'bar',
            data: {
                labels: stimulusLabels,
                datasets: [{
                        label: '25th-75th Percentile Range',
                        data: floatingIQRData,
                        borderColor: stimulusLabels.map(c => c),
                        backgroundColor: stimulusLabels.map(c => withAlpha(c, 0.6)),
                        borderWidth: 3,
                        borderRadius: 5,
                        barPercentage: 0.5,
                        categoryPercentage: 0.8,
                        borderSkipped: false
                    },
                    // 2. Average/Median as prominent white dots
                    {
                    label: 'Median',
                    data: mid50,  // or stimulusAverages if you prefer mean
                    type: 'scatter',
                    borderColor: stimulusLabels.map(c => c),
                    borderWidth: 6,
                    pointRadius: 3,                        // controls width of the rectangle
                    pointHoverRadius: 16,
                    }
                    
                
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,   // ← Keep this
                aspectRatio: 4,              // ← Adjust this value (higher = taller, lower = wider)
                devicePixelRatio: window.devicePixelRatio,

                plugins: {
                    title: {
                        display: true,
                        text: '  Reaction Times (Q1, Median, Q3) by Stimulus Color',
                        color: 'white',
                        align: 'start',
                        fullWidth: true,
                        font: { size: 20 },
                        padding: { top: 10, bottom: 40 }
                    },
                    legend: {
                        display: false
                    },
                },
                scales: {
                    y: {
                        reverse: true,
                        ticks: { color: '#f0f0f0', font: { size: 16 } },
                        
                        grid: { color: '#212121' },
                        beginAtZero: false // disables forcing y-axis to start at 0
                    },
                    x: {
                        ticks: { color: '#f0f0f0', font: { size: 14 } },
                        grid: { display: false },
                        //grid: { color: '#212121' },
                    }
                }
            }
        });

        // TIME OF DAY CHART
        hourAvgChart = new window.Chart(document.getElementById('hourAvgChart'), {
            type: 'line',
            data: {
                labels: hourLabels,
                datasets: [
                    {
                        label: 'Q1',
                        data: hourUpper75,
                        borderColor: '#ff2222ff', // red-ish
                        backgroundColor: '#ff2222ff',
                        tension: 0.25,
                        fill: false
                    },
                    {
                        label: 'Median',
                        data: hourMedian,
                        borderColor: '#21ff72ff', // green-ish
                        backgroundColor: '#21ff72ff',
                        tension: 0.25,
                        fill: false
                    },
                    {
                        label: 'Q3',
                        data: hourLower25,
                        borderColor: '#348efcff', // blue
                        backgroundColor: '#348efcff',
                        tension: 0.25,
                        fill: false
                    },
                    {
                        label: '95%',
                        data: hourLower5,
                        borderColor: '#5412beff', // blue
                        backgroundColor: '#5412beff',
                        tension: 0.25,
                        fill: false
                    }
                ]


            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 3,
                devicePixelRatio: window.devicePixelRatio,

                plugins: {
                    title: {
                        display: true,
                        text: '  Reaction Times (ms) by Hour of Day',
                        color: 'white',
                        align: 'start',
                        fullWidth: true,
                        font: { size: 20 },
                        padding: { top: 10, bottom: 10 }
                    },
                    legend: { labels: { color: 'white', font: { size: 16 } }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                        color: '#f0f0f0',
                        font: {
                            size: 14   // ← Now this works!
                        },
                        maxRotation: 0,
                        minRotation: 0
                        },
                        grid: {
                        color: '#212121'
                        }
                    },
                    y: {
                        reverse: true,
                        ticks: {
                        color: '#f0f0f0',
                        font: {
                            size: 16   // ← Now this works!
                        }
                        },
                        grid: {
                        color: '#212121'
                        }
                    }
                }
            }
        });

        // HISTOGRAM CHART - Distribution of all reaction times
        // Collect ALL reaction times from all entries
        const allReactionTimes = [];
        dataForGraphAndStats.forEach(entry => {
            if (entry.results && Array.isArray(entry.results)) {
                allReactionTimes.push(...entry.results);
            }
        });

        // Sort them (needed for nice binning)
        allReactionTimes.sort((a, b) => a - b);

        // --- Compute bins ---
        const binSize = 5;  // each bin covers 5 ms
        const minRT = Math.floor(Math.min(...allReactionTimes) / binSize) * binSize;
        const maxRT = Math.ceil(Math.max(...allReactionTimes) / binSize) * binSize;
        const binCount = Math.ceil((maxRT - minRT) / binSize);

        // Create bins array and labels
        const bins = Array(binCount).fill(0);
        const labelsa = [];
        for (let i = 0; i < binCount; i++) {
            const start = minRT + i * binSize;
            const end = start + binSize;
            labelsa.push(`${start}`);
        }

        // Count values in each bin
        for (const rt of allReactionTimes) {
            let binIndex = Math.floor((rt - minRT) / binSize);
            if (binIndex >= binCount) binIndex = binCount - 1; // edge case for max value
            bins[binIndex]++;
        }


        const ctx = document.getElementById('histogramChart').getContext('2d');

        // Create gradient: top = solid, bottom = transparent
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, 'rgba(99, 101, 233, 0.7)');
        gradient.addColorStop(1, 'rgba(99, 101, 233, 0.2)');

        // --- Render the histogram --
        histogramChart  = new window.Chart(document.getElementById('histogramChart'), {
            type: 'line', // <-- change to line
            data: {
                labels: labelsa,
                datasets: [{
                    label: 'Number of Trials',
                    data: bins,
                    backgroundColor: gradient, // fill color under the line
                    borderColor: '#6365E9',       // line color
                    borderWidth: 3,
                    fill: true,           // <-- this makes it an area chart
                    tension: 0.25,        // smooth curve, optional
                    pointRadius: 0,       // optional: size of dots
                    pointBackgroundColor: 'rgba(50,150,255,1)',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,   // ← Keep this
                aspectRatio: 4,              // ← Adjust this value (higher = taller, lower = wider)
                devicePixelRatio: window.devicePixelRatio,
                plugins: {
                    title: {
                        display: true,
                        text: ' Reaction Times (ms) Distribution (All Trials)',
                        color: 'white',
                        font: { size: 20 },
                        align: 'start',
                        fullWidth: true,
                        padding: { top: 10, bottom: 10 }
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Count: ${context.parsed.y} trials`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#f0f0f0', font: { size: 16 } },
                        grid: { color: '#212121' },
                        title: {
                            display: false,
                            text: 'Reaction Time (ms)',
                            color: '#f0f0f0'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            color: '#f0f0f0', 
                            font: { size: 16 },
                            stepSize: Math.max(1, Math.round(Math.max(...bins) / 10))
                        },
                        grid: { color: '#212121' },
                        title: {
                            display: false,
                            text: 'Number of Trials',
                            color: '#f0f0f0'
                        }
                    }
                }
            }
        });

    };
    // Helper to assign colors by test type
    function getColorForType(type) {
        const colors = {
            'Freeplay Visual': '#4285f4',
            'Freeplay Audio': '#fbbc04',
            'Session Visual': '#34a853'
        };
        return colors[type] || '#a78bfa';
    }
    // Initial render
    updateDisplay();
    // Live updates on any filter change
    filterType.onchange = updateDisplay;
    graphView.onchange = updateDisplay;
    filterFrom.onchange = updateDisplay;
    filterTo.onchange = updateDisplay;
    removeOutliers.onchange = updateDisplay;
    showLast.onchange = updateDisplay; // ← ADD THIS LINE
    resetBtn.onclick = () => {
        filterType.value = 'all';
        graphView.value = 'all';
        filterFrom.value = '';
        filterTo.value = '';
        showLast.value = 'all'; // ← ADD THIS LINE
        removeOutliers.checked = false;
        updateDisplay();
    };
    // Export (exports ALL data, not just filtered — change if you want filtered only)
    exportBtn.onclick = () => {
        let csv = "Type,Date & Time,Frequency (Hz),Initial Color,Stimulus Color,Trials,Min Delay (s),Max Delay (s),Results (ms),Average (ms),Notes\n";
        originalHistory.forEach(entry => {
            const resultsStr = entry.results.map(r => r.toFixed(1)).join("|");
            const avg = entry.results.length > 0
                ? (entry.results.reduce((a, b) => a + b, 0) / entry.results.length).toFixed(1)
                : '0';
            csv += [
                `"${entry.type}"`,
                `"${entry.timestamp}"`,
                entry.frequency ?? '',
                entry.initialColor ?? '',
                entry.stimulusColor ?? '',
                entry.trials ?? '',
                entry.minDelay ?? '',
                entry.maxDelay ?? '',
                `"${resultsStr}"`,
                avg,
                entry.notes ?? ''
            ].join(',') + '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reaction-test-stats_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    // Clear all history
    clearBtn.onclick = () => {
        if (confirm('This will permanently delete ALL your reaction time history.\n\nAre you sure?')) {
            localStorage.removeItem('reactionTestHistory');
            location.reload(); // Simple full refresh
        }
    };
}
// Function to add each history entry to the stats view
function renderHistoryEntry(entry) {
    const avg = entry.results.length > 0
        ? (entry.results.reduce((a, b) => a + b, 0) / entry.results.length).toFixed(1)
        : '0.0';
    const resultsList = entry.results.map(r => r.toFixed(1)).join(', ');
    // Build each line separately — only add if data exists
    let details = '';
    if (entry.initialColor !== undefined || entry.stimulusColor !== undefined) {
        const init = entry.initialColor ?? '';
        const stim = entry.stimulusColor ?? '';
        details += `Initial: ${init}, Stimulus: ${stim}<br>`;
    }
    if (entry.frequency !== undefined && entry.frequency !== null) {
        details += `Frequency: ${entry.frequency} Hz<br>`;
    }
    if (entry.trials !== undefined) {
        const delayLine = (entry.minDelay !== undefined && entry.maxDelay !== undefined)
            ? ` | Delays: ${entry.minDelay}s – ${entry.maxDelay}s`
            : '';
        details += `Trials: ${entry.trials}${delayLine}<br>`;
    }
    // ADD NOTES HERE — only if they exist
    if (entry.notes) {
        details += `Notes: ${entry.notes}<br>`;
    }
    // If none of the above, add a blank line for spacing
    if (!details) {
        details = '<br>';
    }
    return `
    <div style="margin-bottom:16px;padding:12px;background:#2A2B2E;border-radius:8px;">
      <strong>${entry.type}</strong><br>
      ${entry.timestamp}<br>
      ${details}
      Results (ms): ${resultsList}<br>
      <strong>Average: ${avg} ms</strong>
    </div>
    <hr style="border:none;border-top:1px solid #2A2B2E;margin:8px 0;">
  `.trim();
}

export { renderStats };