// src/views/testerVisual.ts
function renderTesterVisual(container, sessionHistory) {
    container.innerHTML = `
    <div id="freeplayLayout">
      <div id="settingsPanel">
        <h3>Explained</h3>

        <label>Background Color: White</label>
        <label>Test Count: 9</label>
        <label>Stimulus Colors: All 9 (auto-cycled)</label>
        <label>Trials per Color: 5</label>
        <label>Min Delay: 1 second</label>
        <label>Max Delay: 3 seconds</label>
        <label>Color Order: Random each run</label>

        <label>Notes (optional)</label>
        <input type="text" id="notesInput" placeholder="Add any notes for this session..." style="width: 100%; padding: 10px; margin-bottom: 20px; background: var(--primary-bg); color: var(--text-color); border: 1px solid var(--primary-border); border-radius: 2px; font-size: var(--font-size-button); box-sizing: border-box;">
      </div>

      <div id="mainPanel">
        <h3 id="mainTitle">
          Main: Click as fast as possible when the white box changes to 
          <span id="currentColorText" style="font-weight:bold;">white</span>!
        </h3>

        <div id="buttonContainer">
          <button id="startBtn">Start Test</button>
          <button id="stopBtn">Stop Test</button>
        </div>

        <canvas id="stimulus"></canvas>
        <p id="result"></p>
      </div>

      <div id="historyPanel">
        <h3>Recent History</h3>
        <div id="historyContent"></div>
      </div>
    </div>
  `;
    // Load CSS (reuse your existing one or make a new one)
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'styles/testerVisual.css';
    document.head.appendChild(link);
    setupReactionTest(sessionHistory);
}
function setupReactionTest(sessionHistory) {
    const canvas = document.getElementById('stimulus');
    const ctx = canvas.getContext('2d', { alpha: false });
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultText = document.getElementById('result');
    const currentColorText = document.getElementById('currentColorText');
    const trialsPerColor = 5;
    const minDelayS = 1;
    const maxDelayS = 3;
    // All 9 colors
    const allColors = ['blue', 'green', 'red', 'yellow', 'orange', 'purple', 'brown', 'black', 'grey'];
    let colorQueue = []; // Randomized list of colors
    let currentColorIndex = 0; // Which color we're on
    let currentTrialInColor = 0; // Trial count for current color (1 to 5)
    let resultsForCurrentColor = [];
    let readyToClick = false;
    let startTime = 0;
    let isRunning = false;
    function setColor(color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    function updateCurrentColorDisplay(color) {
        const colorName = color.charAt(0).toUpperCase() + color.slice(1);
        currentColorText.textContent = colorName.toLowerCase(); // e.g., "red", "blue"
        currentColorText.style.color = color; // text colored to match
    }
    // Shuffle array (Fisher-Yates)
    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    function startFullTest() {
        // Reset everything
        colorQueue = shuffleArray(allColors); // Random order!
        currentColorIndex = 0;
        currentTrialInColor = 0;
        resultsForCurrentColor = [];
        isRunning = true;
        // Immediately show the first upcoming color
        const firstColor = colorQueue[0];
        updateCurrentColorDisplay(firstColor);
        resultText.textContent = 'Starting full test...';
        setColor('white');
        updateCurrentColorDisplay('white');
        setTimeout(() => runNextTrial(), 1000);
    }
    function runNextTrial() {
        if (!isRunning)
            return;
        // Check if we've finished all 5 trials for current color
        if (currentTrialInColor >= trialsPerColor) {
            // Save results for this color
            const currentColor = colorQueue[currentColorIndex];
            const notesInput = document.getElementById('notesInput');
            const notes = notesInput.value.trim();
            const entry = {
                timestamp: new Date().toLocaleString(),
                type: 'Session Visual',
                initialColor: 'white',
                stimulusColor: currentColor,
                trials: trialsPerColor,
                minDelay: minDelayS,
                maxDelay: maxDelayS,
                results: [...resultsForCurrentColor],
                notes: notes || undefined // only save if not empty
            };
            sessionHistory.push(entry);
            localStorage.setItem('reactionTestHistory', JSON.stringify(sessionHistory));
            addHistoryEntry(entry);
            // Move to next color
            currentColorIndex++;
            currentTrialInColor = 0;
            resultsForCurrentColor = [];
            if (currentColorIndex >= allColors.length) {
                // All colors done!
                resultText.textContent = 'Full test complete! All 9 colors tested.';
                startBtn.classList.remove('active');
                setColor('white');
                updateCurrentColorDisplay('white');
                isRunning = false;
                return;
            }
        }
        // Start next trial
        currentTrialInColor++;
        const currentColor = colorQueue[currentColorIndex];
        updateCurrentColorDisplay(currentColor);
        setColor('white');
        readyToClick = false;
        resultText.textContent = `Color ${currentColorIndex + 1}/9 | Trial ${currentTrialInColor}/5`;
        const minDelay = minDelayS * 1000;
        const maxDelay = maxDelayS * 1000;
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        setTimeout(() => {
            setColor(currentColor);
            startTime = performance.now();
            readyToClick = true;
        }, delay);
    }
    // Click handler
    canvas.addEventListener('pointerdown', () => {
        if (!readyToClick || !isRunning) {
            if (isRunning) {
                resultText.textContent = 'Too early! Wait for the color change.';
            }
            return;
        }
        const rt = performance.now() - startTime;
        resultsForCurrentColor.push(rt);
        resultText.textContent = `Trial ${currentTrialInColor}: ${rt.toFixed(1)} ms`;
        setTimeout(runNextTrial, 300);
    });
    // Start button
    startBtn.onclick = () => {
        if (isRunning)
            return;
        startBtn.classList.add('active');
        stopBtn.classList.remove('active');
        startFullTest();
    };
    // Stop button
    stopBtn.onclick = () => {
        isRunning = false;
        startBtn.classList.remove('active');
        stopBtn.classList.add('active');
        readyToClick = false;
        resultText.textContent = 'Test stopped.';
        setColor('white');
        updateCurrentColorDisplay('white');
    };
    // Initial state
    setColor('white');
    updateCurrentColorDisplay('white');
    // History display
    function addHistoryEntry(entry) {
        const historyContent = document.getElementById('historyContent');
        const div = document.createElement('div');
        div.style.marginBottom = '15px';
        div.style.padding = '12px';
        div.style.background = '#18191C';
        div.style.border = '1px solid #323232';
        div.style.borderRadius = '5px';
        const avg = entry.results.reduce((a, b) => a + b, 0) / entry.results.length || 0;
        div.innerHTML = `
      <strong>Session Visual – ${entry.stimulusColor.charAt(0).toUpperCase() + entry.stimulusColor.slice(1)}</strong><br>
      ${entry.timestamp}<br>
      Background: white → Stimulus: ${entry.stimulusColor}<br>
      Trials: 5 | Delays: 1s – 3s<br>
      Results: ${entry.results.map(r => r.toFixed(1)).join(', ')} ms<br>
      <strong>Average: ${avg.toFixed(1)} ms</strong>
    `;
        //const hr = document.createElement('hr');
        historyContent.insertBefore(div, historyContent.firstChild);
        //historyContent.insertBefore(hr, div);
    }
}

export { renderTesterVisual };