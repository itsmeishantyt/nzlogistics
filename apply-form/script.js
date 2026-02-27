/**
 * N&Z Logistics — Apply Form Engine
 * Supports two layout modes per question:
 *   display_mode: 'single'  → Typeform-style, one question full-screen
 *   display_mode: 'page'    → Google Form-style, questions grouped on a scrollable page
 *
 * The form engine groups consecutive 'page' questions into a shared page,
 * and shows each 'single' question individually. Mixed configs are supported.
 */

// ── State ───────────────────────────────────────────────────────────────────
const state = {
    segments: [],       // Array of { type: 'single'|'page'|'welcome'|'success', steps: [...] }
    segmentIndex: 0,    // Current segment index
    answers: {},
    isTransitioning: false
};

// ── DOM refs ────────────────────────────────────────────────────────────────
const singleView = document.getElementById('single-view');
const pageView = document.getElementById('page-view');
const pageForm = document.getElementById('page-form');
const pageSubmitBar = document.getElementById('page-submit-bar');
const pageNextBtn = document.getElementById('page-next-btn');
const pageBackBtn = document.getElementById('page-back-btn');
const progressTrack = document.getElementById('progress-bar-track');
const progressFill = document.getElementById('progress-bar-fill');
const stepCounter = document.getElementById('step-counter');
const controls = document.getElementById('controls');
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');

// ── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    showLoader();

    try {
        const res = await fetch('../api/form-config.php');
        if (!res.ok) throw new Error('Config load failed');
        let config = await res.json();

        // Fallback: if no questions are configured in the DB, use defaults
        if (!Array.isArray(config) || config.length === 0) {
            config = getDefaultConfig();
        }

        // Build flat flow with welcome/success bookmarks
        const rawFlow = [
            { id: '__welcome__', type: 'welcome', title: 'Drive Your Future With Us', subtitle: 'Apply in a few steps. Fast, honest, and straightforward.', buttonText: 'Start Application' },
            ...config,
            { id: '__success__', type: 'success', title: 'Application Submitted!', subtitle: 'Our recruiting team will reach out within 3–5 business days.' }
        ];

        // Add email/tel validations
        rawFlow.forEach(step => {
            if (step.type === 'email' && !step.validation)
                step.validation = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            if (step.type === 'tel' && !step.validation)
                step.validation = v => v.replace(/\D/g, '').length >= 10;
        });

        // Group into segments
        state.segments = buildSegments(rawFlow);
        state.segmentIndex = 0;

        renderSegment(state.segmentIndex, 'enter-up');
        bindGlobalEvents();

    } catch (err) {
        console.error('Config fetch failed, using fallback:', err);

        // Use fallback config if fetch fails completely
        let config = getDefaultConfig();

        const rawFlow = [
            { id: '__welcome__', type: 'welcome', title: 'Drive Your Future With Us', subtitle: 'Apply in a few steps. Fast, honest, and straightforward.', buttonText: 'Start Application' },
            ...config,
            { id: '__success__', type: 'success', title: 'Application Submitted!', subtitle: 'Our recruiting team will reach out within 3–5 business days.' }
        ];

        rawFlow.forEach(step => {
            if (step.type === 'email' && !step.validation) step.validation = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            if (step.type === 'tel' && !step.validation) step.validation = v => v.replace(/\D/g, '').length >= 10;
        });

        state.segments = buildSegments(rawFlow);
        state.segmentIndex = 0;
        renderSegment(state.segmentIndex, 'enter-up');
        bindGlobalEvents();
    }
});

// ── Segment builder ──────────────────────────────────────────────────────────
/**
 * Groups consecutive 'page' display_mode questions into single page segments.
 * 'single' display_mode questions become individual segments (Typeform).
 * welcome/success become their own segment types.
 */
function buildSegments(flow) {
    const segments = [];
    let pageBuffer = [];
    let currentPageGroup = null;

    const flushPage = () => {
        if (pageBuffer.length > 0) {
            segments.push({ type: 'page', steps: [...pageBuffer] });
            pageBuffer = [];
        }
    };

    flow.forEach(step => {
        if (step.type === 'welcome') {
            flushPage();
            segments.push({ type: 'welcome', steps: [step] });
            currentPageGroup = null;
        } else if (step.type === 'success') {
            flushPage();
            segments.push({ type: 'success', steps: [step] });
            currentPageGroup = null;
        } else {
            const mode = step.display_mode || 'single';
            const group = step.page_group || 'default';
            if (mode === 'page') {
                if (pageBuffer.length > 0 && currentPageGroup !== group) {
                    flushPage();
                }
                pageBuffer.push(step);
                currentPageGroup = group;
            } else {
                flushPage();
                segments.push({ type: 'single', steps: [step] });
                currentPageGroup = null;
            }
        }
    });

    flushPage();
    return segments;
}

// ── Render segment ───────────────────────────────────────────────────────────
function renderSegment(index, animation = 'enter-up') {
    const seg = state.segments[index];
    if (!seg) return;

    hideSingleView();
    hidePageView();

    updateProgress(index);

    if (seg.type === 'welcome') renderWelcome(seg.steps[0], animation);
    else if (seg.type === 'success') renderSuccess(seg.steps[0], animation);
    else if (seg.type === 'single') renderSingle(seg.steps[0], animation);
    else if (seg.type === 'page') renderPage(seg.steps, animation);
}

// ── Welcome screen ───────────────────────────────────────────────────────────
function renderWelcome(step, anim) {
    showSingleView();
    singleView.innerHTML = '';

    const div = document.createElement('div');
    div.className = `welcome-screen ${anim === 'enter-up' ? 'slide-enter-up' : 'slide-enter-down'}`;
    div.innerHTML = `
        <p style="font-size:0.7rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#555;margin-bottom:1.25rem;">N&Z Logistics LLC</p>
        <h1 style="font-family:'Syne','Inter',sans-serif;font-size:clamp(2rem,6vw,4.5rem);font-weight:800;letter-spacing:-0.035em;line-height:1.05;margin-bottom:1rem;color:#f2f2f2;">
            Welcome
        </h1>
        <div style="font-size:1rem;color:#ccc;margin-bottom:2rem;max-width:600px;line-height:1.6;text-align:left;">
            <p style="margin-bottom:1rem;">Thank you for your interest in N&Z Logistics LLC. To apply for a driving position, please complete our online application for employment. Incomplete information will delay the processing of your application or prevent it from being submitted.</p>
            <p style="margin-bottom:1.5rem;">In compliance with Federal and State equal employment opportunity laws, qualified applicants are considered for all positions without regard to race, color, religion, sex, national origin, age, marital status, veteran status, non-job related disability, or any other protected group status.</p>
            
            <p style="font-weight:bold;color:#f2f2f2;margin-bottom:1rem;">To fill out this form, you will need to know the following:</p>
            <ul style="list-style:none;padding:0;margin:0 0 1.5rem 0;color:#ddd;font-size:0.95rem;">
                <li style="margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:1rem;">
                    <svg style="flex-shrink:0;margin-top:2px;" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e0ff00" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Social Security Number
                </li>
                <li style="margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:1rem;">
                    <svg style="flex-shrink:0;margin-top:2px;" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e0ff00" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Home address history for the past 3 years
                </li>
                <li style="margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:1rem;">
                    <svg style="flex-shrink:0;margin-top:2px;" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e0ff00" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Current driver license number and driver license history for the past 3 years
                </li>
                <li style="margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:1rem;">
                    <svg style="flex-shrink:0;margin-top:2px;" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e0ff00" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Employment history up to 10 years
                </li>
                <li style="margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:1rem;">
                    <svg style="flex-shrink:0;margin-top:2px;" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e0ff00" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    History of traffic accidents, violations and/or convictions from the last 3 years (including DUI or reckless driving conviction and license suspension)
                </li>
                <li style="margin-bottom:0.75rem;display:flex;align-items:flex-start;gap:1rem;">
                    <svg style="flex-shrink:0;margin-top:2px;" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#e0ff00" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Military history (if applicable)
                </li>
            </ul>
            
            <p style="font-size:0.9rem;color:#888;">Required entry fields are followed by <span style="color:#f87171;">*</span>, meaning you must provide the requested information to continue. If you encounter any errors during this process and cannot continue, please contact us at <a href="tel:3132557827" style="color:#e0ff00;text-decoration:none;">313-255-7827</a>.</p>
        </div>

        <button id="welcome-btn" class="btn-white" style="font-size:1.05rem;padding:1rem 2.5rem;width:100%;max-width:300px;">
            Let's Go
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
    `;

    singleView.appendChild(div);
    div.querySelector('#welcome-btn').addEventListener('click', goNext);
}

// ── Success screen ───────────────────────────────────────────────────────────
function renderSuccess(step, anim) {
    showSingleView();
    singleView.innerHTML = '';

    const div = document.createElement('div');
    div.className = `success-screen ${anim === 'enter-up' ? 'slide-enter-up' : 'slide-enter-down'}`;
    div.style.textAlign = 'center';
    div.innerHTML = `
        <div style="width:64px;height:64px;margin:0 auto 2rem;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 40px rgba(255,255,255,0.2);">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#fff" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
        </div>
        <h2 style="font-family:'Syne','Inter',sans-serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-0.03em;margin-bottom:1rem;">${step.title}</h2>
        <p style="color:#666;font-size:1rem;margin-bottom:3rem;max-width:440px;margin-left:auto;margin-right:auto;">${step.subtitle}</p>
        <a href="../index.html" class="btn-white" style="text-decoration:none;display:inline-flex;align-items:center;gap:0.5rem;">
            Return to Home
        </a>
    `;

    singleView.appendChild(div);
    // Trigger submission here
    submitApplication(state.answers);
}

// ── Single question (Typeform style) ─────────────────────────────────────────
function renderSingle(step, anim) {
    showSingleView();
    singleView.innerHTML = '';

    const stepNum = getStepNumberForStep(step.id);
    const totalQ = countQuestions();

    const div = document.createElement('div');
    div.className = `single-step ${anim === 'enter-up' ? 'slide-enter-up' : 'slide-enter-down'}`;
    div.dataset.stepId = step.id;

    div.innerHTML = `
        <div class="q-label">
            <span class="q-num">${stepNum}</span>
            of ${totalQ}
        </div>
        <h2 class="single-title">${step.title}${step.required ? ' <span style="color:#555;font-size:0.5em;font-weight:400;">*required</span>' : ''}</h2>
        <div class="input-wrapper">
            ${getSingleInputHTML(step)}
        </div>
        <div class="error-msg" id="single-error"></div>
        ${step.type !== 'options' ? `
        <div style="margin-top:1.5rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
            <button class="btn-white" id="single-ok" type="button" style="font-size:0.9rem;padding:0.75rem 1.75rem;">
                OK
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
            </button>
            <span class="key-hint">press <kbd>Enter ↵</kbd></span>
        </div>` : ''}
    `;

    singleView.appendChild(div);
    bindSingleStep(div, step);

    // Restore answer
    if (state.answers[step.id]) {
        if (step.type === 'options') {
            div.querySelectorAll('.option-btn').forEach(b => {
                if (b.dataset.value === state.answers[step.id]) b.classList.add('selected');
            });
        } else {
            const inp = div.querySelector('input');
            if (inp) { inp.value = state.answers[step.id]; inp.focus(); }
        }
    } else if (step.type !== 'options' && step.type !== 'select') {
        const inp = div.querySelector('input');
        if (inp) inp.focus();
    }
}

function getSingleInputHTML(step) {
    const val = state.answers[step.id] || '';

    if (step.type === 'options') {
        return `
            <div class="options-grid" style="max-width:520px;">
                ${(step.options || []).map((opt, i) => `
                    <button class="option-btn ${val === opt ? 'selected' : ''}" type="button" data-value="${escHtml(opt)}">
                        <span class="option-num">${i + 1}</span>
                        ${escHtml(opt)}
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (step.type === 'select') {
        return `
            <select class="page-input" id="input-${step.id}" style="font-size:1.1rem;padding:1rem 1.25rem;margin-top:0.5rem;cursor:pointer;">
                <option value="">Choose one...</option>
                ${(step.options || []).map(opt => `<option value="${escHtml(opt)}" ${val === opt ? 'selected' : ''}>${escHtml(opt)}</option>`).join('')}
            </select>
        `;
    }

    const typeMap = { email: 'email', tel: 'tel', number: 'number', text: 'text', month: 'month' };
    const itype = typeMap[step.type] || 'text';
    return `
        <input
            type="${itype}"
            class="single-input"
            id="input-${step.id}"
            placeholder="${escHtml(step.placeholder || 'Type your answer...')}"
            value="${escHtml(val)}"
            autocomplete="off"
            ${step.type === 'number' ? 'min="0"' : ''}
        >
    `;
}

function bindSingleStep(container, step) {
    if (step.type === 'options') {
        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.answers[step.id] = btn.dataset.value;
                hideSingleError();
                setTimeout(() => validateAndAdvance(step, container), 350);
            });
        });
    } else {
        const inp = container.querySelector('input, select');
        if (inp) {
            const evt = inp.tagName === 'SELECT' ? 'change' : 'input';
            inp.addEventListener(evt, e => {
                state.answers[step.id] = e.target.value;
                hideSingleError();
            });
            if (step.type === 'tel') applyPhoneFormat(inp);
        }
        const okBtn = container.querySelector('#single-ok');
        if (okBtn) okBtn.addEventListener('click', () => validateAndAdvance(step, container));
    }
}

// ── Page group (Google Form style) ───────────────────────────────────────────
function renderPage(steps, anim) {
    showPageView();
    pageForm.innerHTML = '';

    const totalO = countQuestions();
    const firstNum = getStepNumberForStep(steps[0].id);

    // Header card
    const header = document.createElement('div');
    header.className = 'form-card';
    header.style.cssText = 'background:#0f0f0f;border-color:#1f1f1f;';
    header.innerHTML = `
        <p style="font-size:0.65rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#444;margin-bottom:0.5rem;">Questions ${firstNum}–${Math.min(firstNum + steps.length - 1, totalO)} of ${totalO}</p>
        <div style="height:2px;background:#1a1a1a;border-radius:2px;overflow:hidden;margin-top:0.75rem;">
            <div style="height:100%;width:${(firstNum / totalO) * 100}%;background:#fff;box-shadow:0 0 12px rgba(255,255,255,0.4);transition:width 0.5s;border-radius:2px;"></div>
        </div>
    `;
    pageForm.appendChild(header);

    // Question cards
    steps.forEach((step, i) => {
        const card = document.createElement('div');
        card.className = 'form-card';
        card.dataset.stepId = step.id;

        const num = firstNum + i;
        card.innerHTML = `
            <div class="q-label">
                <span class="q-num">${num}</span>
                of ${totalO}
                ${step.required ? '<span style="color:#f87171;margin-left:0.25rem;">*</span>' : ''}
            </div>
            <p class="page-q-title">${step.title}</p>
            <div class="input-wrapper">
                ${getPageInputHTML(step)}
            </div>
            <div class="error-msg" id="error-${step.id}"></div>
        `;

        pageForm.appendChild(card);
        bindPageStep(card, step);

        // Restore answers
        if (state.answers[step.id]) {
            if (step.type === 'options') {
                card.querySelectorAll('.option-btn').forEach(b => {
                    if (b.dataset.value === state.answers[step.id]) b.classList.add('selected');
                });
            } else {
                const inp = card.querySelector('input, select, textarea');
                if (inp) inp.value = state.answers[step.id];
            }
        }
    });

    // Animate in
    if (anim === 'enter-up') {
        pageForm.classList.remove('page-slide-exit');
        pageForm.classList.add('page-slide-enter');
        setTimeout(() => pageForm.classList.remove('page-slide-enter'), 500);
    }

    // Update page button labels
    const isLastSeg = state.segmentIndex === state.segments.length - 2; // exclude success
    pageNextBtn.textContent = isLastSeg ? 'Submit Application' : 'Continue';
    if (isLastSeg) {
        pageNextBtn.innerHTML = `Submit Application <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    } else {
        pageNextBtn.innerHTML = `Continue <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;
    }

    const canGoBack = state.segmentIndex > 0 && state.segments[state.segmentIndex - 1]?.type !== 'welcome';
    pageBackBtn.style.display = canGoBack ? 'inline-flex' : 'none';

    pageSubmitBar.classList.add('active');
}

function getPageInputHTML(step) {
    const val = state.answers[step.id] || '';

    if (step.type === 'options') {
        return `
            <div class="options-grid">
                ${(step.options || []).map((opt, i) => `
                    <button class="option-btn ${val === opt ? 'selected' : ''}" type="button" data-value="${escHtml(opt)}" style="font-size:0.925rem;padding:0.75rem 1rem;">
                        <span class="option-num" style="font-size:0.6rem;width:18px;height:18px;">${i + 1}</span>
                        ${escHtml(opt)}
                    </button>
                `).join('')}
            </div>
        `;
    }

    if (step.type === 'select') {
        return `
            <select class="page-input" id="input-${step.id}" style="cursor:pointer;">
                <option value="">Choose one...</option>
                ${(step.options || []).map(opt => `<option value="${escHtml(opt)}" ${val === opt ? 'selected' : ''}>${escHtml(opt)}</option>`).join('')}
            </select>
        `;
    }

    const typeMap = { email: 'email', tel: 'tel', number: 'number', text: 'text', month: 'month', file: 'file' };
    const itype = typeMap[step.type] || 'text';

    if (itype === 'file') {
        return `
            <input
                type="file"
                class="page-input"
                id="input-${step.id}"
                accept="image/*,.pdf"
                style="padding:0.75rem;cursor:pointer;background:var(--color-input-bg);"
            >
            ${val instanceof File ? `<p style="font-size:0.8rem;color:var(--color-primary);margin-top:0.5rem;">Selected: ${val.name}</p>` : ''}
        `;
    }

    return `
        <input
            type="${itype}"
            class="page-input"
            id="input-${step.id}"
            placeholder="${escHtml(step.placeholder || '')}"
            value="${escHtml(val instanceof File ? '' : val)}"
            autocomplete="off"
            ${step.type === 'number' ? 'min="0"' : ''}
        >
    `;
}

function bindPageStep(container, step) {
    if (step.type === 'options') {
        container.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                state.answers[step.id] = btn.dataset.value;
                hidePageError(step.id);
            });
        });
    } else {
        const inp = container.querySelector('input, select');
        if (inp) {
            const evt = inp.tagName === 'SELECT' || inp.type === 'file' ? 'change' : 'input';
            inp.addEventListener(evt, e => {
                if (inp.type === 'file') {
                    state.answers[step.id] = e.target.files[0] || '';
                    hidePageError(step.id);
                    // Force redraw
                    container.querySelector('.input-wrapper').innerHTML = getPageInputHTML(step);
                    bindPageStep(container, step); // rebind
                } else {
                    state.answers[step.id] = e.target.value;
                    hidePageError(step.id);
                }
            });
            if (step.type === 'tel') applyPhoneFormat(inp);
        }
    }
}

// ── Validate and advance (single-view) ───────────────────────────────────────
function validateAndAdvance(step, container) {
    let value = state.answers[step.id];
    if (step.type !== 'options') {
        const inp = container.querySelector(`#input-${step.id}`);
        if (inp) { value = inp.value.trim(); state.answers[step.id] = value; }
    }

    if (step.required && (!value || value === '')) {
        showSingleError(step.errorMessage || 'This field is required.');
        shakeInput(container);
        return;
    }
    if (step.validation && !step.validation(value)) {
        showSingleError(step.errorMessage || 'Please enter a valid value.');
        shakeInput(container);
        return;
    }

    hideSingleError();
    goNext();
}

// ── Validate page segment ─────────────────────────────────────────────────────
function validatePageSegment() {
    const seg = state.segments[state.segmentIndex];
    let allValid = true;

    for (const step of seg.steps) {
        let value = state.answers[step.id];
        if (step.type !== 'options' && step.type !== 'file') {
            const inp = pageForm.querySelector(`#input-${step.id}`);
            if (inp) { value = inp.value.trim(); state.answers[step.id] = value; }
        }

        if (step.required && (!value || value === '')) {
            showPageError(step.id, step.errorMessage || 'This field is required.');
            if (allValid) {
                // Scroll to first error
                const errCard = pageForm.querySelector(`[data-step-id="${step.id}"]`);
                if (errCard) errCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            allValid = false;
        } else if (step.validation && !step.validation(value)) {
            showPageError(step.id, step.errorMessage || 'Please enter a valid value.');
            allValid = false;
        } else {
            hidePageError(step.id);
        }
    }

    return allValid;
}

// ── Navigation ───────────────────────────────────────────────────────────────
function goNext() {
    if (state.isTransitioning) return;
    const seg = state.segments[state.segmentIndex];
    if (seg.type === 'page' && !validatePageSegment()) return;

    if (state.segmentIndex < state.segments.length - 1) {
        doTransition(state.segmentIndex + 1, 'enter-up');
    }
}

function goPrevious() {
    if (state.isTransitioning || state.segmentIndex <= 0) return;
    const prevSeg = state.segments[state.segmentIndex - 1];
    if (prevSeg?.type === 'welcome') return;
    doTransition(state.segmentIndex - 1, 'enter-down');
}

function doTransition(nextIndex, anim) {
    state.isTransitioning = true;
    state.segmentIndex = nextIndex;
    renderSegment(nextIndex, anim);
    requestAnimationFrame(() => {
        state.isTransitioning = false;
    });
}

// ── Progress ─────────────────────────────────────────────────────────────────
function updateProgress(segIdx) {
    const seg = state.segments[segIdx];
    const isEdge = seg.type === 'welcome' || seg.type === 'success';

    progressTrack.style.opacity = isEdge ? '0' : '1';
    stepCounter.style.opacity = isEdge ? '0' : '1';
    controls.style.opacity = isEdge ? '0' : '1';

    if (!isEdge) {
        // Compute question progress
        const total = state.segments.length - 2; // exclude welcome + success
        const progress = ((segIdx) / total) * 100;
        progressFill.style.width = `${Math.min(progress, 100)}%`;

        const curSeg = state.segments[segIdx];
        const firstStep = curSeg.steps[0];
        const stepNum = getStepNumberForStep(firstStep.id);
        stepCounter.textContent = `${stepNum} / ${countQuestions()}`;
    }

    // Arrow buttons (single view only)
    btnUp.disabled = segIdx <= 1;
    btnDown.disabled = segIdx >= state.segments.length - 1;
}

// ── View switcher ─────────────────────────────────────────────────────────────
function showSingleView() {
    singleView.classList.add('active');
    pageView.classList.remove('active');
    pageSubmitBar.classList.remove('active');
    controls.style.display = 'flex';
}
function showPageView() {
    pageView.classList.add('active');
    singleView.classList.remove('active');
    controls.style.display = 'none';
}
function hideSingleView() { singleView.classList.remove('active'); }
function hidePageView() {
    pageView.classList.remove('active');
    pageSubmitBar.classList.remove('active');
}

// ── Global keyboard events ────────────────────────────────────────────────────
function bindGlobalEvents() {
    btnUp.addEventListener('click', goPrevious);
    btnDown.addEventListener('click', () => {
        const seg = state.segments[state.segmentIndex];
        if (seg.type === 'single') {
            validateAndAdvance(seg.steps[0], singleView);
        } else {
            goNext();
        }
    });

    pageNextBtn.addEventListener('click', goNext);
    pageBackBtn.addEventListener('click', goPrevious);

    document.addEventListener('keydown', e => {
        if (state.isTransitioning) return;
        const seg = state.segments[state.segmentIndex];
        if (!seg) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            if (seg.type === 'welcome') goNext();
            else if (seg.type === 'single') validateAndAdvance(seg.steps[0], singleView);
            // page: don't auto-advance on Enter to let user fill multiple fields
        }
    });
}

// ── Error helpers ─────────────────────────────────────────────────────────────
function showSingleError(msg) {
    const el = document.getElementById('single-error');
    if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hideSingleError() {
    const el = document.getElementById('single-error');
    if (el) el.classList.remove('show');
}
function showPageError(stepId, msg) {
    const el = document.getElementById(`error-${stepId}`);
    if (el) { el.textContent = msg; el.classList.add('show'); }
}
function hidePageError(stepId) {
    const el = document.getElementById(`error-${stepId}`);
    if (el) el.classList.remove('show');
}
function shakeInput(container) {
    const w = container.querySelector('.input-wrapper');
    if (!w) return;
    w.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-8px)' },
        { transform: 'translateX(8px)' }, { transform: 'translateX(-8px)' },
        { transform: 'translateX(0)' }
    ], { duration: 320, easing: 'ease-in-out' });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function countQuestions() {
    return state.segments.filter(s => s.type === 'single' || s.type === 'page')
        .reduce((acc, s) => acc + s.steps.length, 0);
}
function getStepNumberForStep(stepId) {
    let num = 1;
    for (const seg of state.segments) {
        if (seg.type === 'single' || seg.type === 'page') {
            for (const step of seg.steps) {
                if (step.id === stepId) return num;
                num++;
            }
        }
    }
    return num;
}
function applyPhoneFormat(input) {
    input.addEventListener('input', function () {
        const x = this.value.replace(/\D/g, '').match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
        this.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : '');
    });
}
function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function showLoader() {
    showSingleView();
    singleView.classList.add('active');
    singleView.innerHTML = `
        <div style="text-align:center;color:#444;display:flex;flex-direction:column;align-items:center;gap:1rem;">
            <div class="spinner"></div>
            <p style="font-size:0.85rem;">Loading application...</p>
        </div>
    `;
}
function showError401() {
    showSingleView();
    singleView.innerHTML = `
        <div style="text-align:center;color:#f87171;">
            <p style="font-size:1rem;font-weight:600;">Failed to load the application form.</p>
            <p style="font-size:0.85rem;color:#666;margin-top:0.5rem;">Please try refreshing the page.</p>
        </div>
    `;
}

// ── Submit ─────────────────────────────────────────────────────────────────────
function submitApplication(data) {
    const formData = new FormData();
    const textData = {};
    let hasFiles = false;

    // Separate files from text answers
    for (const [key, val] of Object.entries(data)) {
        if (val instanceof File) {
            formData.append(key, val);
            hasFiles = true;
        } else {
            textData[key] = val;
        }
    }

    // Determine payload format
    let fetchOptions;
    if (hasFiles) {
        formData.append('data', JSON.stringify(textData));
        fetchOptions = { method: 'POST', body: formData };
        // Omit Content-Type header so browser applies boundary automatically
    } else {
        fetchOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textData)
        };
    }

    fetch('../api/submit.php', fetchOptions)
        .then(r => r.json())
        .then(r => {
            const p = document.querySelector('.success-screen p');
            if (p) p.textContent = r.success
                ? 'Our team will contact you within 3–5 business days.'
                : 'There was an issue saving your application. Please email us directly.';
        })
        .catch(() => {
            const p = document.querySelector('.success-screen p');
            if (p) p.textContent = 'Network error — please email us directly at nzlogisticsllc@gmail.com';
        });
}

function getDefaultConfig() {
    return [
        // Page 1: Personal Information (Based on App Screenshots)
        { id: 'first_name', page_group: 1, type: 'text', display_mode: 'page', title: 'First Name', placeholder: '', required: true, errorMessage: 'First name is required.' },
        { id: 'middle_name', page_group: 1, type: 'text', display_mode: 'page', title: 'Middle Name', placeholder: '', required: false },
        { id: 'last_name', page_group: 1, type: 'text', display_mode: 'page', title: 'Last Name', placeholder: '', required: true, errorMessage: 'Last name is required.' },
        { id: 'suffix', page_group: 1, type: 'select', display_mode: 'page', title: 'Suffix', options: ['None', 'Jr.', 'Sr.', 'II', 'III', 'IV'], required: false },
        { id: 'ssn', page_group: 1, type: 'text', display_mode: 'page', title: 'SSN / SIN', placeholder: '', required: true },
        { id: 'dob', page_group: 1, type: 'month', display_mode: 'page', title: 'Date of Birth (mm/yyyy)', placeholder: 'mm/yyyy', required: true },
        { id: 'address_line_1', page_group: 1, type: 'text', display_mode: 'page', title: 'Current Street Address (line 1)', placeholder: '', required: true },
        { id: 'address_line_2', page_group: 1, type: 'text', display_mode: 'page', title: 'Current Street Address (line 2)', placeholder: '', required: false },
        { id: 'country', page_group: 1, type: 'select', display_mode: 'page', title: 'Country', options: ['United States', 'Canada', 'Mexico'], required: true },
        { id: 'city', page_group: 1, type: 'text', display_mode: 'page', title: 'City', placeholder: '', required: true },
        { id: 'state', page_group: 1, type: 'select', display_mode: 'page', title: 'State / Province', options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], required: true },
        { id: 'zip', page_group: 1, type: 'text', display_mode: 'page', title: 'Postal / Zip Code', placeholder: '', required: true },
        { id: 'phone', page_group: 1, type: 'tel', display_mode: 'page', title: 'Cell Phone', placeholder: '', required: false },
        { id: 'email', page_group: 1, type: 'email', display_mode: 'page', title: 'Email Address', placeholder: '', required: false },
        { id: 'confirm_email', page_group: 1, type: 'email', display_mode: 'page', title: 'Confirm Email Address', placeholder: '', required: true },
        { id: 'pref_contact', page_group: 1, type: 'select', display_mode: 'page', title: 'Preferred method of contact', options: ['Primary Phone', 'Email'], required: false },
        { id: 'best_time', page_group: 1, type: 'select', display_mode: 'page', title: 'Best time to contact you', options: ['Any', 'Morning', 'Afternoon', 'Evening'], required: false },
        { id: 'mktg_consent', page_group: 1, type: 'options', display_mode: 'page', title: 'Yes, I agree to receive information concerning future opportunities or promotions from N&Z Logistics LLC by email or other commercial electronic communications.', options: ['Yes', 'No'], required: false },
        { id: 'sms_consent', page_group: 1, type: 'options', display_mode: 'page', title: 'Would you like to receive communication from N&Z Logistics LLC via text message?', options: ['Yes', 'No'], required: false },

        // Page 2: General Info 
        { id: 'position', page_group: 2, type: 'select', display_mode: 'page', title: 'What position are you applying for?', options: ['Company Driver', 'Owner Operator', 'Fleet Owner', 'Driver for Owner Operator'], required: true, errorMessage: 'Please select a position.' },
        { id: 'owner_operator_fleet', page_group: 2, type: 'options', display_mode: 'page', title: 'If you answered "Owner Operator" or "Fleet Owner" above, select Yes.', options: ['Yes', 'No'], required: true },
        { id: 'us_eligible', page_group: 2, type: 'options', display_mode: 'page', title: 'Are you legally eligible for employment in the United States?', options: ['Yes', 'No'], required: true },
        { id: 'currently_employed', page_group: 2, type: 'options', display_mode: 'page', title: 'Are you currently employed?', options: ['Yes', 'No'], required: true },
        { id: 'speaks_english', page_group: 2, type: 'options', display_mode: 'page', title: 'Do you read, write, and speak English?', options: ['Yes', 'No'], required: true },

        // Page 3: General Info (Part 2)
        { id: 'worked_before', page_group: 3, type: 'options', display_mode: 'page', title: 'Have you ever worked for this company before?', options: ['Yes', 'No'], required: true },
        { id: 'twic_card', page_group: 3, type: 'options', display_mode: 'page', title: 'Do you have a current TWIC card?', options: ['Yes', 'No'], required: true },
        { id: 'other_name', page_group: 3, type: 'options', display_mode: 'page', title: 'Have you ever been known by any other name?', options: ['Yes', 'No'], required: true },
        { id: 'referral_source', page_group: 3, type: 'select', display_mode: 'page', title: 'How did you hear about us?', options: ['Driver Referral', 'Craigslist', 'Facebook', 'Driver Pulse', 'Newspaper', 'Web', 'Other'], required: false },
        { id: 'driver_referral_name', page_group: 3, type: 'text', display_mode: 'page', title: 'If "Driver Referral", please enter the driver\'s name', placeholder: 'Driver name...', required: false },
        { id: 'referral_other', page_group: 3, type: 'text', display_mode: 'page', title: 'If "Other", please explain how you heard about us', placeholder: 'Please explain...', required: false },
        { id: 'fmcsa_clearinghouse', page_group: 3, type: 'options', display_mode: 'page', title: 'Have you registered for the FMCSA Drug & Alcohol Clearinghouse?', options: ['Yes', 'No'], required: true },

        // Page 4: Driving Experience & License Info (Part 1)
        { id: 'driving_license_photo', page_group: 4, type: 'file', display_mode: 'page', title: 'Licenses Overview: Please provide all licenses you have held within the last 3 years (Upload Photo / PDF)', required: true },
        { id: 'exp_straight_truck', page_group: 4, type: 'select', display_mode: 'page', title: 'Straight Truck — Years of Experience', options: ['None', 'Less than 1 year', '1-2 years', '2-3 years', '3-4 years', '4-5 years', '5-6 years', '6-7 years', '7+ years'], required: true },
        { id: 'exp_semi_trailer', page_group: 4, type: 'select', display_mode: 'page', title: 'Tractor and Semi-Trailer — Years of Experience', options: ['None', 'Less than 1 year', '1-2 years', '2-3 years', '3-4 years', '4-5 years', '5-6 years', '6-7 years', '7+ years'], required: true },
        { id: 'exp_two_trailers', page_group: 4, type: 'select', display_mode: 'page', title: 'Tractor - Two Trailers — Years of Experience', options: ['None', 'Less than 1 year', '1-2 years', '2-3 years', '3-4 years', '4-5 years', '5-6 years', '6-7 years', '7+ years'], required: true },
        { id: 'exp_other', page_group: 4, type: 'text', display_mode: 'page', title: 'Other equipment experience (if any)', placeholder: 'e.g. Flatbed, Tanker, Refrigerated...', required: false },
        { id: 'license_number', page_group: 4, type: 'text', display_mode: 'page', title: 'What is your driver\'s license number?', placeholder: 'License number', required: true, errorMessage: 'Please enter your license number.' },
        { id: 'license_state', page_group: 4, type: 'select', display_mode: 'page', title: 'Which state issued your license?', options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'], required: true, errorMessage: 'Please select your licensing state.' },
        { id: 'license_expiry', page_group: 4, type: 'month', display_mode: 'page', title: 'License Expiration Date', placeholder: 'MM/YYYY', required: true },
        { id: 'dot_medical_expiry', page_group: 4, type: 'month', display_mode: 'page', title: 'DOT Medical Card Expiration Date (if applicable)', placeholder: 'MM/YYYY', required: false },

        // Page 5: License Info (Part 2) & History
        { id: 'is_current_license', page_group: 5, type: 'options', display_mode: 'page', title: 'Is this your current driver\'s license?', options: ['Yes', 'No'], required: true },
        { id: 'is_commercial_license', page_group: 5, type: 'options', display_mode: 'page', title: 'Is this a commercial driver\'s license (CDL)?', options: ['Yes', 'No'], required: true },
        { id: 'endorsements', page_group: 5, type: 'text', display_mode: 'page', title: 'Endorsements — list any that apply', placeholder: 'e.g. None, Tanker, HazMat, Doubles/Triples, X Endorsement...', required: false },
        { id: 'military', page_group: 5, type: 'options', display_mode: 'page', title: 'Were you ever in the military?', options: ['Yes', 'No'], required: true },
        { id: 'companies_worked_for', page_group: 5, type: 'number', display_mode: 'page', title: 'How many companies have you worked for in the last 10 years?', placeholder: 'e.g. 3', required: true },
        { id: 'employed_10_years', page_group: 5, type: 'options', display_mode: 'page', title: 'Have you been employed, contracted, or attended a company orientation in the last 10 years?', options: ['Yes', 'No'], required: true },
        { id: 'school_10_years', page_group: 5, type: 'options', display_mode: 'page', title: 'Have you attended a school (not related to truck driving) in the last 10 years?', options: ['Yes', 'No'], required: true },
        { id: 'employment_history', page_group: 5, type: 'text', display_mode: 'page', title: 'Briefly describe your employment history for the last 10 years', placeholder: 'Company name, dates, position...', required: false },
    ];
}
