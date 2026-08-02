// Contact Form Handling

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const alertContainer = document.getElementById('contact-alert-container');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertContainer.innerHTML = '';

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHtml = submitBtn.innerHTML;

    // Loading State & Double-submission prevention
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 0.4rem; animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      Sending Message...
    `;

    const phoneEl = document.getElementById('contact-phone');
    const payload = {
      name: document.getElementById('contact-name').value.trim(),
      email: document.getElementById('contact-email').value.trim(),
      phone: phoneEl ? phoneEl.value.trim() : '',
      subject: document.getElementById('contact-subject').value.trim(),
      message: document.getElementById('contact-message').value.trim()
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send your message. Please try again.');
      }

      // Success Confirmation (Gold/Black styling matching site theme, no gradients)
      alertContainer.innerHTML = `
        <div style="background-color: var(--bg-card); border: 1px solid var(--accent-gold); padding: 1.25rem 1.5rem; border-radius: var(--border-radius); color: var(--text-primary); margin-bottom: 1.5rem; text-align: center; box-shadow: var(--shadow-sm);">
          <div style="color: var(--accent-gold); font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            Message Sent Successfully
          </div>
          <p style="margin: 0; font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5;">
            Thank you for reaching out, <strong>${escapeHtml(payload.name)}</strong>. Your inquiry has been sent to our management team, and we will get back to you as soon as possible.
          </p>
        </div>
      `;

      // Clear all form fields after successful submission
      form.reset();

      // Scroll smoothly to alert message
      alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      console.error('[Contact Form Error]:', err);
      // On-page Error Confirmation
      alertContainer.innerHTML = `
        <div style="background-color: var(--bg-card); border: 1px solid #c62828; padding: 1.25rem 1.5rem; border-radius: var(--border-radius); color: var(--text-primary); margin-bottom: 1.5rem; text-align: center; box-shadow: var(--shadow-sm);">
          <div style="color: #c62828; font-size: 1rem; font-weight: 700; margin-bottom: 0.4rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Unable to Send Message
          </div>
          <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.4;">
            ${escapeHtml(err.message || 'An error occurred while sending your message. Please verify your details and try again.')}
          </p>
        </div>
      `;
      alertContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } finally {
      // Re-enable submission button
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.innerHTML = originalHtml;
    }
  });
});
