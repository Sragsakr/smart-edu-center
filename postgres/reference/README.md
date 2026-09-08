# PostgreSQL Reference SQL

These files are historical/reference material only.

They are **not executable migrations** and must not be applied to a database. The only canonical executable Build Mode schema is:

```text
postgres/baseline/0001_smart_edu_center_clean.sql
```

The legacy baseline files document the previous disposable schema. The schema fragments document how the first clean baseline was assembled before finalization. `supabase-history/` contains the retired provider-specific SQL and tests for historical inspection only; no application, package, CI check, or executable migration imports it.
