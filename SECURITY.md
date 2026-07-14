# Security

## Account-name validation

Account names are labels, not authentication identities. They use an allowlist:
ASCII letters and numbers, the existing JavaScript-regex whitespace class,
hyphens, underscores, dots, and `@`. The `@` character is allowed so an email
address can be used as the label; URL and shell delimiters such as `/`, `?`,
`#`, and quotes remain rejected.

The label is not validated as a deliverable email address, so values with `@`
may still be syntactically unusual. Using an email address also exposes that
address anywhere account labels are shown or logged. This is accepted for the
local operator-facing dashboard; account labels must never be treated as proof
of provider identity or authorization.

The retained `\s` behavior also accepts tabs, line breaks, and Unicode
whitespace. This predates email-label support and is not widened by it. Log and
display consumers must therefore continue to treat account labels as untrusted
text and escape structural whitespace where necessary.
