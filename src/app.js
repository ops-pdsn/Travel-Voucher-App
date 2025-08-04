class ExpenseVoucherApp {
  constructor() {
    this.supabase = window.supabase;
    this.user = null;

    // DOM elements
    this.sections = document.querySelectorAll(".section");
    this.navItems = document.querySelectorAll(".nav__item");
    this.logoutBtn = document.getElementById("logoutBtn");
    this.createBtn = document.querySelector(".quick-create-btn");
    this.voucherForm = document.getElementById("voucherForm");
    this.expensesList = document.getElementById("expensesList");
    this.totalAmountEl = document.getElementById("totalAmount");
    this.messageContainer = document.getElementById("messageContainer");
    this.loader = document.getElementById("loader");

    // Expense modal
    this.expenseModal = document.getElementById("expenseModal");
    this.addExpenseBtn = document.getElementById("addExpenseBtn");
    this.saveExpenseBtn = document.getElementById("saveExpenseBtn");
    this.cancelExpenseBtn = document.getElementById("cancelExpenseBtn");
    this.modalCloseBtn = this.expenseModal.querySelector(".modal__close");

    // Expense form fields
    this.expenseDate = document.getElementById("expenseDate");
    this.expenseCategory = document.getElementById("expenseCategory");
    this.expenseAmount = document.getElementById("expenseAmount");
    this.expenseDescription = document.getElementById("expenseDescription");
    this.fuelQuantityGroup = document.getElementById("fuelQuantityGroup");
    this.fuelQuantity = document.getElementById("fuelQuantity");

    // Data
    this.expenses = [];
    this.totalAmount = 0;
    this._submitting = false;
    this.fuelToastEl = null;
    this.currentEditingVoucherId = null;

    this.init();
  }

  async init() {
    console.log("ExpenseVoucherApp initializing...");
    if (this.loader) this.loader.style.display = "flex";

    // Get logged-in user
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    this.user = user;
    if (!this.user) {
      if (this.loader) this.loader.style.display = "none";
      return;
    }

    // Navigation
    this.navItems.forEach((btn) => {
      btn.addEventListener("click", () =>
        this.switchSection(btn.dataset.section)
      );
    });

    // Logout
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener("click", async () => {
        await this.supabase.auth.signOut();
        this.showToast("Logged out successfully!", "success");
        setTimeout(() => window.location.reload(), 1000);
      });
    }

    // Quick create button
    if (this.createBtn) {
      this.createBtn.addEventListener("click", () => {
        this.currentEditingVoucherId = null;
        this.voucherForm.reset();
        this.expenses = [];
        this.renderExpenses();
        this.calculateTotal();
        this.switchSection("create");
      });
    }

    // Voucher form events
    if (this.voucherForm) {
      this.voucherForm.addEventListener("submit", (e) => {
        e.preventDefault();
        if (this._submitting) return;
        this._submitting = true;
        this.submitVoucher("Submitted").finally(
          () => (this._submitting = false)
        );
      });

      const draftBtn = document.getElementById("saveDraftBtn");
      if (draftBtn) {
        draftBtn.addEventListener("click", (e) => {
          e.preventDefault();
          if (this._submitting) return;
          this._submitting = true;
          this.submitVoucher("Draft").finally(() => (this._submitting = false));
        });
      }
    }

    // Expense modal events
    this.addExpenseBtn.addEventListener("click", () => this.openExpenseModal());
    this.saveExpenseBtn.addEventListener("click", () => this.saveExpense());
    this.cancelExpenseBtn.addEventListener("click", () =>
      this.closeExpenseModal()
    );
    this.modalCloseBtn.addEventListener("click", () =>
      this.closeExpenseModal()
    );

    // Category change to toggle fuel input
    this.expenseCategory.addEventListener("change", () => {
      if (this.expenseCategory.value === "fuel") {
        this.fuelQuantityGroup.style.display = "block";
        this.expenseAmount.parentElement.style.display = "none";
      } else {
        this.fuelQuantityGroup.style.display = "none";
        this.expenseAmount.parentElement.style.display = "block";
      }
    });

    // Live fuel calculation toast
    let fuelToastTimer = null;
    this.fuelQuantity.addEventListener("input", () => {
      clearTimeout(fuelToastTimer);
      fuelToastTimer = setTimeout(() => {
        const km = parseFloat(this.fuelQuantity.value || 0);
        if (isNaN(km) || this.expenseCategory.value !== "fuel") return;

        const cost = (km * 3.5).toFixed(2);

        if (this.fuelToastEl) {
          this.fuelToastEl.querySelector(
            ".toast-message"
          ).textContent = `Travel cost ≈ ₹${cost} for ${km} km`;
          return;
        }

        const toast = document.createElement("div");
        toast.className = "toast toast--info";
        toast.innerHTML = `
                    <span class="toast-icon">ℹ️</span>
                    <span class="toast-message">Travel cost ≈ ₹${cost} for ${km} km</span>
                    <span class="toast-close">&times;</span>
                `;
        toast.querySelector(".toast-close").addEventListener("click", () => {
          toast.remove();
          this.fuelToastEl = null;
        });

        this.messageContainer.appendChild(toast);
        this.fuelToastEl = toast;

        setTimeout(() => {
          if (this.fuelToastEl) {
            this.fuelToastEl.remove();
            this.fuelToastEl = null;
          }
        }, 3000);
      }, 300);
    });

    await this.loadDashboard();
    await this.loadVouchersList();
    this.initRealtime();

    if (this.loader) this.loader.style.display = "none";
  }

  showToast(message, type = "info") {
    const icons = { info: "ℹ️", success: "✅", warning: "⚠️", error: "❌" };
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
            <span class="toast-icon">${icons[type] || "ℹ️"}</span>
            <span class="toast-message">${message}</span>
            <span class="toast-close">&times;</span>
        `;
    toast
      .querySelector(".toast-close")
      .addEventListener("click", () => toast.remove());
    this.messageContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  switchSection(sectionId) {
    this.sections.forEach((sec) => sec.classList.remove("section--active"));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add("section--active");

    this.navItems.forEach((btn) => btn.classList.remove("nav__item--active"));
    const activeBtn = [...this.navItems].find(
      (btn) => btn.dataset.section === sectionId
    );
    if (activeBtn) activeBtn.classList.add("nav__item--active");
  }

  openExpenseModal() {
    this.expenseModal.classList.remove("hidden");
  }
  closeExpenseModal() {
    this.expenseModal.classList.add("hidden");
    document.getElementById("expenseForm").reset();
  }

  saveExpense() {
    const category = this.expenseCategory.value;
    if (!category) return this.showToast("Select category!", "info");

    let amount = 0,
      kilometers = 0;
    if (category === "fuel") {
      kilometers = parseFloat(this.fuelQuantity.value || 0);
      if (!kilometers)
        return this.showToast("Enter kilometers for fuel", "error");
      amount = kilometers * 3.5;
    } else {
      amount = parseFloat(this.expenseAmount.value || 0);
      if (!amount) return this.showToast("Enter amount for expense", "error");
    }

    this.expenses.push({
      date: this.expenseDate.value || new Date().toISOString().split("T")[0],
      category,
      amount,
      kilometers,
      description: this.expenseDescription.value,
    });

    this.renderExpenses();
    this.calculateTotal();
    this.closeExpenseModal();
    this.showToast("Expense added successfully!", "success");

    if (this.fuelToastEl) {
      this.fuelToastEl.remove();
      this.fuelToastEl = null;
    }
  }

  renderExpenses() {
    this.expensesList.innerHTML = "";
    this.expenses.forEach((exp, idx) => {
      const div = document.createElement("div");
      div.className = "expense-item";
      div.innerHTML = `
                ${exp.date || "No Date"} - ${exp.category.toUpperCase()} 
                ${exp.kilometers ? `(${exp.kilometers} km)` : ""} 
                - ₹${exp.amount.toFixed(2)}
                <button class="btn btn--small btn--danger" data-index="${idx}">❌</button>
            `;
      div.querySelector("button").addEventListener("click", () => {
        this.expenses.splice(idx, 1);
        this.renderExpenses();
        this.calculateTotal();
        this.showToast("Expense removed", "info");
      });
      this.expensesList.appendChild(div);
    });
  }

  calculateTotal() {
    this.totalAmount = this.expenses.reduce(
      (sum, exp) => sum + (parseFloat(exp.amount) || 0),
      0
    );
    this.totalAmountEl.textContent = this.totalAmount.toFixed(2);
  }

  /** Submit voucher (update if editing) */
  async submitVoucher(status = "Submitted") {
    if (!this.user) return this.showToast("Login first!", "error");

    const title = document.getElementById("voucherTitle").value.trim();
    const type = document.getElementById("voucherType").value;
    const dateRange = document.getElementById("dateRange").value.trim();

    if (!title || !type || !dateRange) {
      return this.showToast("Fill all required fields", "error");
    }

    let voucherId = this.currentEditingVoucherId;
    let voucherData;

    if (voucherId) {
      // Update existing voucher
      const { data, error } = await this.supabase
        .from("vouchers")
        .update({
          title,
          type,
          date_range: dateRange,
          status,
          total: this.totalAmount,
        })
        .eq("id", voucherId)
        .eq("user_id", this.user.id)
        .select("id");

      if (error)
        return this.showToast("Update error: " + error.message, "error");
      voucherData = data[0];
    } else {
      // Insert new voucher
      const { data, error } = await this.supabase
        .from("vouchers")
        .insert([
          {
            user_id: this.user.id,
            title,
            type,
            date_range: dateRange,
            status,
            total: this.totalAmount,
          },
        ])
        .select("id");

      if (error)
        return this.showToast("Insert error: " + error.message, "error");
      voucherData = data[0];
    }

    voucherId = voucherData.id;

    // Delete old expenses if editing
    if (this.currentEditingVoucherId) {
      await this.supabase.from("expenses").delete().eq("voucher_id", voucherId);
    }

    // Insert expenses
    for (const exp of this.expenses) {
      await this.supabase.from("expenses").insert([
        {
          voucher_id: voucherId,
          date: exp.date,
          category: exp.category,
          amount: exp.amount,
          description: exp.description || "",
        },
      ]);
    }

    this.showToast("Voucher saved successfully!", "success");
    this.expenses = [];
    this.renderExpenses();
    this.calculateTotal();
    this.voucherForm.reset();
    this.switchSection("dashboard");
    this.currentEditingVoucherId = null;
  }

  /** Load dashboard */
  async loadDashboard() {
    if (!this.user) return;
    const { data, error } = await this.supabase
      .from("vouchers")
      .select("id, title, status, total, date_range, created_at")
      .eq("user_id", this.user.id)
      .order("created_at", { ascending: false });

    if (error) return console.error("Dashboard load error:", error);

    document.getElementById("totalVouchers").textContent = data.length;
    document.getElementById("totalExpenses").textContent =
      "₹" +
      data.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0).toFixed(2);

    const recentList = document.getElementById("recentVouchersList");
    recentList.innerHTML = "";

    const recentDraft = data.filter((v) => v.status === "Draft").slice(0, 2);
    const recentSubmitted = data
      .filter((v) => v.status === "Submitted")
      .slice(0, 2);

    [...recentDraft, ...recentSubmitted].forEach((v) => {
      const div = document.createElement("div");
      div.className = "voucher-item";
      div.innerHTML = `
                <div class="voucher-left">
                    <div class="voucher-title">
                        ${v.title} <span class="voucher-date-range">(${
        v.date_range || "-"
      })</span>
                    </div>
                    <div class="voucher-total">₹${v.total || 0}</div>
                    <div class="voucher-dates">Created: ${new Date(
                      v.created_at
                    ).toLocaleDateString()}</div>
                </div>
                <div class="voucher-right">
                    <div class="voucher-status ${v.status.toLowerCase()}">${
        v.status
      }</div>
                    <div class="voucher-actions">
                        ${
                          v.status === "Draft"
                            ? `<button class="btn-edit" data-id="${v.id}">✏️ Edit</button>`
                            : ""
                        }
                        <button class="btn-delete" data-id="${
                          v.id
                        }">🗑 Delete</button>
                    </div>
                </div>
            `;
      recentList.appendChild(div);
    });

    // Attach edit & delete events
    recentList
      .querySelectorAll(".btn-edit")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.loadVoucherForEdit(e.target.dataset.id)
        )
      );
    recentList
      .querySelectorAll(".btn-delete")
      .forEach((btn) =>
        btn.addEventListener("click", (e) =>
          this.deleteVoucher(e.target.dataset.id)
        )
      );
  }

  /** Load My Vouchers page */
  async loadVouchersList() {
    if (!this.user) return;

    const filter = document.getElementById("voucherFilter")?.value || "";
    let query = this.supabase
      .from("vouchers")
      .select("id, title, status, total, date_range, created_at")
      .eq("user_id", this.user.id)
      .order("created_at", { ascending: false });

    if (filter) query = query.eq("status", filter);

    const { data, error } = await query;
    if (error) return console.error("My vouchers load error:", error);

    const list = document.getElementById("allVouchersList");
    list.innerHTML = "";

    if (!data || data.length === 0) {
      list.innerHTML = `<div class="empty-state">No vouchers found for this filter.</div>`;
      return;
    }

    data.forEach((v) => {
      const div = document.createElement("div");
      div.className = "voucher-item";

      div.innerHTML = `
            <div class="voucher-left">
                <div class="voucher-title">
                    ${v.title} 
                    <span class="voucher-date-range">(${
                      v.date_range || "-"
                    })</span>
                </div>
                <div class="voucher-total">₹${v.total || 0}</div>
                <div class="voucher-dates">Created: ${new Date(
                  v.created_at
                ).toLocaleDateString()}</div>
            </div>
            <div class="voucher-right">
                <div class="voucher-status ${v.status.toLowerCase()}">${
        v.status
      }</div>
                <div class="voucher-actions">
                    ${
                      v.status === "Draft"
                        ? `<button class="btn-edit" data-id="${v.id}">✏️ Edit</button>`
                        : ""
                    }
                    <button class="btn-delete" data-id="${
                      v.id
                    }">🗑️ Delete</button>
                </div>
            </div>
        `;
      list.appendChild(div);
    });

    // Attach Edit & Delete events
    list.querySelectorAll(".btn-edit").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        this.loadVoucherForEdit(id);
      });
    });

    list.querySelectorAll(".btn-delete").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = e.target.dataset.id;
        if (confirm("Are you sure you want to delete this voucher?")) {
          await this.deleteVoucher(id);
          this.loadVouchersList();
          this.loadDashboard();
        }
      });
    });
  }

  /** Delete voucher & its expenses */
  async deleteVoucher(voucherId) {
    if (
      !confirm(
        "Are you sure you want to delete this voucher? This cannot be undone."
      )
    )
      return;

    await this.supabase.from("expenses").delete().eq("voucher_id", voucherId);
    await this.supabase.from("vouchers").delete().eq("id", voucherId);

    this.showToast("Voucher deleted!", "success");
    this.loadDashboard();
    this.loadVouchersList();
  }

  /** Load draft for editing */
  async loadVoucherForEdit(voucherId) {
    const { data: voucher } = await this.supabase
      .from("vouchers")
      .select("*")
      .eq("id", voucherId)
      .eq("user_id", this.user.id)
      .single();
    const { data: expenses } = await this.supabase
      .from("expenses")
      .select("*")
      .eq("voucher_id", voucherId);

    if (!voucher) return this.showToast("Voucher not found", "error");

    document.getElementById("voucherTitle").value = voucher.title;
    document.getElementById("voucherType").value = voucher.type;
    document.getElementById("dateRange").value = voucher.date_range;
    this.expenses = (expenses || []).map((exp) => ({
      date: exp.date,
      category: exp.category,
      amount: exp.amount,
      kilometers: exp.kilometers || 0,
      description: exp.description,
    }));
    this.renderExpenses();
    this.calculateTotal();

    this.currentEditingVoucherId = voucherId;
    this.switchSection("create");
    this.showToast("Voucher loaded for editing!", "success");
  }

  /** Realtime listener for vouchers */
  initRealtime() {
    this.supabase
      .channel("vouchers-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vouchers" },
        () => {
          this.loadDashboard();
          this.loadVouchersList();
        }
      )
      .subscribe();
  }
}

window.ExpenseVoucherApp = ExpenseVoucherApp;
