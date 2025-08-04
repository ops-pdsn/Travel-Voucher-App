// auth.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = 'https://uypgadhdtyllebloclxk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5cGdhZGhkdHlsbGVibG9jbHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxODg3NjUsImV4cCI6MjA2OTc2NDc2NX0.-fnyCXVqPand2vh5YYhPkHTIV-tZH-ZXuIF9wHTKdRI';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;

let currentUser = null;

const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const loginTabBtn = document.getElementById('loginTabBtn');
const registerTabBtn = document.getElementById('registerTabBtn');
const authActionBtn = document.getElementById('authActionBtn');
const modalTitle = document.getElementById('modalTitle');
const userNameDisplay = document.getElementById('userNameDisplay');
const appContent = document.getElementById('appContent');

let isLogin = true;

function switchToLogin() {
  isLogin = true;
  loginTabBtn.classList.add('btn--primary');
  loginTabBtn.classList.remove('btn--secondary');
  registerTabBtn.classList.add('btn--secondary');
  registerTabBtn.classList.remove('btn--primary');
  authActionBtn.textContent = "Login";
  modalTitle.textContent = "Login";
}

function switchToRegister() {
  isLogin = false;
  registerTabBtn.classList.add('btn--primary');
  registerTabBtn.classList.remove('btn--secondary');
  loginTabBtn.classList.add('btn--secondary');
  loginTabBtn.classList.remove('btn--primary');
  authActionBtn.textContent = "Register";
  modalTitle.textContent = "Register";
}

loginTabBtn.onclick = switchToLogin;
registerTabBtn.onclick = switchToRegister;

// In auth.js, update showAppAfterLogin function
async function showAppAfterLogin(user) {
  currentUser = user;
  userNameDisplay.textContent = user.email || 'User';
  authModal.style.display = 'none';
  appContent.style.display = 'block';

  // Initialize app after showing content
  if (!window.expenseApp) {
    window.expenseApp = new ExpenseVoucherApp();
  }
  
  if (window.expenseApp && window.expenseApp.init) {
    await window.expenseApp.init();
  }
}


async function initAuth() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (session && session.user) {
    await showAppAfterLogin(session.user);
  } else {
    authModal.style.display = 'flex';
    appContent.style.display = 'none';
    switchToLogin();
  }
}

authForm.onsubmit = async (e) => {
  e.preventDefault();

  const email = authForm.authEmail.value.trim();
  const password = authForm.authPassword.value.trim();

  if (!email || !password) {
    alert('Please enter email and password.');
    return;
  }

  if (isLogin) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert(error.message);
    await showAppAfterLogin(data.user);
  } else {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    alert('Registration successful! Check your email inbox if required.');
    switchToLogin();
  }
};

window.addEventListener('DOMContentLoaded', initAuth);
