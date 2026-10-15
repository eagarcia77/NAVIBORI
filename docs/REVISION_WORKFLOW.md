# NAVIBORI Spatial Revision Workflow

## Objective
Prevent unreviewed or provenance-free spatial data from reaching production.

## States
`draft → in_review → approved → published → superseded`

Reviewers may return `in_review` or `approved` records to `draft`.

## Required publication evidence
A production revision must retain:
- entity ID and type;
- venue;
- sequential revision number;
- source/provenance;
- author;
- creation timestamp;
- reviewer;
- review timestamp;
- publisher;
- publication timestamp.

## Separation of duties
Production configuration should allow organizations to require that the author and reviewer are different users. The initial in-memory prototype does not enforce this yet.

## Database implementation
The future Supabase migration should add immutable audit/revision records instead of overwriting published spatial facts without history.

Recommended tables:
- spatial_revisions
- spatial_revision_items
- publication_events
- audit_logs

## Safety
Changes to accessibility, emergency, closure or route data must be reviewed before publication. Generative AI must not approve or publish those changes autonomously.
