/**
 * StudentHub Client-Side Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('[StudentHub Portal] Client scripts loaded.');

  // VULNERABILITY: DOM-Based XSS
  // Checks URL query parameter 'notice' or URL hash and injects directly into innerHTML sink!
  const urlParams = new URLSearchParams(window.location.search);
  const noticeParam = urlParams.get('notice');
  const hashParam = window.location.hash.substring(1);

  const noticeContainer = document.getElementById('dom-xss-notice-container');
  if (noticeContainer) {
    if (noticeParam) {
      // VULNERABLE SINK: Direct innerHTML assignment from URL parameter
      noticeContainer.innerHTML = `<div class="alert alert-success">📢 <strong>Notice:</strong> ${decodeURIComponent(noticeParam)}</div>`;
    } else if (hashParam) {
      // VULNERABLE SINK: Direct innerHTML assignment from URL hash
      noticeContainer.innerHTML = `<div class="alert alert-success">📌 <strong>Announcement:</strong> ${decodeURIComponent(hashParam)}</div>`;
    }
  }

  // Client-side quick filter / search helper
  const tableSearchInput = document.getElementById('tableSearchInput');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('keyup', function() {
      const value = this.value.toLowerCase();
      const rows = document.querySelectorAll('.filterable-table tbody tr');
      rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(value) ? '' : 'none';
      });
    });
  }
});
