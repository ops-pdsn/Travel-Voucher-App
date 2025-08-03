// Expense Voucher Manager Application
class ExpenseVoucherApp {
    constructor() {
        this.vouchers = [];
        this.currentVoucher = null;
        this.currentEditingExpenseIndex = -1;
        this.expenseCategories = [
            {id: "bus", name: "Bus", icon: "🚌"},
            {id: "auto", name: "Auto Rickshaw", icon: "🛺"},
            {id: "taxi", name: "Taxi", icon: "🚖"}, 
            {id: "food", name: "Food Allowance", icon: "🍽️"},
            {id: "fuel", name: "Fuel (₹3.5/L)", icon: "⛽", rate: 3.5},
            {id: "other", name: "Other Expenses", icon: "📝"}
        ];
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateDashboard();
        this.renderRecentVouchers();
        this.renderAllVouchers();
        this.populateExportSelect();
    }

    // Data Management
    loadData() {
        const savedVouchers = localStorage.getItem('expenseVouchers');
        if (savedVouchers) {
            this.vouchers = JSON.parse(savedVouchers);
        } else {
            // Load sample data
            this.vouchers = [
                {
                    id: "V001",
                    title: "Field Visit - Project Alpha",
                    type: "Project",
                    dateRange: "2025-01-15 to 2025-01-20",
                    status: "Draft",
                    totalAmount: 575.00,
                    expenses: [
                        {date: "2025-01-15", category: "bus", amount: 45.00, description: "Travel to site"},
                        {date: "2025-01-15", category: "food", amount: 200.00, description: "Lunch allowance"},
                        {date: "2025-01-16", category: "fuel", amount: 105.00, description: "30L fuel at ₹3.5/L"},
                        {date: "2025-01-17", category: "taxi", amount: 150.00, description: "Site to office"},
                        {date: "2025-01-18", category: "other", amount: 75.00, description: "Site materials"}
                    ],
                    createdAt: new Date().toISOString()
                },
                {
                    id: "V002", 
                    title: "Monthly Expenses - January 2025",
                    type: "Month",
                    dateRange: "January 2025",
                    status: "Submitted",
                    totalAmount: 500.00,
                    expenses: [
                        {date: "2025-01-05", category: "auto", amount: 80.00, description: "Client meeting"},
                        {date: "2025-01-10", category: "food", amount: 300.00, description: "Daily allowance"},
                        {date: "2025-01-12", category: "bus", amount: 120.00, description: "Inter-city travel"}
                    ],
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveData();
        }
    }

    saveData() {
        localStorage.setItem('expenseVouchers', JSON.stringify(this.vouchers));
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav__item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // Quick create button
        document.querySelector('.quick-create-btn').addEventListener('click', () => {
            this.switchSection('create');
        });

        // Voucher form
        document.getElementById('voucherForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitVoucher();
        });

        // Save draft button
        document.getElementById('saveDraftBtn').addEventListener('click', () => {
            this.saveDraft();
        });

        // Add expense button
        document.getElementById('addExpenseBtn').addEventListener('click', () => {
            this.openExpenseModal();
        });

        // Expense modal
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveExpense();
        });

        // Modal controls
        document.querySelector('.modal__close').addEventListener('click', () => {
            this.closeExpenseModal();
        });
        
        document.getElementById('cancelExpenseBtn').addEventListener('click', () => {
            this.closeExpenseModal();
        });

        document.getElementById('saveExpenseBtn').addEventListener('click', () => {
            this.saveExpense();
        });

        document.querySelector('.modal__backdrop').addEventListener('click', () => {
            this.closeExpenseModal();
        });

        // Category change handler for fuel calculation
        document.getElementById('expenseCategory').addEventListener('change', (e) => {
            this.handleCategoryChange(e.target.value);
        });

        // Fuel quantity calculation
        document.getElementById('fuelQuantity').addEventListener('input', (e) => {
            this.calculateFuelAmount(e.target.value);
        });

        // Status filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterVouchers(e.target.value);
        });

        // Export controls
        document.getElementById('exportVoucherSelect').addEventListener('change', (e) => {
            const enabled = e.target.value !== '';
            document.getElementById('exportPdfBtn').disabled = !enabled;
            document.getElementById('exportExcelBtn').disabled = !enabled;
            
            if (enabled) {
                this.showExportPreview(e.target.value);
            } else {
                document.getElementById('exportPreview').innerHTML = '';
            }
        });

        document.getElementById('exportPdfBtn').addEventListener('click', () => {
            const voucherId = document.getElementById('exportVoucherSelect').value;
            this.exportToPDF(voucherId);
        });

        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            const voucherId = document.getElementById('exportVoucherSelect').value;
            this.exportToExcel(voucherId);
        });
    }

    // Navigation
    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav__item').forEach(item => {
            item.classList.remove('nav__item--active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('nav__item--active');

        // Update sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('section--active');
        });
        document.getElementById(sectionName).classList.add('section--active');

        // Reset create form when switching away
        if (sectionName !== 'create') {
            this.resetCreateForm();
        }

        // Update data when switching to certain sections
        if (sectionName === 'dashboard') {
            this.updateDashboard();
            this.renderRecentVouchers();
        } else if (sectionName === 'vouchers') {
            this.renderAllVouchers();
        } else if (sectionName === 'export') {
            this.populateExportSelect();
        }
    }

    // Dashboard
    updateDashboard() {
        const totalVouchers = this.vouchers.length;
        const totalExpenses = this.vouchers.reduce((sum, voucher) => sum + voucher.totalAmount, 0);
        const pendingVouchers = this.vouchers.filter(v => v.status === 'Draft').length;

        document.getElementById('totalVouchers').textContent = totalVouchers;
        document.getElementById('totalExpenses').textContent = `₹${totalExpenses.toFixed(2)}`;
        document.getElementById('pendingVouchers').textContent = pendingVouchers;
    }

    renderRecentVouchers() {
        const container = document.getElementById('recentVouchersList');
        const recentVouchers = this.vouchers.slice(-3).reverse();

        if (recentVouchers.length === 0) {
            container.innerHTML = this.getEmptyState('No vouchers yet', 'Create your first expense voucher to get started');
            return;
        }

        container.innerHTML = recentVouchers.map(voucher => this.createVoucherHTML(voucher, true)).join('');
        this.attachVoucherActions();
    }

    renderAllVouchers() {
        const container = document.getElementById('allVouchersList');
        
        if (this.vouchers.length === 0) {
            container.innerHTML = this.getEmptyState('No vouchers found', 'Create your first expense voucher');
            return;
        }

        container.innerHTML = this.vouchers.map(voucher => this.createVoucherHTML(voucher)).join('');
        this.attachVoucherActions();
    }

    createVoucherHTML(voucher, isRecent = false) {
        return `
            <div class="voucher-item" data-voucher-id="${voucher.id}">
                <div class="voucher-item__header">
                    <h3 class="voucher-item__title">${voucher.title}</h3>
                    <span class="status-badge status-badge--${voucher.status.toLowerCase()}">${voucher.status}</span>
                </div>
                <div class="voucher-item__meta">
                    <span>📅 ${voucher.dateRange}</span>
                    <span>📋 ${voucher.type} Based</span>
                    <span>📊 ${voucher.expenses.length} expenses</span>
                </div>
                <div class="voucher-item__footer">
                    <div class="voucher-item__amount">₹${voucher.totalAmount.toFixed(2)}</div>
                    <div class="voucher-actions">
                        ${voucher.status === 'Draft' ? `<button class="btn btn--sm btn--secondary edit-voucher">Edit</button>` : ''}
                        <button class="btn btn--sm btn--outline view-voucher">View</button>
                    </div>
                </div>
            </div>
        `;
    }

    attachVoucherActions() {
        document.querySelectorAll('.edit-voucher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const voucherId = e.target.closest('.voucher-item').dataset.voucherId;
                this.editVoucher(voucherId);
            });
        });

        document.querySelectorAll('.view-voucher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const voucherId = e.target.closest('.voucher-item').dataset.voucherId;
                this.viewVoucher(voucherId);
            });
        });
    }

    // Voucher Management
    editVoucher(voucherId) {
        const voucher = this.vouchers.find(v => v.id === voucherId);
        if (!voucher) return;

        this.currentVoucher = voucher;
        
        // Populate form
        document.getElementById('voucherTitle').value = voucher.title;
        document.getElementById('voucherType').value = voucher.type;
        document.getElementById('dateRange').value = voucher.dateRange;

        // Render expenses
        this.renderExpenses();
        this.calculateTotal();

        // Switch to create section
        this.switchSection('create');
        this.showMessage('Voucher loaded for editing', 'info');
    }

    viewVoucher(voucherId) {
        const voucher = this.vouchers.find(v => v.id === voucherId);
        if (!voucher) return;

        // For now, just show in export preview
        document.getElementById('exportVoucherSelect').value = voucherId;
        this.showExportPreview(voucherId);
        this.switchSection('export');
    }

    submitVoucher() {
        if (!this.validateVoucherForm()) return;

        const formData = this.getVoucherFormData();
        
        if (this.currentVoucher) {
            // Update existing voucher
            Object.assign(this.currentVoucher, formData);
            this.currentVoucher.status = 'Submitted';
            this.showMessage('Voucher updated and submitted successfully!', 'success');
        } else {
            // Create new voucher
            const newVoucher = {
                ...formData,
                id: this.generateVoucherId(),
                status: 'Submitted',
                createdAt: new Date().toISOString()
            };
            this.vouchers.push(newVoucher);
            this.showMessage('Voucher submitted successfully!', 'success');
        }

        this.saveData();
        this.resetCreateForm();
        this.updateDashboard();
    }

    saveDraft() {
        if (!this.validateVoucherForm(false)) return;

        const formData = this.getVoucherFormData();

        if (this.currentVoucher) {
            // Update existing draft
            Object.assign(this.currentVoucher, formData);
            this.showMessage('Draft updated successfully!', 'success');
        } else {
            // Create new draft
            const newVoucher = {
                ...formData,
                id: this.generateVoucherId(),
                status: 'Draft',
                createdAt: new Date().toISOString()
            };
            this.vouchers.push(newVoucher);
            this.showMessage('Draft saved successfully!', 'success');
        }

        this.saveData();
        this.updateDashboard();
    }

    getVoucherFormData() {
        return {
            title: document.getElementById('voucherTitle').value,
            type: document.getElementById('voucherType').value,
            dateRange: document.getElementById('dateRange').value,
            expenses: this.currentVoucher ? this.currentVoucher.expenses : [],
            totalAmount: this.calculateTotalAmount()
        };
    }

    validateVoucherForm(requireExpenses = true) {
        const title = document.getElementById('voucherTitle').value.trim();
        const type = document.getElementById('voucherType').value;
        const dateRange = document.getElementById('dateRange').value.trim();

        if (!title || !type || !dateRange) {
            this.showMessage('Please fill in all required fields', 'error');
            return false;
        }

        const expenses = this.currentVoucher ? this.currentVoucher.expenses : [];
        if (requireExpenses && expenses.length === 0) {
            this.showMessage('Please add at least one expense', 'error');
            return false;
        }

        return true;
    }

    generateVoucherId() {
        const lastId = this.vouchers.length > 0 
            ? Math.max(...this.vouchers.map(v => parseInt(v.id.substring(1)))) 
            : 0;
        return `V${String(lastId + 1).padStart(3, '0')}`;
    }

    resetCreateForm() {
        document.getElementById('voucherForm').reset();
        this.currentVoucher = null;
        this.renderExpenses();
        this.calculateTotal();
    }

    // Expense Management
    openExpenseModal(expenseIndex = -1) {
        this.currentEditingExpenseIndex = expenseIndex;
        
        if (expenseIndex >= 0 && this.currentVoucher) {
            // Edit existing expense
            const expense = this.currentVoucher.expenses[expenseIndex];
            document.getElementById('expenseDate').value = expense.date;
            document.getElementById('expenseCategory').value = expense.category;
            document.getElementById('expenseAmount').value = expense.amount;
            document.getElementById('expenseDescription').value = expense.description;
            
            if (expense.category === 'fuel') {
                const quantity = expense.amount / 3.5;
                document.getElementById('fuelQuantity').value = quantity;
            }
        } else {
            // New expense
            document.getElementById('expenseForm').reset();
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
        }

        this.handleCategoryChange(document.getElementById('expenseCategory').value);
        document.getElementById('expenseModal').classList.remove('hidden');
    }

    closeExpenseModal() {
        document.getElementById('expenseModal').classList.add('hidden');
        document.getElementById('expenseForm').reset();
        this.currentEditingExpenseIndex = -1;
    }

    handleCategoryChange(category) {
        const fuelGroup = document.getElementById('fuelQuantityGroup');
        const amountGroup = document.getElementById('amountGroup');
        
        if (category === 'fuel') {
            fuelGroup.style.display = 'block';
            amountGroup.style.display = 'none';
        } else {
            fuelGroup.style.display = 'none';
            amountGroup.style.display = 'block';
        }
    }

    calculateFuelAmount(quantity) {
        if (quantity && !isNaN(quantity)) {
            const amount = parseFloat(quantity) * 3.5;
            document.getElementById('expenseAmount').value = amount.toFixed(2);
        }
    }

    saveExpense() {
        const date = document.getElementById('expenseDate').value;
        const category = document.getElementById('expenseCategory').value;
        const description = document.getElementById('expenseDescription').value;
        
        let amount;
        if (category === 'fuel') {
            const quantity = document.getElementById('fuelQuantity').value;
            if (!quantity || isNaN(quantity) || quantity <= 0) {
                this.showMessage('Please enter valid fuel quantity', 'error');
                return;
            }
            amount = parseFloat(quantity) * 3.5;
        } else {
            amount = document.getElementById('expenseAmount').value;
            if (!amount || isNaN(amount) || amount <= 0) {
                this.showMessage('Please enter valid amount', 'error');
                return;
            }
            amount = parseFloat(amount);
        }

        if (!date || !category) {
            this.showMessage('Please fill in all required fields', 'error');
            return;
        }

        const expense = {
            date,
            category,
            amount,
            description: description || ''
        };

        // Initialize current voucher if needed
        if (!this.currentVoucher) {
            this.currentVoucher = {
                expenses: []
            };
        }

        if (this.currentEditingExpenseIndex >= 0) {
            // Update existing expense
            this.currentVoucher.expenses[this.currentEditingExpenseIndex] = expense;
            this.showMessage('Expense updated successfully!', 'success');
        } else {
            // Add new expense
            this.currentVoucher.expenses.push(expense);
            this.showMessage('Expense added successfully!', 'success');
        }

        this.renderExpenses();
        this.calculateTotal();
        this.closeExpenseModal();
    }

    renderExpenses() {
        const container = document.getElementById('expensesList');
        
        if (!this.currentVoucher || !this.currentVoucher.expenses || this.currentVoucher.expenses.length === 0) {
            container.innerHTML = '<p class="empty-state">No expenses added yet</p>';
            return;
        }

        container.innerHTML = this.currentVoucher.expenses.map((expense, index) => {
            const categoryInfo = this.expenseCategories.find(cat => cat.id === expense.category);
            return `
                <div class="expense-item">
                    <div class="expense-item__details">
                        <div class="expense-item__category">
                            ${categoryInfo ? categoryInfo.icon : '📝'} ${categoryInfo ? categoryInfo.name : expense.category}
                        </div>
                        <div class="expense-item__meta">
                            ${expense.date} • ${expense.description || 'No description'}
                        </div>
                    </div>
                    <div class="expense-item__amount">₹${expense.amount.toFixed(2)}</div>
                    <div class="expense-actions">
                        <button class="btn btn--sm btn--secondary" onclick="app.openExpenseModal(${index})">Edit</button>
                        <button class="expense-item__remove" onclick="app.removeExpense(${index})">Remove</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    removeExpense(index) {
        if (!this.currentVoucher || !this.currentVoucher.expenses) return;
        
        this.currentVoucher.expenses.splice(index, 1);
        this.renderExpenses();
        this.calculateTotal();
        this.showMessage('Expense removed successfully!', 'success');
    }

    calculateTotal() {
        const total = this.calculateTotalAmount();
        document.getElementById('totalAmount').textContent = total.toFixed(2);
    }

    calculateTotalAmount() {
        if (!this.currentVoucher || !this.currentVoucher.expenses) return 0;
        return this.currentVoucher.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    }

    // Filtering
    filterVouchers(status) {
        const filteredVouchers = status ? 
            this.vouchers.filter(v => v.status === status) : 
            this.vouchers;

        const container = document.getElementById('allVouchersList');
        
        if (filteredVouchers.length === 0) {
            container.innerHTML = this.getEmptyState('No vouchers found', 'Try adjusting your filter criteria');
            return;
        }

        container.innerHTML = filteredVouchers.map(voucher => this.createVoucherHTML(voucher)).join('');
        this.attachVoucherActions();
    }

    // Export Functions
    populateExportSelect() {
        const select = document.getElementById('exportVoucherSelect');
        const options = this.vouchers.map(voucher => 
            `<option value="${voucher.id}">${voucher.title} (${voucher.status})</option>`
        ).join('');
        
        select.innerHTML = '<option value="">Select voucher to export</option>' + options;
    }

    showExportPreview(voucherId) {
        const voucher = this.vouchers.find(v => v.id === voucherId);
        if (!voucher) return;

        const container = document.getElementById('exportPreview');
        container.innerHTML = `
            <h3>Preview: ${voucher.title}</h3>
            <div class="export-details">
                <p><strong>Voucher ID:</strong> ${voucher.id}</p>
                <p><strong>Type:</strong> ${voucher.type} Based</p>
                <p><strong>Date Range:</strong> ${voucher.dateRange}</p>
                <p><strong>Status:</strong> ${voucher.status}</p>
                <p><strong>Total Amount:</strong> ₹${voucher.totalAmount.toFixed(2)}</p>
            </div>
            <table class="export-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${voucher.expenses.map(expense => {
                        const categoryInfo = this.expenseCategories.find(cat => cat.id === expense.category);
                        return `
                            <tr>
                                <td>${expense.date}</td>
                                <td>${categoryInfo ? categoryInfo.name : expense.category}</td>
                                <td>${expense.description || '-'}</td>
                                <td>₹${expense.amount.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>Total</strong></td>
                        <td><strong>₹${voucher.totalAmount.toFixed(2)}</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    exportToPDF(voucherId) {
        const voucher = this.vouchers.find(v => v.id === voucherId);
        if (!voucher) return;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text('Expense Voucher', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Voucher ID: ${voucher.id}`, 20, 35);
        doc.text(`Title: ${voucher.title}`, 20, 45);
        doc.text(`Type: ${voucher.type} Based`, 20, 55);
        doc.text(`Date Range: ${voucher.dateRange}`, 20, 65);
        doc.text(`Status: ${voucher.status}`, 20, 75);

        // Expenses table
        let yPos = 95;
        doc.text('Expenses:', 20, yPos);
        yPos += 10;

        voucher.expenses.forEach((expense, index) => {
            const categoryInfo = this.expenseCategories.find(cat => cat.id === expense.category);
            doc.text(`${expense.date} - ${categoryInfo ? categoryInfo.name : expense.category}`, 20, yPos);
            doc.text(`₹${expense.amount.toFixed(2)}`, 150, yPos);
            if (expense.description) {
                yPos += 7;
                doc.setFontSize(10);
                doc.text(`${expense.description}`, 25, yPos);
                doc.setFontSize(12);
            }
            yPos += 10;
        });

        // Total
        doc.setFontSize(14);
        doc.text(`Total Amount: ₹${voucher.totalAmount.toFixed(2)}`, 20, yPos + 10);

        // Save
        doc.save(`${voucher.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        this.showMessage('PDF exported successfully!', 'success');
    }

    exportToExcel(voucherId) {
        const voucher = this.vouchers.find(v => v.id === voucherId);
        if (!voucher) return;

        const ws_data = [
            ['Expense Voucher'],
            [''],
            ['Voucher ID', voucher.id],
            ['Title', voucher.title],
            ['Type', voucher.type + ' Based'],
            ['Date Range', voucher.dateRange],
            ['Status', voucher.status],
            [''],
            ['Date', 'Category', 'Description', 'Amount']
        ];

        voucher.expenses.forEach(expense => {
            const categoryInfo = this.expenseCategories.find(cat => cat.id === expense.category);
            ws_data.push([
                expense.date,
                categoryInfo ? categoryInfo.name : expense.category,
                expense.description || '',
                expense.amount
            ]);
        });

        ws_data.push(['', '', 'Total', voucher.totalAmount]);

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Expense Voucher');

        XLSX.writeFile(wb, `${voucher.title.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
        this.showMessage('Excel file exported successfully!', 'success');
    }

    // Utility Functions
    showMessage(text, type = 'info') {
        const container = document.getElementById('messageContainer');
        const message = document.createElement('div');
        message.className = `message message--${type}`;
        message.textContent = text;
        
        container.appendChild(message);
        
        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    getEmptyState(title, description) {
        return `
            <div class="empty-state">
                <div class="empty-state__icon">📋</div>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        `;
    }
}

// Initialize the application
const app = new ExpenseVoucherApp();