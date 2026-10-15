# Input

Text input, select and textarea share one shell: label above, 44px control, hint or error below.

**You provide:** a visible label (always), the control, an optional hint, and the error message for that field when the server or Zod rejects it.

- Edge is `input` on a `card` fill. Hover darkens the edge to `foreground`; focus turns it `forest` and adds the ring.
- **Error:** 2px `destructive` edge, `destructive-soft` fill, and the message under the field with `CircleAlert`. Set `aria-invalid="true"` and point `aria-describedby` at the message. One message per field, saying what to do ("Manca il dominio: prova con nome@esempio.it"), not what went wrong ("Email non valida").
- Errors appear on blur or on submit, never while typing. On submit, focus moves to the first invalid field.
- The hint is replaced by the error, not stacked with it.
- **Disabled:** `secondary` fill. Say why in the hint.
- **Loading** is a property of the form's submit button, not of the field.
- Text stays at 16px in every control. Placeholders are examples ("Mario Rossi"), never the label.
- Select uses the native control with `ChevronDown`; on phones the system picker opens.
- Login and registration: one column, 420px at most. Address and admin forms: two columns from 700px, short fields (CAP, pezzi, prezzo) paired.
