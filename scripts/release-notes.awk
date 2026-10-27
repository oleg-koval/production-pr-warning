# Prints the CHANGELOG.md section whose heading starts with h ("## 1.6.0 ").
# Release notes render every newline as a hard break, so a wrapped line
# (indented, under a non-blank line) is joined back onto the line above.
# Nested list items, fenced code and lines after a blank line keep their own line.
index($0, h) == 1 { p = 1; next }
/^## / { p = 0 }
!p { next }
/^ *```/ { fence = !fence; buf[++n] = $0; next }
fence { buf[++n] = $0; next }
/^  +[^ ]/ && n && buf[n] != "" && buf[n] !~ /^ *```/ && $0 !~ /^ *([-*+]|[0-9]+[.)]) / {
  sub(/^ +/, "")
  buf[n] = buf[n] " " $0
  next
}
{ buf[++n] = $0 }
END { for (i = 1; i <= n; i++) print buf[i] }
