// Import all view render functions
import { renderFreeplayVisual } from './views/freeplayVisual.js';
import { renderFreeplaySound } from './views/freeplaySound.js';
import { renderTesterVisual } from './views/testerVisual.js';
import { renderStats } from './views/stats.js';

const viewContainer = document.getElementById('viewContainer');

// Load saved history from localStorage
let sessionHistory = JSON.parse(
  localStorage.getItem('reactionTestHistory') || '[]'
);

// Function to load a view
function loadView(view) {
  viewContainer.innerHTML = '';

  switch (view) {
    case 'freeplay-visual':
      renderFreeplayVisual(viewContainer, sessionHistory);
      break;
    case 'freeplay-sound':
      renderFreeplaySound(viewContainer, sessionHistory);
      break;
    case 'tester-visual':
      renderTesterVisual(viewContainer, sessionHistory);
      break;
    case 'stats':
      renderStats(viewContainer, sessionHistory);
      break;
    default:
      viewContainer.innerHTML =
        '<p style="text-align:center; padding:2rem;">View not found</p>';
  }
}

// Top navigation
document.querySelectorAll('#topBar button').forEach(btn => {
  btn.addEventListener('click', e => {
    document.querySelectorAll('#topBar button').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');

    const view = e.currentTarget.dataset.view;
    loadView(view);
  });
});

// Load default view on start
loadView('freeplay-visual');
