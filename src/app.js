// Elements
const loginScreen = document.getElementById('login-screen');
const appUI = document.getElementById('app');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const usernameInput = document.getElementById('username-input');
const userDisplay = document.getElementById('user-display');

const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.tab');

const titleInput = document.getElementById('voucher-title');
const dateInput = document.getElementById('voucher-date');
const categorySelect = document.getElementById('expense-category');
const fuelInputDiv = document.getElementById('fuel-input');
const fuelKmInput = document.getElementById('fuel-km');
const amountInputDiv = document.getElementById('amount-input');
const amountInput = document.getElementById('expense-amount');
const descInput = document.getElementById('expense-desc');
const addExpenseBtn = document.getElementById('add-expense-btn');
const expenseList = document.getElementById('expense-list');
const totalDisplay = document.getElementById('total-display');
const saveDraftBtn = document.getElementById('save-draft-btn');
const submitBtn = document.getElementById('submit-btn');

const voucherList = document.getElementById('voucher-list');
const exportSelect = document.getElementById('export-select');
const voucherPreview = document.getElementById('voucher-preview');
const exportPdfBtn = document.getElementById('export-pdf-btn');

// State
let currentUser = null;
let vouchers = JSON.parse(localStorage.getItem('vouchers') || '[]');
let currentVoucher = { id: '', user: '', title:'', date:'', status:'Draft', expenses: [] };

// Auth Logic
loginBtn.onclick = () => {
  const user = usernameInput.value.trim();
  if (!user) return alert('Enter username');
  currentUser = user;
  localStorage.setItem('currentUser', user);
  initApp();
};
logoutBtn.onclick = () => {
  localStorage.removeItem('currentUser');
  location.reload();
};

// Init
function initApp(){
  loginScreen.classList.add('hidden');
  appUI.classList.remove('hidden');
  userDisplay.textContent = `User: ${currentUser}`;
  renderTabs();
  renderVoucherList();
  populateExport();
}

// Tabs
tabs.forEach(btn => btn.onclick = () => {
  tabs.forEach(b=>b.classList.remove('active'));
  sections.forEach(s=>s.classList.add('hidden'));
  btn.classList.add('active');
  document.getElementById(btn.dataset.tab).classList.remove('hidden');
});

// Expense Category Toggle
categorySelect.onchange = () => {
  const isFuel = categorySelect.value === 'fuel';
  fuelInputDiv.classList.toggle('hidden', !isFuel);
  amountInputDiv.classList.toggle('hidden', isFuel);
};

// Add Expense
addExpenseBtn.onclick = () => {
  const cat = categorySelect.value;
  const date = dateInput.value;
  const desc = descInput.value;
  const amt = cat==='fuel'
    ? (parseFloat(fuelKmInput.value)||0) * 3.5
    : parseFloat(amountInput.value)||0;
  if (!date || !desc) return alert('Fill date & description');
  currentVoucher.expenses.push({ date, category: cat, amount: amt, description: desc });
  updateExpenseList();
};

// Update Expense List
function updateExpenseList(){
  expenseList.innerHTML='';
  let tot=0;
  currentVoucher.expenses.forEach(e=>{
    tot+=e.amount;
    const li=document.createElement('li');
    li.textContent=`${e.date} | ${e.category.toUpperCase()} | ₹${e.amount.toFixed(2)} | ${e.description}`;
    expenseList.appendChild(li);
  });
  totalDisplay.textContent=tot.toFixed(2);
}

// Save/Submit
saveDraftBtn.onclick = ()=>saveVoucher('Draft');
submitBtn.onclick = ()=>saveVoucher('Submitted');
function saveVoucher(status){
  if(!titleInput.value||!dateInput.value) return alert('Title & date required');
  currentVoucher = {
    id: currentVoucher.id||`V${Date.now()}`,
    user: currentUser,
    title: titleInput.value,
    date: dateInput.value,
    status,
    expenses: currentVoucher.expenses
  };
  vouchers = vouchers.filter(v=>v.id!==currentVoucher.id);
  vouchers.push(currentVoucher);
  localStorage.setItem('vouchers', JSON.stringify(vouchers));
  alert(`Voucher ${status}`);
  resetForm(); renderVoucherList(); populateExport();
}
function resetForm(){
  currentVoucher={ id:'', user:'', title:'', date:'', status:'Draft', expenses:[]};
  expenseList.innerHTML=''; totalDisplay.textContent='0.00';
  titleInput.value=''; dateInput.value='';
}

// Render Vouchers
function renderVoucherList(){
  voucherList.innerHTML='';
  vouchers.filter(v=>v.user===currentUser).forEach(v=>{
    const li=document.createElement('li');
    li.textContent=`${v.id} | ${v.title} | ${v.status}`;
    voucherList.appendChild(li);
  });
}

// Export
populateExport = ()=> {
  exportSelect.innerHTML='';
  vouchers.filter(v=>v.user===currentUser && v.status==='Submitted')
    .forEach(v=>{
      const opt=new Option(`${v.id} - ${v.title}`, v.id);
      exportSelect.add(opt);
    });
};
exportPdfBtn.onclick = ()=>{
  const vid=exportSelect.value;
  const v=vouchers.find(x=>x.id===vid); if(!v) return;
  voucherPreview.innerHTML=`
    <h2>Voucher ${v.id}</h2>
    <p>${v.title} | ${v.date}</p>
    <ul>${v.expenses.map(e=>`<li>${e.date} - ${e.category.toUpperCase()} - ₹${e.amount.toFixed(2)} - ${e.description}</li>`).join('')}</ul>
    <p>Total: ₹${v.expenses.reduce((a,e)=>a+e.amount,0).toFixed(2)}</p>`;
  html2pdf().from(voucherPreview).save(`Voucher_${v.id}.pdf`);
};

// Auto-login
window.onload = ()=>{
  const u=localStorage.getItem('currentUser');
  if(u){ currentUser=u; initApp(); }
};
