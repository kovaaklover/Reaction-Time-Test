// No import needed anymore!
// This function builds the “Freeplay – Visual” screen and sets up the test
function renderFreeplayVisual(container, sessionHistory) {
    container.innerHTML = `
    <div id="freeplayLayout">
      <div id="settingsPanel">
        <h3>Settings</h3>
        <label>Initial Color</label>
        <select id="colorSelect1">
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="red">Red</option>
          <option value="yellow">Yellow</option>
          <option value="white">White</option>
          <option value="orange">Orange</option>
          <option value="purple">Purple</option>
          <option value="brown">Brown</option>
          <option value="black">Black</option>
          <option value="grey">Grey</option>
        </select>

        <label>Stimulus Color</label>
        <select id="colorSelect2">
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="red">Red</option>
          <option value="yellow">Yellow</option>
          <option value="white">White</option>
          <option value="orange">Orange</option>
          <option value="purple">Purple</option>
          <option value="brown">Brown</option>
          <option value="black">Black</option>
          <option value="grey">Grey</option>
        </select>

        <label>Number of Trials</label>
        <select id="trialsSelect">
          <option value="3">3</option>
          <option value="5" selected>5</option>
          <option value="10">10</option>
          <option value="15">15</option>
        </select>

        <label>Min Delay (seconds)</label>
        <select id="minDelaySelect">
          <option value="0.5">0.5</option>
          <option value="1" selected>1</option>
          <option value="1.5">1.5</option>
          <option value="2">2</option>
        </select>

        <label>Max Delay (seconds)</label>
        <select id="maxDelaySelect">
          <option value="2">2</option>
          <option value="3" selected>3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>

        <label>Notes (optional)</label>
        <input type="text" id="notesInput" placeholder="Add any notes for this session..." style="width: 100%; padding: 10px; margin-bottom: 20px; background: var(--primary-bg); color: var(--text-color); border: 1px solid var(--primary-border); border-radius: 2px; font-size: var(--font-size-button); box-sizing: border-box;">
      </div>

      <div id="mainPanel">
        <h3 id="mainTitle">
          Main: Click the box as fast as possible when it turns
          <span id="targetColorText">red</span>
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
    link.href = 'styles/freeplayVisual.css';
    document.head.appendChild(link);
    setupReactionTest(sessionHistory);

    // Set defaults (I also added 'selected' in HTML for clarity)
    const initialColorSelect = document.getElementById('colorSelect1');
    initialColorSelect.value = 'blue';
    const stimulusColorSelect = document.getElementById('colorSelect2');
    stimulusColorSelect.value = 'red';
    setupReactionTest(sessionHistory);
}
// All the reaction test logic — now in the same file, no imports needed
function setupReactionTest(sessionHistory) {
    const canvas = document.getElementById('stimulus');
    const ctx = canvas.getContext('2d', { alpha: false });
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultText = document.getElementById('result');
    const initialColorSelect = document.getElementById('colorSelect1');
    const stimulusColorSelect = document.getElementById('colorSelect2');
    const trialsSelect = document.getElementById('trialsSelect');
    const minDelaySelect = document.getElementById('minDelaySelect');
    const maxDelaySelect = document.getElementById('maxDelaySelect');
    const targetColorText = document.getElementById('targetColorText');
    let currentTrial = 0;
    let results = [];
    let readyToClick = false;
    let startTime = 0;
    let starteda = false;
    // Canvas color handling
    function setColor(color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setColor(initialColorSelect.value);
    initialColorSelect.addEventListener('change', () => setColor(initialColorSelect.value));
    // Instructions update
    function updateInstructions() {
        const colorName = stimulusColorSelect.options[stimulusColorSelect.selectedIndex].text;
        targetColorText.textContent = colorName.toLowerCase();
        targetColorText.style.color = stimulusColorSelect.value;
    }
    updateInstructions();
    stimulusColorSelect.addEventListener('change', updateInstructions);
    // Start button
    startBtn.onclick = () => {
        startBtn.classList.add('active');
        stopBtn.classList.remove('active');
        results = [];
        currentTrial = 0;
        resultText.textContent = 'Get ready...';
        starteda = true;
        runNextTrial();
    };
    // Stop button
    stopBtn.onclick = () => {
        stopBtn.classList.add('active');
        startBtn.classList.remove('active');
        readyToClick = false;
        currentTrial = 0;
        results = [];
        resultText.textContent = 'Test stopped.';
        starteda = false;
        setColor(initialColorSelect.value);
    };
    // Core trial logic
    function runNextTrial() {
        const totalTrials = parseInt(trialsSelect.value);
        const notesInput = document.getElementById('notesInput');
        const notes = notesInput.value.trim();
        readyToClick = false;
        if (currentTrial >= totalTrials) {
            const entry = {
                timestamp: new Date().toLocaleString(),
                type: 'Freeplay Visual',
                initialColor: initialColorSelect.value,
                stimulusColor: stimulusColorSelect.value,
                trials: totalTrials,
                minDelay: parseFloat(minDelaySelect.value),
                maxDelay: parseFloat(maxDelaySelect.value),
                results: [...results],
                notes: notes || undefined // only save if not empty
            };
            sessionHistory.push(entry);
            localStorage.setItem('reactionTestHistory', JSON.stringify(sessionHistory));
            addHistoryEntry(entry);
            resultText.textContent = 'Test complete!';
            startBtn.classList.remove('active');
            return;
        }
        currentTrial++;
        setColor(initialColorSelect.value);
        resultText.textContent = `Trial ${currentTrial}/${totalTrials}`;
        const minDelay = parseFloat(minDelaySelect.value) * 1000;
        const maxDelay = parseFloat(maxDelaySelect.value) * 1000;
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        setTimeout(() => {
            if (!starteda) return;   // safety
            setColor(stimulusColorSelect.value);
            startTime = performance.now();
            readyToClick = true;
        }, delay);
    }
    // Click handler
    canvas.addEventListener('pointerdown', () => {
        if (!starteda) return;   // safety
        if (!readyToClick) {
            resultText.textContent = `Too early! Wait for ${stimulusColorSelect.options[stimulusColorSelect.selectedIndex].text.toLowerCase()}.`;
            return;
        }
        const rt = performance.now() - startTime;
        results.push(rt);
        resultText.textContent = `Trial ${currentTrial}: ${rt.toFixed(1)} ms`;
        setTimeout(runNextTrial, 300);
    });
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
      <strong>${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}</strong><br>
      ${entry.timestamp}<br>
      Initial: ${entry.initialColor}, Stimulus: ${entry.stimulusColor}<br>
      Trials: ${entry.trials} | Delays: ${entry.minDelay}s – ${entry.maxDelay}s<br>
      Results (ms): ${entry.results.map(r => r.toFixed(1)).join(', ')}<br>
      <strong>Average: ${avg.toFixed(1)} ms</strong>
    `;
        historyContent.insertBefore(div, historyContent.firstChild);
        historyContent.insertBefore(hr, div);
    }
}

export { renderFreeplayVisual };
