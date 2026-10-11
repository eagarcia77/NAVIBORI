# NAVIBORI Commerce API — draft contract

`GET /api/commerces/nearby?lat=18&lng=-66&radius=2000`

Expected response:
```json
{
  "commerces": [
    {
      "id": "example-store-1",
      "name": "Example Store",
      "location": {"lat":18,"lng":-66},
      "category": "retail",
      "description": "Illustrative sample, not a verified business",
      "offer": null
    }
  ]
}
```

The response above is illustrative. Do not display example businesses as real merchants.

## Backend and product acceptance criteria
- Validate coordinates and radius server-side, enforce rate limits and cap response size.
- Obtain merchant records from an authorized database and verify publication consent.
- Never fabricate merchants, locations, offers, opening hours or prices.
- Show verified offers with start/end timestamps and merchant attribution; suppress expired offers.
- Minimize collection and retention of precise GPS coordinates.
- Separate optional marketing notification opt-in from location permissions.
- Provide merchant opt-out and content moderation for listings/promotions.
- On map: selectable accessible pins, search/filter, directions button and route preview.
- Route button must use real routing geometry for the chosen transport mode.
- Confirm the actual application source and backend before integration or Render deployment.
