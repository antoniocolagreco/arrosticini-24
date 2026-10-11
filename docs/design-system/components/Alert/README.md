# Alert

A message about something that just happened. Two kinds: success and error.

**You provide:** the kind, a short title, an optional line of detail, and optionally one inline link ("Annulla", "Riprova").

- **Success:** `success-soft` fill, `forest` edge, `CircleCheck`, `role="status"`.
- **Error:** `destructive-soft` fill, `destructive` edge, `CircleAlert`, `role="alert"`. Say what happened and what to do next, in that order.
- The two differ by icon and wording as well as colour.
- Inline, at the top of the content column, pushing the page down. Not a toast: nothing floats, nothing disappears on a timer.
- Field errors belong to the field (see Input). Use an error Alert for what no single field explains: failed payment, expired session, server error.
- One alert at a time. A new one replaces the old one.
- No warning or info kinds. If something is neither good nor broken, it is page copy.
