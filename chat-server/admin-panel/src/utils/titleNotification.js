// Flashing tab title notification for new messages

const ORIGINAL_TITLE = document.title;
const FLASH_TITLE = '💬 Нове повідомлення!';
const FLASH_INTERVAL = 1000; // ms

let flashIntervalId = null;

export function startTitleFlash() {
  // Only flash if tab is not visible
  if (!document.hidden) return;
  // Don't start another interval if already flashing
  if (flashIntervalId) return;

  let showFlash = true;
  flashIntervalId = setInterval(() => {
    document.title = showFlash ? FLASH_TITLE : ORIGINAL_TITLE;
    showFlash = !showFlash;
  }, FLASH_INTERVAL);
  // Show flash title immediately
  document.title = FLASH_TITLE;
}

export function stopTitleFlash() {
  if (flashIntervalId) {
    clearInterval(flashIntervalId);
    flashIntervalId = null;
  }
  document.title = ORIGINAL_TITLE;
}

// Auto-stop when tab becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    stopTitleFlash();
  }
});
