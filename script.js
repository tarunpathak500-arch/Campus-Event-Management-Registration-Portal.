/**
 * Campus Event Management & Registration Portal
 * Core JavaScript Logic (Data Persistence, Auth, Gateway & Ticket Generation)
 */

// 1. Initial State & Seed Data
const DEFAULT_EVENTS = [
  {
    id: "evt-101",
    title: "HackCampus: 24-Hour National Hackathon",
    category: "Competition",
    datetime: "2026-11-20T09:30",
    venue: "Main Campus Auditorium & IT Lab 4",
    capacity: 120,
    registered: 114,
    fee: 150,
    desc: "Build high-impact web apps, AI tools, and decentralized solutions. Free mentor guidance, meal vouchers, and certificates provided."
  },
  {
    id: "evt-102",
    title: "Full-Stack Web & Cloud Deployment Masterclass",
    category: "Workshop",
    datetime: "2026-11-25T14:00",
    venue: "Computer Center, Block 34",
    capacity: 60,
    registered: 25,
    fee: 0,
    desc: "Hands-on workshop on modern JavaScript, component architectures, and automated cloud deployments on AWS and Vercel."
  },
  {
    id: "evt-103",
    title: "InnovateX: Annual Technical & Robotic Fest",
    category: "Fest",
    datetime: "2026-12-05T10:00",
    venue: "Central Open Amphitheatre",
    capacity: 300,
    registered: 300,
    fee: 100,
    desc: "The largest college technical carnival featuring RoboWars, Drone Obstacle Racing, and Project Display Stalls."
  },
  {
    id: "evt-104",
    title: "AI & Future of Software Engineering Seminar",
    category: "Seminar",
    datetime: "2026-12-10T11:30",
    venue: "Auditorium Hall B",
    capacity: 150,
    registered: 80,
    fee: 0,
    desc: "Keynote address by industry directors discussing LLMs, autonomous agents, and career pathways in modern tech."
  }
];

// 2. Storage Helpers
function getStoredEvents() {
  const data = localStorage.getItem("unievents_events");
  if (!data) {
    localStorage.setItem("unievents_events", JSON.stringify(DEFAULT_EVENTS));
    return DEFAULT_EVENTS;
  }
  return JSON.parse(data);
}

function saveEvents(events) {
  localStorage.setItem("unievents_events", JSON.stringify(events));
}

function getStoredStudents() {
  return JSON.parse(localStorage.getItem("unievents_students") || "[]");
}

function getStoredRegistrations() {
  return JSON.parse(localStorage.getItem("unievents_registrations") || "[]");
}

function getActiveSession() {
  return JSON.parse(localStorage.getItem("unievents_active_session") || "null");
}

// 3. Runtime App State
let activeUser = getActiveSession();
let currentFilterCategory = "All";
let activeCheckoutEvent = null;
let currentPayMethod = "UPI";

// 4. View Navigation & Routing
function navigateTo(viewId) {
  document.querySelectorAll(".app-view").forEach(view => view.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));

  const target = document.getElementById(viewId);
  if (target) target.classList.add("active");

  if (viewId === "events-view") {
    document.getElementById("nav-btn-events")?.classList.add("active");
    renderEventCards();
  } else if (viewId === "admin-dashboard-view") {
    document.getElementById("nav-btn-admin")?.classList.add("active");
    refreshAdminDashboard();
  } else if (viewId === "student-auth-view") {
    document.getElementById("nav-btn-student")?.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleAdminNavClick() {
  if (activeUser && activeUser.role === "admin") {
    navigateTo("admin-dashboard-view");
  } else {
    navigateTo("admin-auth-view");
  }
}

function updateNavAuthBadge() {
  const navStudent = document.getElementById("nav-btn-student");
  const userBadge = document.getElementById("user-badge");
  const badgeName = document.getElementById("badge-name");
  const badgeRole = document.getElementById("badge-role");

  if (activeUser) {
    navStudent.style.display = "none";
    userBadge.style.display = "flex";
    if (activeUser.role === "admin") {
      badgeName.innerText = "Admin Console";
      badgeRole.innerText = "System Convener";
    } else {
      badgeName.innerText = activeUser.name;
      badgeRole.innerText = activeUser.roll;
    }
  } else {
    navStudent.style.display = "inline-flex";
    userBadge.style.display = "none";
  }
}

function logoutSession() {
  activeUser = null;
  localStorage.removeItem("unievents_active_session");
  updateNavAuthBadge();
  showToast("Logged out of account session.");
  navigateTo("events-view");
}

// 5. Toast System
function showToast(message, icon = "fa-circle-info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// 6. Event Card Rendering & Filters
function renderEventCards() {
  const container = document.getElementById("events-grid-container");
  const counterText = document.getElementById("event-stats-count");
  const events = getStoredEvents();
  const searchVal = document.getElementById("event-search-input").value.toLowerCase().trim();

  const filtered = events.filter(evt => {
    const matchesCat = (currentFilterCategory === "All" || evt.category === currentFilterCategory);
    const matchesSearch = evt.title.toLowerCase().includes(searchVal) ||
                          evt.venue.toLowerCase().includes(searchVal) ||
                          evt.desc.toLowerCase().includes(searchVal);
    return matchesCat && matchesSearch;
  });

  counterText.innerText = `Showing ${filtered.length} of ${events.length} campus events`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
        <h3>No matching events found</h3>
        <p>Try searching with another keyword or resetting the category filter.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(evt => {
    const seatsRemaining = Math.max(0, evt.capacity - evt.registered);
    const percentFilled = Math.min(100, Math.round((evt.registered / evt.capacity) * 100));
    const isSoldOut = seatsRemaining === 0;
    const dateFormatted = new Date(evt.datetime).toLocaleString([], {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="event-card">
        <div>
          <div class="card-top">
            <span class="category-tag tag-${evt.category}">${evt.category}</span>
            <div class="price-tag ${evt.fee === 0 ? 'free' : ''}">
              ${evt.fee === 0 ? 'FREE' : '₹' + evt.fee}
            </div>
          </div>
          <h3 class="event-title">${evt.title}</h3>
          <ul class="event-info-list">
            <li><i class="fa-regular fa-clock"></i> ${dateFormatted}</li>
            <li><i class="fa-solid fa-location-dot"></i> ${evt.venue}</li>
          </ul>
          <p class="event-description">${evt.desc}</p>
        </div>

        <div>
          <div class="seat-meter-container">
            <div class="seat-meter-labels">
              <span>${seatsRemaining} seats left</span>
              <span>${percentFilled}% Filled</span>
            </div>
            <div class="seat-progress-track">
              <div class="seat-progress-fill ${seatsRemaining <= 10 ? 'warning' : ''}" style="width: ${percentFilled}%;"></div>
            </div>
          </div>

          ${isSoldOut 
            ? `<button class="disabled-btn" disabled><i class="fa-solid fa-ban"></i> Registrations Closed</button>`
            : `<button class="primary-btn full-width" onclick="openCheckoutModal('${evt.id}')"><i class="fa-solid fa-ticket"></i> Register & Reserve Spot</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

function filterCategory(category, chipElement) {
  currentFilterCategory = category;
  document.querySelectorAll(".tab-chip").forEach(c => c.classList.remove("active"));
  chipElement.classList.add("active");
  renderEventCards();
}

function handleSearchFilter() {
  renderEventCards();
}

// 7. Student Auth System
function switchAuthTab(mode) {
  const tabLogin = document.getElementById("auth-tab-login");
  const tabReg = document.getElementById("auth-tab-register");
  const formLogin = document.getElementById("form-student-login");
  const formReg = document.getElementById("form-student-register");

  if (mode === "login") {
    tabLogin.classList.add("active");
    tabReg.classList.remove("active");
    formLogin.style.display = "block";
    formReg.style.display = "none";
  } else {
    tabReg.classList.add("active");
    tabLogin.classList.remove("active");
    formReg.style.display = "block";
    formLogin.style.display = "none";
  }
}

function handleStudentRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-fullname").value.trim();
  const roll = document.getElementById("reg-rollno").value.trim();
  const dept = document.getElementById("reg-department").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const pass = document.getElementById("reg-password").value;

  const students = getStoredStudents();
  if (students.some(s => s.roll === roll || s.email === email)) {
    showToast("A student account with this Roll No. or Email already exists!", "fa-triangle-exclamation");
    return;
  }

  const newStudent = { id: "std-" + Date.now(), name, roll, dept, email, pass };
  students.push(newStudent);
  localStorage.setItem("unievents_students", JSON.stringify(students));

  // Automatically log student in
  activeUser = { ...newStudent, role: "student" };
  localStorage.setItem("unievents_active_session", JSON.stringify(activeUser));

  updateNavAuthBadge();
  showToast(`Welcome aboard, ${name}! Account created.`, "fa-circle-check");
  document.getElementById("form-student-register").reset();
  navigateTo("events-view");
}

function handleStudentLogin(e) {
  e.preventDefault();
  const identifier = document.getElementById("login-identifier").value.trim();
  const pass = document.getElementById("login-password").value;

  const students = getStoredStudents();
  const user = students.find(s => (s.roll === identifier || s.email === identifier) && s.pass === pass);

  if (!user) {
    showToast("Invalid credentials. Please verify your details or create an account.", "fa-circle-xmark");
    return;
  }

  activeUser = { ...user, role: "student" };
  localStorage.setItem("unievents_active_session", JSON.stringify(activeUser));

  updateNavAuthBadge();
  showToast(`Welcome back, ${user.name}!`, "fa-circle-check");
  document.getElementById("form-student-login").reset();
  navigateTo("events-view");
}

// 8. Admin Auth & Privilege Enforcement
function handleAdminLogin(e) {
  e.preventDefault();
  const user = document.getElementById("admin-user").value.trim();
  const pass = document.getElementById("admin-pass").value;

  if (user === "admin" && pass === "admin123") {
    activeUser = { role: "admin", name: "Campus Administrator", roll: "STAFF-ADM" };
    localStorage.setItem("unievents_active_session", JSON.stringify(activeUser));
    updateNavAuthBadge();
    showToast("Admin authenticated successfully.", "fa-shield-halved");
    document.getElementById("admin-user").value = "";
    document.getElementById("admin-pass").value = "";
    navigateTo("admin-dashboard-view");
  } else {
    showToast("Access Denied! Invalid Administrator credentials.", "fa-hand");
  }
}

// 9. Admin Event Scheduling & Ledger Management
function handleCreateEvent(e) {
  e.preventDefault();
  if (!activeUser || activeUser.role !== "admin") {
    showToast("Unauthorized! Admin credentials required.", "fa-triangle-exclamation");
    return;
  }

  const title = document.getElementById("evt-title").value.trim();
  const category = document.getElementById("evt-category").value;
  const datetime = document.getElementById("evt-datetime").value;
  const venue = document.getElementById("evt-venue").value.trim();
  const capacity = parseInt(document.getElementById("evt-seats").value);
  const fee = parseFloat(document.getElementById("evt-fee").value) || 0;
  const desc = document.getElementById("evt-description").value.trim();

  const newEvent = {
    id: "evt-" + Date.now(),
    title,
    category,
    datetime,
    venue,
    capacity,
    registered: 0,
    fee,
    desc
  };

  const events = getStoredEvents();
  events.unshift(newEvent);
  saveEvents(events);

  showToast(`"${title}" published successfully!`, "fa-circle-check");
  document.getElementById("form-create-event").reset();
  refreshAdminDashboard();
  renderEventCards();
}

function refreshAdminDashboard() {
  const events = getStoredEvents();
  const registrations = getStoredRegistrations();

  const totalRevenue = registrations.reduce((sum, r) => sum + (Number(r.fee) || 0), 0);
  const totalSeats = events.reduce((sum, e) => sum + e.capacity, 0);
  const totalBooked = events.reduce((sum, e) => sum + e.registered, 0);
  const occupancy = totalSeats > 0 ? Math.round((totalBooked / totalSeats) * 100) : 0;

  document.getElementById("kpi-active-events").innerText = events.length;
  document.getElementById("kpi-total-registrations").innerText = registrations.length;
  document.getElementById("kpi-total-revenue").innerText = "₹" + totalRevenue.toLocaleString();
  document.getElementById("kpi-occupancy-rate").innerText = occupancy + "%";

  renderAdminLedger(registrations);
}

function renderAdminLedger(records) {
  const tbody = document.getElementById("admin-ledger-tbody");

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No student bookings recorded in the ledger yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong>${r.roll}</strong></td>
      <td>${r.name}</td>
      <td>${r.dept}</td>
      <td>${r.eventTitle}</td>
      <td><span class="category-tag tag-Workshop">${r.payMethod}</span></td>
      <td><code>${r.txnId}</code></td>
      <td><small>${r.timestamp}</small></td>
    </tr>
  `).join('');
}

function handleLedgerSearch() {
  const query = document.getElementById("ledger-search").value.toLowerCase().trim();
  const registrations = getStoredRegistrations();
  const filtered = registrations.filter(r => 
    r.roll.toLowerCase().includes(query) ||
    r.name.toLowerCase().includes(query) ||
    r.eventTitle.toLowerCase().includes(query)
  );
  renderAdminLedger(filtered);
}

// 10. Checkout & Realistic Payment Simulator
function openCheckoutModal(eventId) {
  if (!activeUser || activeUser.role !== "student") {
    showToast("Please log in with your Student account to register.", "fa-user-lock");
    navigateTo("student-auth-view");
    return;
  }

  const events = getStoredEvents();
  const evt = events.find(e => e.id === eventId);
  if (!evt) return;

  activeCheckoutEvent = evt;

  document.getElementById("modal-step-checkout").style.display = "block";
  document.getElementById("modal-step-ticket").style.display = "none";
  document.getElementById("checkout-modal").classList.add("active");

  const summary = document.getElementById("checkout-summary-box");
  summary.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <h3 style="font-family:var(--font-heading); font-size:1.15rem; color:var(--dark); margin-bottom:4px;">${evt.title}</h3>
        <p style="font-size:0.85rem; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> ${new Date(evt.datetime).toLocaleString()}</p>
        <p style="font-size:0.85rem; color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${evt.venue}</p>
      </div>
      <div style="text-align:right;">
        <span style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Payable Fee</span>
        <div style="font-size:1.35rem; font-weight:800; color:var(--primary);">${evt.fee === 0 ? 'FREE' : '₹' + evt.fee}</div>
      </div>
    </div>
  `;

  const gatewayContainer = document.getElementById("payment-gateway-container");
  const checkoutBtnText = document.getElementById("checkout-btn-text");

  if (evt.fee === 0) {
    gatewayContainer.style.display = "none";
    checkoutBtnText.innerText = "Confirm Free Registration";
  } else {
    gatewayContainer.style.display = "block";
    checkoutBtnText.innerText = `Pay ₹${evt.fee} & Secure Ticket`;
    document.getElementById("preview-card-name").innerText = activeUser.name.toUpperCase();
  }
}

function closeCheckoutModal() {
  document.getElementById("checkout-modal").classList.remove("active");
}

function selectPaymentMethod(method) {
  currentPayMethod = method;
  document.getElementById("tab-pay-upi").classList.toggle("active", method === "UPI");
  document.getElementById("tab-pay-card").classList.toggle("active", method === "Card");
  document.getElementById("pay-content-upi").style.display = method === "UPI" ? "block" : "none";
  document.getElementById("pay-content-card").style.display = method === "Card" ? "block" : "none";
}

function setDemoVpa(suffix) {
  document.getElementById("input-upi-vpa").value = "student" + suffix;
}

function formatCardNumber(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
  input.value = formatted;
  document.getElementById("preview-card-no").innerText = formatted || "•••• •••• •••• ••••";
}

function formatCardExpiry(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 2) {
    val = val.substring(0, 2) + '/' + val.substring(2, 4);
  }
  input.value = val;
  document.getElementById("preview-card-exp").innerText = val || "MM/YY";
}

function processEventRegistration() {
  const events = getStoredEvents();
  const index = events.findIndex(e => e.id === activeCheckoutEvent.id);
  if (index === -1) return;

  const evt = events[index];

  // 1. Over-registration limit validation
  if (evt.registered >= evt.capacity) {
    showToast("This event has reached full seating capacity!", "fa-ban");
    closeCheckoutModal();
    renderEventCards();
    return;
  }

  // 2. Prevent duplicate registrations
  const registrations = getStoredRegistrations();
  if (registrations.some(r => r.roll === activeUser.roll && r.eventId === evt.id)) {
    showToast("You are already registered for this event!", "fa-triangle-exclamation");
    closeCheckoutModal();
    return;
  }

  let paymentMethodLabel = "Free Admission";
  let txnId = "FREE-" + Math.floor(100000 + Math.random() * 900000);

  // 3. Payment verification
  if (evt.fee > 0) {
    if (currentPayMethod === "UPI") {
      const vpa = document.getElementById("input-upi-vpa").value.trim();
      if (!vpa || !vpa.includes("@")) {
        showToast("Please enter a valid UPI VPA (e.g. name@paytm).", "fa-circle-exclamation");
        return;
      }
      paymentMethodLabel = `UPI (${vpa})`;
    } else {
      const cardNum = document.getElementById("input-card-number").value.replace(/\s+/g, '');
      const cardExp = document.getElementById("input-card-exp").value.trim();
      const cardCvv = document.getElementById("input-card-cvv").value.trim();
      if (cardNum.length < 16 || !cardExp || cardCvv.length < 3) {
        showToast("Please provide valid 16-digit card number, expiry, and CVV.", "fa-credit-card");
        return;
      }
      paymentMethodLabel = `Debit Card (ending ${cardNum.slice(-4)})`;
    }
    txnId = "TXN" + Math.floor(100000 + Math.random() * 900000);
  }

  // 4. Update Event Seat Count in Storage
  events[index].registered += 1;
  saveEvents(events);

  // 5. Append student details to Admin Ledger
  const newRegistration = {
    regId: "REG-" + Date.now(),
    eventId: evt.id,
    eventTitle: evt.title,
    venue: evt.venue,
    datetime: evt.datetime,
    fee: evt.fee,
    roll: activeUser.roll,
    name: activeUser.name,
    dept: activeUser.dept,
    payMethod: paymentMethodLabel,
    txnId: txnId,
    timestamp: new Date().toLocaleString()
  };

  registrations.unshift(newRegistration);
  localStorage.setItem("unievents_registrations", JSON.stringify(registrations));

  // 6. Populate & Display Digital Admission Slip
  document.getElementById("modal-step-checkout").style.display = "none";
  document.getElementById("modal-step-ticket").style.display = "block";

  document.getElementById("tkt-event-title").innerText = newRegistration.eventTitle;
  document.getElementById("tkt-student-name").innerText = newRegistration.name;
  document.getElementById("tkt-student-roll").innerText = newRegistration.roll;
  document.getElementById("tkt-student-dept").innerText = newRegistration.dept;
  document.getElementById("tkt-event-datetime").innerText = new Date(newRegistration.datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  document.getElementById("tkt-event-venue").innerText = newRegistration.venue;
  document.getElementById("tkt-txnid").innerText = newRegistration.txnId;
  document.getElementById("tkt-paymethod").innerText = newRegistration.payMethod;

  showToast("Registration Confirmed! Gate entry pass issued.", "fa-circle-check");
  renderEventCards();
}

// 11. Initial Application Setup
window.addEventListener("DOMContentLoaded", () => {
  updateNavAuthBadge();
  renderEventCards();
});