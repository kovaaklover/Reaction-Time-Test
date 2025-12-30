// No import needed anymore!
// This function builds the “Freeplay – Visual” screen and sets up the test
function renderFreeplaySound(container, sessionHistory) {
    container.innerHTML = `
    <div id="freeplayLayout">
      <div id="settingsPanel">
        <h3>Settings</h3>

        <label>Frequency (Hz)</label>
        <select id="freqSelect">
          <option value="440">440</option>
          <option value="880" selected>880</option>
          <option value="1760">1760</option>
          <option value="3520">3520</option>
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
          Main: Click the white box as fast as possible when you hear the beep!
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
    link.href = 'styles/freeplaySound.css';
    document.head.appendChild(link);
    setupReactionTest(sessionHistory);
}
// All the reaction test logic — now in the same file, no imports needed
function setupReactionTest(sessionHistory) {
    const canvas = document.getElementById('stimulus');
    const ctx = canvas.getContext('2d', { alpha: false });
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const resultText = document.getElementById('result');
    const freqSelect = document.getElementById('freqSelect');
    const trialsSelect = document.getElementById('trialsSelect');
    const minDelaySelect = document.getElementById('minDelaySelect');
    const maxDelaySelect = document.getElementById('maxDelaySelect');
    // If frequency is changed
    freqSelect.addEventListener('change', () => playBeep());
    let currentTrial = 0;
    let results = [];
    let readyToClick = false;
    let startTime = 0;
    let audioContext = null;
    // Canvas color handling
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Start button
    startBtn.onclick = () => {
        startBtn.classList.add('active');
        stopBtn.classList.remove('active');
        results = [];
        currentTrial = 0;
        resultText.textContent = 'Get ready...';
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
    };
    // Create a short beep sound (1000 Hz, 100ms)
    function playBeep() {
        if (!audioContext) {
            audioContext = new AudioContext();
        }
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'square';
        oscillator.frequency.value = parseInt(freqSelect.value); // High beep
        gainNode.gain.value = 0.3; // Not too loud
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1); // 100ms beep
    }
    // Core trial logic
    function runNextTrial() {
        // Clear canvas to white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const totalTrials = parseInt(trialsSelect.value);
        const notesInput = document.getElementById('notesInput');
        const notes = notesInput.value.trim();
        if (currentTrial >= totalTrials) {
            const entry = {
                timestamp: new Date().toLocaleString(),
                type: 'Freeplay Audio',
                frequency: parseInt(freqSelect.value),
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
        readyToClick = false;
        resultText.textContent = `Trial ${currentTrial}/${totalTrials}`;
        const minDelay = parseFloat(minDelaySelect.value) * 1000;
        const maxDelay = parseFloat(maxDelaySelect.value) * 1000;
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        setTimeout(() => {
            playBeep();
            startTime = performance.now();
            readyToClick = true;
        }, delay);
    }
    // Click handler
    canvas.addEventListener('pointerdown', () => {
        if (!readyToClick) {
            resultText.textContent = `Too early! Wait for Beep`;
            return;
        }
        const rt = performance.now() - startTime;
        results.push(rt);
        resultText.textContent = `Trial ${currentTrial}: ${rt.toFixed(1)} ms`;
        // Canvas color handling to show a click
        ctx.fillStyle = '#36373C';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      Frequency: ${entry.frequency} Hz<br>
      Trials: ${entry.trials} | Delays: ${entry.minDelay}s – ${entry.maxDelay}s<br>
      Results (ms): ${entry.results.map(r => r.toFixed(1)).join(', ')}<br>
      <strong>Average: ${avg.toFixed(1)} ms</strong>
    `;
        historyContent.insertBefore(div, historyContent.firstChild);
        historyContent.insertBefore(hr, div);
    }
}

export { renderFreeplaySound };
