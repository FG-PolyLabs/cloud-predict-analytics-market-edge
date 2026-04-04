// Firebase config is set as window.FIREBASE_CONFIG by Hugo at build time (see head.html partial).
firebase.initializeApp(window.FIREBASE_CONFIG);

// Handle redirect result on page load (for browsers that fell back from popup to redirect)
firebase.auth().getRedirectResult().catch(function(e) {
  if (e.code === 'auth/missing-initial-state') {
    console.warn('Firebase: clearing stale redirect state');
    sessionStorage.clear();
  }
});

async function authSignOut() {
  await firebase.auth().signOut();
  window.location.href = "/";
}

// Sign in with Google — prefer popup, fall back to redirect for mobile/blocked popups
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request') {
      await firebase.auth().signInWithRedirect(provider);
    } else if (e.code !== 'auth/popup-closed-by-user') {
      showToast('Sign-in failed: ' + e.message, 'danger');
    }
  }
}

function isEmailAllowed(email) {
  let raw = window.ALLOWED_EMAILS || [];
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (_) { raw = raw.split(','); }
  }
  const allowed = raw.map(e => e.trim().toLowerCase()).filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.includes(email.toLowerCase());
}

firebase.auth().onAuthStateChanged(user => {
  const emailEl   = document.getElementById('nav-user-email');
  const logoutBtn = document.getElementById('btn-logout');
  const loginBtn  = document.getElementById('btn-login');
  const navLinks  = document.getElementById('nav-links');

  if (user) {
    if (emailEl)   emailEl.textContent = user.email;
    if (logoutBtn) logoutBtn.classList.remove('d-none');
    if (loginBtn)  loginBtn.classList.add('d-none');
    if (navLinks)  navLinks.style.removeProperty('display');
  } else {
    if (emailEl)   emailEl.textContent = '';
    if (logoutBtn) logoutBtn.classList.add('d-none');
    if (loginBtn)  loginBtn.classList.remove('d-none');
    if (navLinks)  navLinks.style.setProperty('display', 'none', 'important');
  }
});
