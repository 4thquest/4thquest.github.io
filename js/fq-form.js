/* ==========================================================================
   Fourth Quest — contact form handler
   --------------------------------------------------------------------------
   Posts to the existing Google Apps Script endpoint using exactly the wire
   format that script expects, so no backend change is required:

     <field names>          the form's own inputs
     formDataNameOrder      JSON array of field names, sets column order
     formGoogleSheetName    target sheet tab            (form data-sheet)
     formGoogleSendEmail    address to notify on submit (form data-email)

   Adds what the original handler lacked: validation, a pending state, a real
   error path, and a mailto fallback when the request fails.
   ========================================================================== */

(function () {
  'use strict';

  var ENDPOINT_TIMEOUT = 15000;

  function collect(form) {
    var elements = form.elements;
    var names = [];
    var data = {};
    var honeypot = '';

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (!el.name || el.disabled) continue;
      if (el.type === 'submit' || el.type === 'button') continue;

      if (el.name === 'honeypot') {
        honeypot = el.value;
        continue;
      }

      if (el.type === 'checkbox' || el.type === 'radio') {
        if (!el.checked) continue;
        if (data[el.name]) {
          data[el.name] += ', ' + el.value;
          continue;
        }
      }

      if (names.indexOf(el.name) === -1) names.push(el.name);
      data[el.name] = el.value;
    }

    data.formDataNameOrder = JSON.stringify(names);
    data.formGoogleSheetName = form.dataset.sheet || 'responses';
    data.formGoogleSendEmail = form.dataset.email || '';

    return { data: data, honeypot: honeypot, names: names };
  }

  function encode(data) {
    return Object.keys(data)
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
      })
      .join('&');
  }

  function setStatus(form, kind, html) {
    var box = form.querySelector('[data-fq-status]');
    if (!box) return;
    if (!kind) {
      box.className = 'fq-hide';
      box.innerHTML = '';
      return;
    }
    box.className = 'fq-alert fq-alert--' + kind;
    box.innerHTML = html;
    box.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  }

  function handle(event) {
    event.preventDefault();

    var form = event.target;
    var btn = form.querySelector('[type="submit"]');
    var fields = form.querySelector('[data-fq-fields]');
    var payload = collect(form);

    /* Filled honeypot means a bot. Fail silently — show the same success
       state so the bot learns nothing. */
    if (payload.honeypot) {
      if (fields) fields.classList.add('fq-hide');
      setStatus(form, 'ok', '<div><strong>Thanks — message received.</strong></div>');
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var original = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Sending…';
    }
    setStatus(form, null);

    var xhr = new XMLHttpRequest();
    var settled = false;

    function fail() {
      if (settled) return;
      settled = true;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = original;
      }
      setStatus(
        form,
        'err',
        '<div><strong>That didn’t go through.</strong> Please try again, or email ' +
          '<a href="mailto:sp.fourth.quest@gmail.com">sp.fourth.quest@gmail.com</a> directly.</div>'
      );
    }

    xhr.open('POST', form.action);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.timeout = ENDPOINT_TIMEOUT;

    xhr.onload = function () {
      if (settled) return;
      if (xhr.status >= 200 && xhr.status < 400) {
        settled = true;
        form.reset();
        if (fields) fields.classList.add('fq-hide');
        setStatus(
          form,
          'ok',
          '<div><strong>Thanks — your message is on its way.</strong><br>' +
            'We reply within one business day. Prefer to talk sooner? ' +
            '<a href="#schedule">Book a 30-minute slot</a>.</div>'
        );
      } else {
        fail();
      }
    };

    xhr.onerror = fail;
    xhr.ontimeout = fail;
    xhr.send(encode(payload.data));
  }

  function init() {
    var forms = document.querySelectorAll('form.fq-form[data-fq-remote]');
    for (var i = 0; i < forms.length; i++) {
      forms[i].addEventListener('submit', handle, false);
      /* Native bubbles would fire before our handler on some browsers. */
      forms[i].setAttribute('novalidate', 'novalidate');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
