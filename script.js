/**
 * ==============================================================================
 * AI Study Planner - Interactive Client-Side JavaScript
 * ==============================================================================
 * 
 * This file handles:
 *  1. Navigation & View Switching (Dashboard, Generator, Schedule, Productivity, Tips)
 *  2. Plan Generation Algorithm (Heuristic-based scheduling with revision and quiz checkpoints)
 *  3. Interactive Checklist & Progress Tracking
 *  4. LocalStorage Persistence (Saving and loading plans across browser reloads)
 *  5. Dynamic Metrics & Visual Progress Indicators
 *  6. Preset Quick Demos & Toast Notifications
 * 
 * Built with clean, beginner-friendly vanilla JavaScript without any external libraries.
 */

// Key used to store our study plan object inside the browser's localStorage
const STORAGE_KEY = 'ai_study_planner_state_v1';

/**
 * Global state object that holds the current study plan and user progress.
 */
let appState = {
  subject: '',
  examDate: '',
  dailyHours: 2.5,
  difficulty: 'Medium',
  rawTopics: [],
  schedule: [], // Array of day items: { id, dayNumber, dateStr, topic, type, priority, estHours, completed, notes }
  createdAt: null
};

// Preset sample courses for quick testing by students
const PRESETS = {
  cs: {
    subject: 'Data Structures & Algorithms',
    topics: 'Arrays and Two Pointers, Linked Lists & Pointers, Stacks & Queues, Binary Trees & Traversals, Binary Search Trees, Graph BFS & DFS, Dynamic Programming Fundamentals, Sorting Algorithms & Complexity',
    difficulty: 'Hard',
    hours: 3
  },
  math: {
    subject: 'Calculus & Linear Algebra',
    topics: 'Limits and Continuity, Derivatives & Chain Rule, Applications of Derivatives, Definite & Indefinite Integrals, Integration Techniques, Vectors and Matrices, Eigenvalues and Eigenvectors',
    difficulty: 'Medium',
    hours: 2.5
  },
  bio: {
    subject: 'Cell Biology & Genetics',
    topics: 'Cell Membrane & Transport, Cellular Respiration, Photosynthesis Reactions, DNA Replication & Repair, Mendelian Genetics, Gene Expression & Regulation, Biotechnology Fundamentals',
    difficulty: 'Easy',
    hours: 2
  }
};

/* ==============================================================================
   DOM ELEMENT SELECTORS
   ============================================================================== */
const elements = {
  // Navigation
  navItems: document.querySelectorAll('.nav-item'),
  viewSections: document.querySelectorAll('.view-section'),
  pageTitle: document.getElementById('pageTitle'),
  pageSubtitle: document.getElementById('pageSubtitle'),
  mobileToggleBtn: document.getElementById('mobileToggleBtn'),
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  currentDateText: document.getElementById('currentDateText'),
  topbarNewPlanBtn: document.getElementById('topbarNewPlanBtn'),
  heroActionBtn: document.getElementById('heroActionBtn'),
  btnGoToGenerator: document.getElementById('btnGoToGenerator'),
  btnViewAllSchedule: document.getElementById('btnViewAllSchedule'),
  btnQuickSample: document.getElementById('btnQuickSample'),

  // Form Elements
  studyPlanForm: document.getElementById('studyPlanForm'),
  subjectInput: document.getElementById('subjectInput'),
  examDateInput: document.getElementById('examDateInput'),
  topicsInput: document.getElementById('topicsInput'),
  hoursInput: document.getElementById('hoursInput'),
  hoursDisplay: document.getElementById('hoursDisplay'),
  clearFormBtn: document.getElementById('clearFormBtn'),
  generationLoader: document.getElementById('generationLoader'),
  generatePlanBtn: document.getElementById('generatePlanBtn'),
  presetBtns: document.querySelectorAll('.preset-btn'),

  // Dashboard & Hero elements
  heroBanner: document.getElementById('heroBanner'),
  heroSubjectTitle: document.getElementById('heroSubjectTitle'),
  heroSubjectDesc: document.getElementById('heroSubjectDesc'),
  heroMeta: document.getElementById('heroMeta'),
  heroExamDate: document.getElementById('heroExamDate'),
  heroCountdown: document.getElementById('heroCountdown'),
  heroDifficulty: document.getElementById('heroDifficulty'),
  dashboardUpcomingList: document.getElementById('dashboardUpcomingList'),

  // AI Breakdown Elements
  insightStrategy: document.getElementById('insightStrategy'),
  insightTotalHours: document.getElementById('insightTotalHours'),
  insightQuizDays: document.getElementById('insightQuizDays'),
  insightRevisionDays: document.getElementById('insightRevisionDays'),
  insightAdvice: document.getElementById('insightAdvice'),

  // Productivity & Stats Elements
  statTotalTopics: document.getElementById('statTotalTopics'),
  statCompletedTopics: document.getElementById('statCompletedTopics'),
  statRemainingTopics: document.getElementById('statRemainingTopics'),
  statProgressPercent: document.getElementById('statProgressPercent'),
  statProgressBar: document.getElementById('statProgressBar'),
  sidebarProgressPercent: document.getElementById('sidebarProgressPercent'),
  sidebarProgressBar: document.getElementById('sidebarProgressBar'),
  scheduleBadge: document.getElementById('scheduleBadge'),

  // Circular Ring in Productivity Section
  progressRingCircle: document.getElementById('progressRingCircle'),
  ringPercentText: document.getElementById('ringPercentText'),
  productivitySubjectHeading: document.getElementById('productivitySubjectHeading'),
  productivitySummaryText: document.getElementById('productivitySummaryText'),
  productivityStatusBadge: document.getElementById('productivityStatusBadge'),
  prodTotal: document.getElementById('prodTotal'),
  prodCompleted: document.getElementById('prodCompleted'),
  prodRemaining: document.getElementById('prodRemaining'),
  prodHoursLogged: document.getElementById('prodHoursLogged'),

  // Breakdown Bars
  countCoreTopics: document.getElementById('countCoreTopics'),
  countRevisionTopics: document.getElementById('countRevisionTopics'),
  countQuizTopics: document.getElementById('countQuizTopics'),
  barCoreTopics: document.getElementById('barCoreTopics'),
  barRevisionTopics: document.getElementById('barRevisionTopics'),
  barQuizTopics: document.getElementById('barQuizTopics'),

  // Schedule Grid & Toolbar
  scheduleCardsGrid: document.getElementById('scheduleCardsGrid'),
  emptySchedulePlaceholder: document.getElementById('emptySchedulePlaceholder'),
  scheduleHeaderSubject: document.getElementById('scheduleHeaderSubject'),
  scheduleHeaderMeta: document.getElementById('scheduleHeaderMeta'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  btnClearPlan: document.getElementById('btnClearPlan'),
  btnExportPlan: document.getElementById('btnExportPlan'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// Current active filter on the schedule view ('all', 'pending', 'completed', 'special')
let currentScheduleFilter = 'all';

/* ==============================================================================
   1. INITIALIZATION & EVENT LISTENERS
   ============================================================================== */

/**
 * Initializes the application when the DOM is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  initDateDisplay();
  setupMinExamDate();
  setupNavigationEvents();
  setupFormEvents();
  setupScheduleEvents();
  loadStateFromStorage();
  updateUI();
});

/**
 * Formats and displays the current date in the header chip.
 */
function initDateDisplay() {
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const todayStr = new Date().toLocaleDateString('en-US', options);
  if (elements.currentDateText) {
    elements.currentDateText.textContent = todayStr;
  }
}

/**
 * Sets the minimum selectable date in the exam date picker to tomorrow.
 */
function setupMinExamDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];
  if (elements.examDateInput) {
    elements.examDateInput.setAttribute('min', minDateStr);
    
    // Default to 14 days from now if not set
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 14);
    elements.examDateInput.value = defaultDate.toISOString().split('T')[0];
  }
}

/* ==============================================================================
   2. VIEW NAVIGATION & MOBILE DRAWER LOGIC
   ============================================================================== */

function setupNavigationEvents() {
  // Navigation Tabs (Sidebar)
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');
      switchView(viewId);
      closeMobileSidebar();
    });
  });

  // Shortcut buttons to create plan
  if (elements.topbarNewPlanBtn) {
    elements.topbarNewPlanBtn.addEventListener('click', () => switchView('generator'));
  }
  if (elements.heroActionBtn) {
    elements.heroActionBtn.addEventListener('click', () => {
      if (appState.schedule && appState.schedule.length > 0) {
        switchView('schedule');
      } else {
        switchView('generator');
      }
    });
  }
  if (elements.btnGoToGenerator) {
    elements.btnGoToGenerator.addEventListener('click', () => switchView('generator'));
  }
  if (elements.btnViewAllSchedule) {
    elements.btnViewAllSchedule.addEventListener('click', () => switchView('schedule'));
  }

  // Quick Demo Plan button
  if (elements.btnQuickSample) {
    elements.btnQuickSample.addEventListener('click', loadDemoPlan);
  }

  // Mobile hamburger menu toggle
  if (elements.mobileToggleBtn) {
    elements.mobileToggleBtn.addEventListener('click', toggleMobileSidebar);
  }
  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }
}

/**
 * Switches the active view (Dashboard, Generator, Schedule, Productivity, Tips)
 * @param {string} viewId 
 */
function switchView(viewId) {
  // Update nav item active classes
  elements.navItems.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
  });

  // Mapping view IDs to DOM container elements
  const viewMap = {
    dashboard: document.getElementById('viewDashboard'),
    generator: document.getElementById('viewGenerator'),
    schedule: document.getElementById('viewSchedule'),
    productivity: document.getElementById('viewProductivity'),
    tips: document.getElementById('viewTips')
  };

  const titleMap = {
    dashboard: { title: 'Dashboard Overview', sub: 'Monitor your daily study goals and exam preparation status' },
    generator: { title: 'Create Study Plan', sub: 'Input your subject topics, exam date, and available time' },
    schedule: { title: 'Study Schedule', sub: 'Day-by-day plan with priorities, revision, and quiz checkpoints' },
    productivity: { title: 'Productivity Tracker', sub: 'Analyze study pace, completion rates, and learning distribution' },
    tips: { title: 'Study Tips & Strategies', sub: 'Proven evidence-based cognitive retention techniques' }
  };

  // Toggle view visibility
  elements.viewSections.forEach(section => section.classList.remove('active'));
  if (viewMap[viewId]) {
    viewMap[viewId].classList.add('active');
  }

  // Update Topbar Title
  if (titleMap[viewId]) {
    elements.pageTitle.textContent = titleMap[viewId].title;
    elements.pageSubtitle.textContent = titleMap[viewId].sub;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileSidebar() {
  elements.sidebar.classList.toggle('open');
  elements.sidebarBackdrop.classList.toggle('open');
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove('open');
  elements.sidebarBackdrop.classList.remove('open');
}

/* ==============================================================================
   3. FORM HANDLING & SMART PRESETS
   ============================================================================== */

function setupFormEvents() {
  // Update range slider live readout
  if (elements.hoursInput && elements.hoursDisplay) {
    elements.hoursInput.addEventListener('input', (e) => {
      elements.hoursDisplay.textContent = `${e.target.value} hrs`;
    });
  }

  // Preset syllabus buttons
  elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const preset = PRESETS[presetKey];
      if (!preset) return;

      elements.subjectInput.value = preset.subject;
      elements.topicsInput.value = preset.topics;
      elements.hoursInput.value = preset.hours;
      elements.hoursDisplay.textContent = `${preset.hours} hrs`;

      // Select matching difficulty radio
      const diffRadio = document.querySelector(`input[name="difficulty"][value="${preset.difficulty}"]`);
      if (diffRadio) diffRadio.checked = true;

      showToast(`Loaded ${preset.subject} preset!`, 'info');
    });
  });

  // Clear form button
  if (elements.clearFormBtn) {
    elements.clearFormBtn.addEventListener('click', () => {
      elements.studyPlanForm.reset();
      elements.hoursDisplay.textContent = '2.5 hrs';
      setupMinExamDate();
      showToast('Form cleared', 'info');
    });
  }

  // Form Submission -> Generate Plan
  if (elements.studyPlanForm) {
    elements.studyPlanForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleGeneratePlan();
    });
  }
}

/**
 * Validates inputs and initiates the plan generation algorithm.
 */
function handleGeneratePlan() {
  const subject = elements.subjectInput.value.trim();
  const examDate = elements.examDateInput.value;
  const rawTopicsText = elements.topicsInput.value.trim();
  const dailyHours = parseFloat(elements.hoursInput.value) || 2;
  const difficultyRadio = document.querySelector('input[name="difficulty"]:checked');
  const difficulty = difficultyRadio ? difficultyRadio.value : 'Medium';

  // Validation
  if (!subject) {
    showToast('Please enter a subject name.', 'error');
    elements.subjectInput.focus();
    return;
  }
  if (!examDate) {
    showToast('Please choose an exam date.', 'error');
    elements.examDateInput.focus();
    return;
  }
  if (!rawTopicsText) {
    showToast('Please enter at least one topic or syllabus outline.', 'error');
    elements.topicsInput.focus();
    return;
  }

  // Parse topics list (split by comma, semicolon or new lines)
  const topics = rawTopicsText
    .split(/[\n,;]+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (topics.length === 0) {
    showToast('Please enter at least one valid topic name.', 'error');
    return;
  }

  // Calculate days remaining between today and exam date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate + 'T00:00:00');
  const timeDiff = exam.getTime() - today.getTime();
  const daysUntilExam = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (daysUntilExam <= 0) {
    showToast('Exam date must be in the future.', 'error');
    return;
  }

  // Simulate an AI generation progress feedback step
  elements.studyPlanForm.style.display = 'none';
  elements.generationLoader.style.display = 'block';

  setTimeout(() => {
    // Generate the intelligent day-by-day study schedule
    const generatedSchedule = buildSmartSchedule({
      topics,
      daysUntilExam,
      dailyHours,
      difficulty,
      startDate: today
    });

    // Save to App State
    appState = {
      subject,
      examDate,
      dailyHours,
      difficulty,
      rawTopics: topics,
      schedule: generatedSchedule,
      createdAt: new Date().toISOString()
    };

    saveStateToStorage();
    updateUI();

    elements.generationLoader.style.display = 'none';
    elements.studyPlanForm.style.display = 'block';

    showToast(`Success! Generated a ${generatedSchedule.length}-day study plan.`, 'success');
    switchView('schedule');
  }, 600);
}

/* ==============================================================================
   4. SMART STUDY PLAN GENERATION ALGORITHM
   ==============================================================================
   * Balances topic introduction, revision days (spaced repetition),
   * and practice quiz checkpoints based on exam deadline and difficulty.
   * Priority levels: High (harder or core foundational topics), Medium, Low.
   */
function buildSmartSchedule({ topics, daysUntilExam, dailyHours, difficulty, startDate }) {
  const schedule = [];
  const totalTopics = topics.length;

  // Determine spacing intervals based on difficulty level
  // Harder subjects require more frequent quizzes and revision blocks
  let quizInterval = 4;      // Every 4 study days
  let revisionInterval = 6;  // Every 6 study days
  let hourMultiplier = 1;

  if (difficulty === 'Hard') {
    quizInterval = 3;
    revisionInterval = 5;
    hourMultiplier = 1.2;
  } else if (difficulty === 'Easy') {
    quizInterval = 5;
    revisionInterval = 7;
    hourMultiplier = 0.85;
  }

  let topicIndex = 0;
  let dayCounter = 1;
  const coveredTopicsSoFar = [];

  // Generate schedule day by day up to exam or topics completed
  while ((topicIndex < totalTopics || schedule.length < 2) && dayCounter <= daysUntilExam) {
    const sessionDate = new Date(startDate);
    sessionDate.setDate(startDate.getDate() + dayCounter);
    const dateFormatted = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

    // Check if it's the final day before exam -> Final Full Revision & Mock Test
    if (dayCounter === daysUntilExam) {
      schedule.push({
        id: `day-${dayCounter}`,
        dayNumber: dayCounter,
        dateStr: dateFormatted,
        topic: 'Final Exam Readiness & High-Yield Summary Review',
        type: 'revision',
        priority: 'High',
        estHours: Math.min(dailyHours * 1.2, 8).toFixed(1),
        completed: false,
        notes: 'Review quick reference formula sheets, key definitions, and get adequate rest.'
      });
      break;
    }

    // Check if day qualifies as a Practice / Quiz Day
    const isQuizDay = (dayCounter % quizInterval === 0) && coveredTopicsSoFar.length >= 2;
    // Check if day qualifies as a Spaced Revision Day
    const isRevisionDay = (dayCounter % revisionInterval === 0) && coveredTopicsSoFar.length >= 3 && !isQuizDay;

    if (isQuizDay) {
      const recentTopics = coveredTopicsSoFar.slice(-3).join(', ');
      schedule.push({
        id: `day-${dayCounter}`,
        dayNumber: dayCounter,
        dateStr: dateFormatted,
        topic: `Active Recall & Quiz: Reviewing (${recentTopics})`,
        type: 'quiz',
        priority: 'High',
        estHours: (dailyHours * 0.9).toFixed(1),
        completed: false,
        notes: 'Practice with mock questions, flashcards, or textbook end-of-chapter problems.'
      });
      dayCounter++;
      continue;
    }

    if (isRevisionDay) {
      const earlierTopics = coveredTopicsSoFar.slice(0, 3).join(', ');
      schedule.push({
        id: `day-${dayCounter}`,
        dayNumber: dayCounter,
        dateStr: dateFormatted,
        topic: `Spaced Revision: Consolidating (${earlierTopics})`,
        type: 'revision',
        priority: 'Medium',
        estHours: (dailyHours * 0.8).toFixed(1),
        completed: false,
        notes: 'Focus on weak concepts from previous sessions using the Feynman technique.'
      });
      dayCounter++;
      continue;
    }

    // Regular Learning Session for next topic
    if (topicIndex < totalTopics) {
      const currentTopic = topics[topicIndex];
      coveredTopicsSoFar.push(currentTopic);

      // Heuristic Priority assignment
      let priority = 'Medium';
      if (difficulty === 'Hard' || topicIndex === 0 || topicIndex === totalTopics - 1) {
        priority = 'High';
      } else if (difficulty === 'Easy' && topicIndex % 2 === 1) {
        priority = 'Low';
      }

      // Calculate estimated session time
      const estHours = (dailyHours * hourMultiplier).toFixed(1);

      schedule.push({
        id: `day-${dayCounter}`,
        dayNumber: dayCounter,
        dateStr: dateFormatted,
        topic: currentTopic,
        type: 'study',
        priority: priority,
        estHours: estHours,
        completed: false,
        notes: `Master core principles, take structured notes, and complete 2-3 practice examples.`
      });

      topicIndex++;
    }

    dayCounter++;
  }

  // If there are still remaining days before the exam, add dedicated capstone review days
  while (dayCounter < daysUntilExam && schedule.length < daysUntilExam) {
    const sessionDate = new Date(startDate);
    sessionDate.setDate(startDate.getDate() + dayCounter);
    const dateFormatted = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

    if (dayCounter === daysUntilExam - 1) {
      schedule.push({
        id: `day-${dayCounter}`,
        dayNumber: dayCounter,
        dateStr: dateFormatted,
        topic: 'Full Mock Test & Problem-Solving Sprint',
        type: 'quiz',
        priority: 'High',
        estHours: dailyHours.toFixed(1),
        completed: false,
        notes: 'Simulate realistic exam conditions with a timed practice paper.'
      });
    } else {
      schedule.push({
        id: `day-${dayCounter}`,
        dayNumber: dayCounter,
        dateStr: dateFormatted,
        topic: 'Deep Review & Difficult Problem Resolution',
        type: 'revision',
        priority: 'Medium',
        estHours: dailyHours.toFixed(1),
        completed: false,
        notes: 'Target questions you previously struggled with or missed.'
      });
    }
    dayCounter++;
  }

  return schedule;
}

/* ==============================================================================
   5. SCHEDULE RENDERING & USER INTERACTION (MARK COMPLETED)
   ============================================================================== */

function setupScheduleEvents() {
  // Filter tabs (All, Pending, Completed, Special)
  elements.filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScheduleFilter = btn.getAttribute('data-filter');
      renderSchedule();
    });
  });

  // Reset Plan Button
  if (elements.btnClearPlan) {
    elements.btnClearPlan.addEventListener('click', () => {
      if (!appState.schedule || appState.schedule.length === 0) return;
      if (confirm('Are you sure you want to reset your study plan? All completion progress will be cleared.')) {
        appState = {
          subject: '',
          examDate: '',
          dailyHours: 2.5,
          difficulty: 'Medium',
          rawTopics: [],
          schedule: [],
          createdAt: null
        };
        localStorage.removeItem(STORAGE_KEY);
        updateUI();
        showToast('Study plan cleared', 'info');
        switchView('generator');
      }
    });
  }

  // Export / Print button
  if (elements.btnExportPlan) {
    elements.btnExportPlan.addEventListener('click', () => {
      if (!appState.schedule || appState.schedule.length === 0) {
        showToast('No active plan to print.', 'info');
        return;
      }
      window.print();
    });
  }
}

/**
 * Renders the day-by-day schedule cards grid.
 */
function renderSchedule() {
  const container = elements.scheduleCardsGrid;
  const placeholder = elements.emptySchedulePlaceholder;

  if (!appState.schedule || appState.schedule.length === 0) {
    container.innerHTML = '';
    placeholder.style.display = 'block';
    elements.scheduleHeaderSubject.textContent = 'Your Study Schedule';
    elements.scheduleHeaderMeta.textContent = 'Create a plan to see day-by-day sessions';
    return;
  }

  placeholder.style.display = 'none';
  elements.scheduleHeaderSubject.textContent = `${appState.subject} Schedule`;
  elements.scheduleHeaderMeta.textContent = `${appState.schedule.length} Total Sessions planned leading up to ${formatFriendlyDate(appState.examDate)}`;

  // Filter items
  const filteredSchedule = appState.schedule.filter(item => {
    if (currentScheduleFilter === 'pending') return !item.completed;
    if (currentScheduleFilter === 'completed') return item.completed;
    if (currentScheduleFilter === 'special') return item.type === 'revision' || item.type === 'quiz';
    return true; // 'all'
  });

  if (filteredSchedule.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted); background: white; border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <p style="font-size: 1.1rem; margin-bottom: 8px;">No sessions found matching this filter ("${currentScheduleFilter}")</p>
        <small>Try selecting "All Days" to view all sessions.</small>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredSchedule.map(item => {
    // Type badge styling
    let typeBadgeHtml = '';
    if (item.type === 'revision') {
      typeBadgeHtml = `<span class="badge badge-revision">🔄 Revision Day</span>`;
    } else if (item.type === 'quiz') {
      typeBadgeHtml = `<span class="badge badge-quiz">✍️ Practice / Quiz</span>`;
    } else {
      typeBadgeHtml = `<span class="badge badge-study">📖 Study Day</span>`;
    }

    // Priority badge styling
    const priorityClass = item.priority === 'High' 
      ? 'priority-high' 
      : (item.priority === 'Medium' ? 'priority-medium' : 'priority-low');

    const isCompleted = item.completed ? 'is-completed' : '';
    const btnCheckedClass = item.completed ? 'checked' : '';
    const btnLabel = item.completed ? '✓ Completed' : 'Mark Complete';

    return `
      <div class="schedule-card ${isCompleted}" data-id="${item.id}">
        <div>
          <div class="schedule-card-header">
            <span class="day-pill">Day ${item.dayNumber} &bull; ${item.dateStr}</span>
            <div class="badge-group">
              ${typeBadgeHtml}
              <span class="badge ${priorityClass}">${item.priority} Priority</span>
            </div>
          </div>
          
          <div class="schedule-card-body">
            <h3 class="topic-title">${escapeHtml(item.topic)}</h3>
            <p class="task-description">${escapeHtml(item.notes)}</p>
            
            <div class="task-meta-row">
              <span>⏱️ Est. Study Time: <strong>${item.estHours} hrs</strong></span>
              <span>⚡ Strategy: <strong>${item.type === 'quiz' ? 'Active Recall' : (item.type === 'revision' ? 'Spaced Repetition' : 'Deep Study')}</strong></span>
            </div>
          </div>
        </div>

        <div class="schedule-card-footer">
          <button class="complete-toggle-btn ${btnCheckedClass}" onclick="toggleTopicCompletion('${item.id}')">
            <span>${item.completed ? '✅' : '⭕'}</span>
            <span>${btnLabel}</span>
          </button>
          <span class="status-label">${item.completed ? 'Done 🎉' : 'To Do'}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Toggles a schedule day / topic completion status.
 * Global function so it can be called from card onclick attribute.
 * @param {string} itemId 
 */
window.toggleTopicCompletion = function(itemId) {
  const item = appState.schedule.find(s => s.id === itemId);
  if (!item) return;

  item.completed = !item.completed;
  saveStateToStorage();
  updateUI();

  if (item.completed) {
    showToast(`Great job! Completed: "${item.topic.substring(0, 32)}..."`, 'success');
  } else {
    showToast(`Marked session as pending.`, 'info');
  }
};

/* ==============================================================================
   6. UI SYNCHRONIZATION & METRIC CALCULATIONS
   ============================================================================== */

/**
 * Updates all sections of the UI based on appState.
 */
function updateUI() {
  const total = appState.schedule ? appState.schedule.length : 0;
  const completed = appState.schedule ? appState.schedule.filter(s => s.completed).length : 0;
  const remaining = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 1. Sidebar badge and progress bar
  if (elements.scheduleBadge) elements.scheduleBadge.textContent = total;
  if (elements.sidebarProgressPercent) elements.sidebarProgressPercent.textContent = `${percent}%`;
  if (elements.sidebarProgressBar) elements.sidebarProgressBar.style.width = `${percent}%`;

  // 2. Dashboard Stat Cards
  if (elements.statTotalTopics) elements.statTotalTopics.textContent = total;
  if (elements.statCompletedTopics) elements.statCompletedTopics.textContent = completed;
  if (elements.statRemainingTopics) elements.statRemainingTopics.textContent = remaining;
  if (elements.statProgressPercent) elements.statProgressPercent.textContent = `${percent}%`;
  if (elements.statProgressBar) elements.statProgressBar.style.width = `${percent}%`;

  // 3. Hero Countdown Banner
  updateHeroBanner();

  // 4. Upcoming schedule preview in Dashboard
  updateDashboardUpcoming();

  // 5. AI Insights in Dashboard
  updateAiInsightsBox();

  // 6. Schedule Grid
  renderSchedule();

  // 7. Productivity Section & Circular Ring
  updateProductivityView(total, completed, remaining, percent);
}

/**
 * Updates hero banner with countdown, subject title, and exam date.
 */
function updateHeroBanner() {
  if (!appState.subject || !appState.examDate || appState.schedule.length === 0) {
    elements.heroSubjectTitle.textContent = 'No active study plan found';
    elements.heroSubjectDesc.textContent = 'Enter your course syllabus to generate a personalized day-by-day learning plan.';
    elements.heroMeta.style.display = 'none';
    elements.heroActionBtn.textContent = '⚡ Create Your Plan';
    return;
  }

  elements.heroSubjectTitle.textContent = `${appState.subject}`;
  elements.heroSubjectDesc.textContent = `Personalized pace for ${appState.difficulty} difficulty with spaced revision checkpoints.`;
  elements.heroMeta.style.display = 'flex';
  elements.heroActionBtn.textContent = '📅 View Full Schedule';

  // Calculate days remaining
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(appState.examDate + 'T00:00:00');
  const daysDiff = Math.ceil((exam - today) / (1000 * 3600 * 24));

  elements.heroExamDate.textContent = formatFriendlyDate(appState.examDate);
  elements.heroCountdown.textContent = daysDiff > 0 ? `${daysDiff} Days Left` : (daysDiff === 0 ? 'Today!' : 'Exam Passed');
  elements.heroDifficulty.textContent = appState.difficulty;
}

/**
 * Updates next 3 upcoming sessions in Dashboard.
 */
function updateDashboardUpcoming() {
  const container = elements.dashboardUpcomingList;
  if (!container) return;

  if (!appState.schedule || appState.schedule.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <h4>No study plan yet!</h4>
        <p>Click "Create Plan" or "Try Demo Plan" to start generating your custom schedule.</p>
      </div>
    `;
    return;
  }

  // Get upcoming uncompleted sessions
  const pendingSessions = appState.schedule.filter(s => !s.completed);
  const displaySessions = (pendingSessions.length > 0 ? pendingSessions : appState.schedule).slice(0, 4);

  container.innerHTML = displaySessions.map(item => {
    let typeIcon = '📖';
    if (item.type === 'revision') typeIcon = '🔄';
    if (item.type === 'quiz') typeIcon = '✍️';

    return `
      <div class="upcoming-item">
        <div class="upcoming-left">
          <span class="day-badge">Day ${item.dayNumber}</span>
          <div>
            <div class="upcoming-title">${typeIcon} ${escapeHtml(item.topic)}</div>
            <small style="color: var(--text-muted); font-size: 0.74rem;">${item.dateStr} &bull; ${item.estHours} hrs</small>
          </div>
        </div>
        <div class="upcoming-right">
          <button class="btn btn-outline-sm" onclick="toggleTopicCompletion('${item.id}')">
            ${item.completed ? '✅ Done' : 'Complete'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Updates AI Insights box in Dashboard.
 */
function updateAiInsightsBox() {
  if (!appState.schedule || appState.schedule.length === 0) {
    elements.insightStrategy.textContent = 'Adaptive Spaced Learning';
    elements.insightTotalHours.textContent = '0 Hours';
    elements.insightQuizDays.textContent = '0 Days';
    elements.insightRevisionDays.textContent = '0 Days';
    elements.insightAdvice.textContent = 'Enter your subject details to receive optimized study sessions.';
    return;
  }

  // Sum total hours
  const totalHours = appState.schedule.reduce((acc, curr) => acc + (parseFloat(curr.estHours) || 0), 0).toFixed(1);
  const quizDays = appState.schedule.filter(s => s.type === 'quiz').length;
  const revisionDays = appState.schedule.filter(s => s.type === 'revision').length;

  elements.insightStrategy.textContent = appState.difficulty === 'Hard' ? 'High-Intensity Mastery' : 'Balanced Spaced Repetition';
  elements.insightTotalHours.textContent = `${totalHours} Hours`;
  elements.insightQuizDays.textContent = `${quizDays} Sessions`;
  elements.insightRevisionDays.textContent = `${revisionDays} Checkpoints`;

  let advice = `Studying ~${appState.dailyHours} hrs/day with ${appState.difficulty} pacing will optimize your cognitive retention before the exam.`;
  if (appState.difficulty === 'Hard') {
    advice += ' Ensure you test yourself during quiz checkpoints to address blind spots.';
  }
  elements.insightAdvice.textContent = advice;
}

/**
 * Updates Productivity view details and circular progress ring.
 */
function updateProductivityView(total, completed, remaining, percent) {
  // Update numbers
  if (elements.prodTotal) elements.prodTotal.textContent = total;
  if (elements.prodCompleted) elements.prodCompleted.textContent = completed;
  if (elements.prodRemaining) elements.prodRemaining.textContent = remaining;

  // Calculate hours completed vs total
  let completedHours = 0;
  let totalHours = 0;
  if (appState.schedule) {
    appState.schedule.forEach(s => {
      const h = parseFloat(s.estHours) || 0;
      totalHours += h;
      if (s.completed) completedHours += h;
    });
  }
  if (elements.prodHoursLogged) {
    elements.prodHoursLogged.textContent = `${completedHours.toFixed(1)} / ${totalHours.toFixed(1)} hrs`;
  }

  // Update Headings
  if (appState.subject) {
    elements.productivitySubjectHeading.textContent = `${appState.subject} Study Velocity`;
    elements.productivitySummaryText.textContent = `You have completed ${completed} out of ${total} planned study milestones. Keep consistent!`;
  }

  // Update Status badge
  if (percent >= 100 && total > 0) {
    elements.productivityStatusBadge.textContent = '🎉 Exam Ready!';
    elements.productivityStatusBadge.className = 'badge badge-success';
  } else if (percent >= 50) {
    elements.productivityStatusBadge.textContent = '🚀 Strong Momentum';
    elements.productivityStatusBadge.className = 'badge badge-success';
  } else if (total > 0) {
    elements.productivityStatusBadge.textContent = '🌱 In Progress';
    elements.productivityStatusBadge.className = 'badge badge-primary';
  } else {
    elements.productivityStatusBadge.textContent = 'Awaiting Plan';
    elements.productivityStatusBadge.className = 'badge badge-warning';
  }

  // Update Circular Progress Ring SVG
  // Radius r = 68 -> Circumference = 2 * PI * 68 ≈ 427.25
  const circumference = 2 * Math.PI * 68;
  if (elements.progressRingCircle) {
    elements.progressRingCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (percent / 100) * circumference;
    elements.progressRingCircle.style.strokeDashoffset = offset;
  }
  if (elements.ringPercentText) {
    elements.ringPercentText.textContent = `${percent}%`;
  }

  // Breakdown counts & percentages
  const coreTopics = appState.schedule ? appState.schedule.filter(s => s.type === 'study').length : 0;
  const revTopics = appState.schedule ? appState.schedule.filter(s => s.type === 'revision').length : 0;
  const quizTopics = appState.schedule ? appState.schedule.filter(s => s.type === 'quiz').length : 0;

  if (elements.countCoreTopics) elements.countCoreTopics.textContent = `${coreTopics} sessions`;
  if (elements.countRevisionTopics) elements.countRevisionTopics.textContent = `${revTopics} sessions`;
  if (elements.countQuizTopics) elements.countQuizTopics.textContent = `${quizTopics} sessions`;

  if (elements.barCoreTopics) elements.barCoreTopics.style.width = total > 0 ? `${(coreTopics / total) * 100}%` : '0%';
  if (elements.barRevisionTopics) elements.barRevisionTopics.style.width = total > 0 ? `${(revTopics / total) * 100}%` : '0%';
  if (elements.barQuizTopics) elements.barQuizTopics.style.width = total > 0 ? `${(quizTopics / total) * 100}%` : '0%';
}

/* ==============================================================================
   7. LOCALSTORAGE PERSISTENCE
   ============================================================================== */

/**
 * Saves current application state to browser localStorage.
 */
function saveStateToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.error('Failed to save state to localStorage:', err);
  }
}

/**
 * Loads previously saved state from browser localStorage if available.
 */
function loadStateFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.schedule)) {
        appState = parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load state from localStorage:', err);
  }
}

/* ==============================================================================
   8. DEMO PLAN GENERATOR & TOAST SYSTEM
   ============================================================================== */

/**
 * Loads a pre-built rich sample plan so the user can immediately test features.
 */
function loadDemoPlan() {
  const sample = PRESETS.cs;
  const exam = new Date();
  exam.setDate(exam.getDate() + 10);
  const examDateStr = exam.toISOString().split('T')[0];

  const topics = sample.topics.split(',').map(t => t.trim());
  const schedule = buildSmartSchedule({
    topics,
    daysUntilExam: 10,
    dailyHours: sample.hours,
    difficulty: sample.difficulty,
    startDate: new Date()
  });

  // Mark the first 2 sessions completed to show the progress bars working immediately!
  if (schedule.length > 0) schedule[0].completed = true;
  if (schedule.length > 1) schedule[1].completed = true;

  appState = {
    subject: sample.subject,
    examDate: examDateStr,
    dailyHours: sample.hours,
    difficulty: sample.difficulty,
    rawTopics: topics,
    schedule: schedule,
    createdAt: new Date().toISOString()
  };

  saveStateToStorage();
  updateUI();
  showToast('Loaded demo Computer Science study plan!', 'success');
  switchView('dashboard');
}

/**
 * Displays a non-intrusive floating toast notification.
 * @param {string} message 
 * @param {'success'|'info'|'error'} type 
 */
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Formats YYYY-MM-DD into a human-friendly string (e.g. Oct 17, 2026).
 * @param {string} dateStr 
 */
function formatFriendlyDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str 
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
