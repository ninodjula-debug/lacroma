# LACROMA CMS content rule

All published editable content must have a corresponding CMS entry.

Collections covered:
- Homepage Images
- Works
- Exhibitions
- Press

New content is created through Decap CMS and remains represented by a file in the matching `data/` collection. Build helpers must not introduce user-visible collection content that has no CMS entry. Legacy content must be migrated into the matching collection before it is treated as CMS-managed.
