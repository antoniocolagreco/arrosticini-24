# Header

Logo, three links, language selector, account, cart. The same on every page, admin included.

**You provide:** the current route (sets `aria-current="page"`), the locale, the cart count and whether the visitor is signed in.

- Links, in this order: Shop, La nostra storia, Spedizioni nel mondo (EN: Shop, Our story, Worldwide delivery). The active link gets a 2px `primary` underline.
- Language selector: `Globe`, "IT / EUR" or "EN / EUR", `ChevronDown`. Currency is always EUR; the selector changes language only.
- Account: `User` icon button. Signed out it goes to login; signed in it opens the account menu (Ordini, Account, Esci with `LogOut`; admins also get `Settings`).
- Cart: the only `primary` button in the header, `ShoppingCart` plus the count in brackets, "(0)" included. The count bumps once (`duration-cart`) when an item is added.
- Under 700px the links drop to a second row that scrolls sideways and the selector collapses to its globe. No hamburger: three links fit.
- Not sticky. Every target is at least 44px.
